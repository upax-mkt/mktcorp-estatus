'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MinutaCliente } from '@/app/preparar/[id]/minuta/MinutaCliente'
import { fechaCompleta } from '@/lib/fecha'
import estilos from '@/app/sala/sala.module.css'

/**
 * Levantar una minuta desde donde se esté.
 *
 * Franco: "un botón para cargar una transcripción y generar con IA la minuta
 * directamente". Directamente significa DESDE AQUÍ: hasta ahora había que
 * acordarse de qué sesión era, entrar al preparador, buscarla y abrir su
 * pantalla de minuta.
 *
 * AGNÓSTICO de dónde vive: la sala le pasa sus sesiones sin minuta y el Home
 * le pasa las de las diez. Lo único que cambia es si cada fila dice de qué
 * sala es. Es la misma pieza porque es la misma tarea, y tenerla dos veces
 * garantiza que una de las dos se quede atrás.
 *
 * Lo que NO se salta es la revisión. La generación propone acuerdos y esos
 * acuerdos, al publicarse, nacen en la sala con dueño y fecha: pasan por la
 * misma pantalla de revisión de siempre (`MinutaCliente`, reutilizada tal
 * cual), solo que dentro de esta ventana. Publicar sin revisar sería meter en
 * la sala de un director compromisos que nadie leyó.
 */

export interface SesionMinutable {
  id: string
  titulo: string
  fecha: string // ISO
  /**
   * De qué sala es. Solo hace falta cuando la lista cruza salas —el Home—;
   * dentro de una sala repetir su nombre en cada fila es ruido.
   */
  salaNombre?: string
  salaColor?: string
}

interface Props {
  /** Sesiones ya presentadas que todavía no tienen minuta. */
  sesiones: SesionMinutable[]
  /** Cómo se ve el disparador. Cada sitio lo viste con su hoja de estilos. */
  claseBoton?: string
  etiquetaBoton?: string
  /** Qué decir cuando no hay ninguna sesión que minutar. */
  claseVacio?: string
}

export function LevantarMinuta({
  sesiones,
  claseBoton,
  etiquetaBoton = 'Levantar minuta con IA',
  claseVacio,
}: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [sesionId, setSesionId] = useState<string | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierto && !nodo.open) nodo.showModal()
    if (!abierto && nodo.open) nodo.close()
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setSesionId(null)
  }

  // Sin sesiones presentadas no hay nada que minutar, y decir por qué vale
  // más que un botón que no hace nada: el eslabón que falta es marcar la
  // sesión como presentada al terminar la reunión.
  if (sesiones.length === 0) {
    return (
      <p className={claseVacio ?? estilos.vacioNota}>
        Para levantar una minuta hace falta una reunión ya presentada. Al terminar, marca la
        sesión como presentada desde su documento.
      </p>
    )
  }

  const elegida = sesiones.find((s) => s.id === sesionId)

  return (
    <>
      <button
        type="button"
        className={claseBoton ?? estilos.nuevaMinutaBoton}
        onClick={() => setAbierto(true)}
      >
        {etiquetaBoton}
      </button>

      <dialog
        ref={dialogo}
        className={`${estilos.lightbox} ${estilos.lightboxAncho}`}
        aria-label="Levantar una minuta"
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar()
        }}
        onClose={cerrar}
      >
        <div className={estilos.lightboxCaja}>
          <header className={estilos.lightboxCabecera}>
            <div>
              <h3 className={estilos.lightboxTitulo}>Levantar minuta</h3>
              <div className={estilos.lightboxFecha}>
                {elegida
                  ? `${elegida.salaNombre ? `${elegida.salaNombre} · ` : ''}${elegida.titulo} · ${fechaCompleta(elegida.fecha)}`
                  : 'Elige de qué sesión, y pega la transcripción.'}
              </div>
            </div>
            <button
              type="button"
              className={estilos.lightboxCerrar}
              onClick={cerrar}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>

          <div className={estilos.lightboxCuerpo}>
            {!elegida ? (
              <div className={estilos.eleccionSesion}>
                {sesiones.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={estilos.eleccionFila}
                    onClick={() => setSesionId(s.id)}
                  >
                    <span className={estilos.eleccionTitulo}>
                      {/* El punto de color y el nombre de la sala solo salen
                          cuando la lista cruza salas: dentro de una, repetir
                          su nombre en cada fila es ruido. */}
                      {s.salaNombre && (
                        <span
                          className={estilos.eleccionSala}
                          style={{ '--marca': s.salaColor } as React.CSSProperties}
                        >
                          {s.salaNombre}
                        </span>
                      )}
                      {s.titulo}
                    </span>
                    <span className={estilos.eleccionFecha}>{fechaCompleta(s.fecha)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <MinutaCliente
                sesionId={elegida.id}
                alPublicar={() => {
                  cerrar()
                  router.refresh()
                }}
              />
            )}
          </div>

          {elegida && (
            <footer className={estilos.lightboxPie}>
              <button type="button" className={estilos.botonVolverSesion} onClick={() => setSesionId(null)}>
                ← Elegir otra sesión
              </button>
            </footer>
          )}
        </div>
      </dialog>
    </>
  )
}
