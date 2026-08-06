'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import {
  LevantarMinuta, type SesionMinutable, type SalaElegible,
} from '@/componentes/LevantarMinuta'
import { EditorMolde } from '@/componentes/EditorMolde'
import type { MoldeMinuta } from '@/minuta/molde'
import type { PersonaMonday } from '@/monday/personas'
import estilos from '@/app/hub.module.css'
import { colorDeTextoDeMarca } from '@/temas'

/**
 * Las minutas de todas las salas, en el Home, Y LEVANTAR UNA DESDE AQUÍ.
 *
 * Franco, dos veces: "sigo sin ver la generación de minutas como módulo
 * agnóstico en el Home". Tenía razón — este módulo solo LEÍA. Levantar una
 * seguía obligando a saber de qué sala era, entrar a esa sala y buscar el
 * botón allí, que es exactamente el rodeo que el módulo venía a quitar.
 *
 * Agnóstico significa dos cosas y las dos se cumplen aquí: sirve para
 * cualquier tipo de reunión —no solo un estatus de UDN— y no le importa de
 * qué sala viene. Es la MISMA pieza que usa la sala (`LevantarMinuta`), con
 * las sesiones de las diez en vez de las de una; tenerla dos veces
 * garantizaría que una de las dos se quede atrás.
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
  reunionId?: string
}

interface Props {
  minutas: MinutaEnHome[]
  /** Reuniones presentadas que todavía no tienen minuta, de todas las salas. */
  pendientes: SesionMinutable[]
  /** Salas entre las que elegir al describir una reunión que no está en la app. */
  salas: SalaElegible[]
  /** El molde con el que se arman: editable desde aquí. */
  molde: MoldeMinuta
  guardarMoldeAction: (molde: MoldeMinuta) => Promise<{ error?: string }>
  /** La gente viva de Mkt Corp, para el selector de responsable de MinutaCliente. */
  personas: PersonaMonday[]
}

export function ModuloMinutas({
  minutas, pendientes, salas, molde, guardarMoldeAction, personas,
}: Props) {
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
        {pendientes.length > 0 && (
          <span className="pildora" data-tono="ojo">
            {pendientes.length === 1 ? '1 reunión sin minuta' : `${pendientes.length} reuniones sin minuta`}
          </span>
        )}
      </header>

      {minutas.length === 0 ? (
        <p className={estilos.moduloVacio}>
          Todavía no hay ninguna. Genera la primera pegando la transcripción de cualquier reunión.
        </p>
      ) : (
        <ul className={estilos.listaMinutas}>
          {minutas.slice(0, 5).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={estilos.filaMinuta}
                style={{ '--marca': m.salaColor, '--marca-texto': colorDeTextoDeMarca(m.salaColor) } as React.CSSProperties}
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

      {/* SIEMPRE, haya reuniones pendientes o no: el componente sirve para
          cualquier reunión, incluida una que nunca se preparó aquí. Antes solo
          salía si había alguna presentada sin minuta, y eso lo hacía parecer
          una herramienta de seguimiento en vez de lo que es. */}
      <div className={estilos.moduloPie}>
        <LevantarMinuta sesiones={pendientes} salas={salas} claseBoton="boton" personas={personas} />
        <EditorMolde molde={molde} guardarAction={guardarMoldeAction} />
      </div>

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
              <Link href={`/cliente/${abierta.salaSlug}`} className="boton" data-tono="suave">
                Ir a {abierta.salaNombre} →
              </Link>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  )
}
