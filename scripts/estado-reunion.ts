/**
 * Qué hay en la base para una reunión: su estado y quién consta que la
 * presentó. Sirve para comprobar que una verificación automatizada no dejó
 * rastro donde no debía.
 *
 * Uso:  npx tsx scripts/estado-reunion.ts <reunionId>
 */
process.loadEnvFile('.env.local')

import { sql } from 'drizzle-orm'
import { db } from '../src/db/cliente'

async function main() {
  const id = process.argv[2]
  if (!id) { console.error('Falta el id de la reunión'); process.exit(1) }

  const reunion = await db().execute(
    sql`select id, titulo, estado, sala_slug, fecha from reuniones where id = ${id}`,
  )
  console.log('REUNIÓN:', JSON.stringify(reunion.rows ?? reunion, null, 1))

  // La tabla de participación es donde aterriza `registrarPresentacion`.
  const participacion = await db().execute(
    sql`select * from participacion where reunion_id = ${id}`,
  )
  console.log('PARTICIPACIÓN:', JSON.stringify(participacion.rows ?? participacion, null, 1))
}

main().catch((e) => { console.error(e); process.exit(1) })
