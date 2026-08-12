import type { AcuerdoDeReunion } from '@/dominio/reunion'
import { fechaBreve } from '@/lib/fecha'
import estilos from './AcuerdosDeReunion.module.css'

interface Props {
  /**
   * Los acuerdos que nacieron en ESTA reunión — ya cosidos por
   * `reunionesDeSala` (`dominio/reunion.ts`) a partir de lo que arma
   * `estadoDeSalaDB` (`src/db/consultas.ts`, tarea 10). Este componente no
   * agrupa ni consulta nada: recibe `Reunion.acuerdos` tal cual y lo pinta.
   */
  acuerdos: AcuerdoDeReunion[]
}

/**
 * El tono de `.pildora` (sistema.css) para cada estatus — mismo criterio que
 * `TablaAcuerdos.tsx`/`src/app/cliente/[slug]/page.tsx`: neutro (sin tono)
 * para "abierto", que no es ni bueno ni malo todavía.
 */
const TONO_ESTATUS: Partial<Record<AcuerdoDeReunion['estatus'], string>> = {
  cumplido: 'bien',
  vencido: 'mal',
}

/**
 * "por definir", no "sin fecha": hereda el vocabulario de la lista de
 * acuerdos de la sala (`src/app/cliente/[slug]/page.tsx`, `textoFechaAcuerdo`
 * — el mismo texto que ya usa el tipo `Acuerdo`, `dominio/salas.ts`:
 * `fechaCompromiso: string | null // ISO, o null = "por definir"`). "sin
 * fecha" es el rótulo de otra pantalla (la bandeja de Monday) — no el de
 * aquí.
 */
function textoFecha(fechaCompromiso: string | null): string {
  return fechaCompromiso ? fechaBreve(fechaCompromiso) : 'por definir'
}

/**
 * LOS ACUERDOS DE UNA REUNIÓN, DESPLEGABLES (ronda 10, tarea 10).
 *
 * Franco, sobre el módulo de reuniones de una sala: "la minuta con un link a
 * ver los acuerdos de esa reu, se puede desplegar ahí mismo". Cada reunión ya
 * lleva sus acuerdos cosidos (`Reunion.acuerdos`, tarea 7) — este componente
 * solo los pinta, sin salir de la fila.
 *
 * `<details>`/`<summary>` NATIVOS, no un acordeón hecho a mano con
 * `useState`: el navegador ya da el teclado (Enter/Espacio sobre el
 * `<summary>` con foco) y el anuncio a lectores de pantalla (el estado
 * expandido/colapsado es nativo de `HTMLDetailsElement`) — reimplementarlo
 * sería más código y peor accesibilidad.
 *
 * CERRADOS INCLUIDOS, CON SU ESTADO DE HOY: un acuerdo ya `cumplido` no se
 * esconde —que se haya cumplido es parte de lo que la UDN quiere ver de esa
 * junta— y el estatus que se pinta es el que YA TRAE `acuerdos` (calculado
 * con `estatusEfectivo` en `estadoDeSalaDB`, src/db/consultas.ts): un acuerdo
 * que nació en julio y hoy está vencido llega aquí ya `vencido`. Este
 * componente NO recalcula nada — solo pinta lo que le llega.
 *
 * SIN ACUERDOS, SIN DESPLEGABLE: "0 acuerdos" no es un dato, es ruido — una
 * reunión sin nada que mostrar no ofrece un desplegable vacío para abrir.
 */
export function AcuerdosDeReunion({ acuerdos }: Props) {
  if (acuerdos.length === 0) return null

  const resumen = `${acuerdos.length} ${acuerdos.length === 1 ? 'acuerdo' : 'acuerdos'}`

  return (
    <details className={estilos.desplegable}>
      <summary className={estilos.resumen}>{resumen}</summary>
      <ul className={estilos.lista}>
        {acuerdos.map((a) => (
          <li key={a.id} className={estilos.fila}>
            <span className={estilos.que}>{a.que}</span>
            {/* LA META Y EL ESTATUS, JUNTOS Y EN UNA SOLA CAJA.
                Franco: *"cuando los acuerdos son un poco extensos se rompe el
                diseño"*. Eran TRES hijos de un flex con `space-between` y
                `wrap`: en cuanto el texto ocupaba la línea entera, el
                responsable y la píldora caían por separado y `space-between`
                los mandaba a extremos opuestos —o dejaba "abierto" solo en su
                propia línea, sangrado—. Agrupados, la fila solo puede partirse
                por un sitio, y siempre por el mismo. */}
            <span className={estilos.derecha}>
            <span className={estilos.meta}>
              {/* "por asignar" es el valor de base cuando nadie eligió responsable
                  todavía (ver SelectorResponsable.tsx) — mismo criterio de lectura
                  que src/app/cliente/[slug]/page.tsx: se lee "sin dueño", no el
                  literal interno. */}
              <span>{a.responsable === 'por asignar' ? 'sin dueño' : a.responsable}</span>
              <span className={estilos.punto} aria-hidden>·</span>
              <span className={a.estatus === 'vencido' ? estilos.fechaVencida : undefined}>
                {textoFecha(a.fechaCompromiso)}
              </span>
            </span>
            <span className="pildora" data-tono={TONO_ESTATUS[a.estatus]}>
              {a.estatus}
            </span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
