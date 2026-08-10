'use client'

import { useState, useTransition } from 'react'
import type { ArchivoSala } from '@/db/archivos'
import { pesoLegible } from '@/lib/blob'
import { materialParaVista } from '@/lib/materiales'
import { fechaBreveConAnio } from '@/lib/fecha'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * MATERIALES COMERCIALES de una sala, en rejilla con miniatura.
 *
 * Franco: *"En la sala de cada UDN, el módulo Archivos de Interés lo
 * cambiaremos por «Materiales Comerciales»; aquí no solo la UDN tienen PPT, o
 * PDF, también puede ser un video de YouTube o link de interés. Además la
 * vista debe ser más vistosa con un preview tal vez o miniatura de imagen con
 * el título del doc"*.
 *
 * Por qué una rejilla y no la lista de antes: lo que aquí se guarda es
 * material que se ENSEÑA (credenciales, un caso en vídeo, una nota de prensa).
 * Una lista de texto obliga a leer siete títulos para encontrar el deck de
 * credenciales; una rejilla con carátula se reconoce de un vistazo. Las
 * presentaciones anteriores siguen en lista (`ArchivosSala`) porque ahí lo
 * que ordena es la FECHA, no el aspecto.
 *
 * De dónde sale cada carátula lo decide `src/lib/materiales.ts`, que es la
 * única fuente de esa decisión y está probada aparte.
 */

interface Props {
  materiales: ArchivoSala[]
  /** Solo el equipo añade y edita; el director lee y abre. */
  equipo: boolean
  editarAction: (id: string, cambios: { titulo: string; fecha: string | null }) => Promise<void>
  eliminarAction: (id: string) => Promise<void>
}

export function MaterialesSala({ materiales, equipo, editarAction, eliminarAction }: Props) {
  if (materiales.length === 0) {
    return (
      <p className={estilos.vacioNota}>
        Credenciales, casos de éxito, un vídeo de YouTube, una nota de prensa: lo que la UDN
        necesite tener a mano para vender.
      </p>
    )
  }

  return (
    <ul className={estilos.materiales}>
      {materiales.map((m) => (
        <Material
          key={m.id}
          material={m}
          equipo={equipo}
          editarAction={editarAction}
          eliminarAction={eliminarAction}
        />
      ))}
    </ul>
  )
}

function Material({
  material,
  equipo,
  editarAction,
  eliminarAction,
}: {
  material: ArchivoSala
  equipo: boolean
  editarAction: Props['editarAction']
  eliminarAction: Props['eliminarAction']
}) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(material.titulo)
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()
  // Una miniatura remota puede fallar (un vídeo privado o borrado deja de
  // servir su portada). Cuando eso pasa se cae a la carátula tipográfica en
  // vez de dejar el hueco roto del navegador.
  const [miniaturaRota, setMiniaturaRota] = useState(false)

  const vista = materialParaVista(material)
  const peso = pesoLegible(material.tamanoBytes)
  const miniatura = miniaturaRota ? null : vista.miniatura

  if (editando) {
    return (
      <li className={estilos.materialEditando}>
        <input
          type="text"
          className={estilos.archivoInput}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Título del material"
          autoFocus
        />
        <div className={estilos.materialAccionesEdicion}>
          <button
            type="button"
            className={estilos.archivoGuardar}
            disabled={pendiente || titulo.trim().length === 0}
            onClick={() =>
              empezar(async () => {
                await editarAction(material.id, { titulo: titulo.trim(), fecha: material.fecha })
                setEditando(false)
              })
            }
          >
            {pendiente ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            className={estilos.botonVolverSesion}
            onClick={() => {
              setTitulo(material.titulo)
              setEditando(false)
            }}
          >
            Cancelar
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className={estilos.material} data-tipo={vista.tipo}>
      <a
        href={vista.destino}
        target="_blank"
        rel={vista.externo ? 'noopener noreferrer' : 'noopener'}
        className={estilos.materialEnlace}
      >
        <span className={estilos.materialCaratula} data-tipo={vista.tipo}>
          {miniatura ? (
            // `img` a pelo y no `next/image`: la portada de YouTube es un
            // dominio externo (habría que declararlo en la config) y la
            // miniatura de un fichero sale de /api/archivo/[id], que es
            // dinámica y privada — optimizarla en el servidor obligaría a
            // descargarla en cada render.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={miniatura}
              alt=""
              className={estilos.materialImagen}
              loading="lazy"
              onError={() => setMiniaturaRota(true)}
            />
          ) : (
            <span className={estilos.materialDistintivo}>{vista.distintivo}</span>
          )}
          {/* El triángulo de reproducir SOLO en vídeo: sin él, la portada de
              YouTube es indistinguible de una imagen cualquiera. */}
          {vista.tipo === 'video' && (
            <span className={estilos.materialPlay} aria-hidden="true" />
          )}
        </span>

        <span className={estilos.materialTexto}>
          <span className={estilos.materialTitulo}>{material.titulo}</span>
          <span className={estilos.materialMeta}>
            {/* El tipo va escrito, no solo codificado en la carátula: el color
                y el icono no pueden ser la única señal. */}
            {ETIQUETA_TIPO[vista.tipo]}
            {vista.tipo === 'enlace' && <> · {vista.distintivo}</>}
            {peso && <> · {peso}</>}
            {material.fecha && <> · {fechaBreveConAnio(material.fecha)}</>}
          </span>
        </span>
      </a>

      {equipo && (
        <div className={estilos.materialAcciones}>
          {confirmando ? (
            <>
              <button
                type="button"
                className={estilos.botonBorrar}
                disabled={pendiente}
                onClick={() => empezar(async () => { await eliminarAction(material.id) })}
              >
                {pendiente ? 'Borrando…' : 'Borrar'}
              </button>
              <button
                type="button"
                className={estilos.botonCancelarBorrado}
                onClick={() => setConfirmando(false)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={estilos.botonVolverSesion}
                onClick={() => setEditando(true)}
              >
                Renombrar
              </button>
              <button
                type="button"
                className={estilos.botonIconoBorrar}
                onClick={() => setConfirmando(true)}
                aria-label={`Quitar ${material.titulo}`}
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

const ETIQUETA_TIPO: Record<ReturnType<typeof materialParaVista>['tipo'], string> = {
  video: 'Vídeo',
  enlace: 'Enlace',
  imagen: 'Imagen',
  documento: 'Documento',
}
