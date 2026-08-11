'use client'

import { useState, useTransition } from 'react'
import { PLANTILLAS } from '@/secciones/plantillas'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * CREAR UNA REUNIÓN desde la sala.
 *
 * Franco: *"aparece un botón que dice crear presentación y debería ser crear
 * reunión; una vez que la creo debo decidir si la creo con el editor de
 * presentaciones o cargar un archivo ya creado"*.
 *
 * Se llamaba "Preparar una presentación nueva" y terminaba en el editor, así
 * que agendar una junta y empezar a maquetar su deck eran el mismo gesto:
 * quien ya tenía la presentación hecha acababa igual dentro del editor, con
 * ocho secciones vacías que nadie iba a llenar. Ahora esto crea la REUNIÓN y
 * ya; la presentación se elige después, en "Lo que viene", donde las dos
 * vías están una al lado de la otra.
 *
 * "Qué reunión es" SE SIGUE PREGUNTANDO AQUÍ, y no es una contradicción: es
 * una propiedad de la junta —un comité no es un estatus de UDN— y lo que
 * decide con qué secciones nace su deck el día que se arme. Se guarda en la
 * reunión (migración 0035) y espera ahí.
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
        + Crear reunión
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
          if (r.error) { setError(r.error); return }
          // Se cierra y se limpia: la reunión recién creada aparece justo
          // encima, en "Lo que viene", con las dos vías para su presentación.
          // Antes esto no hacía falta porque la acción redirigía al editor.
          setDia(''); setTitulo(''); setAbierto(false)
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
        Se agenda para {nombreSala}. Después eliges si armas la presentación aquí o subes la que ya
        tienes hecha. La fecha se puede mover.
      </p>
      {error && <p className={estilos.subirError}>{error}</p>}

      <div className={estilos.confirmarBorrado}>
        <button type="submit" className={estilos.archivoGuardar} disabled={pendiente || !dia}>
          {pendiente ? 'Creando…' : 'Crear reunión'}
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
