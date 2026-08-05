'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/agenda/agenda.module.css'

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
   * El formulario solo ofrece Mensual/Semanal como radios (abajo): 'quincenal'
   * ("Quincenal en la interfaz" es trabajo de otra tarea) no se puede ELEGIR
   * aquí. Se ensancha el tipo para que `inicial.tipo` pueda recibir, sin
   * reventar, la de una reunión que ya es quincenal (Research Land) al abrir
   * su formulario de edición — ninguno de los radios la marca por defecto en
   * ese caso, que es el mismo comportamiento (ningún radio matched) que ya
   * tenía cualquier otro valor no contemplado.
   */
  tipo: 'semanal' | 'quincenal' | 'mensual'
  alcance: string
  lugar: string
  /** Nombres separados por coma, tal como se escriben. */
  participantes: string
}

interface Props {
  salas: SalaElegible[]
  inicial?: Partial<DatosFormulario>
  /** Qué dice el botón: "Agendar" al crear, "Guardar cambios" al corregir. */
  etiquetaEnviar: string
  enviarAction: (datos: DatosFormulario) => Promise<{ error?: string }>
  alTerminar?: () => void
  alCancelar?: () => void
}

const HORA_POR_DEFECTO = '10:00'

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
          <span className={estilos.etiqueta}>Cadencia</span>
          <select
            className={estilos.entrada}
            value={datos.tipo}
            onChange={(e) => campo('tipo', e.target.value as 'semanal' | 'mensual')}
          >
            <option value="mensual">mensual</option>
            <option value="semanal">semanal</option>
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
