'use client'

import { useRef, useState, useTransition } from 'react'
import { subirArchivoDirecto } from '@/lib/subir'
import { normalizarEnlace, idDeYouTube } from '@/lib/materiales'
import { pesoLegible, TAMANO_MAXIMO, TAMANO_MAXIMO_VIDEO, TOPE_VIDEO_MB } from '@/lib/blob'
import type { EvidenciaBenchmark as Evidencia } from '@/db/evidencia'
import { nombreDeDisciplina } from '@/dominio/benchmark'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LA EVIDENCIA DE UN BLOQUE DEL BENCHMARK: lo que sostiene el hallazgo.
 *
 * Franco: *"la evidencia mejor la cargaré manualmente según la categoría,
 * subiré imágenes o videos o url; crea el módulo… no quites el texto ya que
 * es su bajada explicativa"*.
 *
 * Dos decisiones que vienen de esa frase:
 *
 * 1. **La bajada es obligatoria.** Una captura sin una línea que diga QUÉ hay
 *    que mirar en ella es decoración, y esta pantalla la abre alguien que
 *    tiene cinco minutos antes de una reunión. El formulario no deja guardar
 *    sin ella.
 * 2. **Imagen, vídeo o enlace, en un solo sitio.** Para quien lo usa es la
 *    misma acción —"meter la prueba de esto"—; separarla en tres botones
 *    obliga a decidir antes de saber qué se va a meter.
 *
 * Cada pieza vive en el BLOQUE donde se carga (web, paid, RRSS, PR…), que es
 * lo que hace que la evidencia aparezca junto al hallazgo que sostiene y no
 * en un cajón al final.
 */

interface Props {
  salaSlug: string
  bloque: string
  piezas: Evidencia[]
  /** Solo el equipo carga y quita; el director mira. */
  equipo: boolean
  subirAction: (datos: {
    bloque: string
    titulo: string
    lectura: string
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }) => Promise<{ error?: string }>
  enlazarAction: (datos: {
    bloque: string
    titulo: string
    lectura: string
    enlace: string
  }) => Promise<{ error?: string }>
  quitarAction: (id: string) => Promise<void>
}

const ETIQUETA_TIPO: Record<Evidencia['tipo'], string> = {
  video: 'Vídeo',
  enlace: 'Enlace',
  imagen: 'Imagen',
  documento: 'Documento',
}

export function EvidenciaBenchmark({
  salaSlug,
  bloque,
  piezas,
  equipo,
  subirAction,
  enlazarAction,
  quitarAction,
}: Props) {
  if (piezas.length === 0 && !equipo) return null

  return (
    <div className={estilos.evBloque}>
      <span className={estilos.evEtiqueta}>La evidencia</span>

      {piezas.length === 0 ? (
        <p className={estilos.evVacio}>
          Sin evidencia cargada en {nombreDeDisciplina(bloque)}. Una captura de lo que hace la
          competencia, un vídeo o el enlace a su sitio.
        </p>
      ) : (
        <ul className={estilos.evLista}>
          {piezas.map((p) => (
            <Pieza key={p.id} pieza={p} equipo={equipo} quitarAction={quitarAction} />
          ))}
        </ul>
      )}

      {equipo && (
        <AnadirEvidencia
          salaSlug={salaSlug}
          bloque={bloque}
          subirAction={subirAction}
          enlazarAction={enlazarAction}
        />
      )}
    </div>
  )
}

/* El nombre va tal cual, SIN pasar a minúsculas: "PR y presencia
   institucional" salía como "pr y presencia institucional". */

