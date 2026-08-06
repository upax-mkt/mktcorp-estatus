'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import estilos from './AgendarRapido.module.css'

/**
 * Agendar una reunión SIN SALIR DEL HOME (ronda 10, tarea 14).
 *
 * Franco, literal: "el calendario (no lo desaparezcas del home), más sí debe
 * haber un botón en el home para agendar rápidamente una sesión". Hoy, para
 * agendar hay que irse a otra pantalla (/agenda, y pronto /reuniones — tarea
 * 13). Este botón vive JUNTO al calendario —nunca en su lugar, `ModuloCalendario`
 * no se toca, ver `app/page.tsx`— y pide lo MÍNIMO: sala, día, hora y tipo.
 * Nada de título, alcance, lugar ni participantes: eso se completa después,
 * ya con la reunión creada — como hoy se completa después de agendar en
 * /agenda.
 *
 * MISMO `<dialog>` nativo que `ModuloMinutas`/`LevantarMinuta`: foco atrapado,
 * Escape y fondo inerte los pone el navegador. El contenido de dentro se
 * renderiza solo con `abierto` en `true` (no basta con el atributo `open` del
 * propio `<dialog>`) — mismo patrón que `ModuloMinutas`, y necesario aquí
 * además para que SOLO exista un botón "Agendar" en el documento antes de
 * abrir: el disparador y el de enviar dicen los dos "agendar".
 *
 * UNA SALA EN PAUSA NO SE OFRECE (constraint del brief, con test propio):
 * cortesía de interfaz nada más — el rechazo de verdad, contra la base, ya lo
 * hace `crearReunion` (ver el comentario de `agendarRapidoAction`,
 * `app/page.tsx`). Filtrar aquí evita el viaje al servidor para el caso
 * común, pero el freeze real vive en un solo sitio.
 *
 * CON TODAS EN PAUSA (revisión final de la ronda 10), `salasActivas` queda
 * vacío: el `<select>` no tendría ninguna `<option>` y "Agendar" se quedaría
 * deshabilitado para siempre sin que nadie supiera por qué. En vez de ese
 * formulario muerto, se enseña por qué no hay nada que agendar — mismo
 * criterio de "un vacío que lo explica" que ya usan `ReunionesSala`,
 * `PanelAgenda` y `AcuerdosArrastrables`.
 */

export interface SalaParaAgendar {
  slug: string
  nombre: string
  /** Una sala en pausa no se ofrece en el selector — ver el comentario de arriba. */
  activa: boolean
}

export interface DatosAgendarRapido {
  salaSlug: string
  /** YYYY-MM-DD */
  dia: string
  /** HH:MM */
  hora: string
  tipo: 'semanal' | 'quincenal' | 'mensual'
}

interface Props {
  salas: SalaParaAgendar[]
  agendar: (datos: DatosAgendarRapido) => Promise<{ error?: string }>
}

const HORA_POR_DEFECTO = '10:00'

/**
 * Semanal → quincenal → mensual: de más a menos frecuente (ronda 10, tarea
 * 16 — "quincenal en la interfaz"). Mismo orden que `TIPOS_REUNION` en
 * `FormularioSesion.tsx` y que `tipoReunionEnum` (src/db/esquema.ts): fuente
 * única aquí para que un enum que gane un valor no deje un `<option>` suelto
 * desincronizado.
 */
const TIPOS_REUNION: DatosAgendarRapido['tipo'][] = ['semanal', 'quincenal', 'mensual']

/** "semanal" → "Semanal": el enum se escribe en minúsculas; lo que se lee en pantalla, no. */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function AgendarRapido({ salas, agendar }: Props) {
  const salasActivas = salas.filter((s) => s.activa)

  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState<DatosAgendarRapido>({
    salaSlug: salasActivas[0]?.slug ?? '',
    dia: '',
    hora: HORA_POR_DEFECTO,
    tipo: 'mensual',
  })
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const n = dialogo.current
    if (!n) return
    if (abierto && !n.open) n.showModal()
    if (!abierto && n.open) n.close()
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setError(null)
  }

  function campo<K extends keyof DatosAgendarRapido>(clave: K, valor: DatosAgendarRapido[K]) {
    setDatos((prev) => ({ ...prev, [clave]: valor }))
  }

  const listo = datos.salaSlug.length > 0 && datos.dia.length > 0

  return (
    <>
      <button type="button" className="boton" data-tono="suave" onClick={() => setAbierto(true)}>
        + Agendar reunión
      </button>

      <dialog
        ref={dialogo}
        className={estilos.dialogo}
        aria-label="Agendar reunión"
        onClick={(e) => { if (e.target === dialogo.current) cerrar() }}
        onClose={cerrar}
      >
        {abierto && (
          <div className={estilos.caja}>
            <header className={estilos.cabecera}>
              <h3 className={estilos.titulo}>Agendar reunión</h3>
              <button type="button" className={estilos.cerrar} onClick={cerrar} aria-label="Cerrar">
                ✕
              </button>
            </header>

            {salasActivas.length === 0 ? (
              // TODAS LAS SALAS EN PAUSA: sin ninguna que ofrecer, el <select>
              // saldría vacío y "Agendar" quedaría deshabilitado para siempre
              // sin que nadie supiera por qué — mismo criterio de "un vacío que
              // lo explica" que ya usan ReunionesSala/PanelAgenda/AcuerdosArrastrables
              // en vez de una lista o un formulario mudos.
              <div className={estilos.cuerpo}>
                <p className={estilos.vacio}>
                  {salas.length === 0
                    ? 'No hay ninguna sala configurada todavía.'
                    : `No hay ninguna sala activa: las ${salas.length} están en pausa. Reactiva alguna ` +
                      'desde sus ajustes para poder agendarle una reunión.'}
                </p>
                <div className={estilos.acciones}>
                  <button type="button" className={estilos.cancelar} onClick={cerrar}>
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form
                className={estilos.cuerpo}
                onSubmit={(e) => {
                  e.preventDefault()
                  setError(null)
                  empezar(async () => {
                    const r = await agendar(datos)
                    if (r.error) {
                      setError(r.error)
                      return
                    }
                    cerrar()
                  })
                }}
              >
                <div className={estilos.campos}>
                  <label className={estilos.campo}>
                    <span className="micro">Sala</span>
                    <select value={datos.salaSlug} onChange={(e) => campo('salaSlug', e.target.value)}>
                      {salasActivas.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={estilos.campo}>
                    <span className="micro">Día</span>
                    <input
                      type="date"
                      value={datos.dia}
                      onChange={(e) => campo('dia', e.target.value)}
                      required
                    />
                  </label>

                  <label className={estilos.campo}>
                    <span className="micro">Hora</span>
                    <input type="time" value={datos.hora} onChange={(e) => campo('hora', e.target.value)} />
                  </label>

                  <label className={estilos.campo}>
                    <span className="micro">Tipo de reunión</span>
                    <select
                      value={datos.tipo}
                      onChange={(e) => campo('tipo', e.target.value as DatosAgendarRapido['tipo'])}
                    >
                      {TIPOS_REUNION.map((t) => (
                        <option key={t} value={t}>
                          {capitalizar(t)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {error && <p className={estilos.aviso}>{error}</p>}

                <div className={estilos.acciones}>
                  <button type="submit" className="boton" disabled={pendiente || !listo}>
                    {pendiente ? 'Agendando…' : 'Agendar'}
                  </button>
                  <button type="button" className={estilos.cancelar} onClick={cerrar} disabled={pendiente}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </dialog>
    </>
  )
}
