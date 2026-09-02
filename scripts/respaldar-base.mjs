/**
 * RESPALDO DE LA BASE DE PRODUCCIÓN, FUERA DE NEON.
 *
 * POR QUÉ EXISTE (1-sep-2026). El plan de Neon de este proyecto es `free_v3`,
 * y su ventana de recuperación a un punto en el tiempo es de **6 HORAS**
 * (`history_retention_seconds: 21600`). Eso significa que un borrado masivo
 * —un `delete` mal escrito, una credencial filtrada, un ransomware— que nadie
 * note dentro de esas 6 horas es IRREVERSIBLE: no hay nada más que restaurar.
 * Este script es la única copia que sobrevive a esa ventana.
 *
 * NO SUSTITUYE A `pg_dump`, y conviene decirlo claro: vuelca DATOS, no el
 * esquema —que ya vive versionado en `drizzle/`— ni los binarios de Vercel
 * Blob (presentaciones, logos, imágenes del concurso), que están en otro
 * sistema y tienen su propia vida. Restaurar de aquí es: aplicar las
 * migraciones sobre una base vacía y volver a meter estas filas.
 *
 * LEE `.env.prod.local` A PROPÓSITO. Desde el 1-sep `.env.local` apunta a la
 * rama `dev`, y respaldar dev no protege nada.
 *
 * Uso:  npm run db:respaldo
 */
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { homedir } from 'node:os'

const DESTINO = join(homedir(), 'Respaldos-mktcorp')
/** Cuántos respaldos se conservan. Con uno diario, dos meses de historia. */
const CUANTOS_SE_GUARDAN = 60

if (!existsSync('.env.prod.local')) {
  console.error('Falta .env.prod.local (la DATABASE_URL de la rama `main` de Neon).')
  process.exit(1)
}
process.loadEnvFile('.env.prod.local')

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

// Las tablas se PREGUNTAN, no se listan a mano: una tabla nueva entra en el
// respaldo sola. Una lista escrita aquí envejece en silencio, y un respaldo
// que envejece en silencio es peor que no tenerlo — se descubre el día que
// hace falta.
const tablas = (await sql.query(
  'select tablename from pg_tables where schemaname = $1 order by tablename', ['public'],
)).map((t) => t.tablename)

const volcado = { generado: new Date().toISOString(), origen: process.env.PGHOST ?? '?', tablas: {} }
let filas = 0
for (const tabla of tablas) {
  // Nombre de tabla entrecomillado: viene de `pg_tables`, no de fuera, pero
  // interpolar identificadores sin comillas es la clase de atajo que un día
  // deja de ser seguro.
  const datos = await sql.query(`select * from "${tabla.replace(/"/g, '""')}"`)
  volcado.tablas[tabla] = datos
  filas += datos.length
  console.log(`  ${tabla.padEnd(34)} ${String(datos.length).padStart(5)} filas`)
}

mkdirSync(DESTINO, { recursive: true })
const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const archivo = join(DESTINO, `mktcorp-${sello}.json.gz`)
writeFileSync(archivo, gzipSync(JSON.stringify(volcado)))

console.log(`\n${filas} filas de ${tablas.length} tablas → ${archivo}`)
console.log(`  ${(statSync(archivo).size / 1024).toFixed(1)} KB`)

// Rotación: se borran los más viejos, nunca el más reciente.
const viejos = readdirSync(DESTINO)
  .filter((f) => f.startsWith('mktcorp-') && f.endsWith('.json.gz'))
  .sort()
  .slice(0, -CUANTOS_SE_GUARDAN)
for (const f of viejos) unlinkSync(join(DESTINO, f))
if (viejos.length) console.log(`  (${viejos.length} respaldos viejos retirados)`)
