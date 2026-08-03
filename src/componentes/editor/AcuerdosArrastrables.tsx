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
   * Si esta sesión tiene una sección de Acuerdos y Pendientes donde
   * aterrizar un acuerdo retomado (`itemDeAcuerdosPendientes`,
   * src/db/sesiones.ts) — revisión final de la rama, punto 5.
   *
   * Las plantillas «en blanco» y «comité» (`src/secciones/plantillas.ts`) no
   * traen esa sección, y sin este dato el panel se pintaba igual, arrastre y
   * botón «Añadir» incluidos: al soltar o pulsar, `anadirAcuerdoRetomado`
   * (src/db/sesiones.ts) LANZA —"Esta sesión no tiene una sección de
   * Acuerdos y Pendientes..."— y como `retomar()`, más abajo, solo hacía
   * `console.error`, quien pulsaba el botón no veía nada: ni el acuerdo se
   * movía ni había ningún aviso. `false` cambia lo que se pinta: un vacío
   * que lo explica, en vez de una lista que promete algo que no puede
   * cumplir.
   */
  hayDestino: boolean
  /**
   * Retoma un acuerdo en esta sesión. Solo lo llama el botón «Añadir» de
   * aquí — el arrastre lo dispara `ZonaSoltarAcuerdo` (en la tarjeta de
   * Acuerdos y Pendientes), no esta lista: esta lista es la FUENTE
   * (`draggable`, pone el id en `dataTransfer`), no el destino. Las dos vías
   * llaman a la misma acción del servidor, así que el resultado es idéntico
   * venga de donde venga.
   *
   * NO DUPLICA EL ACUERDO, y eso va contra la letra de lo que pidió Franco
   * ("poder arrastrarlos a la nueva presentación"). Copiar su contenido a un
   * acuerdo aparte daría dos compromisos donde hay uno: el original seguiría
   * colgando de la sala sin que cerrar el nuevo lo cerrara a él, y viceversa.
   * El acuerdo es el MISMO — sigue siendo de la sala — y lo único que esta
   * llamada registra es una REFERENCIA: que ESTA sesión lo retoma (ver
   * `anadirAcuerdoRetomado`, src/db/sesiones.ts, que la sección de Acuerdos y
   * Pendientes resuelve en cada lectura, nunca copia). Si algún día parece
   * que "falta la copia", es este comentario el que hay que releer, no el
   * código el que hay que "arreglar".
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

export function AcuerdosArrastrables({ acuerdos, alArrastrar, hayDestino }: Props) {
  const [enCurso, setEnCurso] = useState<string | null>(null)
  // Revisión final de la rama, punto 5: antes el único rastro de un fallo al
  // retomar era `console.error` — el botón «Añadir» se quedaba tal cual, sin
  // decir nada, y quien lo pulsó no tenía forma de saber que no pasó nada.
  const [error, setError] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  function retomar(acuerdoId: string) {
    setEnCurso(acuerdoId)
    setError(null)
    empezarTransicion(async () => {
      try {
        await alArrastrar(acuerdoId)
      } catch (error_) {
        // El rastro en consola se conserva (útil para depurar), pero ya no es
        // el ÚNICO: el mensaje real de `anadirAcuerdoRetomado` (o el que sea)
        // llega también a la pantalla — si no revalidó la lista es porque
        // falló antes de llegar, así que el acuerdo se sigue ofreciendo y se
        // puede reintentar.
        console.error(`[AcuerdosArrastrables] no se pudo retomar "${acuerdoId}":`, error_)
        setError(error_ instanceof Error ? error_.message : 'No se pudo añadir el acuerdo.')
      } finally {
        setEnCurso(null)
      }
    })
  }

  return (
    <aside className={estilos.panel} aria-label="Acuerdos abiertos de la sala">
      <p className={estilos.titulo}>Acuerdos abiertos de la sala</p>

      {!hayDestino ? (
        // NO SE PINTA EL PANEL ARRASTRABLE (revisión final de la rama, punto
        // 5): esta plantilla no tiene dónde aterrizar un acuerdo retomado —
        // ofrecer arrastre y botón «Añadir» aquí sería prometer algo que
        // `anadirAcuerdoRetomado` siempre va a rechazar. Un vacío que lo
        // explica, en vez de una lista muda que falla en silencio.
        <p className={estilos.vacio}>
          Esta reunión no tiene una sección de Acuerdos y Pendientes, así que los acuerdos abiertos
          de la sala no se pueden retomar aquí.
        </p>
      ) : acuerdos.length === 0 ? (
        <p className={estilos.vacio}>No hay acuerdos abiertos que retomar.</p>
      ) : (
        <>
          <p className={estilos.pista}>Arrástralos a la sesión, o añádelos con el botón.</p>
          {error && (
            <p className={estilos.error} role="alert">
              {error}
            </p>
          )}
          <ul className={estilos.lista}>
            {ordenados(acuerdos).map((acuerdo) => (
              <li
                key={acuerdo.id}
                className={estilos.fila}
                draggable
                data-pendiente={enCurso === acuerdo.id ? 'true' : undefined}
                /**
                 * Solo pone el id en el portapapeles del arrastre. Quien
                 * DECIDE si el gesto contó es `ZonaSoltarAcuerdo` —la sección
                 * de Acuerdos y Pendientes—, en su `onDrop`: sin un destino
                 * real que acepte el `drop`, el navegador trata soltar en
                 * cualquier otro sitio como cancelado y aquí no pasa nada.
                 * Antes esta tarjeta llamaba a `alArrastrar` en su propio
                 * `onDragEnd`, sin comprobar destino — así que arrastrar y
                 * arrepentirse a media pantalla igual lo retomaba. Ya no.
                 */
                onDragStart={(evento) => {
                  evento.dataTransfer.setData('text/plain', acuerdo.id)
                  evento.dataTransfer.effectAllowed = 'copy'
                }}
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
