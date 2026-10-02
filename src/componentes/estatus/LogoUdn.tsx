import Image from 'next/image'
import estilos from './estatus.module.css'

/** Los logos viven en /public/logos, en dos versiones: a color (fondos claros) y en blanco (fondos oscuros). */
const SLUG: Record<string, string> = {
  'Research Land': 'research-land',
  'Promo Espacio': 'promo-espacio',
  'Marketing United': 'marketing-united',
  'Mexa Creativa': 'mexa-creativa',
  'House of Films': 'house-of-films',
  UiX: 'uix',
  NeraCode: 'neracode',
  'Grupo UPAX': 'grupo-upax',
}

/**
 * Un solo orden de empresas en toda la pieza: quien sigue a una la encuentra siempre en el mismo sitio.
 * Es el ALFABÉTICO (decisión de Franco con el equipo, 2-oct-2026): ni por tier ni por el «journey»
 * que arranca en Research Land, que el propio equipo descartó.
 */
export const ORDEN_UDN = ['House of Films', 'Marketing United', 'Mexa Creativa', 'NeraCode', 'Promo Espacio', 'Research Land', 'UiX']
export const lugarUdn = (nombre: string) => { const i = ORDEN_UDN.indexOf(nombre); return i < 0 ? ORDEN_UDN.length : i }

export const tieneLogo = (nombre: string) => nombre in SLUG

/** Las empresas del grupo que aparecen en un texto libre («Grupo UPAX · NeraCode y UiX»), en el orden en que se nombran. */
export function udnsEn(texto: string): string[] {
  return Object.keys(SLUG)
    .map((n) => ({ n, i: texto.indexOf(n) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.n)
}

/**
 * EL LOGO DE UNA EMPRESA DEL GRUPO en lugar de su nombre escrito.
 * Se pintan las dos versiones y el CSS enseña la que toca según el fondo de la
 * lámina; solo una lleva el nombre como texto alternativo, para que un lector
 * de pantalla no lo diga dos veces. Si la empresa no tiene logo, va su nombre.
 */
export function LogoUdn({ nombre, className }: { nombre: string; className?: string }) {
  const slug = SLUG[nombre]
  if (!slug) return <span className={className}>{nombre}</span>
  return (
    <span className={`${estilos.logoUdn} ${className ?? ''}`} data-logo={slug}>
      <Image src={`/logos/${slug}-color.png`} alt={nombre} width={220} height={80} unoptimized data-version="color" />
      <Image src={`/logos/${slug}-blanco.png`} alt="" aria-hidden="true" width={220} height={80} unoptimized data-version="blanco" />
    </span>
  )
}
