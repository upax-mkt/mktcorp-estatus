'use client'

import { useRef, useState } from 'react'
import { subirArchivoDirecto } from '@/lib/subir'
import { normalizarEnlace, idDeYouTube } from '@/lib/materiales'
import { pesoLegible, TAMANO_MAXIMO } from '@/lib/blob'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * AÑADIR UN MATERIAL COMERCIAL: un archivo o un enlace.
 *
 * Dos caminos en un solo sitio porque para quien lo usa es la misma acción
 * —"meter algo en la carpeta de la UDN"— y separarlos en dos botones obliga a
 * decidir antes de saber qué se va a meter.
 *
 * El TÍTULO se pide primero en los dos caminos, por el mismo motivo de
 * siempre: elegir el archivo dispara la subida, y si el registro usara lo que
 * hay en pantalla cuando termina, un título a medio escribir quedaría a
 * medias. En el camino del enlace no haría falta, pero pedirlo igual mantiene
 * un solo formulario.
 */

interface Props {
  salaSlug: string
  registrarArchivoAction: (datos: {
    titulo: string
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }) => Promise<{ error?: string }>
  registrarEnlaceAction: (datos: { titulo: string; enlace: string }) => Promise<{ error?: string }>
}

type Camino = 'archivo' | 'enlace'

export function AnadirMaterial({ salaSlug, registrarArchivoAction, registrarEnlaceAction }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [camino, setCamino] = useState<Camino>('archivo')
  const [titulo, setTitulo] = useState('')
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const tituloListo = titulo.trim().length > 0

  function cerrar() {
    setAbierto(false)
    setTitulo('')
    setEnlace('')
    setError(null)
    setCamino('archivo')
  }

  async function alElegirArchivo(archivo: File) {
    setError(null)
    // Se comprueba aquí ADEMÁS de en el servidor. El servidor es el que manda;
    // esto solo evita esperar dos minutos a que suba algo que iba a
    // rechazarse al final.
    if (archivo.size > TAMANO_MAXIMO) {
      setError(`El archivo pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`)
      return
    }
    setTrabajando(true)
    try {
      const subido = await subirArchivoDirecto(salaSlug, 'interes', archivo)
      const r = await registrarArchivoAction({ titulo: titulo.trim(), ...subido })
      if (r.error) { setError(r.error); return }
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el archivo.')
    } finally {
      setTrabajando(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  async function guardarEnlace() {
    setError(null)
    const r = normalizarEnlace(enlace)
    if ('error' in r) { setError(r.error); return }
    setTrabajando(true)
    try {
      const res = await registrarEnlaceAction({ titulo: titulo.trim(), enlace: r.url })
      if (res.error) { setError(res.error); return }
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el enlace.')
    } finally {
      setTrabajando(false)
    }
  }

  if (!abierto) {
    return (
      <button type="button" className={estilos.nuevaMinutaBoton} onClick={() => setAbierto(true)}>
        + Añadir material
      </button>
    )
  }

  const esVideo = camino === 'enlace' && enlace.trim().length > 0 && idDeYouTube(
    /^[a-z][a-z0-9+.-]*:/i.test(enlace.trim()) ? enlace.trim() : `https://${enlace.trim()}`,
  ) !== null

  return (
    <div className={estilos.subirCaja}>
      <div className={estilos.materialCaminos} role="group" aria-label="Qué se va a añadir">
        <button
          type="button"
          className={estilos.materialCamino}
          data-activo={camino === 'archivo' ? 'true' : undefined}
          onClick={() => { setCamino('archivo'); setError(null) }}
        >
          Un archivo
        </button>
        <button
          type="button"
          className={estilos.materialCamino}
          data-activo={camino === 'enlace' ? 'true' : undefined}
          onClick={() => { setCamino('enlace'); setError(null) }}
        >
          Un enlace o vídeo
        </button>
      </div>

      <div className={estilos.subirCampos}>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Título</span>
          <input
            type="text"
            className={estilos.archivoInput}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Cómo se llama en la lista"
            autoFocus
          />
        </label>
      </div>

      {camino === 'archivo' ? (
        <>
          <input
            ref={entrada}
            type="file"
            className={estilos.subirEntrada}
            disabled={trabajando || !tituloListo}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void alElegirArchivo(archivo)
            }}
          />
          {!tituloListo && (
            <p className={estilos.subirPista}>Escribe el título y después elige el archivo.</p>
          )}
          {trabajando && <p className={estilos.subirPista}>Subiendo…</p>}
        </>
      ) : (
        <>
          <div className={estilos.subirCampos}>
            <label className={estilos.subirCampo}>
              <span className={estilos.subirEtiqueta}>Enlace</span>
              <input
                type="url"
                inputMode="url"
                className={estilos.archivoInput}
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                placeholder="youtube.com/watch?v=… · una nota de prensa · un caso"
              />
            </label>
          </div>
          {esVideo && (
            <p className={estilos.subirPista}>
              Es un vídeo de YouTube: se guardará con su portada.
            </p>
          )}
          <button
            type="button"
            className={estilos.archivoGuardar}
            disabled={trabajando || !tituloListo || enlace.trim().length === 0}
            onClick={() => void guardarEnlace()}
          >
            {trabajando ? 'Guardando…' : 'Guardar el enlace'}
          </button>
        </>
      )}

      {error && <p className={estilos.subirError}>{error}</p>}

      <button
        type="button"
        className={estilos.botonVolverSesion}
        onClick={cerrar}
        disabled={trabajando}
      >
        Cancelar
      </button>
    </div>
  )
}
