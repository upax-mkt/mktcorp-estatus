'use client'

import { useState } from 'react'
import { ListaOrdenable } from '@/componentes/ListaOrdenable'
import { maquetarBorrador } from '@/motor/maquetar'
import { estadoDeSeccion, type BorradorSeccion } from '@/secciones/borrador'
import { SeccionDocumento } from '@/componentes/sesion/SeccionDocumento'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import type { Tema } from '@/temas/tipos'
import estilos from './lienzo.module.css'
import documento from '@/componentes/sesion/documento.module.css'

/**
 * EL PREVISUALIZADOR: la sesión entera como se va a ver, y se reordena
 * arrastrando ahí mismo.
 *
 * Franco: "la edición de la ppt también debería ser en drag & drop desde un
 * previsualizador, y ya cuando todos hayan terminado de editar y estén ok con
 * el diseño se genera la presentación web".
 *
 * Lo que faltaba no era arrastrar —eso ya estaba— sino arrastrar VIENDO. En
 * la lista de formularios, cada sección es una tarjeta plegada con su título:
 * decidir si la comparativa va antes o después del pipeline obligaba a
 * acordarse de qué había dentro de cada una. Aquí se ve, y por eso se decide.
 *
 * NO ES UNA MAQUETA: cada sección se dibuja con el MISMO `SeccionDocumento` y
 * el MISMO tema de la sala que el documento final, a escala. Una vista previa
 * parecida pero no idéntica es peor que ninguna, porque enseña a desconfiar de
 * ella.
 *
 * Se calcula entero en el navegador: `maquetarBorrador` es puro y síncrono en
 * la ruta manual —no llama a ningún modelo— así que reordenar no cuesta una
 * petición.
 */

export interface SeccionEnLienzo {
  id: string
  titulo: string
  borrador: BorradorSeccion
  /** Las subsecciones se muestran dentro de su bloque y no se arrastran aquí. */
  esSub?: boolean
}

interface Props {
  secciones: SeccionEnLienzo[]
  tema: Tema
  reordenarAction: (idsEnOrden: string[]) => Promise<void>
  /** Llevar a la sección en el editor de formularios. */
  alAbrir: (id: string) => void
}

export function LienzoPrevio({ secciones, tema, reordenarAction, alAbrir }: Props) {
  const [zoom, setZoom] = useState(0.5)

  return (
    <div className={estilos.lienzo}>
      <div className={estilos.barra}>
        <span className="micro">Arrastra para reordenar. Haz clic en una sección para editarla.</span>
        <label className={estilos.zoom}>
          <span className="micro" data-sinpunto>Tamaño</span>
          <input
            type="range"
            min="0.35"
            max="0.9"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Tamaño de la vista previa"
          />
        </label>
      </div>

      <ListaOrdenable ids={secciones.map((s) => s.id)} reordenarAction={reordenarAction}>
        {secciones.map((s) => (
          <Tarjeta key={s.id} seccion={s} tema={tema} zoom={zoom} alAbrir={alAbrir} />
        ))}
      </ListaOrdenable>
    </div>
  )
}

function Tarjeta({
  seccion,
  tema,
  zoom,
  alAbrir,
}: {
  seccion: SeccionEnLienzo
  tema: Tema
  zoom: number
  alAbrir: (id: string) => void
}) {
  const maquetado = maquetarBorrador(seccion.borrador, seccion.titulo)
  const estado = estadoDeSeccion(seccion.borrador, seccion.titulo)

  return (
    <article className={estilos.tarjeta} data-estado={estado.estado}>
      <header className={estilos.cabecera}>
        <span className={estilos.nombre}>{seccion.titulo}</span>
        <Estado estado={estado} />
        <button type="button" className={estilos.editar} onClick={() => alAbrir(seccion.id)}>
          Editar
        </button>
      </header>

      {/*
        Se reduce con `zoom` y no bajando tipografías una a una: reducir
        tamaños por separado cambia las proporciones —una cifra grande deja de
        dominar— y entonces la vista previa ya no enseña lo que se va a
        proyectar. `zoom` mantiene todas las relaciones exactas Y afecta al
        espacio que ocupa, que es lo que `transform: scale` no hace.
      */}
      <button
        type="button"
        className={estilos.marco}
        onClick={() => alAbrir(seccion.id)}
        aria-label={`Editar la sección ${seccion.titulo}`}
      >
        <div className={estilos.escala} style={{ zoom }}>
          <ProveedorTema tema={tema} superficie="clara">
            <div className={documento.documento}>
              <SeccionDocumento decision={maquetado.decision} indice={0} />
            </div>
          </ProveedorTema>
        </div>
      </button>

      {maquetado.degradado && <p className={estilos.aviso}>{maquetado.motivo}</p>}
    </article>
  )
}

function Estado({ estado }: { estado: ReturnType<typeof estadoDeSeccion> }) {
  switch (estado.estado) {
    case 'lista':
      return <span className="pildora" data-tono="bien">lista</span>
    case 'con-problema':
      return <span className="pildora" data-tono="mal">{estado.motivo}</span>
    case 'incompleta':
      return <span className="pildora" data-tono="ojo">falta {estado.falta.join(' y ')}</span>
    case 'por-empezar':
      return <span className="pildora">por empezar</span>
  }
}
