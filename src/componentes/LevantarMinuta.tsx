'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MinutaCliente } from '@/app/deck/[id]/minuta/MinutaCliente'
import type { DeQueReunion } from '@/app/deck/[id]/minuta/acciones'
import type { PersonaMonday } from '@/monday/personas'
import { fechaCompleta } from '@/lib/fecha'
import estilos from './minuta.module.css'
import { colorDeTextoDeMarca } from '@/temas'

/**
 * GENERAR UNA MINUTA, de la reunión que sea.
 *
 * Franco: "no debe obligarme a asociar la minuta a una reunión, ya que el
 * componente lo puedo ocupar para cualquier reunión".
 *
 * Antes exigía elegir una sesión YA PREPARADA en la app, y eso deja fuera el
 * caso más común: una junta que se dio y que nadie preparó aquí. Ahora hay dos
 * vías y la segunda no exige nada previo — se escribe de qué reunión fue y ya.
 *
 * POR DEBAJO ACABA HABIENDO UNA REUNIÓN, pero solo si acaba habiendo minuta.
 * Una minuta suelta, sin nada a lo que pertenecer, no se puede encontrar
 * después: no sale en ninguna sala, no entra en el histórico. Así que la
 * asociación se mantiene y lo que se quita es el trabajo de hacerla.
 *
 * PERO NO SE REGISTRA AL EMPEZAR. Franco: "fueron intentos de generar una
 * minuta, no debería haberse creado como una reunión". Describir de qué junta
 * fue no es celebrarla: aquí eso se queda en la pantalla y viaja al servidor
 * junto con la transcripción. La reunión nace en `publicarMinutaAction`,
 * cuando ya tiene acta. Cerrar la ventana a medias no deja nada detrás.
 *
 * AGNÓSTICO de dónde vive: la sala le pasa sus sesiones y el Home las de
 * todas. Es la misma pieza porque es la misma tarea.
 */

export interface SesionMinutable {
  id: string
  titulo: string
  fecha: string // ISO
  /** De qué sala. Solo se enseña cuando la lista cruza salas (el Home). */
  salaNombre?: string
  salaColor?: string
}

export interface SalaElegible {
  slug: string
  nombre: string
}

interface Props {
  /** Reuniones ya registradas en la app que siguen sin minuta. */
  sesiones: SesionMinutable[]
  /**
   * Salas entre las que elegir al describir una reunión nueva. Vacío = no se
   * ofrece (dentro de una sala ya se sabe cuál es).
   */
  salas?: SalaElegible[]
  /** Sala fija, cuando el componente vive dentro de una. */
  salaFija?: string
  claseBoton?: string
  etiquetaBoton?: string
  /** La gente viva de Mkt Corp, para el selector de responsable de MinutaCliente. */
  personas: PersonaMonday[]
}

/** La reunión que se está minutando, con lo justo para enseñarla en pantalla. */
interface EnCurso {
  de: DeQueReunion
  titulo: string
  fecha: string
}

/** El icono de la IA. A mano, con el mismo trazo que el resto (ver IconoSeccion). */
export function IconoIA({ tamano = 18 }: { tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Una chispa: el gesto que ya significa "esto lo escribe un modelo". */}
      <path d="M12 3l1.6 4.3L18 9l-4.4 1.7L12 15l-1.6-4.3L6 9l4.4-1.7z" />
      <path d="M18.5 15.5l.7 1.9 1.8.7-1.8.7-.7 1.9-.7-1.9-1.8-.7 1.8-.7z" />
    </svg>
  )
}

