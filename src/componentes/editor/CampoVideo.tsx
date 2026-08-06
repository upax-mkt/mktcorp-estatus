'use client'

import { useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { pesoLegible, rutaDeArchivo, TIPOS_VIDEO, TOPE_VIDEO_MB, TAMANO_MAXIMO_VIDEO } from '@/lib/blob'
import estilos from './editor.module.css'

// Re-exportadas: `TOPE_VIDEO_MB`/`TIPOS_VIDEO` viven en `@/lib/blob` (fuente
// única con el tope de servidor de `/api/archivos/subir`), pero este campo es
// quien las enseña en pantalla y quien las usa para cortar antes de subir.
export { TIPOS_VIDEO, TOPE_VIDEO_MB }

/**
 * El vídeo de una sección (ronda 9, tarea 7): se SUBE, como la imagen — nunca
 * se pega un enlace de YouTube aquí, eso ya existe hoy como una sección de
 * enlaces aparte.
 *
 * DOS TOPES, EL MISMO NÚMERO. El de aquí es cortesía: avisa ANTES de que
 * alguien empiece a subir un archivo de 800 MB y espere diez minutos para que
 * lo rechacen. El que de verdad manda vive en `/api/archivos/subir` — ese es
 * el que no se puede saltar. `TOPE_VIDEO_MB` es más alto que el de la imagen
 * (100 MB) porque un vídeo pesa más; y el aviso, siempre visible y no solo
 * como error, sugiere la salida para uno más largo: un enlace a YouTube o
 * Drive en una sección de enlaces.
 *
 * Formatos: `video/mp4` y `video/webm` — lo que Chrome reproduce sin
 * plugins. Nada de contenedores que necesiten un códec que el navegador no
 * trae de fábrica.
 *
 * Va del navegador DIRECTO a Blob, igual que la imagen, y cuelga de LA
 * REUNIÓN: quien puede ver el documento puede ver su vídeo, incluso si la
 * reunión no es de ninguna sala.
 */

export interface ValorVideo {
  url: string
  /** Cómo se llama en el documento — el nombre del archivo que se subió. */
  titulo: string
}

export type SubirVideo = (datos: {
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
}) => Promise<{ url?: string; error?: string }>

interface Props {
  valor: ValorVideo | null
  alCambiar: (video: ValorVideo | null) => void
  /** Dónde colgar el vídeo subido. Sin reunión, no se puede subir nada. */
  reunionId?: string
  subirVideoAction?: SubirVideo
}

export function CampoVideo({ valor, alCambiar, reunionId, subirVideoAction }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  async function alElegir(archivo: File) {
    setError(null)
    if (!TIPOS_VIDEO.includes(archivo.type)) {
      setError('Tiene que ser un vídeo: MP4 o WebM — lo que Chrome reproduce sin plugins.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO_VIDEO) {
      setError(
        `Pesa ${pesoLegible(archivo.size)} y el máximo son ${TOPE_VIDEO_MB} MB. Para uno más pesado, ` +
          'pon un enlace a YouTube o Drive en una sección de enlaces.',
      )
      return
    }
    if (!subirVideoAction || !reunionId) {
      setError('Esta sección todavía no se puede guardar. Recarga la página.')
      return
    }

    setSubiendo(true)
    try {
      // El prefijo `sesion-` del primer argumento es namespacing de storage,
      // no el identificador que se retira en esta tarea: sigue igual a
      // propósito, para no cambiar la forma de las rutas de Blob ya escritas.
      const subido = await upload(rutaDeArchivo(`sesion-${reunionId}`, 'video', archivo.name), archivo, {
        access: 'private',
        handleUploadUrl: '/api/archivos/subir',
        contentType: archivo.type || undefined,
      })
      const r = await subirVideoAction({
        ruta: subido.pathname,
        nombreOriginal: archivo.name,
        tipoContenido: archivo.type || null,
        tamanoBytes: archivo.size,
      })
      if (r.error || !r.url) {
        setError(r.error ?? 'No se pudo registrar el vídeo.')
        return
      }
      alCambiar({ url: r.url, titulo: archivo.name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el vídeo.')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <div className={estilos.campo}>
      <span>Vídeo</span>

      {valor ? (
        <div className={estilos.videoPuesto}>
          <video
            src={valor.url}
            controls
            preload="metadata"
            aria-label={valor.titulo}
            className={estilos.videoReproductorCampo}
          />
          <div className={estilos.imagenAcciones}>
            <span className={estilos.imagenRuta}>{valor.titulo}</span>
            <button type="button" className={estilos.quitarImagen} onClick={() => alCambiar(null)}>
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_VIDEO.join(',')}
            className={estilos.entradaArchivo}
            disabled={subiendo}
            onChange={(e) => {
              const a = e.target.files?.[0]
              if (a) void alElegir(a)
            }}
          />
          {/* SIEMPRE visible, no solo al fallar: avisar del tope DESPUÉS de
              que alguien esperó una subida larga es peor que no avisar. */}
          <em className={estilos.pista}>
            Hasta {TOPE_VIDEO_MB} MB, en MP4 o WebM. Para uno más largo, un enlace a YouTube o Drive
            en una sección de enlaces se ve igual de bien.
          </em>
          {subiendo && <em className={estilos.pista}>Subiendo…</em>}
        </>
      )}

      {error && <p className={estilos.errorImagen}>{error}</p>}
    </div>
  )
}
