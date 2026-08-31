'use client'

import { useMemo, useState, useTransition } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import { AdminPropuestas } from './AdminPropuestas'
import type { EstadoJuradoConcurso, PropuestaConcurso } from '@/db/concurso'
import {
  guardarCalificacionAction,
  guardarJuradoAction,
} from '@/app/concurso/acciones'

export function PanelJurado({
  propuestas,
  estado,
}: {
  propuestas: PropuestaConcurso[]
  estado: EstadoJuradoConcurso
}) {
  const [nombres, setNombres] = useState<[string, string, string]>([
    estado.nombres[0] ?? 'Franco Cruzat',
    estado.nombres[1] ?? '',
    estado.nombres[2] ?? '',
  ])
  const [propuestaId, setPropuestaId] = useState(propuestas[0]?.id ?? '')
  const [posicion, setPosicion] = useState(1)
  const guardada = useMemo(() => estado.calificaciones.find(
    (c) => c.propuestaId === propuestaId && c.posicionJurado === posicion,
  ), [estado.calificaciones, posicion, propuestaId])
  const [creatividad, setCreatividad] = useState(guardada?.creatividad ?? 0)
  const [cultura, setCultura] = useState(guardada?.cultura ?? 0)
  const [viabilidad, setViabilidad] = useState(guardada?.viabilidad ?? 0)
  const [atractivo, setAtractivo] = useState(guardada?.atractivo ?? 0)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, comenzar] = useTransition()

  function ejecutar(tarea: () => Promise<{ error?: string; ok?: string }>) {
    setError(null); setMensaje(null)
    comenzar(async () => {
      const resultado = await tarea()
      if (resultado.error) setError(resultado.error)
      else setMensaje(resultado.ok ?? 'Guardado.')
    })
  }

  return (
    <details className={estilos.admin}>
      <summary>Administración · jurado y visibilidad</summary>
      <div className={estilos.adminInterior}>
        <section>
          <h3>Jurado externo</h3>
          <div className={estilos.adminGrid}>
            {nombres.map((nombre, indice) => (
              <label key={indice}><span>Integrante {indice + 1}</span><input value={nombre} onChange={(e) => setNombres((actual) => actual.map((n, i) => i === indice ? e.target.value : n) as [string, string, string])} /></label>
            ))}
          </div>
          <button type="button" className={estilos.botonPunk} disabled={pendiente} onClick={() => ejecutar(() => guardarJuradoAction(nombres))}>Guardar jurado</button>
        </section>

        {propuestas.length > 0 && (
          <section>
            <h3>Capturar evaluación</h3>
            <div className={estilos.adminGrid}>
              <label><span>Propuesta</span><select value={propuestaId} onChange={(e) => setPropuestaId(e.target.value)}>{propuestas.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></label>
              <label><span>Jurado</span><select value={posicion} onChange={(e) => setPosicion(Number(e.target.value))}>{[1, 2, 3].map((n) => <option value={n} key={n}>{nombres[n - 1] || `Integrante ${n}`}</option>)}</select></label>
              {([
                ['Creatividad', creatividad, setCreatividad],
                ['Cultura', cultura, setCultura],
                ['Viabilidad', viabilidad, setViabilidad],
                ['Atractivo', atractivo, setAtractivo],
              ] as const).map(([etiqueta, valor, setter]) => (
                <label key={etiqueta}><span>{etiqueta} · 0–10</span><input type="number" min={0} max={10} step={1} value={valor} onChange={(e) => setter(Number(e.target.value))} /></label>
              ))}
            </div>
            <button type="button" className={estilos.botonPunk} disabled={pendiente || !propuestaId} onClick={() => ejecutar(() => guardarCalificacionAction(propuestaId, posicion, { creatividad, cultura, viabilidad, atractivo }))}>Guardar evaluación</button>
          </section>
        )}

        <section>
          <h3>Propuestas recibidas</h3>
          {/* Era una lista de `título · nombres` con un botón de ocultar: no
              dejaba ver el diseño ni permitía borrar nada, así que no servía
              para lo único que hace falta aquí, decidir sobre una propuesta.
              `AdminPropuestas` pinta lo que ya viajaba en los datos. */}
          <AdminPropuestas propuestas={propuestas} />
        </section>
        {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
        {mensaje && <p className={estilos.mensajeOk} role="status">{mensaje}</p>}
      </div>
    </details>
  )
}

