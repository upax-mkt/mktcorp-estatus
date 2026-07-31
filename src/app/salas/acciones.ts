'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'
import { derivarMarca, slugDesdeNombre } from '@/lib/marca'
import { generarEnlaceDeAgenda, revocarEnlaceDeAgenda } from '@/db/enlace-agenda'
import type { DatosSala } from '@/componentes/salas/FormularioSala'
import { esFamiliaConocida } from '@/temas/fuentes'
import { urlBase } from '@/lib/url-base'

/**
 * LAS ACCIONES DE `/salas`: crear y editar salas, y generar/revocar el
 * enlace público de la agenda (tarea 1, expuesto por fin desde una pantalla).
 *
 * Todas empiezan con `exigirEquipo()`, primera línea, sin excepción — esconder
 * el botón de Crear o el de Editar en la pantalla no protege nada: son Server
 * Actions, y quien conozca su nombre las puede llamar sin pasar por ella.
 *
 * Las escrituras se hacen aquí, directo con Drizzle, en vez de delegar a
 * `src/db/salas.ts` (que hoy solo sabe de freeze comercial — pausar y
 * reactivar): mismo criterio que ya usa `src/app/acuerdos/acciones.ts` con
 * `esquema.acuerdos`. Una Server Action ya es la capa de escritura de esta
 * pantalla; una capa intermedia de una función no habría separado nada que
 * no estuviera ya separado por el propio archivo.
 *
 * `derivarMarca` SOLO se usa al CREAR (revisión final de la rama, punto 1).
 * `editarSalaAction` guarda únicamente lo que el formulario edita de verdad
 * y deja los ocho campos derivados (secundario, acento, las dos superficies,
 * los dos textos y el degradado) tal como estaban — antes los recalculaba en
 * CADA guardado, así que abrir el formulario para cambiar la tipografía y
 * pulsar "Guardar cambios" sobrescribía en silencio la paleta certificada de
 * la sala con la que produce la fórmula genérica, casi nunca la misma (medido
 * contra las diez filas reales: los ocho campos derivados de las diez
 * divergen de lo que `derivarMarca` produciría hoy). Ver `recalcularPaletaAction`,
 * más abajo, para el camino explícito cuando SÍ hace falta recalcular.
 */

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/

/**
 * Tope de longitud de `nombre` (revisión final de la rama, punto 4): no
 * tenía ninguno, y este texto se pinta sin recortar en tres sitios que no
 * perdonan un párrafo — la tarjeta del hub (una sola línea con elipsis, pero
 * el layout entero se corre), el encabezado de la sala (`heroNombreOculto`
 * aparte, el h1 real) y la agenda pública, que además la ve gente de fuera
 * del equipo. 60 es generoso frente a las diez marcas reales (16 caracteres
 * la más larga, "Marketing United") y del mismo orden que otros textos
 * cortos ya acotados en este código (`titulo` de un bloque de minuta,
 * `.max(80)` en src/minuta/molde.ts).
 */
const LONGITUD_MAXIMA_NOMBRE = 60

/**
 * Validación compartida por crear y editar, sobre un slug YA NORMALIZADO
 * (quien llama decide cómo se llegó a él — ver los dos comentarios de más
 * abajo, que difieren entre crear y editar). La unicidad NO se comprueba
 * aquí: crear y editar la tratan distinto (crear la exige contra CUALQUIER
 * fila existente, editar ni la mira — el slug de quien edita es, por
 * definición, el de su propia fila).
 *
 * FAMILIADISPLAY/FAMILIATEXTO (tarea 7) se validan con `esFamiliaConocida`,
 * NO contra `CATALOGO_DE_FUENTES` directamente: esa función es
 * deliberadamente más permisiva —acepta también los dos alias heredados de
 * la Fase 1 ('specialGothic', 'satoshi') que hoy siguen guardadas
 * mexa-creativa y uix— para que esas dos salas se puedan seguir editando
 * (el logo, el color) sin que un campo de tipografía que nadie tocó bloquee
 * el guardado entero. `FormularioSala` ya nunca vuelve a MANDAR esos dos
 * alias salvo que el propio `sala` que le pasó `page.tsx` los traiga sin
 * tocar — es la Server Action, no la pantalla, quien de verdad decide qué
 * se guarda: es un endpoint, y esta validación es la que importa.
 */
