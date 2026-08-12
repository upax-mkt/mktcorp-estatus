// Este módulo es solo de servidor. No se usa el paquete `server-only` (no está
// en el proyecto y no vale la pena una dependencia por una línea): importa
// `next/headers`, que ya revienta el build si alguien lo arrastra a un
// componente de cliente.
import { cookies } from 'next/headers'
import { firmar, verificar, type Sesion, type RolApp } from './firma'
import { puedeVerSala } from './politica'
import { COOKIE_SESION } from './nombres'
import { hayAlgunAdminActivo } from '@/db/directorio'

/**
 * La sesión viva: leer quién entró, abrirla y cerrarla. Es la capa de acceso
 * a datos de autenticación — las páginas y las Server Actions preguntan aquí,
 * nunca leen la cookie por su cuenta.
 *
 * Se cierra por defecto: sin SESSION_SECRET no hay sesión válida posible y la
 * app manda a /entrar, que explica qué falta configurar. Es preferible una app
 * inaccesible a una app abierta de par en par con los acuerdos internos de las
 * 10 salas dentro.
 */

export { COOKIE_SESION } from './nombres'

/** Cuánto dura cada tipo de acceso. */
const DIAS_EQUIPO = 7
const DIAS_SALA = 30
const MS_POR_DIA = 86_400_000

/** El secreto de firma, o null si el despliegue no lo tiene configurado. */
export function secretoConfigurado(): string | null {
  const s = process.env.SESSION_SECRET
  return s && s.trim().length > 0 ? s : null
}

/** true si el despliegue puede autenticar a alguien. */
export function hayAuth(): boolean {
  return secretoConfigurado() !== null
}

/** true si hay una clave de equipo con la que Mkt Corp puede entrar. */
export function hayClaveDeEquipo(): boolean {
  const c = process.env.CLAVE_EQUIPO
  return Boolean(c && c.trim().length > 0)
}

/**
 * Compara la clave tecleada con la del entorno sin filtrar por dónde deja de
 * coincidir: se comparan los digest SHA-256, no las cadenas.
 */
export async function claveDeEquipoCorrecta(intento: string): Promise<boolean> {
  const real = process.env.CLAVE_EQUIPO
  if (!real || real.trim().length === 0) return false
  const [a, b] = await Promise.all([digest(intento), digest(real)])
  return a === b
}

async function digest(valor: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(valor))
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** La sesión de quien está pidiendo esta página, o null si no hay ninguna válida. */
export async function sesionActual(): Promise<Sesion | null> {
  const secreto = secretoConfigurado()
  if (!secreto) return null
  const token = (await cookies()).get(COOKIE_SESION)?.value
  return verificar(token, secreto)
}

async function guardarCookie(sesion: Sesion): Promise<void> {
  const secreto = secretoConfigurado()
  if (!secreto) throw new Error('No se puede abrir sesión sin SESSION_SECRET.')
  const token = await firmar(sesion, secreto)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(sesion.exp),
  })
}

/**
 * Abre sesión de Marketing Corporativo. `rolApp` es opcional solo por
 * compatibilidad de firma — en la práctica todo llamador de esta ronda en
 * adelante lo manda: el retorno de Slack con el rol que trae el directorio
 * (`src/db/directorio.ts`), y el portillo de emergencia de `/entrar` con
 * `'admin'` a mano. Sin `rolApp`, la sesión entra igual (sigue siendo
 * `rol: 'equipo'`) pero no pasa ninguna de las tres exigencias de
 * `src/auth/roles.ts`: falla cerrado, no accede completo por accidente.
 */
export async function abrirSesionEquipo(sub: string, rolApp?: RolApp): Promise<void> {
  await guardarCookie({ rol: 'equipo', sub, rolApp, exp: Date.now() + DIAS_EQUIPO * MS_POR_DIA })
}

/** Abre sesión de solo lectura para una sala concreta. */
export async function abrirSesionSala(sala: string): Promise<void> {
  await guardarCookie({ rol: 'sala', sala, exp: Date.now() + DIAS_SALA * MS_POR_DIA })
}

export async function cerrarSesion(): Promise<void> {
  ;(await cookies()).delete(COOKIE_SESION)
}

