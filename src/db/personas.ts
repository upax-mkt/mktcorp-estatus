import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { personasDeMonday, hayQueRefrescar, type PersonaMonday } from '@/monday/personas'
import { mondayConectado } from '@/monday/cliente'
import { notInArray, sql } from 'drizzle-orm'

/**
 * El directorio que ve la interfaz.
 *
 * Devuelve la copia local y, si está vieja, la refresca contra Monday. Si el
 * refresco falla, se devuelve la copia vieja: un directorio de ayer sirve para
 * asignar un acuerdo; una lista vacía, no. Sin base ni token devuelve [] y el
 * selector lo dice en pantalla.
 */

/**
 * Transforma guardadas de la base a formato PersonaMonday, ordenadas alfabéticamente.
 */
function formatearYOrdenar(guardadas: typeof esquema.personasMonday.$inferSelect[]): PersonaMonday[] {
  return guardadas
    .map((p) => ({ id: p.mondayId, nombre: p.nombre, correo: p.correo }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export async function directorio(): Promise<PersonaMonday[]> {
  if (!hayDB()) return mondayConectado() ? await personasDeMonday().catch(() => []) : []

  const guardadas = await db().select().from(esquema.personasMonday)
  const masVieja = guardadas.reduce<Date | null>(
    (peor, p) => (peor === null || p.cargadoEn < peor ? p.cargadoEn : peor),
    null,
  )

  if (!mondayConectado() || !hayQueRefrescar(masVieja, new Date())) {
    return formatearYOrdenar(guardadas)
  }

  // Refresco de Monday: fallo de RED vs fallo de ESCRITURA son caminos distintos.
  let frescas: PersonaMonday[]
  try {
    frescas = await personasDeMonday()
  } catch {
    // Fallo de red al consultar Monday: devuelve la copia vieja.
    return formatearYOrdenar(guardadas)
  }

  // Ahora sincroniza la base con las frescas. No usa delete+insert sino upsert
  // (onConflictDoUpdate) + limpiar solo lo viejo. Si algo falla a mitad, la tabla
  // nunca queda vacía: en el peor caso queda con gente de más, que no impide
  // trabajar (vs. una tabla vacía que sí impide).
  try {
    const idsNuevos = frescas.map((p) => p.id)
    if (frescas.length > 0) {
      // Upsert: inserta o actualiza. Campos que siempre actualiza: nombre, correo, cargadoEn.
      await db()
        .insert(esquema.personasMonday)
        .values(frescas.map((p) => ({ mondayId: p.id, nombre: p.nombre, correo: p.correo })))
        .onConflictDoUpdate({
          target: esquema.personasMonday.mondayId,
          set: {
            nombre: sql`EXCLUDED.nombre`,
            correo: sql`EXCLUDED.correo`,
            cargadoEn: new Date(),
          },
        })
    }
    // Limpia solo lo que NO está en las frescas (fue removido de Monday).
    if (idsNuevos.length > 0) {
      await db()
        .delete(esquema.personasMonday)
        .where(notInArray(esquema.personasMonday.mondayId, idsNuevos))
    }
    // Si frescas.length === 0 (Monday devolvió lista vacía), no toca nada.
    // Eso es un edge case (error potencial): una lista vacía de Monday no es una verdad.
  } catch {
    // Fallo al escribir en la base: devuelve la copia vieja. La tabla queda
    // en estado parcial (puede tener gente que desapareció o estar sin refrescar),
    // pero no vacía.
    return formatearYOrdenar(guardadas)
  }

  return frescas
}