function validarDatosComunes(datos: {
  nombre: string
  slug: string
  primario: string
  familiaDisplay: string
  familiaTexto: string
}): string | null {
  if (datos.nombre.trim().length === 0) return 'Escribe un nombre para la sala.'
  if (datos.nombre.trim().length > LONGITUD_MAXIMA_NOMBRE) {
    return `El nombre no puede pasar de ${LONGITUD_MAXIMA_NOMBRE} caracteres (tiene ${datos.nombre.trim().length}): se pinta en la tarjeta del hub, en la sala y en la agenda pública.`
  }
  // Mismo contrato que documenta `slugDesdeNombre` (src/lib/marca.ts): un
  // nombre sin ningún carácter alfanumérico da slug vacío, y ese vacío no se
  // guarda — es la clave primaria de la fila.
  if (datos.slug.length === 0) {
    return 'Ese nombre no aporta ninguna letra o número: no hay con qué construir un identificador.'
  }
  if (!HEX_VALIDO.test(datos.primario)) {
    return `"${datos.primario}" no es un color hex válido (se espera algo como "#614ACA").`
  }
  if (!esFamiliaConocida(datos.familiaDisplay)) {
    return `"${datos.familiaDisplay}" no es una familia tipográfica reconocida para títulos.`
  }
  if (!esFamiliaConocida(datos.familiaTexto)) {
    return `"${datos.familiaTexto}" no es una familia tipográfica reconocida para texto.`
  }
  return null
}

/**
 * Crea una sala. Rechaza un slug repetido diciendo cuál es — se comprueba
 * contra LA TABLA COMPLETA (las diez filas, no solo las nueve que
 * `slugsDeSalas()` expone como "salas de verdad"): `grupo-upax` sigue siendo
 * una fila real con esa clave primaria, y dejar que alguien cree "Grupo
 * Upax" y choque contra ella en el INSERT daría un error de Postgres en vez
 * de uno que se entiende.
 *
 * Ninguna acción de esta pantalla borra salas — no existe un
 * `eliminarSalaAction`. Para dejar de atender una está la pausa (ronda 7).
 */
