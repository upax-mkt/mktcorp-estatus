'use client'

import { useState, useTransition } from 'react'
import { PLANTILLAS, obtenerPlantilla } from '@/secciones/plantillas'
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
 * "¿QUÉ JUNTA ES?" SE SIGUE PREGUNTANDO AQUÍ, y no es una contradicción: es
 * una propiedad de la junta —un comité no es un estatus de UDN— y es la
 * CAUSA, no la consecuencia. El desplegable preguntaba antes por una
 * "plantilla": el nombre técnico de cómo se arma el deck por dentro, que es
 * justo lo que a quien agenda no le toca decidir todavía. Lo que sí sabe,
 * porque es lo único que tiene enfrente al agendar, es qué CLASE de junta va
 * a dar —un Sync Comercial, un comité, un arranque de campaña—. Es la clase
 * la que decide con qué secciones nace el deck (el `paraQue` de cada una,
 * bajo el desplegable, existe para que se note ANTES de elegir, no después
 * abriendo el editor a ciegas) y no al revés: el deck no elige la junta. Se
 * guarda en la reunión (migración 0035) y espera ahí.
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
  // PLANTILLAS[0].id y no un id escrito a mano: el orden del catálogo puede
  // moverse (task 1 ya movió "en-blanco" al final) y el primero de la lista
  // sigue siendo "estatus-udn" —la reunión mensual con una UDN, el valor por
  // defecto correcto para una sala—. Escribirlo a pelo aquí lo desincroniza
  // del catálogo el día que alguien reordene de nuevo.
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0].id)
  const plantillaElegida = obtenerPlantilla(plantilla)
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
        {/* El desplegable de CLASE DE JUNTA es solo de este formulario: no se
            extrae a un componente compartido aunque `deck/nueva` vaya a
            necesitar el mismo select más adelante. Hay otro agente montando
            ese formulario en paralelo ahora mismo, y dos agentes creando el
            mismo componente compartido a la vez es una colisión garantizada.
            Se unifica cuando existan los DOS llamadores de verdad —que es
            cuando la extracción está justificada—, no antes. */}
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>¿Qué junta es?</span>
          <select
            className={estilos.archivoInput}
            value={plantilla}
            onChange={(e) => setPlantilla(e.target.value)}
            aria-label="¿Qué junta es?"
          >
            {/* `optgroup`, no un separador de guiones dibujado a mano: es el
                mecanismo nativo del <select> para agrupar opciones, y el que
                un lector de pantalla anuncia como grupo en vez de leer texto
                suelto. Las clases van en el orden del catálogo; "en-blanco"
                sale de ahí porque NO es una clase de junta —es la salida de
                emergencia para cuando ninguna encaja— y por eso vive en su
                propio grupo, al final, con una etiqueta que dice las dos
                cosas: que no es una clase, y qué hace si se elige. */}
            <optgroup label="Clases de junta">
              {PLANTILLAS.filter((p) => p.id !== 'en-blanco').map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Otra">
              <option value="en-blanco">Otra (deck en blanco)</option>
            </optgroup>
          </select>
          {/* La línea que faltaba: el catálogo ya trae un `paraQue` por
              plantilla —una frase de cuándo elegir esa y no otra— y hasta
              hoy no se enseñaba en ningún sitio. Sin esto, elegir era
              adivinar por el nombre. */}
          <p className={estilos.subirPista}>{plantillaElegida.paraQue}</p>
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
