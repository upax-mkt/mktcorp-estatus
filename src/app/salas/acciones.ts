'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'
import { derivarMarca, slugDesdeNombre } from '@/lib/marca'
import { generarEnlaceDeAgenda, revocarEnlaceDeAgenda } from '@/db/enlace-agenda'
import type { DatosSala } from '@/componentes/salas/FormularioSala'
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
 */

const FAMILIA_POR_DEFECTO = 'outfit'
const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/

/**
 * Validación compartida por crear y editar, sobre un slug YA NORMALIZADO
 * (quien llama decide cómo se llegó a él — ver los dos comentarios de más
 * abajo, que difieren entre crear y editar). La unicidad NO se comprueba
 * aquí: crear y editar la tratan distinto (crear la exige contra CUALQUIER
 * fila existente, editar ni la mira — el slug de quien edita es, por
 * definición, el de su propia fila).
 */
function validarDatosComunes(datos: { nombre: string; slug: string; primario: string }): string | null {
  if (datos.nombre.trim().length === 0) return 'Escribe un nombre para la sala.'
  // Mismo contrato que documenta `slugDesdeNombre` (src/lib/marca.ts): un
  // nombre sin ningún carácter alfanumérico da slug vacío, y ese vacío no se
  // guarda — es la clave primaria de la fila.
  if (datos.slug.length === 0) {
    return 'Ese nombre no aporta ninguna letra o número: no hay con qué construir un identificador.'
  }
  if (!HEX_VALIDO.test(datos.primario)) {
    return `"${datos.primario}" no es un color hex válido (se espera algo como "#614ACA").`
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
      // Sin selector de tipografía todavía (tarea 7, "Veinte tipografías"):
      // toda sala nueva nace con la misma familia por defecto y se puede
      // cambiar cuando esa pantalla exista.
      familiaDisplay: FAMILIA_POR_DEFECTO,
      familiaTexto: FAMILIA_POR_DEFECTO,
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
 */
export async function editarSalaAction(slug: string, datos: DatosSala): Promise<{ error?: string }> {
  await exigirEquipo()

  const problema = validarDatosComunes({ ...datos, slug })
  if (problema) return { error: problema }
  if (!hayDB()) return { error: 'Sin base de datos no se pueden editar salas.' }

  const marca = derivarMarca(datos.nombre, datos.primario)

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
        nombre: marca.nombre,
        primario: marca.primario,
        secundario: marca.secundario,
        acento: marca.acento,
        superficieClara: marca.superficieClara,
        superficieOscura: marca.superficieOscura,
        textoSobreClara: marca.textoSobreClara,
        textoSobreOscura: marca.textoSobreOscura,
        gradiente: marca.gradiente,
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
