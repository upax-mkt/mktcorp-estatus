/**
 * LISTA LOS BINARIOS DE VERCEL BLOB QUE YA NO REFERENCIA NADIE.
 *
 * Uso:
 *   npx tsx scripts/blobs-huerfanos.ts            # informe legible
 *   npx tsx scripts/blobs-huerfanos.ts --json     # para encadenar con jq
 *
 * ⚠️ NO BORRA NADA, y no debe aprender a hacerlo. Un huérfano de esta lista es
 * "ninguna de las referencias que ESTE script conoce lo menciona", que no es
 * lo mismo que "nadie lo usa": basta una columna nueva con un pathname para
 * que un archivo vivo aparezca aquí. Con esa incertidumbre se puede tomar una
 * decisión humana; no se puede automatizar un borrado.
 *
 * POR QUÉ EXISTE: los ocho sitios que borran un archivo llaman a
 * `del(ruta).catch(() => {})` — best-effort a propósito, para que un fallo de
 * Blob no tumbe la operación que ya tocó la base. Si Blob falla, el binario se
 * queda pagándose y nadie se entera. Esto es el "enterarse".
 *
 * Lee de `.env.local`: necesita `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN`.
 */
process.loadEnvFile('.env.local')

import { list } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'
import { blobsHuerfanos, enUnidadLegible, type BlobListado } from '../src/lib/blobs-huerfanos'

/**
 * TODO LO QUE LA BASE APUNTA A BLOB. Dos columnas, dos formatos:
 * `archivos.ruta` guarda el pathname pelado y `salas.logo_url` la URL
 * completa. `comoPathname` las iguala; aquí solo hay que acordarse de PEDIR
 * las dos — olvidar una convierte archivos vivos en falsos huérfanos.
 */
async function referenciasDeLaBase(): Promise<string[]> {
  // El cliente se crea aquí y no se recibe por parámetro: el tipo que devuelve
  // `neon()` es genérico en dos flags (arrayMode/fullResults) y pasarlo entre
  // funciones obliga a repetir esa firma para nada.
  const sql = neon(process.env.DATABASE_URL as string)
  const [archivos, salas] = (await Promise.all([
    sql`select ruta from archivos where ruta is not null`,
    sql`select logo_url from salas where logo_url is not null`,
  ])) as [Array<{ ruta: string }>, Array<{ logo_url: string }>]
  return [...archivos.map((f) => f.ruta), ...salas.map((f) => f.logo_url)]
}

/** Todo el store, página a página: `list()` pagina a los 1.000. */
async function todosLosBlobs(): Promise<BlobListado[]> {
  const todos: BlobListado[] = []
  let cursor: string | undefined
  do {
    const pagina = await list({ cursor, limit: 1000 })
    todos.push(...pagina.blobs.map((b) => ({
      pathname: b.pathname,
      size: b.size,
      uploadedAt: b.uploadedAt,
    })))
    cursor = pagina.hasMore ? pagina.cursor : undefined
  } while (cursor)
  return todos
}

async function main() {
  const json = process.argv.includes('--json')
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.local')
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta BLOB_READ_WRITE_TOKEN en .env.local')

  const [blobs, referencias] = await Promise.all([todosLosBlobs(), referenciasDeLaBase()])
  const huerfanos = blobsHuerfanos(blobs, referencias)
  const bytes = huerfanos.reduce((n, h) => n + h.size, 0)

  if (json) {
    console.log(JSON.stringify(
      { blobs: blobs.length, referencias: referencias.length, huerfanos, bytes },
      null, 2,
    ))
    return
  }

  console.log(`\n  ${blobs.length} binarios en el store · ${referencias.length} referencias en la base`)
  if (huerfanos.length === 0) {
    console.log('  Ninguno huérfano: cada binario tiene quien lo nombre.\n')
    return
  }
  console.log(`  ${huerfanos.length} sin referencia, ${enUnidadLegible(bytes)} en total:\n`)
  for (const h of [...huerfanos].sort((a, b) => b.size - a.size)) {
    console.log(`   ${enUnidadLegible(h.size).padStart(9)}  ${h.uploadedAt.slice(0, 10)}  ${h.pathname}`)
  }
  console.log('\n  Esto NO borra nada. Revisa la lista antes de tocar ninguno:')
  console.log('  un binario puede estar vivo y no aparecer en las columnas que este script consulta.\n')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
