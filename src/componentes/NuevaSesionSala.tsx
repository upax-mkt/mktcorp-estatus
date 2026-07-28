'use client'

import { useState, useTransition } from 'react'
import { PLANTILLAS } from '@/secciones/plantillas'
import estilos from '@/app/sala/sala.module.css'

/**
 * Preparar una presentación DESDE la sala.
 *
 * Lo pidió Franco (punto 3): antes había que salir a `/preparar/nueva`,
 * elegir otra vez de qué sala era —estando ya dentro de ella— y volver. La
 * sala ya sabe de quién es; lo único que falta preguntar es qué reunión es y
 * para cuándo.
 */

interface Props {
  nombreSala: string
  crearAction: (datos: { plantilla: string; dia: string }) => Promise<{ error?: string }>
}

export function NuevaSesionSala({ nombreSala, crearAction }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0].id)
  const [dia, setDia] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  if (!abierto) {
    return (
      <button type="button" className={estilos.nuevaMinutaBoton} onClick={() => setAbierto(true)}>
        Preparar una presentación nueva
      </button>
    )
  }

  return (
    <form
      className={estilos.subirCaja}
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        empezar(async () => {
          const r = await crearAction({ plantilla, dia })
          if (r.error) setError(r.error)
        })
      }}
    >
      <div className={estilos.subirCampos}>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Qué reunión es</span>
          <select
            className={estilos.archivoInput}
            value={plantilla}
            onChange={(e) => setPlantilla(e.target.value)}
          >
            {PLANTILLAS.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </label>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Cuándo</span>
          <input
            type="date"
            className={estilos.archivoFechaInput}
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            required
          />
        </label>
      </div>

      <p className={estilos.subirPista}>
        Se crea para {nombreSala} y se abre el editor. La fecha se puede mover después.
      </p>
      {error && <p className={estilos.subirError}>{error}</p>}

      <div className={estilos.confirmarBorrado}>
        <button type="submit" className={estilos.archivoGuardar} disabled={pendiente || !dia}>
          {pendiente ? 'Creando…' : 'Crear y abrir el editor →'}
        </button>
        <button
          type="button"
          className={estilos.botonVolverSesion}
          onClick={() => setAbierto(false)}
          disabled={pendiente}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
