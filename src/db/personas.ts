import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { personasDeMonday, hayQueRefrescar, type PersonaMonday } from '@/monday/personas'
import { mondayConectado } from '@/monday/cliente'

/**
 * El directorio que ve la interfaz.
 *
 * Devuelve la copia local y, si está vieja, la refresca contra Monday. Si el
 * refresco falla, se devuelve la copia vieja: un directorio de ayer sirve para
 * asignar un acuerdo; una lista vacía, no. Sin base ni token devuelve [] y el
 * selector lo dice en pantalla.
 */
export async function directorio(): Promise<PersonaMonday[]> {
  if (!hayDB()) return mondayConectado() ? await personasDeMonday().catch(() => []) : []

  const guardadas = await db().select().from(esquema.personasMonday)
  const masVieja = guardadas.reduce<Date | null>(
    (peor, p) => (peor === null || p.cargadoEn < peor ? p.cargadoEn : peor),
    null,
  )

  if (!mondayConectado() || !hayQueRefrescar(masVieja, new Date())) {
    return guardadas
      .map((p) => ({ id: p.mondayId, nombre: p.nombre, correo: p.correo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }

  try {
    const frescas = await personasDeMonday()
    await db().delete(esquema.personasMonday)
    if (frescas.length > 0) {
      await db()
        .insert(esquema.personasMonday)
        .values(frescas.map((p) => ({ mondayId: p.id, nombre: p.nombre, correo: p.correo })))
    }
    return frescas
  } catch {
    return guardadas
      .map((p) => ({ id: p.mondayId, nombre: p.nombre, correo: p.correo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
}
