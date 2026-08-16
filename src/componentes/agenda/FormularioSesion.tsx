'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/agenda/agenda.module.css'
import { PLANTILLAS, PLANTILLA_POR_DEFECTO } from '@/secciones/plantillas'

/**
 * Agendar una reunión, o corregir la que ya está.
 *
 * Es lo que faltaba para que el hub pudiera decir algo verde: hasta ahora
 * "próxima sesión" se deducía de las sesiones que alguien había EMPEZADO A
 * PREPARAR, así que no había forma de decir "el 19 de agosto tenemos Zeus"
 * sin ponerse a redactar el estatus.
 *
 * Outlook queda para después; los campos son los que trae un evento de
 * calendario para que integrarlo luego sea rellenarlos, no rehacerlos.
 */

export interface SalaElegible {
  slug: string
  nombre: string
  color: string
}

export interface DatosFormulario {
  salaSlug: string
  titulo: string
  /** YYYY-MM-DD */
  dia: string
  /** HH:MM */
  hora: string
  /**
   * Con qué frecuencia es ESTA reunión en particular — no confundir con la
   * CADENCIA DE LA SALA (cada cuánto nos reunimos con este cliente en
   * general), que se elige en `FormularioSala` y vive en un enum aparte
   * (`cadenciaEnum`, mismos tres valores, distinto eje).
   *
   * Las tres opciones ya se pueden ELEGIR en el `<select>` de abajo desde
   * la ronda 10, tarea 16 ("Quincenal en la interfaz"). Antes de esa tarea
   * el tipo ya venía ensanchado a las tres —ver `PanelAgenda.tsx`— para que
   * `inicial.tipo` pudiera recibir, sin reventar, la de una reunión que ya
   * es quincenal (Research Land) al abrir su formulario de edición; solo
   * faltaba poder escogerla aquí.
   *
   * CORREGIDO EN LA REVISIÓN FINAL DE LA RONDA 10: el `<select>` de abajo
   * etiquetaba este campo "Cadencia" —el nombre del OTRO eje, el de la
   * sala— contradiciendo el párrafo de arriba en su propio archivo. Ahora
   * dice "Tipo de reunión", igual que ya decía `AgendarRapido.tsx` para
   * este mismo campo: un solo nombre para un solo dato, sin importar por
   * dónde se agende o se corrija.
   */
  tipo: 'semanal' | 'quincenal' | 'mensual'
  alcance: string
  lugar: string
  /** Nombres separados por coma, tal como se escriben. */
  participantes: string
  /**
   * Qué clase de junta es (`src/secciones/plantillas.ts`, tarea 1 de esta
   * ronda) — el id de una `Plantilla` del catálogo, o `''` para "sin
   * clasificar". Un `<select>` no tiene `null`: eso es solo cómo se guarda
   * la ausencia en la base (`DatosDeReunion.plantilla`,
   * `src/db/reuniones.ts`); en esta pantalla la ausencia es una cadena
   * vacía, y las acciones (`src/app/reuniones/acciones.ts`) son las que
   * traducen una forma a la otra antes de tocar la base.
   */
  plantilla: string
}

interface Props {
  salas: SalaElegible[]
  /**
   * `plantilla` se ensancha aparte del resto: `Partial<DatosFormulario>` no
   * admite `null` en un campo tipado `string`, y una reunión real SÍ puede
   * traer `plantilla: null` (sin clasificar). Distinguir "vino en `null`" de
   * "no vino" es justo lo que decide el valor con el que arranca el
   * desplegable — ver `plantillaInicial`, más abajo.
   */
  inicial?: Partial<Omit<DatosFormulario, 'plantilla'>> & { plantilla?: string | null }
  /** Qué dice el botón: "Agendar" al crear, "Guardar cambios" al corregir. */
  etiquetaEnviar: string
  enviarAction: (datos: DatosFormulario) => Promise<{ error?: string }>
  alTerminar?: () => void
  alCancelar?: () => void
}

const HORA_POR_DEFECTO = '10:00'

/**
 * Las cadencias elegibles para el tipo de una reunión, de más frecuente a
 * menos — mismo orden que usa `tipoReunionEnum` (src/db/esquema.ts). Fuente
 * única para las `<option>` de abajo: así un enum que gane un valor no deja
 * un `<option>` suelto desincronizado.
 */
const TIPOS_REUNION: DatosFormulario['tipo'][] = ['semanal', 'quincenal', 'mensual']

/** "semanal" → "Semanal": el enum se escribe en minúsculas; lo que se lee en pantalla, no. */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * El valor con el que arranca el desplegable "¿Qué junta es?".
 *
 * Agendar una reunión NUEVA (no llega `inicial`, o llega sin la clave
 * `plantilla`) arranca en la clase por defecto del catálogo
 * (`PLANTILLA_POR_DEFECTO`) — igual que ya hace `NuevaSesionSala` (tarea 2 de
 * esta ronda) para la misma pregunta: una junta que nace debería nacer
 * clasificada, no en blanco.
 *
 * Editar una reunión que YA EXISTE es una pregunta distinta. Si esa reunión
 * no tiene clase, llega con `inicial.plantilla` en `null` — y ahí NO se
 * puede caer a la clase por defecto: guardar cualquier otro campo (el lugar,
 * el título…) dejaría la junta marcada como "Estatus de UDN" sin que nadie
 * lo haya decidido. Es la "clasificación de rebote" que esta tarea existe
 * para evitar — un dato que falta es un hecho, y convertirlo en un dato
 * inventado es peor que dejarlo vacío.
 *
 * Por eso se distingue si `plantilla` VINO en `inicial` —con el operador
 * `in`, que sí ve una clave puesta a `null`, a diferencia de `?.`— de si
 * simplemente no vino. Solo en el primer caso se respeta tal cual (y `null`
 * se vuelve `''`, el valor de "Sin clasificar" en este `<select>`).
 */
