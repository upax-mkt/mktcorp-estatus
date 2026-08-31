'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, type MouseEvent } from 'react'
import estilos from '@/app/concurso/concurso.module.css'

const LLAVE = 'mktcorp-concurso-sudadera-2026-visto'

/**
 * ⚠️ TRES SITIOS DONDE RECORDAR QUE YA SE CERRÓ, Y NO UNO.
 *
 * Franco: *«el lightbox del concurso no se puede cerrar»*. Y cerrarse, se
 * cerraba: reproducido en producción, las tres salidas funcionan. Lo que
 * pasaba es que VOLVÍA A SALIR en cada carga, que desde fuera es exactamente
 * la misma sensación — y peor, porque parece que la app te ignora.
 *
 * La causa: el «ya lo vi» se guardaba solo en `localStorage`, envuelto en un
 * `try/catch` que se tragaba el fallo en silencio. En un navegador embebido
 * —el que abre Slack al pulsar un enlace desde la app, que es justo por donde
 * va a llegar todo el equipo— el almacenamiento puede estar restringido: la
 * escritura lanza, el catch la ignora, y al recargar el anuncio no sabe que ya
 * se cerró. Reproducido simulando ese bloqueo.
 *
 * Ahora se intentan tres, en orden de permanencia: `localStorage` (sobrevive a
 * todo), `sessionStorage` (sobrevive a recargas dentro de la pestaña) y, si
 * los dos fallan, una variable de módulo que al menos aguanta mientras dure la
 * navegación. Ninguno es imprescindible: el peor caso ya no es «reaparece
 * siempre», sino «reaparece si cierras la pestaña y vuelves».
 */
let cerradoEnMemoria = false

function marcarVisto(): void {
  cerradoEnMemoria = true
  for (const almacen of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[almacen]?.setItem(LLAVE, '1')
    } catch {
      // Cada almacén puede fallar por su cuenta: se prueban los dos.
    }
  }
  try {
    // Y una cookie, que es el único recuerdo que sobrevive a un navegador con
    // AMBOS almacenes bloqueados. 30 bytes que viajan en cada petición: un
    // precio ridículo comparado con un anuncio que reaparece para siempre.
    // `SameSite=Lax` y sin `Secure` para que valga también en local.
    document.cookie = `${LLAVE}=1; max-age=2592000; path=/; SameSite=Lax`
  } catch {
    // Queda `cerradoEnMemoria`, que aguanta lo que dure la navegación.
  }
}

function yaSeVio(): boolean {
  if (cerradoEnMemoria) return true
  for (const almacen of ['localStorage', 'sessionStorage'] as const) {
    try {
      if (window[almacen]?.getItem(LLAVE)) return true
    } catch {
      // Un almacén que ni siquiera deja LEER no dice nada: se sigue probando.
    }
  }
  try {
    if (document.cookie.split('; ').some((c) => c.startsWith(`${LLAVE}=`))) return true
  } catch {
    // Sin cookies tampoco: se enseña, que es el fallo tolerable.
  }
  return false
}

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
    if (yaSeVio()) return
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

  /**
   * TOCAR FUERA CIERRA. Franco: *«no puedo cerrar el pop up en mobile»*.
   *
   * Un `<dialog>` NO se cierra al pulsar su backdrop; hay que hacerlo a mano. Y
   * el click del backdrop llega al propio `<dialog>` como diana —no a un
   * elemento de fuera— así que no vale con comparar `event.target`: se compara
   * la posición del puntero contra la caja del diálogo. Si cae fuera, era el
   * fondo.
   *
   * En un escritorio esto es una comodidad; en un teléfono es LA forma de
   * cerrar que la gente intenta primero, antes de buscar ninguna equis.
   */
  function alPulsar(evento: MouseEvent<HTMLDialogElement>) {
    const d = dialogo.current
    if (!d || evento.target !== d) return
    const caja = d.getBoundingClientRect()
    const dentro =
      evento.clientX >= caja.left && evento.clientX <= caja.right &&
      evento.clientY >= caja.top && evento.clientY <= caja.bottom
    // (0,0) es lo que manda un click sintético del teclado sobre el dialog:
    // cerrar ahí sería cerrar al pulsar Enter dentro del modal.
    if (!dentro && (evento.clientX !== 0 || evento.clientY !== 0)) cerrar()
  }

  function cerrar() {
    marcarVisto()
    dialogo.current?.close?.()
  }

  if (!activo) return null

  // CON CARTEL: la imagen manda y el texto sobra — repetir debajo lo que el
  // cartel ya dice sería ruido. Se conservan el botón de cerrar y el enlace,
  // que son lo único que el cartel no puede hacer por sí mismo, y el `alt`
  // lleva la convocatoria completa para quien no ve la imagen.
  if (CARTEL) {
    return (
      <dialog ref={dialogo} className={`${estilos.popup} ${estilos.popupCartel}`} onClose={cerrar} onClick={alPulsar} aria-label="Concurso: diseña la sudadera de MKT Corp">
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
          <div className={estilos.popupAcciones}>
            <Link href="/concurso" className={estilos.popupCta} onClick={cerrar}>Entrar al concurso →</Link>
            {/* Una salida CON PALABRA, además de la equis. En un teléfono la
                equis es un objetivo de 40 px sobre una imagen oscura; esto está
                donde ya se está mirando y dice lo que hace. */}
            <button type="button" className={estilos.popupCerrarTexto} onClick={cerrar}>Ahora no</button>
          </div>
        </div>
      </dialog>
    )
  }

  return (
    <dialog ref={dialogo} className={estilos.popup} onClose={cerrar} onClick={alPulsar} aria-labelledby="concurso-popup-titulo">
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
