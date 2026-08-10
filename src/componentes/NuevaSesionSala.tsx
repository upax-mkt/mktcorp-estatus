'use client'

import { useState, useTransition } from 'react'
import { PLANTILLAS } from '@/secciones/plantillas'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * Preparar una presentación DESDE la sala.
 *
 * Lo pidió Franco (punto 3): antes había que salir a `/deck/nueva`,
 * elegir otra vez de qué sala era —estando ya dentro de ella— y volver. La
 * sala ya sabe de quién es; lo único que falta preguntar es qué reunión es y
 * para cuándo.
 *
 * TÍTULO, OPCIONAL (deuda menor, cierre de ronda) — el tercero de tres
 * formularios que mandaban el título vacío. `AgendarRapido` (Home) y
 * `deck/nueva` ya lo piden y reenvían; este atajo era el único que se había
 * quedado atrás — no porque `crearSesionAction` (`page.tsx`) no supiera qué
 * hacer con un título, sino porque este formulario nunca se lo daba a
 * escoger: la acción mandaba `titulo: ''` FIJO, sin mirar nada. Caso real:
 * Research Land tiene dos quincenales en la MISMA sala —Comercial y
 * Digital— indistinguibles en cualquier lista si las dos caen al mismo
 * `tituloPorDefecto` (`src/db/documentos.ts`), que describe la CADENCIA, no
 * el contenido. Mismo vocabulario que los otros dos formularios ya
 * arreglados: campo "Título", opcional, mismo placeholder — quien tiene
 * prisa lo deja en blanco y el servidor resuelve un título legible por su
 * cuenta.
 */

interface Props {
  nombreSala: string
  crearAction: (datos: { plantilla: string; dia: string; titulo: string }) => Promise<{ error?: string }>
}

export function NuevaSesionSala({ nombreSala, crearAction }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0].id)
  const [dia, setDia] = useState('')
  const [titulo, setTitulo] = useState('')
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
          const r = await crearAction({ plantilla, dia, titulo })
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

      {/* OPCIONAL (ver el comentario del archivo): en su propia fila
          `subirCampos` —`.subirCampo` está pensado como hijo de un flex-row,
          no del flex-column de `.subirCaja`; ponerlo ahí directo lo hubiera
          estirado en ALTO (`flex-basis` sigue el eje principal del padre) en
          vez de dejarlo a todo lo ancho— mismo criterio visual con el que
          `AgendarRapido` y `deck/nueva` separan su "Título" del resto de los
          campos. Mismo vocabulario ("Título", mismo placeholder) que esos dos
          formularios. */}
      <div className={estilos.subirCampos}>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Título</span>
          <input
            type="text"
            className={estilos.archivoInput}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Si lo dejas vacío, se pone uno solo"
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