function plantillaInicial(inicial: Props['inicial']): string {
  if (inicial && 'plantilla' in inicial) return inicial.plantilla ?? ''
  return PLANTILLA_POR_DEFECTO
}

export function FormularioSesion({
  salas,
  inicial,
  etiquetaEnviar,
  enviarAction,
  alTerminar,
  alCancelar,
}: Props) {
  const [datos, setDatos] = useState<DatosFormulario>({
    salaSlug: inicial?.salaSlug ?? salas[0]?.slug ?? '',
    titulo: inicial?.titulo ?? '',
    dia: inicial?.dia ?? '',
    hora: inicial?.hora ?? HORA_POR_DEFECTO,
    tipo: inicial?.tipo ?? 'mensual',
    alcance: inicial?.alcance ?? 'todos',
    lugar: inicial?.lugar ?? '',
    participantes: inicial?.participantes ?? '',
    plantilla: plantillaInicial(inicial),
  })
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  function campo<K extends keyof DatosFormulario>(clave: K, valor: DatosFormulario[K]) {
    setDatos((prev) => ({ ...prev, [clave]: valor }))
  }

  const listo = datos.salaSlug.length > 0 && datos.dia.length > 0

  return (
    <form
      className={estilos.formulario}
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        empezar(async () => {
          const r = await enviarAction(datos)
          if (r.error) {
            setError(r.error)
            return
          }
          alTerminar?.()
        })
      }}
    >
      <div className={estilos.campos}>
        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Sala</span>
          <select
            className={estilos.entrada}
            value={datos.salaSlug}
            onChange={(e) => campo('salaSlug', e.target.value)}
          >
            {salas.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Día</span>
          <input
            type="date"
            className={estilos.entrada}
            value={datos.dia}
            onChange={(e) => campo('dia', e.target.value)}
            required
          />
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Hora</span>
          <input
            type="time"
            className={estilos.entrada}
            value={datos.hora}
            onChange={(e) => campo('hora', e.target.value)}
          />
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Tipo de reunión</span>
          <select
            className={estilos.entrada}
            value={datos.tipo}
            onChange={(e) => campo('tipo', e.target.value as DatosFormulario['tipo'])}
          >
            {TIPOS_REUNION.map((t) => (
              <option key={t} value={t}>
                {capitalizar(t)}
              </option>
            ))}
          </select>
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>¿Qué junta es?</span>
          <select
            className={estilos.entrada}
            value={datos.plantilla}
            onChange={(e) => campo('plantilla', e.target.value)}
          >
            {/* Solo se enseña mientras el valor siga vacío: es el estado de
                una reunión ya existente sin clase (ver `plantillaInicial`),
                no una opción para "desclasificar" una junta que ya la
                tiene — ofrecerla siempre invitaría a eso por accidente. */}
            {datos.plantilla === '' && <option value="">Sin clasificar</option>}
            {/* 'en-blanco' se saca del recorrido normal y se reinserta abajo
                en su propio `<optgroup>` — mismo tratamiento que le da la
                tarea 2 en `NuevaSesionSala`: no es una clase de junta, es la
                salida para cuando ninguna clase real aplica, y necesita
                leerse aparte del resto (mismo orden del catálogo, separador
                nativo antes de la última). */}
            {PLANTILLAS.filter((p) => p.id !== 'en-blanco').map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
            <optgroup label="Otra">
              <option value="en-blanco">Otra (deck en blanco)</option>
            </optgroup>
          </select>
        </label>
      </div>

      <label className={estilos.campoAncho}>
        <span className={estilos.etiqueta}>Título</span>
        <input
          type="text"
          className={estilos.entrada}
          value={datos.titulo}
          onChange={(e) => campo('titulo', e.target.value)}
          placeholder="Estatus de agosto — si lo dejas vacío, se pone uno solo"
        />
      </label>

      <div className={estilos.campos}>
        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Alcance</span>
          <input
            type="text"
            className={estilos.entrada}
            value={datos.alcance}
            onChange={(e) => campo('alcance', e.target.value)}
            placeholder="todos los squads"
          />
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Dónde</span>
          <input
            type="text"
            className={estilos.entrada}
            value={datos.lugar}
            onChange={(e) => campo('lugar', e.target.value)}
            placeholder="Teams, sala 4, por definir…"
          />
        </label>
      </div>

      <label className={estilos.campoAncho}>
        <span className={estilos.etiqueta}>Quién va</span>
        <input
          type="text"
          className={estilos.entrada}
          value={datos.participantes}
          onChange={(e) => campo('participantes', e.target.value)}
          placeholder="Nombres separados por coma"
        />
      </label>

      {error && <p className={estilos.formularioError}>{error}</p>}

      <div className={estilos.formularioAcciones}>
        <button type="submit" className={estilos.botonPrimario} disabled={pendiente || !listo}>
          {pendiente ? 'Guardando…' : etiquetaEnviar}
        </button>
        {alCancelar && (
          <button type="button" className={estilos.botonTexto} onClick={alCancelar} disabled={pendiente}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