function Pieza({
  pieza,
  equipo,
  quitarAction,
}: {
  pieza: Evidencia
  equipo: boolean
  quitarAction: Props['quitarAction']
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()
  // Una miniatura remota puede dejar de servir (un vídeo que se hace privado).
  // Cuando pasa se cae a la carátula, en vez de dejar el hueco roto.
  const [rota, setRota] = useState(false)
  const miniatura = rota ? null : pieza.miniatura
  // Un vídeo SUBIDO se reproduce aquí mismo; uno de YouTube abre fuera con su
  // portada. Los dos son `tipo: 'video'`; los distingue de dónde salen.
  const videoPropio = pieza.tipo === 'video' && !pieza.externo

  return (
    <li className={estilos.evPieza}>
      {videoPropio ? (
        <div className={estilos.evImagen}>
          {/* `preload="metadata"`: un bloque puede tener cuatro vídeos y
              precargarlos enteros son cien megas por abrir la página. */}
          <video src={pieza.destino} controls preload="metadata" />
        </div>
      ) : (
        <a
          href={pieza.destino}
          target="_blank"
          rel={pieza.externo ? 'noopener noreferrer' : 'noopener'}
          className={estilos.evImagen}
        >
          {miniatura ? (
            // `img` a pelo y no `next/image`: sale de /api/archivo/[id], que es
            // dinámica y privada — optimizarla en el servidor obligaría a
            // descargarla en cada render.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={miniatura} alt="" loading="lazy" onError={() => setRota(true)} />
          ) : (
            <span className={estilos.evCaratula}>{ETIQUETA_TIPO[pieza.tipo]}</span>
          )}
          {pieza.tipo === 'video' && <span className={estilos.materialPlay} aria-hidden="true" />}
        </a>
      )}

      <div className={estilos.evTexto}>
        <span className={estilos.evTitulo}>{pieza.titulo}</span>
        {/* LA BAJADA. Es lo que convierte una captura en evidencia: sin ella
            nadie sabe qué se supone que tiene que ver ahí. */}
        {pieza.lectura && <p>{pieza.lectura}</p>}
        {equipo && (
          <div className={estilos.evAcciones}>
            {confirmando ? (
              <>
                <button
                  type="button"
                  className={estilos.botonBorrar}
                  disabled={pendiente}
                  onClick={() => empezar(async () => { await quitarAction(pieza.id) })}
                >
                  {pendiente ? 'Quitando…' : 'Quitar'}
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
              <button
                type="button"
                className={estilos.botonIconoBorrar}
                onClick={() => setConfirmando(true)}
                aria-label={`Quitar ${pieza.titulo}`}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function AnadirEvidencia({
  salaSlug,
  bloque,
  subirAction,
  enlazarAction,
}: {
  salaSlug: string
  bloque: string
  subirAction: Props['subirAction']
  enlazarAction: Props['enlazarAction']
}) {
  const [abierto, setAbierto] = useState(false)
  const [camino, setCamino] = useState<'archivo' | 'enlace'>('archivo')
  const [titulo, setTitulo] = useState('')
  const [lectura, setLectura] = useState('')
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  // La bajada es obligatoria: sin ella la pieza es decoración.
  const listo = titulo.trim().length > 0 && lectura.trim().length > 0

  function cerrar() {
    setAbierto(false); setTitulo(''); setLectura(''); setEnlace('')
    setError(null); setCamino('archivo')
  }

  async function alElegirArchivo(archivo: File) {
    setError(null)
    // UN VÍDEO VIAJA POR LA CARPETA `video` DEL STORE, no por `evidencia`: la
    // ruta que autoriza la subida lee ese tramo para decidir QUÉ política
    // aplicar (tipos permitidos y tope de tamaño), y la de `evidencia` no
    // admite `video/mp4`. La fila en base sigue siendo `categoria: 'evidencia'`
    // —es lo que la hace aparecer en su bloque—; lo que cambia es dónde queda
    // el binario y con qué límite se le deja subir.
    const esVideo = archivo.type.startsWith('video/')
    const tope = esVideo ? TAMANO_MAXIMO_VIDEO : TAMANO_MAXIMO
    if (archivo.size > tope) {
      setError(
        `Pesa ${pesoLegible(archivo.size)} y el máximo son ${esVideo ? `${TOPE_VIDEO_MB} MB` : '100 MB'}.`,
      )
      return
    }
    setTrabajando(true)
    try {
      const subido = await subirArchivoDirecto(salaSlug, esVideo ? 'video' : 'evidencia', archivo)
      const r = await subirAction({ bloque, titulo: titulo.trim(), lectura: lectura.trim(), ...subido })
      if (r.error) { setError(r.error); return }
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir.')
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
      const res = await enlazarAction({ bloque, titulo: titulo.trim(), lectura: lectura.trim(), enlace: r.url })
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
      <button type="button" className={estilos.evAnadir} onClick={() => setAbierto(true)}>
        + Añadir evidencia
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
          type="button" className={estilos.materialCamino}
          data-activo={camino === 'archivo' ? 'true' : undefined}
          onClick={() => { setCamino('archivo'); setError(null) }}
        >
          Imagen o vídeo
        </button>
        <button
          type="button" className={estilos.materialCamino}
          data-activo={camino === 'enlace' ? 'true' : undefined}
          onClick={() => { setCamino('enlace'); setError(null) }}
        >
          Un enlace
        </button>
      </div>

      <div className={estilos.subirCampos}>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Título</span>
          <input
            type="text" className={estilos.archivoInput} value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Los anuncios que ISA lleva meses sin apagar" autoFocus
          />
        </label>
      </div>

      <label className={estilos.subirCampo}>
        <span className={estilos.subirEtiqueta}>Qué hay que mirar</span>
        <textarea
          className={estilos.archivoInput} rows={3} value={lectura}
          onChange={(e) => setLectura(e.target.value)}
          placeholder="La bajada: qué se aprende de esta pieza y por qué le importa a un comercial."
        />
      </label>

      {camino === 'archivo' ? (
        <>
          <input
            ref={entrada} type="file" accept="image/*,video/*"
            className={estilos.subirEntrada}
            disabled={trabajando || !listo}
            onChange={(e) => { const a = e.target.files?.[0]; if (a) void alElegirArchivo(a) }}
          />
          {!listo && <p className={estilos.subirPista}>Escribe el título y la bajada; después elige el archivo.</p>}
          {trabajando && <p className={estilos.subirPista}>Subiendo…</p>}
        </>
      ) : (
        <>
          <div className={estilos.subirCampos}>
            <label className={estilos.subirCampo}>
              <span className={estilos.subirEtiqueta}>Enlace</span>
              <input
                type="url" inputMode="url" className={estilos.archivoInput} value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                placeholder="youtube.com/watch?v=… · el sitio de un competidor · una nota"
              />
            </label>
          </div>
          {esVideo && <p className={estilos.subirPista}>Es un vídeo de YouTube: se guarda con su portada.</p>}
          <button
            type="button" className={estilos.archivoGuardar}
            disabled={trabajando || !listo || enlace.trim().length === 0}
            onClick={() => void guardarEnlace()}
          >
            {trabajando ? 'Guardando…' : 'Guardar la evidencia'}
          </button>
        </>
      )}

      {error && <p className={estilos.subirError}>{error}</p>}
      <button type="button" className={estilos.botonVolverSesion} onClick={cerrar} disabled={trabajando}>
        Cancelar
      </button>
    </div>
  )
}
