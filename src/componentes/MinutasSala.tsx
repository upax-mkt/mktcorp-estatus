'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Minuta } from '@/dominio/salas'
import { fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import { CopiarBoton } from './CopiarBoton'
import estilos from '@/app/sala/sala.module.css'

/**
 * Las minutas de una sala: la última destacada, las anteriores en lista, y
 * cualquiera se abre EN LA MISMA PÁGINA, en una ventana flotante.
 *
 * Antes cada fila llevaba a `/preparar/{id}/minuta`, que es la pantalla de
 * edición del equipo: al director al que se le comparte su sala el proxy se la
 * cierra, así que su lista de minutas no llevaba a ninguna parte. Y para el
 * equipo era peor que inútil — perdía la sala para leer un texto de veinte
 * líneas y tenía que volver.
 *
 * Es un `<dialog>` de verdad, no un div con `position: fixed`: el navegador ya
 * atrapa el foco dentro, cierra con Escape, deja inerte lo de detrás y anuncia
 * el diálogo a un lector de pantalla. Reimplementar eso a mano es como se
 * fabrican las trampas de teclado.
 */

interface Props {
  minutas: Minuta[]
  /** El equipo puede corregirlas; el director solo las lee. */
  equipo: boolean
}

export function MinutasSala({ minutas, equipo }: Props) {
  const [abierta, setAbierta] = useState<Minuta | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  // `showModal()` es lo que da el modo modal —foco atrapado, fondo inerte—.
  // Un `<dialog open>` declarativo NO es modal: sale en el flujo y el resto de
  // la página sigue siendo tabulable por detrás.
  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierta && !nodo.open) nodo.showModal()
    if (!abierta && nodo.open) nodo.close()
  }, [abierta])

  if (minutas.length === 0) {
    return <p className={estilos.vacioNota}>Todavía no hay minutas en esta sala.</p>
  }

  const [ultima, ...anteriores] = minutas

  return (
    <>
      <button type="button" className={estilos.minutaDestacada} onClick={() => setAbierta(ultima)}>
        <div>
          <div className={estilos.presTag}>La última</div>
          <h3 className={estilos.presTitulo}>{ultima.titulo}</h3>
          <div className={estilos.presFecha}>
            {fechaCompleta(ultima.fecha)} · {textoEnvio(ultima.enviadaA)}
          </div>
        </div>
        <span className={estilos.presVer}>Leer minuta →</span>
      </button>

      {anteriores.length > 0 && (
        <div className={estilos.minutas}>
          {anteriores.map((m) => (
            <button
              key={m.sesionId ?? m.fecha}
              type="button"
              className={estilos.minuta}
              onClick={() => setAbierta(m)}
            >
              <span className={estilos.minutaIzq}>
                <span className={estilos.minutaIcono} aria-hidden>▤</span>
                <span>{m.titulo}</span>
              </span>
              <span className={estilos.minutaEnviada}>
                {fechaBreveConAnio(m.fecha)} · {textoEnvio(m.enviadaA)}
              </span>
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialogo}
        className={estilos.lightbox}
        aria-label={abierta ? `Minuta · ${abierta.titulo}` : 'Minuta'}
        // El backdrop cierra, pero solo si el clic cayó EN el backdrop: un
        // `<dialog>` recibe los clics de su contenido, así que sin comprobar
        // el destino se cierra al soltar el ratón dentro del propio texto.
        onClick={(e) => {
          if (e.target === dialogo.current) setAbierta(null)
        }}
        onClose={() => setAbierta(null)}
      >
        {abierta && (
          <div className={estilos.lightboxCaja}>
            <header className={estilos.lightboxCabecera}>
              <div>
                <h3 className={estilos.lightboxTitulo}>{abierta.titulo}</h3>
                <div className={estilos.lightboxFecha}>
                  {fechaCompleta(abierta.fecha)} · {textoEnvio(abierta.enviadaA)}
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

            {abierta.texto ? (
              <div className={estilos.lightboxTexto}>{abierta.texto}</div>
            ) : (
              <p className={estilos.lightboxVacio}>
                Esta minuta no tiene texto guardado. Se generó antes de que la sala pudiera
                mostrarlas, o se publicó sin cuerpo.
              </p>
            )}

            <footer className={estilos.lightboxPie}>
              {abierta.texto && <CopiarBoton texto={abierta.texto} className={estilos.lightboxBoton} />}
              {equipo && abierta.sesionId && (
                <Link href={`/preparar/${abierta.sesionId}/minuta`} className={estilos.lightboxEnlace}>
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

/** "enviada a 0" es la forma más fría de decir que no se ha mandado. */
function textoEnvio(cuantos: number): string {
  if (cuantos === 0) return 'sin enviar'
  return `enviada a ${cuantos}`
}
