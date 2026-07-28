'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import estilos from '@/app/hub.module.css'

/**
 * Las minutas de todas las salas, en el Home, y el botón de levantar una.
 *
 * Antes vivían enterradas: había que saber de qué sala era, entrar, y
 * buscarla. Una minuta se cita durante semanas — es material de consulta, y
 * el material de consulta va donde uno ya está mirando.
 *
 * Se lee en una ventana flotante, con el mismo `<dialog>` nativo de la sala:
 * foco atrapado, Escape y fondo inerte los pone el navegador.
 */

export interface MinutaEnHome {
  id: string
  titulo: string
  fecha: string
  salaSlug: string
  salaNombre: string
  salaColor: string
  texto?: string
  sesionId?: string
}

interface Props {
  minutas: MinutaEnHome[]
  /** Salas con una sesión presentada sin minuta: de ahí se puede levantar una. */
  pendientes: number
}

export function ModuloMinutas({ minutas, pendientes }: Props) {
  const [abierta, setAbierta] = useState<MinutaEnHome | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const n = dialogo.current
    if (!n) return
    if (abierta && !n.open) n.showModal()
    if (!abierta && n.open) n.close()
  }, [abierta])

  return (
    <section className={`tarjeta ${estilos.modulo}`}>
      <header className={estilos.moduloCabecera}>
        <h2 className={estilos.moduloTitulo}>Minutas</h2>
        {pendientes > 0 && (
          <span className="pildora" data-tono="ojo">{pendientes} sesión(es) sin minuta</span>
        )}
      </header>

      {minutas.length === 0 ? (
        <p className={estilos.moduloVacio}>
          Todavía no hay ninguna. Se levantan desde la sala, cargando la transcripción de la
          reunión.
        </p>
      ) : (
        <ul className={estilos.listaMinutas}>
          {minutas.slice(0, 5).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={estilos.filaMinuta}
                style={{ '--marca': m.salaColor } as React.CSSProperties}
                onClick={() => setAbierta(m)}
              >
                <span className={estilos.filaMinutaSala}>{m.salaNombre}</span>
                <span className={estilos.filaMinutaTitulo}>{m.titulo}</span>
                <span className={estilos.filaMinutaFecha}>{fechaBreveConAnio(m.fecha)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogo}
        className={estilos.lightbox}
        aria-label={abierta ? `Minuta · ${abierta.titulo}` : 'Minuta'}
        onClick={(e) => { if (e.target === dialogo.current) setAbierta(null) }}
        onClose={() => setAbierta(null)}
      >
        {abierta && (
          <div className={estilos.lightboxCaja} style={{ '--marca': abierta.salaColor } as React.CSSProperties}>
            <header className={estilos.lightboxCabecera}>
              <div>
                <span className="micro">{abierta.salaNombre}</span>
                <h3 className={estilos.lightboxTitulo}>{abierta.titulo}</h3>
                <p className={estilos.lightboxFecha}>{fechaCompleta(abierta.fecha)}</p>
              </div>
              <button
                type="button"
                className="boton"
                data-tono="fantasma"
                onClick={() => setAbierta(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            {abierta.texto ? (
              <div className={estilos.lightboxTexto}>{abierta.texto}</div>
            ) : (
              <p className={estilos.moduloVacio}>Esta minuta no tiene texto guardado.</p>
            )}

            <footer className={estilos.lightboxPie}>
              <Link href={`/sala/${abierta.salaSlug}`} className="boton" data-tono="suave">
                Ir a {abierta.salaNombre} →
              </Link>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  )
}
