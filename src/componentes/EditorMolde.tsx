'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MOLDE_POR_DEFECTO, loQueFaltaAlMolde, type MoldeMinuta } from '@/minuta/molde'
import estilos from './molde.module.css'

/**
 * EDITAR EL MOLDE DE LA MINUTA.
 *
 * Franco: "el módulo minutas debería tener un editor del template del tipo de
 * minuta".
 *
 * El molde estaba incrustado en el código —saludo, objetivo, temas, tabla,
 * próximos pasos— y es el correcto para el estatus de una UDN. No lo es para
 * un comité, donde lo que importa es qué se aprobó, ni para un arranque de
 * campaña. Cambiarlo obligaba a tocar código.
 *
 * DOS COSAS DISTINTAS, y separarlas es lo que hace el editor entendible:
 *
 * - El **título** es lo que se lee en el correo.
 * - La **guía** es lo que se le pide al modelo que ponga ahí. No se lee: se
 *   nota. Una guía vaga ("lo que pasó") produce relleno; una concreta ("los
 *   temas que se trataron, uno por línea, con lo que se concluyó") produce
 *   una minuta que se puede reenviar sin retocar.
 *
 * La TABLA DE ACUERDOS no se redacta, se COLOCA. Se arma con los compromisos
 * que se van a publicar en la sala, con su dueño y su fecha; dejar que el
 * modelo la escribiera libre sería dejarle inventar compromisos. Por eso su
 * bloque solo se marca.
 */

interface Props {
  molde: MoldeMinuta
  /** De qué sala es el molde. Nulo = el general, el que usan todas. */
  salaNombre?: string
  guardarAction: (molde: MoldeMinuta) => Promise<{ error?: string }>
}

