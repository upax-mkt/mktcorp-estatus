import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import base from './base.module.css'

/** El orden de entrada de un elemento dentro de su escena (escalón de 90 ms). */
export const orden = (i: number) => ({ '--i': i }) as CSSProperties

/** Las dos capas de luz de una escena: luz de marca con viñeta, y grano. Van después del fondo, antes de la escena. */
export function Luz() {
  return (
    <>
      <div className={base.luz} aria-hidden="true" />
      <div className={base.grano} aria-hidden="true" />
    </>
  )
}

/**
 * UNA FOTO A SANGRE detrás de la escena, con su velo para que el texto se lea.
 * `velo`: «izquierda» (texto a la izquierda), «total» (texto en cualquier lado) o «abajo».
 * Decorativa para el lector de pantalla salvo que traiga `alt`.
 */
export function Fondo({
  src,
  alt = '',
  velo = 'total',
  posicion = 'center',
  preload = false,
}: {
  src: string
  alt?: string
  velo?: 'izquierda' | 'total' | 'abajo'
  posicion?: string
  preload?: boolean
}) {
  return (
    <>
      <div className={base.fondo} aria-hidden={alt ? undefined : true}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          unoptimized
          preload={preload}
          style={{ objectPosition: posicion }}
        />
      </div>
      <div className={base.velo} data-velo={velo} aria-hidden="true" />
    </>
  )
}

/**
 * UNA FOTO dentro de la escena, recortada, con pie opcional. El alto lo pone quien la usa (clase o estilo).
 * `marca`: lo que es la imagen cuando no es una foto tal cual: «Simulación» (un montaje sobre una foto real, como las
 * pantallas encendidas) o «Ilustración» (una imagen generada). Va en una esquina, siempre visible.
 */
export function Foto({
  src,
  alt,
  pie,
  marca,
  posicion = 'center',
  className = '',
  style,
}: {
  src: string
  alt: string
  pie?: ReactNode
  marca?: 'Simulación' | 'Ilustración'
  posicion?: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <figure className={`${base.foto} ${className}`} style={style}>
      {marca ? <span className={base.fotoMarca}>{marca}</span> : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 100vw, 40vw"
        unoptimized
        style={{ objectPosition: posicion }}
      />
      {pie ? <figcaption className={base.fotoPie}>{pie}</figcaption> : null}
    </figure>
  )
}

/**
 * LOS LOGOS DE LAS UNIDADES (blancos, en `public/logos/`). Alto 164 px en origen.
 * `escala`: ajuste óptico. House of Films y Marketing United son sellos compactos con letra chica adentro; a la
 * misma altura que los demás se leen diminutos.
 */
export const LOGOS = {
  'grupo-upax': {
    src: '/logos/grupo-upax-blanco.png',
    ancho: 639,
    nombre: 'Grupo UPAX',
  },
  'promo-espacio': {
    src: '/logos/promo-espacio-blanco.png',
    ancho: 746,
    nombre: 'Promo Espacio',
  },
  'house-of-films': {
    src: '/logos/house-of-films-blanco.png',
    ancho: 267,
    nombre: 'House of Films',
    escala: 1.55,
  },
  'marketing-united': {
    src: '/logos/marketing-united-blanco.png',
    ancho: 395,
    nombre: 'Marketing United',
    escala: 1.6,
  },
  uix: { src: '/logos/uix-blanco.png', ancho: 387, nombre: 'UiX' },
  neracode: {
    src: '/logos/neracode-blanco.png',
    ancho: 721,
    nombre: 'NeraCode',
  },
  'research-land': {
    src: '/logos/research-land-blanco.png',
    ancho: 1121,
    nombre: 'Research Land',
  },
  'marketing-corporativo': {
    src: '/logos/marketing-corp-blanco.png',
    ancho: 707,
    nombre: 'Marketing Corporativo',
  },
  zeus: { src: '/logos/zeus-blanco.png', ancho: 645, nombre: 'Zeus' },
} as const

export type Unidad = keyof typeof LOGOS

/** Una fila de logos de unidades, a la altura de una línea. */
export function Firma({
  unidades,
  className = '',
  style,
}: {
  unidades: readonly Unidad[]
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`${base.firma} ${className}`} style={style}>
      {unidades.map((u) =>
        u === 'marketing-corporativo' ? (
          <span key={u} className={base.firmaTexto}>
            Marketing Corporativo
          </span>
        ) : (
          <Image
            key={u}
            src={LOGOS[u].src}
            alt={LOGOS[u].nombre}
            width={LOGOS[u].ancho}
            height={164}
            unoptimized
            style={
              {
                '--logo-escala': 'escala' in LOGOS[u] ? LOGOS[u].escala : 1,
              } as CSSProperties
            }
          />
        ),
      )}
    </div>
  )
}

/** LAS MARCAS DE ELLOS: Malinche, el Frontón y Pelota Mestiza (de su sitio oficial). */
export const MARCAS = {
  malinche: {
    src: '/fortaleza/malinche-logo.png',
    ancho: 1000,
    alto: 176,
    nombre: 'Malinche',
  },
  fronton: {
    src: '/fortaleza/fronton-logo.png',
    ancho: 182,
    alto: 160,
    nombre: 'Frontón México',
  },
  pelota: {
    src: '/fortaleza/pelota-mestiza-logo.svg',
    ancho: 47,
    alto: 17,
    nombre: 'Pelota Mestiza',
  },
} as const

/**
 * LA PROPUESTA DE UNA UNIDAD (ronda 3, 20-oct-2026): la misma forma en todos los frentes, para que se lea qué hace
 * cada una. Arriba, su logo; luego qué hace, en una frase; debajo, sus acciones, cada una con su título corto.
 */
export function Propuesta({
  unidades,
  frase,
  acciones,
  i,
  className = '',
  style,
}: {
  unidades: readonly Unidad[]
  frase?: ReactNode
  acciones: readonly { titulo: string; texto: ReactNode }[]
  i: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <article className={`${base.propuesta} ${base.aparece} ${className}`} style={{ ...orden(i), ...style }}>
      <Firma unidades={unidades} className={base.propuestaFirma} />
      {frase ? <p className={base.propuestaFrase}>{frase}</p> : null}
      <ul className={base.acciones}>
        {acciones.map((a) => (
          <li key={a.titulo} className={base.accion}>
            <span className={base.accionTitulo}>{a.titulo}</span>
            <span className={base.accionTexto}>{a.texto}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

/**
 * UNA TARJETA DE FRENTE: título corto, texto y quién lo hace. Es la pieza que más se repite:
 * todas comparten forma y curva; lo único que cambia es cuándo entran (`i`).
 */
export function Tarjeta({
  titulo,
  quien,
  i,
  className = '',
  children,
}: {
  titulo: ReactNode
  quien?: ReactNode
  i: number
  className?: string
  children: ReactNode
}) {
  return (
    <article className={`${base.vidrio} ${base.tarjeta} ${base.aparece} ${className}`} style={orden(i)}>
      <h3 className={base.tarjetaTitulo}>{titulo}</h3>
      <p className={base.tarjetaTexto}>{children}</p>
      {quien ? <p className={base.quien}>{quien}</p> : null}
    </article>
  )
}
