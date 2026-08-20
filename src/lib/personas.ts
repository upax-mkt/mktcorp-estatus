/**
 * LA GENTE QUE PUEDE CARGAR CON UN ACUERDO.
 *
 * Sale de la tabla `personas` (ver `genteParaResponsable` en
 * src/db/personas.ts): las de Mkt Corp que pueden entrar a la app. Este
 * archivo es lógica pura —sin base, sin red— porque lo importan componentes
 * de cliente.
 *
 * Antes este tipo se llamaba `PersonaMonday` y venía del directorio de la
 * cuenta de Monday. La integración se desmontó el 20-ago-2026 (Franco: "lo de
 * Monday lo mataremos, no va la conexión"), así que la única fuente es la
 * nuestra.
 */
export interface PersonaResponsable {
  /**
   * Lo que se guarda en `acuerdos.responsable`, y lo ÚNICO que viaja al HTML:
   * es el `value` de cada opción del desplegable.
   */
  nombre: string
  /**
   * Identifica a la persona en la tabla `personas` (es su clave primaria).
   *
   * ⚠️ NUNCA se pinta ni viaja en ningún atributo: la pantalla de acuerdos se
   * comparte por enlace firmado con gente de la UDN, y el correo de las 24
   * personas de Mkt Corp no tiene que estar ahí. Regla de la ronda 7, con dos
   * tests que caen si alguien lo pone en un `title` o en cualquier atributo
   * (SelectorResponsable.test.tsx).
   */
  correo: string
}

/** Minúsculas, sin acentos, espacios colapsados. La única forma de comparar dos nombres de este archivo. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    // NFD separa cada letra acentuada en (letra base + marca diacrítica); esto
    // quita esa marca, dejando solo la letra base. \p{Diacritic} con el flag
    // `u` es la forma explícita de pedir "cualquier marca diacrítica" sin
    // escribir el rango de puntos Unicode a mano.
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Primer nombre + último apellido (normalizados) — cubre que la transcripción omita un segundo nombre o apellido materno. */
function primeroYApellido(nombreCompleto: string): string {
  const partes = normalizar(nombreCompleto).split(' ').filter(Boolean)
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes[0]} ${partes[partes.length - 1]}`
}

/**
 * LA PERSONA MÁS PARECIDA A UN NOMBRE, o ninguna si la coincidencia no es evidente.
 *
 * Para cuando la IA detecta un responsable leyendo una transcripción: nunca
 * decide sola a quién asignarlo (eso lo confirma una persona, ver
 * SelectorResponsable), pero sí puede OFRECER la coincidencia más obvia de la
 * lista viva para que sea más rápido confirmarla.
 *
 * Deliberadamente sencillo — sin distancia de edición ni librerías de
 * fuzzy-matching: dos niveles, nombre completo normalizado y luego "primer
 * nombre + apellido" normalizado (por si la transcripción omitió un nombre
 * compuesto). Si cualquiera de los dos niveles encuentra más de una persona
 * —dos "Ana García", por ejemplo— NO es evidente cuál es, así que no se
 * sugiere ninguna: es mejor no sugerir nada que sugerir a quien no toca.
 */
export function personaMasParecida(
  nombreDetectado: string,
  personas: PersonaResponsable[],
): PersonaResponsable | null {
  const nombreNorm = normalizar(nombreDetectado)
  if (nombreNorm === '') return null

  const porNombreCompleto = personas.filter((p) => normalizar(p.nombre) === nombreNorm)
  if (porNombreCompleto.length === 1) return porNombreCompleto[0]
  if (porNombreCompleto.length > 1) return null

  const nombreCorto = primeroYApellido(nombreDetectado)
  if (nombreCorto === '') return null
  const porNombreCorto = personas.filter((p) => primeroYApellido(p.nombre) === nombreCorto)
  if (porNombreCorto.length === 1) return porNombreCorto[0]

  return null
}
