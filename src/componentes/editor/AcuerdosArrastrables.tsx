'use client'

import { useState, useTransition } from 'react'
import { fechaBreve } from '@/lib/fecha'
import estilos from './acuerdos-arrastrables.module.css'

/**
 * Lo que este componente necesita de un `Acuerdo` (`@/db/consultas`) para
 * ofrecerlo como arrastrable: un shape propio, más angosto, con `estatus`
 * en `string` y no en el union cerrado `EstatusAcuerdo` — aquí solo se
 * compara contra `'vencido'`, así que no hace falta el tipo completo del
 * dominio. Cualquier `Acuerdo` real encaja aquí sin conversión: es
 * estructuralmente el mismo dato, con menos exigencia.
 */
export interface AcuerdoArrastrable {
  id: string
  que: string
  responsable: string
  fechaCompromiso: string | null
  estatus: string
}

interface Props {
  /** Los acuerdos ABIERTOS de la sala que todavía no se han retomado en esta sesión. */
  acuerdos: AcuerdoArrastrable[]
  /**
   * Retoma un acuerdo en esta sesión — por arrastre o por el botón «Añadir»,
   * las dos vías llaman a lo mismo.
   *
   * NO DUPLICA EL ACUERDO, y eso va contra la letra de lo que pidió Franco
   * ("poder arrastrarlos a la nueva presentación"). Copiar su contenido a un
   * acuerdo aparte daría dos compromisos donde hay uno: el original seguiría
   * colgando de la sala sin que cerrar el nuevo lo cerrara a él, y viceversa.
   * El acuerdo es el MISMO — sigue siendo de la sala — y lo único que esta
   * llamada registra es que ESTA sesión lo retoma (ver `retomarAcuerdo`,
   * src/db/acuerdos.ts, y `acuerdosArrastrablesDe`, src/db/consultas.ts, que
   * es quien deja de ofrecerlo una vez retomado). Si algún día parece que
   * "falta la copia", es este comentario el que hay que releer, no el código
   * el que hay que "arreglar".
   */
  alArrastrar: (acuerdoId: string) => void | Promise<void>
}

/**
 * Los vencidos primero: son los que hay que retomar (spec §4). Orden
 * estable — entre dos con el mismo estatus, se respeta el que ya traían.
 */
function ordenados(acuerdos: AcuerdoArrastrable[]): AcuerdoArrastrable[] {
  return [...acuerdos].sort((a, b) => (a.estatus === 'vencido' ? 0 : 1) - (b.estatus === 'vencido' ? 0 : 1))
}

export function AcuerdosArrastrables({ acuerdos, alArrastrar }: Props) {
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  function retomar(acuerdoId: string) {
    setEnCurso(acuerdoId)
    empezarTransicion(async () => {
      try {
        await alArrastrar(acuerdoId)
      } catch (error) {
        // No hay nada más que hacer aquí: si `alArrastrar` no revalida la
        // lista (falló antes de llegar), el acuerdo simplemente se sigue
        // ofreciendo y se puede reintentar. Que quede rastro en la consola
        // es mejor que tragarse el error en silencio.
        console.error(`[AcuerdosArrastrables] no se pudo retomar "${acuerdoId}":`, error)
      } finally {
        setEnCurso(null)
      }
    })
  }

  return (
    <aside className={estilos.panel} aria-label="Acuerdos abiertos de la sala">
      <p className={estilos.titulo}>Acuerdos abiertos de la sala</p>

      {acuerdos.length === 0 ? (
        <p className={estilos.vacio}>No hay acuerdos abiertos que retomar.</p>
      ) : (
        <>
          <p className={estilos.pista}>Arrástralos a la sesión, o añádelos con el botón.</p>
          <ul className={estilos.lista}>
            {ordenados(acuerdos).map((acuerdo) => (
              <li
                key={acuerdo.id}
                className={estilos.fila}
                draggable
                data-pendiente={enCurso === acuerdo.id ? 'true' : undefined}
                onDragStart={(evento) => {
                  evento.dataTransfer.setData('text/plain', acuerdo.id)
                  evento.dataTransfer.effectAllowed = 'copy'
                }}
                /**
                 * El arrastre nativo (HTML5, no dnd-kit) no tiene ningún otro
                 * elemento en esta pantalla que registre un `drop`, así que
                 * `dataTransfer.dropEffect` nunca reportaría un destino
                 * válido aunque el gesto fuera exactamente el que se pidió.
                 * Soltar la tarjeta —en cualquier parte, tras haberla
                 * levantado— se lee como la misma intención que pulsar
                 * «Añadir»: el botón es la vía que SIEMPRE funciona (la
                 * accesible, la que no depende del ratón); esto es el atajo
                 * para quien ya la levantó.
                 */
                onDragEnd={() => retomar(acuerdo.id)}
              >
                <div className={estilos.encabezado}>
                  <span className={estilos.asa} aria-hidden="true">⠿</span>
                  <p className={estilos.que}>{acuerdo.que}</p>
                </div>
                <p className={estilos.meta}>
                  <span>{acuerdo.responsable}</span>
                  <span className={estilos.punto} aria-hidden="true">·</span>
                  <span>{acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}</span>
                  {acuerdo.estatus === 'vencido' && (
                    <>
                      <span className={estilos.punto} aria-hidden="true">·</span>
                      <span className={estilos.vencido}>Vencido</span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  className={estilos.botonAnadir}
                  disabled={enCurso === acuerdo.id}
                  onClick={() => retomar(acuerdo.id)}
                  aria-label={`Añadir «${acuerdo.que}» a esta sesión`}
                >
                  Añadir
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
