import Link from 'next/link'
import Image from 'next/image'
import estilos from './BarraNavegacion.module.css'
import { fechaLarga } from '@/lib/fecha'

/**
 * LA BARRA, siempre disponible en cualquier módulo (ronda 11, tarea 2).
 *
 * Franco: "el menú de pestañas debería estar siempre disponible en
 * cualquier módulo, utiliza buenas prácticas de ux/ui para lograrlo."
 *
 * ANTES DE ESTA TAREA, la barra completa solo vivía en el Home
 * (`src/app/page.tsx`) — 5 enlaces, `admin &&`, fecha y Salir. `/reuniones`
 * tenía su PROPIA copia, ya divergida (solo "← Meeting Hub" + Presentaciones,
 * sin Reuniones/Acuerdos/Clientes/Personas/Salir) y el resto de pantallas
 * —`/deck`, `/deck/nueva`, `/deck/[id]`, `/acuerdos`, `/salas`, `/personas`—
 * no tenían ninguna: la única salida de un módulo era su "← volver" local o
 * el logo. Extraer aquí es exactamente para que dejen de poder divergir:
 * hay un solo sitio donde se define el orden, el gate de admin y el resto.
 *
 * FUENTE: el Home, tomado como el original completo — los comentarios de
 * cada enlace, más abajo, son LOS MISMOS que traía su barra, sin reescribir
 * por qué está cada uno donde está.
 *
 * SABER LA RUTA ACTIVA SIN CONVERTIR NADA A CLIENT COMPONENT: este NO es un
 * layout compartido que envuelva a las siete pantallas sin saber cuál de
 * ellas está activa (el caso que `usePathname`/`useSelectedLayoutSegment`
 * resuelven en la guía de Next, `node_modules/next/dist/docs/01-app/
 * 01-getting-started/03-layouts-and-pages.md`, sección "Active Nav Links" —
 * las dos son hooks de Client Component, para un componente que no sabe qué
 * página lo está usando). Aquí cada `page.tsx` YA SABE su propia ruta —es
 * literalmente el archivo de esa ruta— así que la pasa como dato
 * (`seccionActiva`), igual que ya pasa `hoy` o `admin`. Sigue siendo un
 * Server Component: cero JS de cliente para pintar la pestaña correcta.
 *
 * `admin &&` en Clientes y Personas: ESCONDER EL ENLACE NO PROTEGE LA
 * PÁGINA. `/salas` y `/personas` exigen `exigirAdmin()` por dentro — eso es
 * lo que protege de verdad (ver la cabecera de esas pantallas). Este gate es
 * cosmético a propósito: un editor o viewer que hace clic y rebota al login
 * sin explicación es una interfaz que promete algo que no puede cumplir.
 *
 * LOS DIRECTORES DE UDN (sesión `rol: 'sala'`) NUNCA MONTAN ESTE COMPONENTE:
 * `puedeVerRuta` (`src/auth/politica.ts`) es lista blanca estricta y ninguna
 * de las siete rutas de equipo está en ella —confirmado en
 * `src/auth/politica.test.ts` ("un acceso de sala no entra al hub ni a la
 * preparación ni al motor", "un acceso de sala no entra al espacio de
 * acuerdos ni a su bandeja", "un acceso de sala tampoco [a /salas ni
 * /personas]")—, así que `src/proxy.ts` lo redirige a `/cliente/<su-sala>`
 * ANTES de que Next llegue a renderizar el Server Component de la página, y
 * con él, esta barra. No hace falta (ni tendría sentido) esconder algo aquí
 * dentro para un rol que jamás pinta este árbol.
 */

/** Las cinco pestañas del ciclo — mismo orden que la barra siempre tuvo. */
export type SeccionBarra = 'reuniones' | 'deck' | 'acuerdos' | 'salas' | 'personas'

