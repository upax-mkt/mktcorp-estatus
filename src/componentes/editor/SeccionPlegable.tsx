'use client'

import { useState, type ReactNode } from 'react'
import estilos from './editor.module.css'

/**
 * Una sección del editor que se abre y se cierra.
 *
 * POR QUÉ: una sesión real trae catorce secciones. Con todos los formularios
 * desplegados a la vez la página medía veinte mil píxeles — para cambiar una
 * cifra de la última sección había que recorrer las trece anteriores. Cerradas,
 * la sesión entera cabe en una pantalla y se ve su estructura de un vistazo,
 * que es lo que hace falta para decidir qué falta.
 *
 * EL FORMULARIO NO SE DESMONTA al cerrar: se esconde. Si se desmontara, lo
 * escrito y sin guardar se perdería al plegar la sección por error — y plegar
 * es un clic, no una decisión.
 */
export function SeccionPlegable({
  cabecera,
  resumen,
  abiertaPorDefecto,
  children,
}: {
  /** Título y acciones: siempre visibles, abierta o cerrada. */
  cabecera: ReactNode
  /** Una línea de qué hay dentro, para no tener que abrir para saberlo. */
  resumen: ReactNode
  abiertaPorDefecto?: boolean
  children: ReactNode
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto === true)

  return (
    <>
      <div className={estilos.cabeceraPlegable}>
        <button
          type="button"
          className={estilos.disparador}
          aria-expanded={abierta}
          onClick={() => setAbierta((a) => !a)}
        >
          <span className={estilos.flecha} data-abierta={abierta ? 'true' : undefined} aria-hidden="true">
            ▸
          </span>
          <span className={estilos.disparadorTexto}>{cabecera}</span>
        </button>
        {!abierta && <span className={estilos.resumen}>{resumen}</span>}
      </div>
      {/* `hidden` y no desmontar: ver la nota de arriba. */}
      <div hidden={!abierta}>{children}</div>
    </>
  )
}
