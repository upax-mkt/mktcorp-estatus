'use client'

import { useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { pesoLegible, rutaDeArchivo, TAMANO_MAXIMO } from '@/lib/blob'
import { ALINEACIONES_IMAGEN, type AlineacionImagen, type ImagenSeccion } from '@/decision/esquema'
import estilos from './editor.module.css'

/**
 * La imagen de una sección: se SUBE, no se pega una URL.
 *
 * Pedir una URL era pedirle a alguien que primero subiera el archivo a otro
 * sitio —Drive, el repositorio— y volviera con el enlace. Y si ese enlace era
 * de Drive, la imagen no se veía: Drive no sirve imágenes incrustables. Así
 * que el campo funcionaba en teoría y fallaba en la práctica casi siempre.
 *
 * Va del navegador DIRECTO a Blob, igual que los archivos de sala, y se
 * registra colgando de LA REUNIÓN: quien puede ver el documento puede ver su
 * imagen, incluso si la reunión no es de ninguna sala.
 *
 * El campo de texto sigue existiendo, plegado: una imagen que ya vive en el
 * proyecto (`/assets/…`) no necesita subirse otra vez.
 *
 * ANCHO Y ALINEACIÓN (ronda 9, tarea 7): un tirador de 25 a 100% del ancho de
 * la columna, y a qué lado cae cuando no ocupa el 100%. Viven en el mismo
 * objeto que la URL —`ImagenSeccion`, `src/decision/esquema.ts`— y se aplican
 * al pintarla en `SeccionDocumento`, así que el editor, el documento y el
 * modo presentación muestran EXACTAMENTE lo mismo. Esto NO recorta ni edita
 * la imagen: sigue siendo el archivo entero, solo más angosto en la página.
 */

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

const ANCHO_MINIMO = 25
const ANCHO_MAXIMO = 100
const ANCHO_POR_DEFECTO = 100
const ALINEACION_POR_DEFECTO: AlineacionImagen = 'centro'

const ETIQUETA_ALINEACION: Record<AlineacionImagen, string> = {
  izquierda: 'Izquierda',
  centro: 'Centro',
  derecha: 'Derecha',
}

interface Props {
  valor: ImagenSeccion | undefined
  onChange: (imagen: ImagenSeccion | undefined) => void
  /** Dónde colgar la imagen subida. Sin reunión, solo queda pegar una ruta. */
  reunionId?: string
  subirImagenAction?: (datos: {
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }) => Promise<{ url?: string; error?: string }>
}

export function CampoImagen({ valor, onChange, reunionId, subirImagenAction }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pegarRuta, setPegarRuta] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  async function alElegir(archivo: File) {
    setError(null)
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setError('Tiene que ser una imagen: PNG, JPG, WebP, GIF o SVG.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setError(`Pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`)
      return
    }
    if (!subirImagenAction || !reunionId) {
      setError('Esta sección todavía no se puede guardar. Recarga la página.')
      return
    }

    setSubiendo(true)
    try {
      // El prefijo `sesion-` del primer argumento es namespacing de storage,
      // no el identificador que se retira en esta tarea: sigue igual a
      // propósito, para no cambiar la forma de las rutas de Blob ya escritas.
      const subido = await upload(rutaDeArchivo(`sesion-${reunionId}`, 'imagen', archivo.name), archivo, {
        access: 'private',
        handleUploadUrl: '/api/archivos/subir',
        contentType: archivo.type || undefined,
      })
      const r = await subirImagenAction({
        ruta: subido.pathname,
        nombreOriginal: archivo.name,
        tipoContenido: archivo.type || null,
        tamanoBytes: archivo.size,
      })
      if (r.error || !r.url) {
        setError(r.error ?? 'No se pudo registrar la imagen.')
        return
      }
      onChange({ url: r.url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <div className={estilos.campo}>
      <span>Imagen</span>

      {valor ? (
        <>
          <div className={estilos.imagenPuesta}>
            {/* Sin next/image: la ruta la sirve nuestra propia API con
                permiso, y declarar ese origen en la configuración de
                imágenes no aporta nada cuando el tamaño real lo pone el
                documento. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={valor.url} alt="" className={estilos.imagenMiniatura} />
            <div className={estilos.imagenAcciones}>
              <span className={estilos.imagenRuta}>{valor.url}</span>
              <button
                type="button"
                className={estilos.quitarImagen}
                onClick={() => onChange(undefined)}
              >
                Quitar
              </button>
            </div>
          </div>

          {/* Ancho y alineación: NO recorta ni edita la imagen, solo decide
              cuánto de la columna ocupa y a qué lado cae — eso es otro
              producto y no es lo que se pidió. */}
          <div className={estilos.imagenAjustes}>
            <label className={estilos.imagenAncho}>
              <span>Ancho — {valor.anchoPorcentaje ?? ANCHO_POR_DEFECTO}%</span>
              <input
                type="range"
                min={ANCHO_MINIMO}
                max={ANCHO_MAXIMO}
                step={5}
                value={valor.anchoPorcentaje ?? ANCHO_POR_DEFECTO}
                onChange={(e) => onChange({ ...valor, anchoPorcentaje: Number(e.target.value) })}
                aria-label="Ancho de la imagen, en porcentaje del ancho de la columna"
              />
            </label>

            <div className={estilos.imagenAlineacion} role="group" aria-label="Alineación de la imagen">
              {ALINEACIONES_IMAGEN.map((opcion) => {
                const activa = (valor.alineacion ?? ALINEACION_POR_DEFECTO) === opcion
                return (
                  <button
                    key={opcion}
                    type="button"
                    className={estilos.botonAlineacion}
                    aria-pressed={activa}
                    onClick={() => onChange({ ...valor, alineacion: opcion })}
                  >
                    {ETIQUETA_ALINEACION[opcion]}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_IMAGEN.join(',')}
            className={estilos.entradaArchivo}
            disabled={subiendo}
            onChange={(e) => {
              const a = e.target.files?.[0]
              if (a) void alElegir(a)
            }}
          />
          {subiendo && <em className={estilos.pista}>Subiendo…</em>}
        </>
      )}

      {error && <p className={estilos.errorImagen}>{error}</p>}

      {/* Para una imagen que ya vive en el proyecto. Plegado: es el caso raro. */}
      {!valor && (
        pegarRuta ? (
          <input
            value=""
            onChange={(e) => onChange(e.target.value ? { url: e.target.value } : undefined)}
            placeholder="/assets/testigo.jpg"
            aria-label="Ruta de la imagen"
            autoFocus
          />
        ) : (
          <button type="button" className={estilos.enlacePlegado} onClick={() => setPegarRuta(true)}>
            ¿La imagen ya está en el proyecto? Pega su ruta
          </button>
        )
      )}
    </div>
  )
}
