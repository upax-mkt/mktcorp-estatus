'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import type { PropuestaConcurso } from '@/db/concurso'
import { eliminarPropuestaAction, establecerVisibilidadPropuestaAction } from '@/app/concurso/acciones'

/**
 * EL ADMINISTRADOR DE PROPUESTAS, con lo que hace falta para decidir sobre ellas.
 *
 * Franco: *«en el administrador de propuestas enviadas por el equipo solo me
 * muestra info resumida, no puedo eliminar por ejemplo una propuesta realizada
 * por error o algo que no cumpla bases, no veo la imagen cargada, nada»*.
 *
 * Lo que había era una lista de `título · nombres` con un botón de ocultar. Los
 * datos —imágenes, descripción, squads, fechas— ya viajaban en `PropuestaConcurso`
 * desde el primer día; simplemente no se pintaban. Y no se podía juzgar si algo
 * cumple las bases sin ver justo lo que no se enseñaba: el diseño.
 *
 * LA IMAGEN VA POR `/api/concurso/imagen/<id>`, no por su URL de Blob. Esa ruta
 * comprueba sesión, autoría y fase antes de servir un byte (`imagenConcursoParaServir`),
 * que es lo que mantiene la galería cerrada hasta el 7 de septiembre. Un `<img>`
 * apuntando al blob se saltaría esa puerta.
 */
export function AdminPropuestas({ propuestas }: { propuestas: PropuestaConcurso[] }) {
  const [pendiente, comenzar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  /** Qué propuesta está pidiendo confirmación de borrado. */
  const [borrando, setBorrando] = useState<string | null>(null)

  function ejecutar(accion: () => Promise<{ error?: string; ok?: string }>) {
    setError(null)
    setMensaje(null)
    comenzar(async () => {
      const r = await accion()
      if (r.error) setError(r.error)
      else setMensaje(r.ok ?? 'Hecho.')
    })
  }

  if (propuestas.length === 0) {
    return <p className={estilos.adminVacio}>Todavía no hay propuestas.</p>
  }

  return (
    <div className={estilos.adminPropuestas}>
      <p className={estilos.adminConteo}>
        {propuestas.length} {propuestas.length === 1 ? 'propuesta recibida' : 'propuestas recibidas'}
      </p>

      {propuestas.map((p) => (
        <article key={p.id} className={`${estilos.adminFicha} ${p.oculta ? estilos.adminOculta : ''}`}>
          <div className={estilos.adminImagenes}>
            {p.imagenes.length === 0 && <span className={estilos.adminSinImagen}>Sin imagen</span>}
            {p.imagenes.map((img) => (
              /* Un enlace y no un visor propio: abrir la imagen a tamaño real
                 en otra pestaña es lo que un administrador espera, y no hay que
                 mantener un lightbox para conseguirlo. */
              <a key={img.id} href={`/api/concurso/imagen/${img.id}`} target="_blank" rel="noreferrer" title={`${img.nombreOriginal} — abrir a tamaño real`}>
                {/* `<img>` y no `next/image`: la ruta es dinámica y protegida
                    por sesión, así que el optimizador no puede pre-procesarla.
                    Y sin `loading="lazy"`: aquí son cuatro imágenes como mucho
                    y el administrador viene justamente a verlas; con lazy, las
                    que quedan bajo el pliegue no se piden hasta hacer scroll. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/concurso/imagen/${img.id}`} alt={`${p.titulo} — ${img.nombreOriginal}`} />
              </a>
            ))}
          </div>

          <div className={estilos.adminDatos}>
            <h4>
              {p.titulo}
              {p.oculta && <span className={estilos.adminEtiquetaOculta}>OCULTA</span>}
            </h4>
            <p className={estilos.adminAutores}>
              {p.integrantes.map((i) => `${i.nombre} · ${i.squad ?? 'sin squad'}`).join('  +  ')}
            </p>
            <p className={estilos.adminDescripcion}>{p.descripcion}</p>
            <p className={estilos.adminMeta}>
              {p.imagenes.length} {p.imagenes.length === 1 ? 'imagen' : 'imágenes'}
              {p.imagenes.length > 0 && ` · ${Math.round(p.imagenes.reduce((n, i) => n + i.tamanoBytes, 0) / 1024)} KB`}
              {' · enviada el '}
              {new Date(p.creadaEn).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}
            </p>

            <div className={estilos.adminAcciones}>
              <button type="button" disabled={pendiente} onClick={() => ejecutar(() => establecerVisibilidadPropuestaAction(p.id, p.oculta))}>
                {p.oculta ? 'Volver a publicar' : 'Ocultar de la galería'}
              </button>

              {/* BORRAR PIDE CONFIRMACIÓN EN DOS TIEMPOS, y no un `confirm()`
                  del navegador: esto no tiene deshacer —se lleva la propuesta,
                  sus imágenes y los votos que hubiera recibido— y el segundo
                  botón dice qué se pierde, no «¿Estás seguro?». */}
              {borrando === p.id ? (
                <span className={estilos.adminConfirmar}>
                  <strong>Se borra la propuesta, sus imágenes y sus votos. No se puede deshacer.</strong>
                  <button type="button" disabled={pendiente} className={estilos.adminBorrar} onClick={() => { setBorrando(null); ejecutar(() => eliminarPropuestaAction(p.id)) }}>
                    Sí, eliminar
                  </button>
                  <button type="button" disabled={pendiente} onClick={() => setBorrando(null)}>Cancelar</button>
                </span>
              ) : (
                <button type="button" disabled={pendiente} className={estilos.adminBorrar} onClick={() => setBorrando(p.id)}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </article>
      ))}

      {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
      {mensaje && <p className={estilos.mensajeOk} role="status">{mensaje}</p>}
    </div>
  )
}
