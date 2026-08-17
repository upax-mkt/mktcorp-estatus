/**
 * Borra las filas de participación que dejó la verificación automatizada.
 *
 * Abrir el modo Presentar dispara `registrarPresentacion` con el `sub` de la
 * sesión. Verificar la maquetación con un navegador headless usa una sesión
 * emitida por `scripts/cookie-local.ts`, cuyo `sub` es `verificacion-local`,
 * así que cada pasada deja constancia de que ese usuario —que no existe—
 * presentó la reunión. En la vista de participación eso aparece al lado de
 * personas reales.
 *
 * Solo toca ese correo: cualquier otra fila es de alguien de verdad.
 *
 * Uso:  npx tsx scripts/limpiar-participacion-local.ts [--seco]
 */
process.loadEnvFile('.env.local')

import { sql } from 'drizzle-orm'
import { db } from '../src/db/cliente'

const CORREO = 'verificacion-local'
const SECO = process.argv.includes('--seco')

async function main() {
  const antes = await db().execute(
    sql`select reunion_id, presento, ediciones from participacion where correo = ${CORREO}`,
  )
  const filas = (antes.rows ?? antes) as unknown[]
  if (filas.length === 0) { console.log('No hay nada que limpiar.'); return }

  console.log(`Filas de "${CORREO}":`)
  for (const f of filas) console.log(' ', JSON.stringify(f))
  if (SECO) { console.log('(--seco: no se borró nada)'); return }

  await db().execute(sql`delete from participacion where correo = ${CORREO}`)
  const despues = await db().execute(
    sql`select count(*)::int as n from participacion where correo = ${CORREO}`,
  )
  console.log('✓ borradas. Quedan:', JSON.stringify((despues.rows ?? despues)[0]))
}

main().catch((e) => { console.error(e); process.exit(1) })