/**
 * Token de acceso para el director de una sala. Es lo que se pega en el link
 * que se le manda: quien lo tenga entra, así que se comparte por canal
 * privado y caduca solo.
 */
export async function generarTokenDeSala(sala: string, dias = DIAS_SALA): Promise<string | null> {
  const secreto = secretoConfigurado()
  if (!secreto) return null
  return firmar({ rol: 'sala', sala, exp: Date.now() + dias * MS_POR_DIA }, secreto)
}

/**
 * EL PORTILLO DE EMERGENCIA, y no es un descuido.
 *
 * NO se abre "cuando no hay nadie" — se abre cuando NO QUEDA NADIE QUE PUEDA
 * DAR ACCESO: mientras el directorio no tenga ningún admin activo, la clave
 * de equipo sigue sirviendo y quien la teclea entra como admin (ver
 * `entrarConClave`, src/app/entrar/page.tsx). En cuanto hay al menos un admin
 * activo, deja de funcionar. No lo quites pensando que sobra: es el
 * extintor.
 *
 * Antes esto solo miraba si el directorio tenía ALGUNA fila (revisión del
 * coordinador a la ronda 9, tarea 3): cubría el primer día —directorio
 * vacío— pero no el incendio real que las propias guardas de
 * `src/app/personas/acciones.ts` dejan abierto a propósito (guarda 2: dos
 * peticiones simultáneas degradando cada una a un admin distinto, los dos
 * últimos, pueden ganar las dos — límite estructural del driver de Neon, que
 * no soporta transacciones ni bloquear filas). Con la condición vieja, ese
 * fallo era irrecuperable: el directorio ya no estaba vacío, así que ni
 * `/personas` ni la clave de equipo devolvían el acceso — solo SQL a mano.
 * Con `hayAlgunAdminActivo()`, el peor caso pasa a ser "entra con la clave de
 * equipo y te vuelves a poner admin".
 *
 * Separada de `entrarConClave` en su propia función exportada por una sola
 * razón: para poder probarla sin necesitar cookies ni un request de Next
 * vivo — solo lee `hayAlgunAdminActivo()` (una consulta), no escribe nada.
 */
export async function claveDeEquipoSigueSirviendo(): Promise<boolean> {
  return !(await hayAlgunAdminActivo())
}

// ---- Guardas para páginas y Server Actions ----
//
// El proxy ya filtra la mayoría del tráfico, pero es un chequeo optimista: la
// verificación que cuenta es esta, pegada al dato que se va a leer o escribir.
//
// La única vía es la de src/auth/roles.ts (exigirAdmin/exigirEditor/
// exigirLectura, y sus tres hermanas en boolean esAdmin/esEditor/esLector) —
// ver la cabecera de ese archivo para el porqué. `exigirEdicionDeAcuerdos`,
// aquí abajo, es la única excepción real: la excepción de acuerdos del
// director de una UDN, que roles.ts no modela porque no es un nivel dentro
// de equipo, es un permiso aparte sobre SU sala.

/* NO HAY YA UNA EXCEPCIÓN DE ACUERDOS PARA EL DIRECTOR DE UNA UDN.
 *
 * Vivían aquí `exigirEdicionDeAcuerdos(slug)` y `puedeEditarAcuerdosDe(slug)`,
 * la única grieta en "solo Marketing Corp escribe": el director podía mover el
 * estatus y la fecha de los compromisos de SU sala. Franco la cerró al ver lo
 * que ve alguien con el enlace de una sala compartido: *"si no estás logueado
 * solo puede ver la vista de solo lectura; por ende no tiene que verse el
 * botón añadir acuerdo, ni poder modificar fechas o estatus"*.
 *
 * Se RETIRAN en vez de dejarlas sin llamadores: una función de permisos que
 * concede más de lo que la política permite es exactamente lo que alguien
 * reconecta por error creyendo que es el gate correcto. Lo que queda es la vía
 * única de `src/auth/roles.ts` — `exigirEditor()` para escribir, `esEditor()`
 * para decidir si se ofrece el control. Si algún día vuelve la excepción, está
 * en git y su razón está escrita arriba.
 */

/** true si quien pide puede ver esta sala. */
export async function puedeVerEstaSala(slug: string): Promise<boolean> {
  return puedeVerSala(await sesionActual(), slug)
}
