import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { personasDeMonday, hayQueRefrescar, type PersonaMonday } from '@/monday/personas'
import { mondayConectado } from '@/monday/cliente'
import { eq, notInArray, sql } from 'drizzle-orm'

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

  // Si Monday devolvió lista vacía y hay guardadas, no confío en esa respuesta.
  // Una lista vacía no es una verdad: devuelvo la copia que tengo.
  if (frescas.length === 0 && guardadas.length > 0) {
    return formatearYOrdenar(guardadas)
  }

  return frescas
}

/**
 * ---- LA GENTE QUE SE OFRECE PARA RESPONSABLE (ronda 13) ----
 *
 * `directorio()` de arriba habla SOLO con Monday, y Monday sigue apagado en
 * esta app —falta el token del usuario "Meeting Hub"—, así que `personas_monday`
 * tiene CERO filas. Consecuencia que nadie había mirado: el desplegable "Mkt
 * Corp" salía vacío en TODAS las pantallas (la sala, la bandeja, la minuta y
 * la pestaña de acuerdos) con el aviso de "no se pudo cargar la gente de
 * Monday", y la única forma de poner un responsable era teclearlo. Franco,
 * 13-ago: *"hay acuerdos que no tienen responsable, y no los puedo editar ni
 * la persona ni el equipo"*.
 *
 * Y la app SÍ conoce a su gente: la tabla `personas` (ronda 9) tiene las 24 de
 * Mkt Corp con nombre, correo y rol — es la que decide quién entra. Así que
 * cuando Monday no da nada, el desplegable se llena de ahí.
 *
 * ⚠️ EL ID DE ESAS OPCIONES LLEVA EL PREFIJO `app:`, y no es decorativo: la
 * columna `responsableMondayId` guarda ids DEL TABLERO, y meter ahí un
 * identificador nuestro sería sembrar un dato falso que algún día alguien
 * mandaría a Monday. `SelectorResponsable` lo traduce a nulo al emitir, así
 * que quien recoge el valor nunca ve el prefijo: elegir a alguien del
 * directorio propio guarda su NOMBRE y ningún id — exactamente lo que ya
 * pasaba al escribirlo a mano, pero sin erratas ni tres grafías del mismo
 * nombre.
 *
 * ⚠️ Y el prefijo va sobre el NOMBRE, no sobre el correo: el `value` de cada
 * opción viaja al HTML, y esta pantalla se comparte por enlace firmado — el
 * correo de las 24 personas no tiene que estar ahí (regla de la ronda 7, con
 * su test en SelectorResponsable.test.tsx).
 *
 * El día que Monday se encienda, `directorio()` devuelve ids de verdad y esta
 * rama deja de usarse sola, sin tocar nada.
 */
export const PREFIJO_APP = 'app:'

export async function genteParaResponsable(): Promise<PersonaMonday[]> {
  const deMonday = await directorio()
  if (deMonday.length > 0) return deMonday
  if (!hayDB()) return []

  const propias = await db()
    .select({ nombre: esquema.personas.nombre, correo: esquema.personas.correo })
    .from(esquema.personas)
    .where(eq(esquema.personas.activa, true))

  return propias
    .map((p) => ({ id: `${PREFIJO_APP}${p.nombre}`, nombre: p.nombre, correo: p.correo }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
