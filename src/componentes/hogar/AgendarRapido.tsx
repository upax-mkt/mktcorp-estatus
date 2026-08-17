'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { SelectorClaseDeJunta } from '@/componentes/comunes/SelectorClaseDeJunta'
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
 *
 * TÍTULO, OPCIONAL (auditoría UX/UI, ronda 11 — "el título de una reunión no
 * dice de qué es"): hasta ahora este atajo pedía sala/día/hora/tipo y NADA
 * más, así que toda reunión creada aquí nacía con el título derivado de
 * `tituloPorDefecto` (`src/db/documentos.ts`) — que describe la CADENCIA, no
 * el CONTENIDO. Caso real que lo disparó: Research Land tiene dos
 * quincenales en la MISMA sala, Comercial y Digital, indistinguibles en
 * cualquier lista con solo la cadencia como título. El campo se suma, pero
 * OPCIONAL, a propósito: este formulario sigue siendo el atajo "rápido" que
 * Franco pidió, y obligarlo aquí metería fricción justo donde el diseño la
 * evita a propósito — quien tiene prisa lo deja en blanco y
 * `crearReunionConDocumento` resuelve un título legible por su cuenta; quien
 * ya sabe si es la Comercial o la Digital lo escribe en dos segundos. Alcance,
 * lugar y participantes SIGUEN sin pedirse aquí: eso se completa después, ya
 * con la reunión creada, como antes. Mismo nombre de campo ("Título") que
 * `FormularioSesion.tsx` (`DatosFormulario.titulo`) — un solo vocabulario
 * entre los dos formularios, aunque resuelvan obligatorio/opcional distinto.
 *
 * "¿QUÉ JUNTA ES?" (cierre de deuda técnica): este era el ÚNICO de los tres
 * sitios que crean una reunión sin preguntar la clase — `NuevaSesionSala` y
 * `FormularioSesion` (`componentes/agenda`) ya la piden. Toda reunión nacida
 * aquí engordaba en silencio la columna "Sin clasificar" de su sala y de
 * `/reuniones`. Se suma el mismo `SelectorClaseDeJunta` que ya usan los otros
 * dos —no un tercer `<select>` escrito a mano, que es como este repo se comió
 * la lección la primera vez (ver el comentario del propio componente)—, y
 * OPCIONAL, con el mismo criterio que el Título: quien tiene prisa lo deja
 * sin tocar.
 *
 * ARRANCA VACÍO ("" = sin clasificar), NUNCA en la primera clase del catálogo.
 * Esta pantalla SOLO CREA —no hay "editar" que abra en su clase ya puesta,
 * al revés de `FormularioSesion`—, así que aquí no hay ambigüedad que
 * resolver: si nadie toca el desplegable, `agendarRapidoAction` (`app/page.tsx`)
 * manda `plantilla: null` y la reunión nace tal como nacía antes de que este
 * campo existiera — sin clase, que es la verdad, no "Estatus de UDN" porque
 * esa fuera la primera fila del catálogo. Un dato que falta es un hecho;
 * convertirlo en un dato inventado por el orden del `<select>` es peor que
 * dejarlo vacío.
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
  /**
   * OPCIONAL: en blanco, `crearReunionConDocumento` cae a `tituloPorDefecto`
   * (ver el comentario de arriba). Mismo criterio de tipo que
   * `DatosFormulario.titulo` (`FormularioSesion.tsx`) — `string`, nunca
   * `string | undefined`: "sin título" se representa con `''`, no con la
   * ausencia de la clave, para que las dos formas de agendar compartan una
   * sola forma de decir "no lo llenaron".
   */
  titulo: string
  /**
   * Qué clase de junta es (`src/secciones/plantillas.ts`) — el id de una
   * `Plantilla` del catálogo, o `''` para "sin clasificar". Mismo tipo y
   * mismo significado de `''` que `DatosFormulario.plantilla`
   * (`FormularioSesion.tsx`): un `<select>` no tiene `null`, así que la
   * ausencia se representa como cadena vacía aquí, y es `agendarRapidoAction`
   * (`app/page.tsx`) quien la traduce a `null` antes de tocar la base.
   */
  plantilla: string
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
    titulo: '',
    // '' = sin clasificar, SIEMPRE al crear — ver el comentario de "¿Qué
    // junta es?" arriba. Nunca `PLANTILLA_POR_DEFECTO`: esta pantalla no
    // edita, solo crea, así que no hay una clase previa que respetar.
    plantilla: '',
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

                {/* "¿QUÉ JUNTA ES?", OPCIONAL (ver el comentario del
                    archivo): el mismo `SelectorClaseDeJunta` que ya usan
                    `NuevaSesionSala` y `FormularioSesion` — no un tercer
                    `<select>` escrito a mano. Fuera de la rejilla 2x2, a todo
                    lo ancho, mismo criterio que el Título de aquí abajo: no
                    bloquea "Agendar", `.campo` es la MISMA clase que ya
                    estiliza cada label de esta rejilla (descendant selector
                    `.campo select` en AgendarRapido.module.css), y "micro" es
                    la clase global que ya usan Sala/Día/Hora/Tipo — un
                    formulario, un solo vocabulario visual. */}
                <SelectorClaseDeJunta
                  value={datos.plantilla}
                  onChange={(v) => campo('plantilla', v)}
                  className={estilos.campo}
                  etiquetaClassName="micro"
                  pistaClassName={estilos.pista}
                />

                {/* OPCIONAL (ver el comentario del archivo): fuera de la rejilla
                    2x2 de arriba, a todo lo ancho — mismo criterio visual que
                    `FormularioSesion.tsx` separa su "Título" del resto de los
                    campos. */}
                <label className={estilos.campo}>
                  <span className="micro">Título</span>
                  <input
                    type="text"
                    value={datos.titulo}
                    onChange={(e) => campo('titulo', e.target.value)}
                    placeholder="Si lo dejas vacío, se pone uno solo"
                  />
                </label>

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
