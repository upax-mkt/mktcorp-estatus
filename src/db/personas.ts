import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import type { PersonaResponsable } from '@/lib/personas'
import { eq } from 'drizzle-orm'

/**
 * ---- LA GENTE QUE SE OFRECE PARA RESPONSABLE ----
 *
 * Sale de la tabla `personas` (ronda 9): las 24 de Mkt Corp con nombre y
 * correo — la misma que decide quién entra a la app.
 *
 * ⚠️ SOLO VIAJA EL NOMBRE, y no es un detalle: `SelectorResponsable` pinta el
 * nombre como `value` de cada opción, ese HTML se sirve en una pantalla que
 * se comparte por enlace firmado con gente de la UDN, y el correo de las 24
 * personas no tiene que estar ahí (regla de la ronda 7, con sus tests en
 * SelectorResponsable.test.tsx). El correo viaja en el tipo porque es lo que
 * identifica a la persona en la tabla; quien lo pinte, rompe un test.
 *
 * Y el nombre es lo único que se guarda: `acuerdos.responsable` es texto. Hasta
 * el 20-ago-2026 convivía con `acuerdos.responsable_monday_id` —el id del
 * usuario en el tablero, que decidía si el acuerdo subía a la bandeja— y con
 * un directorio copiado de la cuenta de Monday (`personas_monday`). Esa
 * integración se desmontó entera (Franco: "lo de Monday lo mataremos, no va
 * la conexión"); la tabla `personas_monday` nunca tuvo una sola fila en
 * producción y ninguno de los 37 acuerdos llegó a llevar id de Monday, así
 * que el desmontaje no cambió el comportamiento de esta pantalla: ya se
 * llenaba de aquí.
 */
export async function genteParaResponsable(): Promise<PersonaResponsable[]> {
  if (!hayDB()) return []

  const propias = await db()
    .select({ nombre: esquema.personas.nombre, correo: esquema.personas.correo })
    .from(esquema.personas)
    .where(eq(esquema.personas.activa, true))

  return propias.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
