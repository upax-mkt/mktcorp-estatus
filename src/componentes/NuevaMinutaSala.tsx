'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MinutaCliente } from '@/app/preparar/[id]/minuta/MinutaCliente'
import { fechaCompleta } from '@/lib/fecha'
import estilos from '@/app/sala/sala.module.css'

/**
 * Levantar una minuta desde la propia sala.
 *
 * Franco: "un botón para cargar una transcripción y generar con IA la minuta
 * directamente". Directamente significa DESDE AQUÍ: hasta ahora había que
 * acordarse de qué sesión era, entrar al preparador, buscarla y abrir su
 * pantalla de minuta.
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
}

interface Props {
  /** Sesiones ya presentadas que todavía no tienen minuta. */
  sesiones: SesionMinutable[]
}

export function NuevaMinutaSala({ sesiones }: Props) {
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
      <p className={estilos.vacioNota}>
        Para levantar una minuta hace falta una sesión ya presentada. Al terminar la reunión,
        marca la sesión como presentada desde su documento.
      </p>
    )
  }

  const elegida = sesiones.find((s) => s.id === sesionId)

  return (
    <>
      <button type="button" className={estilos.nuevaMinutaBoton} onClick={() => setAbierto(true)}>
        Levantar minuta con IA
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
                  ? `${elegida.titulo} · ${fechaCompleta(elegida.fecha)}`
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
                    <span className={estilos.eleccionTitulo}>{s.titulo}</span>
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
