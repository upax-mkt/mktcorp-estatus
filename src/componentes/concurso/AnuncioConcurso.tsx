'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import estilos from '@/app/concurso/concurso.module.css'

const LLAVE = 'mktcorp-concurso-sudadera-2026-visto'

export function AnuncioConcurso({ activo }: { activo: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!activo) return
    try {
      if (window.localStorage?.getItem(LLAVE)) return
    } catch {
      // Un navegador que bloquea storage todavía puede mostrar el anuncio.
    }
    dialogo.current?.showModal?.()
  }, [activo])

  function cerrar() {
    try {
      window.localStorage?.setItem(LLAVE, '1')
    } catch {
      // El cierre no depende de que el navegador permita persistirlo.
    }
    dialogo.current?.close?.()
  }

  if (!activo) return null
  return (
    <dialog ref={dialogo} className={estilos.popup} onClose={cerrar} aria-labelledby="concurso-popup-titulo">
      <div className={estilos.popupRuido} aria-hidden="true" />
      <button className={estilos.popupCerrar} type="button" onClick={cerrar} aria-label="Cerrar anuncio">×</button>
      <Image
        src="/logos/mkt-corp-grupo-upax-blanco.png"
        width={4500}
        height={1516}
        alt="Marketing Corp y Grupo UPAX"
        className={estilos.popupLogo}
        priority
      />
      <p className={estilos.eyebrow}>CONVOCATORIA ABIERTA · 2026</p>
      <h2 id="concurso-popup-titulo" className={estilos.popupTitulo}>
        DISEÑA<br /><span>LO QUE SOMOS</span>
      </h2>
      <p className={estilos.popupTexto}>La sudadera oficial de MKT Corp puede llevar tu firma.</p>
      <div className={estilos.popupPremio}>
        <strong>ARENA CDMX</strong><span>+</span><strong>GIFT CARD</strong><span>+</span><strong>1 DÍA</strong>
      </div>
      <Link href="/concurso" className={estilos.popupCta} onClick={cerrar}>Entrar al concurso →</Link>
      <p className={estilos.popupFecha}>Propuestas hasta el 7 SEP · 11:00 H</p>
    </dialog>
  )
}