export function EditorMolde({ molde: inicial, salaNombre, guardarAction }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [molde, setMolde] = useState<MoldeMinuta>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [pendiente, empezar] = useTransition()
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const n = dialogo.current
    if (!n) return
    if (abierto && !n.open) n.showModal()
    if (!abierto && n.open) n.close()
  }, [abierto])

  const faltas = loQueFaltaAlMolde(molde)

  function cambiarBloque(i: number, parcial: Partial<MoldeMinuta['bloques'][number]>) {
    setGuardado(false)
    setMolde((m) => ({ ...m, bloques: m.bloques.map((b, j) => (j === i ? { ...b, ...parcial } : b)) }))
  }

  /** Marcar dónde va la tabla DESMARCA el resto: dos tablas iguales no ayudan. */
  function ponerTabla(i: number) {
    setGuardado(false)
    setMolde((m) => ({ ...m, bloques: m.bloques.map((b, j) => ({ ...b, conTabla: j === i })) }))
  }

  function mover(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= molde.bloques.length) return
    setGuardado(false)
    setMolde((m) => {
      const b = [...m.bloques]
      ;[b[i], b[j]] = [b[j], b[i]]
      return { ...m, bloques: b }
    })
  }

  function guardar() {
    setError(null)
    empezar(async () => {
      const r = await guardarAction(molde)
      if (r.error) {
        setError(r.error)
        return
      }
      setGuardado(true)
    })
  }

  return (
    <>
      <button type="button" className="boton" data-tono="fantasma" onClick={() => setAbierto(true)}>
        Editar el molde de la minuta
      </button>

      <dialog
        ref={dialogo}
        className={estilos.dialogo}
        aria-label="Molde de la minuta"
        onClick={(e) => { if (e.target === dialogo.current) setAbierto(false) }}
        onClose={() => setAbierto(false)}
      >
        <div className={estilos.caja}>
          <header className={estilos.cabecera}>
            <div>
              <h3 className={estilos.titulo}>El molde de la minuta</h3>
              <p className={estilos.sub}>
                Qué bloques lleva el correo y qué se pide en cada uno.
                {salaNombre ? ` Solo para ${salaNombre}.` : ' Para todas las salas.'}
              </p>
            </div>
            <button type="button" className="boton" data-tono="fantasma" onClick={() => setAbierto(false)} aria-label="Cerrar">
              ✕
            </button>
          </header>

          <div className={estilos.cuerpo}>
            <label className={estilos.campo}>
              <span className="micro">Saludo</span>
              <input
                value={molde.saludo}
                onChange={(e) => { setGuardado(false); setMolde((m) => ({ ...m, saludo: e.target.value })) }}
                placeholder="Hola equipo,"
              />
            </label>

            <ol className={estilos.bloques}>
              {molde.bloques.map((b, i) => (
                <li key={i} className={estilos.bloque}>
                  <div className={estilos.bloqueCabecera}>
                    <span className={estilos.numero}>{i + 1}</span>
                    <input
                      className={estilos.tituloBloque}
                      value={b.titulo}
                      onChange={(e) => cambiarBloque(i, { titulo: e.target.value })}
                      placeholder="Objetivo de la reunión"
                      aria-label={`Título del bloque ${i + 1}`}
                    />
                    <div className={estilos.acciones}>
                      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir el bloque ${i + 1}`}>↑</button>
                      <button type="button" onClick={() => mover(i, 1)} disabled={i === molde.bloques.length - 1} aria-label={`Bajar el bloque ${i + 1}`}>↓</button>
                      <button
                        type="button"
                        onClick={() => { setGuardado(false); setMolde((m) => ({ ...m, bloques: m.bloques.filter((_, j) => j !== i) })) }}
                        disabled={molde.bloques.length <= 1}
                        aria-label={`Quitar el bloque ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <textarea
                    className={estilos.guia}
                    value={b.guia}
                    onChange={(e) => cambiarBloque(i, { guia: e.target.value })}
                    rows={2}
                    placeholder="Qué debe contener este bloque. Esto se le pide al modelo: cuanto más concreto, menos relleno."
                    aria-label={`Qué se pide en el bloque ${i + 1}`}
                  />

                  <label className={estilos.marcarTabla}>
                    <input type="radio" name="tabla" checked={Boolean(b.conTabla)} onChange={() => ponerTabla(i)} />
                    <span>
                      Aquí va la tabla de acuerdos
                      <em> — se arma con los compromisos que se publican en el espacio del cliente; el modelo no la escribe.</em>
                    </span>
                  </label>
                </li>
              ))}
            </ol>

            <div className={estilos.pieAcciones}>
              <button
                type="button"
                className="boton"
                data-tono="suave"
                disabled={molde.bloques.length >= 8}
                onClick={() => { setGuardado(false); setMolde((m) => ({ ...m, bloques: [...m.bloques, { titulo: '', guia: '' }] })) }}
              >
                + Añadir bloque
              </button>
              <button
                type="button"
                className="boton"
                data-tono="fantasma"
                onClick={() => { setGuardado(false); setMolde(MOLDE_POR_DEFECTO) }}
              >
                Volver al molde de siempre
              </button>
            </div>

            <label className={estilos.marcarTabla}>
              <input
                type="checkbox"
                checked={molde.conEnlace}
                onChange={(e) => { setGuardado(false); setMolde((m) => ({ ...m, conEnlace: e.target.checked })) }}
              />
              <span>Cerrar el correo con el enlace a la sala</span>
            </label>
          </div>

          <footer className={estilos.pie}>
            {/* Se comprueba AL GUARDAR y no al generar: descubrir que el molde
                no sirve cuando ya se pegó la transcripción de una reunión de
                una hora es descubrirlo tarde. */}
            {faltas.length > 0 ? (
              <span className={estilos.aviso}>Falta {faltas.join(' y ')}.</span>
            ) : error ? (
              <span className={estilos.aviso}>{error}</span>
            ) : guardado ? (
              <span className={estilos.ok}>Guardado. Las siguientes minutas usarán este molde.</span>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="boton"
              data-tono="marca"
              disabled={faltas.length > 0 || pendiente}
              onClick={guardar}
            >
              {pendiente ? 'Guardando…' : 'Guardar el molde'}
            </button>
          </footer>
        </div>
      </dialog>
    </>
  )
}