/** Hoy, en el formato del campo de fecha, para que el formulario no nazca vacío. */
function hoyCivil(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function LevantarMinuta({
  sesiones,
  salas = [],
  salaFija,
  claseBoton,
  etiquetaBoton = 'Generar una minuta',
  personas,
}: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [via, setVia] = useState<'preparada' | 'otra'>(sesiones.length > 0 ? 'preparada' : 'otra')
  const [elegida, setElegida] = useState<EnCurso | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  // Campos de "otra reunión". `DatosDeReunion.salaSlug` es obligatorio desde
  // la Tarea 4 (ronda 10): ya no hay "Ninguna" — ver el comentario junto al
  // <select> más abajo. Sin sala fija, arranca en la primera de la lista.
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(hoyCivil())
  const [sala, setSala] = useState(salaFija ?? salas[0]?.slug ?? '')

  useEffect(() => {
    const n = dialogo.current
    if (!n) return
    if (abierto && !n.open) n.showModal()
    if (!abierto && n.open) n.close()
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setElegida(null)
    setError(null)
  }

  /**
   * Pasar a la transcripción. NO REGISTRA NADA: la descripción se guarda aquí
   * y viaja al servidor con la transcripción; la reunión nace al publicar.
   *
   * SIEMPRE con sala (ronda 10, tarea 5b): `DatosDeReunion.salaSlug` es
   * obligatorio desde la Tarea 4 — antes "Ninguna" cubría un comité o una
   * junta interna sin UDN, con sus acuerdos quedando solo en el texto de la
   * minuta. Esa vía ya no existe del lado de la escritura (`crearReunion`
   * la rechazaría); ver el reporte de esta tarea.
   */
  function seguir() {
    setError(null)
    const nombre = titulo.trim()
    if (!nombre) {
      setError('Ponle un nombre a la reunión: es como se va a encontrar después.')
      return
    }
    if (!sala) {
      setError('Elige a qué sala pertenece esta reunión.')
      return
    }
    // Mediodía y no medianoche: una fecha a las 00:00 UTC se corre de día al
    // leerla en la zona de México.
    const cuando = `${fecha}T12:00:00.000Z`
    setElegida({
      de: { nueva: { titulo: nombre, fecha: cuando, salaSlug: sala } },
      titulo: nombre,
      fecha: cuando,
    })
  }

  return (
    <>
      <button
        type="button"
        className={claseBoton}
        onClick={() => setAbierto(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
      >
        <IconoIA />
        {etiquetaBoton}
      </button>

      <dialog
        ref={dialogo}
        className={estilos.dialogo}
        aria-label="Generar una minuta"
        onClick={(e) => { if (e.target === dialogo.current) cerrar() }}
        onClose={cerrar}
      >
        <div className={estilos.caja}>
          <header className={estilos.cabecera}>
            <div>
              <h3 className={estilos.titulo}>
                <IconoIA tamano={20} />
                Generar una minuta
              </h3>
              <p className={estilos.sub}>
                {elegida
                  ? 'Pega la transcripción y la IA propone el acta y los acuerdos. Nada se publica sin que lo revises.'
                  : 'De cualquier reunión: una que preparaste aquí, o cualquier otra que se haya dado.'}
              </p>
            </div>
            <button type="button" className={estilos.cerrar} onClick={cerrar} aria-label="Cerrar">✕</button>
          </header>

          <div className={estilos.cuerpo}>
            {elegida ? (
              <>
                <div className={estilos.elegida}>
                  <span>
                    <strong>{elegida.titulo}</strong> · {fechaCompleta(elegida.fecha)}
                  </span>
                  <button type="button" className={estilos.cambiar} onClick={() => setElegida(null)}>
                    Cambiar de reunión
                  </button>
                </div>
                <MinutaCliente
                  de={elegida.de}
                  alPublicar={() => {
                    cerrar()
                    router.refresh()
                  }}
                  personas={personas}
                />
              </>
            ) : (
              <>
                {/* Las dos vías a la vista desde el principio: escondida detrás
                    de un enlace, «Otra reunión» seguiría pareciendo que hay que
                    elegir una sesión preparada. */}
                <div className={estilos.pestanas} role="tablist" aria-label="De qué reunión">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={via === 'preparada'}
                    data-activo={via === 'preparada' ? 'true' : undefined}
                    onClick={() => setVia('preparada')}
                  >
                    Una preparada aquí{sesiones.length > 0 ? ` (${sesiones.length})` : ''}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={via === 'otra'}
                    data-activo={via === 'otra' ? 'true' : undefined}
                    onClick={() => setVia('otra')}
                  >
                    Otra reunión
                  </button>
                </div>

                {via === 'preparada' ? (
                  sesiones.length === 0 ? (
                    <p className={estilos.vacio}>
                      No hay ninguna reunión preparada aquí sin minuta. Usa «Otra reunión» para
                      minutar cualquier junta que se haya dado.
                    </p>
                  ) : (
                    <div className={estilos.lista}>
                      {sesiones.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={estilos.fila}
                          style={{
                            '--marca': s.salaColor,
                            '--marca-texto': s.salaColor ? colorDeTextoDeMarca(s.salaColor) : undefined,
                          } as React.CSSProperties}
                          onClick={() => setElegida({ de: { reunionId: s.id }, titulo: s.titulo, fecha: s.fecha })}
                        >
                          <span className={estilos.filaTitulo}>
                            {s.salaNombre && <span className={estilos.filaSala}>{s.salaNombre}</span>}
                            {s.titulo}
                          </span>
                          <span className={estilos.filaFecha}>{fechaCompleta(s.fecha)}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <div className={estilos.campos}>
                      <label className={`${estilos.campo} ${estilos.anchoEntero}`}>
                        <span className="micro">De qué reunión fue</span>
                        <input
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                          placeholder="Comité de dirección · julio"
                        />
                      </label>
                      <label className={estilos.campo}>
                        <span className="micro">Cuándo</span>
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                      </label>
                      {salas.length > 0 && (
                        <label className={estilos.campo}>
                          <span className="micro">Sala</span>
                          <select value={sala} onChange={(e) => setSala(e.target.value)}>
                            {salas.map((s) => (
                              <option key={s.slug} value={s.slug}>{s.nombre}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>

                    <div className={estilos.acciones}>
                      <button type="button" className="boton" data-tono="marca" onClick={seguir}>
                        Continuar
                      </button>
                      {error && <span className={estilos.aviso}>{error}</span>}
                    </div>

                    <p className={estilos.vacio} style={{ marginTop: '0.9rem' }}>
                      La reunión se registra al publicar la minuta, no ahora: si lo dejas a medias,
                      no queda nada. Su minuta y sus acuerdos quedan en la sala que elijas.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
