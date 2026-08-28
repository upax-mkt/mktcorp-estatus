'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import estilos from '@/app/concurso/concurso.module.css'

const LLAVE = 'mktcorp-concurso-sudadera-2026-visto'

/**
 * LA RUTA DEL CARTEL, cuando exista.
 *
 * Franco va a diseñar un póster y este anuncio será ese póster. Hasta que el
 * archivo esté en `public/concurso/`, se enseña la versión tipográfica de
 * abajo — que no es un placeholder: es una pieza terminada que puede vivir
 * sola. Poner el PNG en esa ruta cambia el anuncio sin tocar código.
 *
 * `null` (y no una ruta a un archivo que no está) porque `next/image` con un
 * src inexistente rompe el modal entero: el anuncio se quedaría en blanco.
 */
const CARTEL: { src: string; ancho: number; alto: number; alt: string } | null = {
  src: '/concurso/cartel.png',
  ancho: 1024,
  alto: 1536,
  // El `alt` lleva la convocatoria ENTERA, no una descripción del dibujo: para
  // quien no ve la imagen, este texto ES el anuncio. Incluye lo que el cartel
  // dice y lo único que le falta —las fechas—, que van además impresas debajo.
  alt: 'Concurso interno 2026 de Grupo UPAX y Marketing Corp: «Diseña lo que somos». Diseña la sudadera oficial de Marketing Corp. El ganador se lleva un pase doble para la Arena CDMX, una gift card de 1.000 pesos y un día de vacaciones.',
}

export function AnuncioConcurso({ activo }: { activo: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!activo) return
    try {
      if (window.localStorage?.getItem(LLAVE)) return
    } catch {
      // Un navegador que bloquea storage todavía puede mostrar el anuncio.
    }
    // `showModal()` puede lanzar —si el diálogo ya está abierto, si el
    // navegador no lo implementa— y una excepción aquí dejaría el anuncio a
    // medias. El fallback lo abre igual: sin top layer, pero el `z-index` de
    // `.popup` lo mantiene por encima del Home. Ver ese comentario.
    const d = dialogo.current
    if (!d) return
    try {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    } catch {
      d.setAttribute('open', '')
    }
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

  // CON CARTEL: la imagen manda y el texto sobra — repetir debajo lo que el
  // cartel ya dice sería ruido. Se conservan el botón de cerrar y el enlace,
  // que son lo único que el cartel no puede hacer por sí mismo, y el `alt`
  // lleva la convocatoria completa para quien no ve la imagen.
  if (CARTEL) {
    return (
      <dialog ref={dialogo} className={`${estilos.popup} ${estilos.popupCartel}`} onClose={cerrar} aria-label="Concurso: diseña la sudadera de MKT Corp">
        <button className={estilos.popupCerrar} type="button" onClick={cerrar} aria-label="Cerrar anuncio">×</button>
        <Image src={CARTEL.src} width={CARTEL.ancho} height={CARTEL.alto} alt={CARTEL.alt} className={estilos.popupImagen} priority />
        {/* Las fechas van FUERA del cartel, no dentro: en la imagen quedarían
            a cuerpo diminuto dentro de un modal de 42rem, y además cambian sin
            que nadie quiera reexportar un PNG por ello. */}
        <div className={estilos.popupPie}>
          <p className={estilos.popupFechas}>
            <strong>Sube tu propuesta hasta el 7 de septiembre, 11:00.</strong>
            {' '}Se vota del 7 al 8 y el ganador se revela el 9 a las 15:00 en Sky Lobby, Sala 2.
          </p>
          <Link href="/concurso" className={estilos.popupCta} onClick={cerrar}>Entrar al concurso →</Link>
        </div>
      </dialog>
    )
  }

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
