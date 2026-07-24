/**
 * Siembra la base de datos: las 10 salas (fijas) + los datos de ejemplo
 * actuales (sesiones/acuerdos/minutas de src/datos-ejemplo.ts), para que la
 * primera vez que se conecte la DB en producción tenga contenido realista
 * en vez de aparecer vacía.
 *
 * Idempotente: usa ids deterministas y onConflictDoNothing, así que correr
 * `npm run db:seed` varias veces no duplica nada.
 *
 * Uso: `npm run db:seed` (requiere DATABASE_URL en el entorno).
 */
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { estadoDeSalas } from '@/datos-ejemplo'

export async function sembrar(): Promise<void> {
  if (!hayDB()) {
    console.log('[semilla] DATABASE_URL no está definida — nada que sembrar.')
    return
  }

  const conexion = db()
  const salas = estadoDeSalas()

  // 1. Las 10 salas — idempotente por slug.
  await conexion
    .insert(esquema.salas)
    .values(salas.map((s) => ({ slug: s.slug, cadencia: s.cadencia })))
    .onConflictDoNothing({ target: esquema.salas.slug })

  for (const sala of salas) {
    // 2. Sesiones (una por presentación de ejemplo) — ya "minutada" porque
    //    en los datos de ejemplo todas son sesiones pasadas y celebradas.
    for (const p of sala.presentaciones) {
      const sesionId = `semilla-${sala.slug}-${p.fecha}`
      await conexion
        .insert(esquema.sesiones)
        .values({
          id: sesionId,
          salaSlug: sala.slug,
          fecha: new Date(p.fecha),
          tipo: p.tipo,
          alcance: 'todos',
          estado: 'minutada',
          estructura: { titulo: p.titulo, origen: 'semilla' },
        })
        .onConflictDoNothing({ target: esquema.sesiones.id })
    }

    // 3. Minutas — una por minuta de ejemplo, ligada a su sesión homónima.
    for (const m of sala.minutas) {
      const sesionId = `semilla-${sala.slug}-${m.fecha}`
      const minutaId = `${sesionId}-minuta`
      await conexion
        .insert(esquema.minutas)
        .values({
          id: minutaId,
          sesionId,
          transcripcion: null,
          textoFinal: null,
          enviadaA: Array.from({ length: m.enviadaA }, (_, i) => `destinatario-${i + 1}`),
        })
        .onConflictDoNothing({ target: esquema.minutas.id })
    }

    // 4. Acuerdos — cuelgan de la sala; se reusa el id de datos-ejemplo.ts.
    if (sala.acuerdos.length > 0) {
      await conexion
        .insert(esquema.acuerdos)
        .values(
          sala.acuerdos.map((a) => ({
            id: a.id,
            salaSlug: sala.slug,
            que: a.que,
            responsable: a.responsable,
            squad: a.squad ?? null,
            prioridad: null,
            fechaCompromiso: a.fechaCompromiso ? new Date(a.fechaCompromiso) : null,
            estatus: a.estatus,
            sesionOrigenId: null,
          })),
        )
        .onConflictDoNothing({ target: esquema.acuerdos.id })
    }
  }

  console.log(`[semilla] listo: ${salas.length} salas sembradas.`)
}

// Ejecución directa: `npm run db:seed` (vía tsx).
const esEjecucionDirecta = (() => {
  try {
    return import.meta.url === `file://${process.argv[1]}`
  } catch {
    return false
  }
})()

if (esEjecucionDirecta) {
  sembrar()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[semilla] error:', err)
      process.exit(1)
    })
}
