'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Reunion } from '@/dominio/salas'
import { fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import { CopiarBoton } from './CopiarBoton'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LAS REUNIONES DE UNA SALA: lo que se presentó y lo que se acordó, juntos.
 *
 * Franco: "el módulo Presentaciones y minutas creo que debe ser uno, así la
 * presentación está asociada a una minuta, es decir a una reunión".
 *
 * Antes eran dos secciones paralelas, cada una ordenada por su cuenta. Para
 * saber qué se acordó en la presentación de mayo había que buscar mayo dos
 * veces y confiar en que las dos listas hablaban del mismo día. Ahora cada
 * reunión es una fila con sus dos caras, y lo que le falta se ve sin buscar:
 * una reunión presentada y sin minuta lo dice en su propia fila.
 *
 * La minuta se lee AQUÍ, en un `<dialog>` de verdad: el navegador ya atrapa el
 * foco dentro, cierra con Escape, deja inerte lo de detrás y lo anuncia a un
 * lector de pantalla. Reimplementar eso a mano es como se fabrican las trampas
 * de teclado.
 */

interface Props {
  reuniones: Reunion[]
  /** El equipo puede corregir la minuta; el director solo la lee. */
  equipo: boolean
}

export function ReunionesSala({ reuniones, equipo }: Props) {
  const [abierta, setAbierta] = useState<Reunion | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  // `showModal()` es lo que da el modo modal. Un `<dialog open>` declarativo
  // NO es modal: sale en el flujo y el resto sigue siendo tabulable por detrás.
  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierta && !nodo.open) nodo.showModal()
    if (!abierta && nodo.open) nodo.close()
  }, [abierta])

  if (reuniones.length === 0) {
    return (
      <p className={estilos.vacioNota}>
        Todavía no se ha dado ninguna reunión con este cliente. La primera nace al preparar una
        presentación; su minuta se levanta al terminarla.
      </p>
    )
  }

  const [ultima, ...anteriores] = reuniones
  const minutaDe = (r: Reunion) => r.minuta

  return (
    <>
      <div className={estilos.reunionDestacada}>
        <div className={estilos.reunionCabecera}>
          <div>
            <div className={estilos.presTag}>La última</div>
            <h3 className={estilos.presTitulo}>{ultima.titulo}</h3>
            <div className={estilos.presFecha}>{fechaCompleta(ultima.fecha)}</div>
          </div>
        </div>
        <Caras reunion={ultima} onLeerMinuta={() => setAbierta(ultima)} />
      </div>

      {anteriores.length > 0 && (
        <div className={estilos.reuniones}>
          {anteriores.map((r) => (
            <div key={r.sesionId ?? r.fecha} className={estilos.reunionFila}>
              <div className={estilos.reunionFilaTexto}>
                <span className={estilos.presFilaTitulo}>{r.titulo}</span>
                <span className={estilos.presFilaFecha}>{fechaBreveConAnio(r.fecha)}</span>
              </div>
              <Caras reunion={r} onLeerMinuta={() => setAbierta(r)} compacta />
            </div>
          ))}
        </div>
      )}

      <dialog
        ref={dialogo}
        className={estilos.lightbox}
        aria-label={abierta ? `Minuta · ${abierta.titulo}` : 'Minuta'}
        // El backdrop cierra, pero solo si el clic cayó EN el backdrop: un
        // `<dialog>` recibe los clics de su contenido, así que sin comprobar el
        // destino se cierra al soltar el ratón dentro del propio texto.
        onClick={(e) => {
          if (e.target === dialogo.current) setAbierta(null)
        }}
        onClose={() => setAbierta(null)}
      >
        {abierta && minutaDe(abierta) && (
          <div className={estilos.lightboxCaja}>
            <header className={estilos.lightboxCabecera}>
              <div>
                <h3 className={estilos.lightboxTitulo}>{minutaDe(abierta)!.titulo}</h3>
                <div className={estilos.lightboxFecha}>
                  {fechaCompleta(minutaDe(abierta)!.fecha)} · {textoEnvio(minutaDe(abierta)!.enviadaA)}
                </div>
              </div>
              <button
                type="button"
                className={estilos.lightboxCerrar}
                onClick={() => setAbierta(null)}
                aria-label="Cerrar la minuta"
              >
                ✕
              </button>
            </header>

            {minutaDe(abierta)!.texto ? (
              <div className={estilos.lightboxTexto}>{minutaDe(abierta)!.texto}</div>
            ) : (
              <p className={estilos.lightboxVacio}>
                Esta minuta no tiene texto guardado. Se generó antes de que la sala pudiera
                mostrarlas, o se publicó sin cuerpo.
              </p>
            )}

            <footer className={estilos.lightboxPie}>
              {minutaDe(abierta)!.texto && (
                <CopiarBoton texto={minutaDe(abierta)!.texto!} className={estilos.lightboxBoton} />
              )}
              {/* Desde la minuta se llega al documento de SU reunión: es la
                  pregunta que sigue a leer un acuerdo — "¿qué se presentó?". */}
              {abierta.presentacion?.sesionId && (
                <Link href={`/reunion/${abierta.presentacion.sesionId}`} className={estilos.lightboxEnlace}>
                  Ver la presentación →
                </Link>
              )}
              {equipo && abierta.sesionId && (
                <Link href={`/deck/${abierta.sesionId}/minuta`} className={estilos.lightboxEnlace}>
                  Corregir el texto →
                </Link>
              )}
            </footer>
          </div>
        )}
      </dialog>
    </>
  )
}

/**
 * Las dos caras de una reunión, y lo que le falta.
 *
 * Que falte se DICE, no se omite: una reunión presentada sin minuta es
 * trabajo pendiente, y una fila que simplemente no enseña el botón de minuta
 * no se distingue de una que sí la tiene.
 */
function Caras({
  reunion,
  onLeerMinuta,
  compacta,
}: {
  reunion: Reunion
  onLeerMinuta: () => void
  compacta?: boolean
}) {
  const idDoc = reunion.presentacion?.sesionId
  return (
    <div className={compacta ? estilos.carasCompactas : estilos.caras}>
      {idDoc ? (
        <Link href={`/reunion/${idDoc}`} className={estilos.cara}>
          <span aria-hidden>▤</span> Presentación
        </Link>
      ) : (
        <span className={estilos.caraAusente}>Sin presentación</span>
      )}

      {reunion.minuta ? (
        <button type="button" className={estilos.cara} onClick={onLeerMinuta}>
          <span aria-hidden>✎</span> Minuta
        </button>
      ) : (
        <span className={estilos.caraPendiente}>Falta la minuta</span>
      )}
    </div>
  )
}

/** "enviada a 0" es la forma más fría de decir que no se ha mandado. */
function textoEnvio(cuantos: number): string {
  if (cuantos === 0) return 'sin enviar'
  return `enviada a ${cuantos}`
}