export interface BarraNavegacionProps {
  /**
   * La sección de ESTA pantalla, para marcarla con `aria-current="page"`.
   * `undefined` en el Home: ninguna de las cinco pestañas es "/" — a él se
   * llega por el logo, no por el ciclo.
   */
  seccionActiva?: SeccionBarra
  /** Se pinta con `fechaLarga` (`src/lib/fecha.ts`), anclada a America/Mexico_City. */
  hoy: Date
  /** Si quien mira administra Marketing Corporativo — condiciona Clientes y Personas. */
  admin: boolean
  /** Server Action de cada página: `cerrarSesion()` + `redirect('/entrar')`. */
  salirAction: () => Promise<void>
}

export function BarraNavegacion({ seccionActiva, hoy, admin, salirAction }: BarraNavegacionProps) {
  return (
    <header className={estilos.barra}>
      <Link href="/" className={estilos.marca}>
        <Image
          src="/logos/marketing-corp-blanco.png"
          alt="Marketing Corp"
          width={140}
          height={33}
          className={estilos.marcaLogo}
          priority
        />
      </Link>
      <nav className={estilos.barraDcha} aria-label="Secciones de Marketing Corp">
        {/* EL ORDEN (tarea 18, ronda 10) sigue el ciclo de trabajo real
            —agendar → preparar → dar → minutar → seguir acuerdos—,
            confirmado por Franco: Reuniones, Presentaciones, Acuerdos;
            Clientes y Personas van al final porque son configuración, no
            trabajo diario (y a un cliente se llega desde el Home, no desde
            esta barra). Antes empezaba por Acuerdos, que es el ÚLTIMO paso
            del ciclo. Confirmado de nuevo para esta ronda (11, tarea 2): el
            mismo orden, ahora en el único sitio que lo define. */}
        {/* → /reuniones, no /agenda (tarea 14): la tarea 13 la absorbe
            — /agenda queda como redirección, y apuntar la barra a la
            redirección es un salto extra que no aporta nada. Si al
            desplegar /reuniones todavía no existiera, sigue resolviendo
            vía esa redirección. */}
        <Link
          href="/reuniones"
          className={estilos.barraLink}
          aria-current={seccionActiva === 'reuniones' ? 'page' : undefined}
        >
          Reuniones
        </Link>
        {/* Deck Designer → Presentaciones (tarea 18): solo el nombre
            visible: la ruta sigue siendo /deck — hay enlaces compartidos y
            esto no es una migración de URLs. */}
        <Link
          href="/deck"
          className={estilos.barraLink}
          aria-current={seccionActiva === 'deck' ? 'page' : undefined}
        >
          Presentaciones
        </Link>
        {/* Enlace FIJO (revisión final de la ronda 7, punto 5): antes la
            única puerta a /acuerdos vivía dentro del vacío "Nada destacado
            todavía" de ModuloAcuerdos — en cuanto alguien destacaba un
            acuerdo, ese vacío dejaba de pintarse y con él la única entrada
            a media rama de esta ronda. Aquí no depende de que algo esté
            vacío o lleno. */}
        <Link
          href="/acuerdos"
          className={estilos.barraLink}
          aria-current={seccionActiva === 'acuerdos' ? 'page' : undefined}
        >
          Acuerdos
        </Link>
        {/* /salas y /personas son las dos únicas secciones solo-admin
            (`SECCIONES_SOLO_ADMIN`, src/auth/politica.ts) — las dos con el
            mismo gate aquí (revisión del coordinador a la tarea 3): las dos
            pantallas ya exigen `exigirAdmin()` por dentro, así que esto no
            es la protección real, pero un editor o viewer que hace clic y
            rebota al login sin explicación es una interfaz que promete algo
            que no puede cumplir. Salas → Clientes (tarea 18): mismo
            criterio de solo-nombre que Presentaciones, arriba. */}
        {admin && (
          <Link
            href="/salas"
            className={estilos.barraLink}
            aria-current={seccionActiva === 'salas' ? 'page' : undefined}
          >
            Clientes
          </Link>
        )}
        {admin && (
          <Link
            href="/personas"
            className={estilos.barraLink}
            aria-current={seccionActiva === 'personas' ? 'page' : undefined}
          >
            Personas
          </Link>
        )}
        <span className={estilos.barraFecha}>{fechaLarga(hoy)}</span>
        <form action={salirAction}>
          <button type="submit" className={estilos.barraSalir}>Salir</button>
        </form>
      </nav>
    </header>
  )
}