export async function crearSalaAction(datos: DatosSala): Promise<{ error?: string }> {
  await exigirEquipo()

  // El slug SE VUELVE A DERIVAR aquí con la misma `slugDesdeNombre` que ya
  // usa `FormularioSala` — nunca se guarda el texto crudo que mandó el
  // cliente tal cual. Es defensa en profundidad: el formulario ya normaliza
  // antes de enviar, pero una Server Action es un endpoint, y quien la llame
  // sin pasar por la pantalla podría mandar cualquier cosa en `slug` — con
  // mayúsculas, espacios o símbolos que romperían la URL de la sala si se
  // guardaran así. Re-derivar es idempotente sobre un slug ya bueno (no
  // cambia nada) y convierte cualquier otra cosa en una forma segura, o en
  // vacío si no había ninguna letra o número que aprovechar.
  const slug = slugDesdeNombre(datos.slug)
  const problema = validarDatosComunes({ ...datos, slug })
  if (problema) return { error: problema }
  if (!hayDB()) return { error: 'Sin base de datos no se pueden crear salas.' }

  const existente = (
    await db().select({ slug: esquema.salas.slug }).from(esquema.salas).where(eq(esquema.salas.slug, slug))
  )[0]
  if (existente) return { error: `Ya existe una sala con el identificador "${slug}".` }

  const marca = derivarMarca(datos.nombre, datos.primario)

  try {
    await db().insert(esquema.salas).values({
      slug,
      nombre: marca.nombre,
      primario: marca.primario,
      secundario: marca.secundario,
      acento: marca.acento,
      superficieClara: marca.superficieClara,
      superficieOscura: marca.superficieOscura,
      textoSobreClara: marca.textoSobreClara,
      textoSobreOscura: marca.textoSobreOscura,
      gradiente: marca.gradiente,
      // Tarea 7: la tipografía la elige quien crea la sala —`FormularioSala`
      // ya la manda validada (`validarDatosComunes`, arriba) — no una
      // constante fija para todas.
      familiaDisplay: datos.familiaDisplay,
      familiaTexto: datos.familiaTexto,
      logoUrl: datos.logoUrl,
      logoRelacionDeTinta: datos.logoRelacionDeTinta,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la sala.' }
  }

  revalidatePath('/salas')
  revalidatePath('/')
  return {}
}

/**
 * Edita una sala existente. El identificador no viaja en `datos` como algo
 * que se pueda cambiar — `slug` llega APARTE, ligado por `.bind()` a la sala
 * que se está editando (ver `src/app/salas/page.tsx`) — así que aquí no hay
 * nada que comparar contra la lista de slugs usados: por definición, este
 * slug ya es el de esta fila.
 *
 * SOLO ESCRIBE LO QUE EL FORMULARIO EDITA DE VERDAD (revisión final de la
 * rama, punto 1): `nombre`, `primario`, `familiaDisplay`, `familiaTexto`,
 * `logoUrl`, `logoRelacionDeTinta`. Los ocho campos derivados —secundario,
 * acento, las dos superficies, los dos textos legibles y el degradado— NO
 * entran en este `.set()`: `FormularioSala` no expone ningún campo para
 * ellos, así que no hay forma de que quien edita los revise antes de
 * guardar, y sobrescribirlos con lo que produce `derivarMarca` tiraba en
 * silencio la paleta certificada de la sala en el primer "Guardar cambios"
 * — el mismo clic que hace falta para cambiar solo la tipografía.
 *
 * Esto deja abierto, a propósito, un caso: si `primario` cambia aquí, la
 * paleta derivada que se queda en la fila sigue calculada del color VIEJO.
 * No se resuelve solo — es justo lo que `recalcularPaletaAction`, más abajo,
 * existe para hacer de forma explícita y separada del guardado normal.
 */
export async function editarSalaAction(slug: string, datos: DatosSala): Promise<{ error?: string }> {
  await exigirEquipo()

  const problema = validarDatosComunes({ ...datos, slug })
  if (problema) return { error: problema }
  if (!hayDB()) return { error: 'Sin base de datos no se pueden editar salas.' }

  // Envuelto en try/catch, igual que `crearSalaAction` con su INSERT — antes
  // no lo estaba, y un fallo de escritura (conexión caída a mitad, una
  // restricción que rechaza el UPDATE) se propagaba como promesa rechazada
  // en vez de un `{error}` legible. La corrección real que hacía falta era
  // del lado del cliente (ver `FormularioSala`, que ahora envuelve la
  // llamada a `guardar()` entera), pero esto cierra el hueco simétrico: la
  // acción no debe depender de que quien la llama la envuelva bien para dar
  // un mensaje decente.
  let actualizada: { slug: string }[]
  try {
    actualizada = await db()
      .update(esquema.salas)
      .set({
        // `.trim()` aquí y no antes de validar: `validarDatosComunes` ya
        // exige que el nombre SIN espacios no esté vacío, así que lo único
        // que falta es no guardar los espacios sueltos que sobrevivieron a
        // esa comprobación (mismo criterio que `derivarMarca.nombre`, del
        // que `crearSalaAction` sigue dependiendo).
        nombre: datos.nombre.trim(),
        primario: datos.primario,
        // Tarea 7: antes este UPDATE no tocaba la tipografía en absoluto —no
        // había desde dónde elegirla— así que cualquier edición (el logo, el
        // color) dejaba la fuente donde estuviera. Ahora sí viaja, validada
        // arriba igual que el resto de campos.
        familiaDisplay: datos.familiaDisplay,
        familiaTexto: datos.familiaTexto,
        logoUrl: datos.logoUrl,
        logoRelacionDeTinta: datos.logoRelacionDeTinta,
        updatedAt: new Date(),
      })
      .where(eq(esquema.salas.slug, slug))
      .returning({ slug: esquema.salas.slug })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la sala.' }
  }

  if (actualizada.length === 0) return { error: `Sala desconocida: "${slug}"` }

  revalidatePath('/salas')
  revalidatePath('/')
  revalidatePath(`/cliente/${slug}`)
  return {}
}

/**
 * RECALCULA LA PALETA DE UNA SALA EXISTENTE desde un color primario — el
 * camino explícito para el caso que `editarSalaAction` deja abierto a
 * propósito (revisión final de la rama, punto 1): cambiar el primario en un
 * guardado normal no toca los ocho campos derivados, así que se quedan
 * calculados del color anterior hasta que alguien pida, a propósito, que se
 * recalculen.
 *
 * Escribe `primario` JUNTO con los ocho derivados —en el mismo `.set()`—
 * para que los dos queden sincronizados en un solo commit sin importar si
 * `editarSalaAction` ya guardó ese primario o si esta acción recibe uno que
 * el formulario todavía no había guardado. Es la ÚNICA acción de este
 * archivo que vuelve a llamar `derivarMarca` fuera de crear una sala, y
 * nunca toca `nombre`, tipografía ni logo — recalcular la paleta no es
 * cambiar ninguna de esas tres cosas.
 *
 * `FormularioSala` la ofrece como un botón APARTE de "Guardar cambios", con
 * su propia confirmación ("esto reemplaza lo que hay, no se puede
 * deshacer"): mezclarla con el guardado normal habría sido volver a poner en
 * un solo clic la trampa que este punto de la revisión vino a quitar.
 */
export async function recalcularPaletaAction(slug: string, primario: string): Promise<{ error?: string }> {
  await exigirEquipo()

  if (!HEX_VALIDO.test(primario)) {
    return { error: `"${primario}" no es un color hex válido (se espera algo como "#614ACA").` }
  }
  if (!hayDB()) return { error: 'Sin base de datos no se puede recalcular la paleta.' }

  // `derivarMarca` exige un `nombre` pero no lo usa para ningún cálculo de
  // color (lo devuelve tal cual, recortado) — aquí se le pasa `slug` como
  // valor de relleno porque esta acción JAMÁS toca la columna `nombre` de la
  // fila: `marca.nombre` ni se lee del resultado, abajo.
  const marca = derivarMarca(slug, primario)

  let actualizada: { slug: string }[]
  try {
    actualizada = await db()
      .update(esquema.salas)
      .set({
        primario: marca.primario,
        secundario: marca.secundario,
        acento: marca.acento,
        superficieClara: marca.superficieClara,
        superficieOscura: marca.superficieOscura,
        textoSobreClara: marca.textoSobreClara,
        textoSobreOscura: marca.textoSobreOscura,
        gradiente: marca.gradiente,
        updatedAt: new Date(),
      })
      .where(eq(esquema.salas.slug, slug))
      .returning({ slug: esquema.salas.slug })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo recalcular la paleta.' }
  }

  if (actualizada.length === 0) return { error: `Sala desconocida: "${slug}"` }

  revalidatePath('/salas')
  revalidatePath('/')
  revalidatePath(`/cliente/${slug}`)
  return {}
}

/**
 * Genera un enlace nuevo y devuelve la URL completa para enseñarla al
 * instante (ver `BloqueEnlaceAgenda`) — la Server Action que faltaba para que
 * `generarEnlaceDeAgenda`/`revocarEnlaceDeAgenda` (tarea 1) tuvieran una
 * pantalla desde la que llamarse.
 */
export async function generarEnlaceAction(): Promise<{ enlace?: string; error?: string }> {
  await exigirEquipo()
  let token: string
  try {
    token = await generarEnlaceDeAgenda()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo generar el enlace.' }
  }
  revalidatePath('/salas')
  return { enlace: `${await urlBase()}/agenda/${token}` }
}

/**
 * Devuelve `{error?}` en vez de `Promise<void>` — antes no lo hacía, y un
 * fallo al borrar la fila (conexión caída, por ejemplo) se propagaba como
 * promesa rechazada sin ningún canal para explicarlo. Mismo criterio que
 * `generarEnlaceAction`, su hermana: la acción devuelve el problema, el
 * componente lo enseña.
 */
export async function revocarEnlaceAction(): Promise<{ error?: string }> {
  await exigirEquipo()
  try {
    await revocarEnlaceDeAgenda()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo revocar el enlace.' }
  }
  revalidatePath('/salas')
  return {}
}
