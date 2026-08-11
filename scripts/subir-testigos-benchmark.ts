/**
 * SUBE LAS LÁMINAS DEL BENCHMARK que valen porque se VEN.
 *
 * Un benchmark real trae gráficos, matrices y capturas de los anuncios de la
 * competencia. Algunas se pueden reconstruir con datos —y entonces se
 * reconstruyen, que se leen mejor y se actualizan—, pero otras no: un radar
 * sin valores rotulados, la captura de un anuncio de JCDecaux. Esas se
 * enseñan tal cual, y para eso hay que guardarlas.
 *
 * Se suben al MISMO store privado que el resto (`access: 'private'`) y se
 * sirven por `/api/archivo/[id]`, que comprueba el permiso contra la sala.
 * Nunca por la URL de Blob a pelo.
 *
 * Idempotente: si ya existe un archivo con el mismo título en la sala, no
 * sube otro — imprime el id que ya tenía.
 *
 * Uso: npx tsx scripts/subir-testigos-benchmark.ts
 */
process.loadEnvFile('.env.local')

import { readFileSync } from 'node:fs'
import { put } from '@vercel/blob'
import { and, eq } from 'drizzle-orm'
import { db } from '../src/db/cliente'
import * as esquema from '../src/db/esquema'

const SALA = 'promo-espacio'
const DIR = `${process.env.CLAUDE_JOB_DIR}/tmp/pe`

/** Las láminas que se suben, con el título con el que quedan registradas. */
const TESTIGOS = [
  { archivo: 's67-radar.png', titulo: 'Benchmark · Radar de capacidades' },
  { archivo: 's29.png', titulo: 'Benchmark · Tabla comparativa de sitios web y SEO' },
  { archivo: 's27-matriz.png', titulo: 'Benchmark · Matriz de posicionamiento competitivo' },
  { archivo: 's21-contacto.png', titulo: 'Benchmark · Contactabilidad de la competencia' },
]

async function main() {
  const conexion = db()
  for (const t of TESTIGOS) {
    const yaEsta = (
      await conexion
        .select({ id: esquema.archivos.id })
        .from(esquema.archivos)
        .where(and(eq(esquema.archivos.salaSlug, SALA), eq(esquema.archivos.titulo, t.titulo)))
        .limit(1)
    )[0]
    if (yaEsta) {
      console.log(`· ya estaba  ${t.titulo}\n  /api/archivo/${yaEsta.id}`)
      continue
    }

    let bytes: Buffer
    try {
      bytes = readFileSync(`${DIR}/${t.archivo}`)
    } catch {
      console.warn(`⚠ no encontré ${DIR}/${t.archivo} — se salta`)
      continue
    }

    const id = crypto.randomUUID()
    const ruta = `salas/${SALA}/imagen/${id}-${t.archivo}`
    await put(ruta, bytes, { access: 'private', contentType: 'image/png', addRandomSuffix: false })
    await conexion.insert(esquema.archivos).values({
      id,
      salaSlug: SALA,
      categoria: 'imagen',
      titulo: t.titulo,
      fecha: null,
      ruta,
      nombreOriginal: t.archivo,
      tipoContenido: 'image/png',
      tamanoBytes: bytes.byteLength,
    })
    console.log(`✓ subido    ${t.titulo}  (${Math.round(bytes.byteLength / 1024)} KB)\n  /api/archivo/${id}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
