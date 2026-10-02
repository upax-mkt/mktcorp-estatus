'use client'

import { useRef, type ReactNode } from 'react'
import estilos from './estatus.module.css'

/** El dialog nativo conserva foco, Escape y el top layer también al proyectar. */
export function DetalleQ3({ etiqueta, titulo, children }: { etiqueta: string; titulo: string; children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  return <div onKeyDown={e => e.stopPropagation()}>
    <button type="button" className={estilos.enlaceDetalle} onClick={() => dialogo.current?.showModal()}>{etiqueta}<span aria-hidden="true"> ↗</span></button>
    <dialog className={estilos.dialogo} ref={dialogo} aria-label={titulo}>
      <header><h3>{titulo}</h3><button type="button" aria-label="Cerrar detalle" onClick={() => dialogo.current?.close()}>Cerrar <span aria-hidden="true">×</span></button></header>
      <div className={estilos.dialogoCuerpo}>{children}</div>
    </dialog>
  </div>
}
