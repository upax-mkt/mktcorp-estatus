import type { TIPOS_DE_GRAFICO } from '@/decision/esquema'
import estilos from './editor.module.css'

/**
 * El dibujo de cada tipo de gráfico.
 *
 * Antes eran caracteres Unicode —`▊`, `≋`, `◣`, `◕`— con dos problemas: no
 * comunican (`◣` no se parece a un área y `≋` no se parece a dos líneas), y su
 * cobertura depende de la fuente que tenga el sistema, así que en una máquina
 * sin ese glifo salía un rectángulo vacío. Un SVG se dibuja igual en todas
 * partes y sí se parece a lo que nombra.
 *
 * Comparte la idea de las miniaturas del selector de sección: no es una
 * captura, es la forma.
 */

type TipoGrafico = (typeof TIPOS_DE_GRAFICO)[number]

const MARCA = 'var(--sala, #888)'
const APAGADO = 'color-mix(in oklch, currentColor 35%, transparent)'

/** Barras verticales a alturas dadas, sobre una base común. */
function barras(alturas: number[], color = MARCA) {
  const ancho = 24 / (alturas.length * 2 - 1)
  return alturas.map((alto, i) => (
    <rect
      key={i}
      x={i * ancho * 2}
      y={20 - alto}
      width={ancho}
      height={alto}
      rx="0.5"
      fill={color}
    />
  ))
}

const DIBUJOS: Record<TipoGrafico, React.ReactNode> = {
  'barras': <>{barras([8, 13, 17, 11])}</>,
  'barras-comparadas': (
    <>
      <rect x="1" y="8" width="4" height="12" rx="0.5" fill={MARCA} />
      <rect x="6" y="4" width="4" height="16" rx="0.5" fill={APAGADO} />
      <rect x="14" y="11" width="4" height="9" rx="0.5" fill={MARCA} />
      <rect x="19" y="6" width="4" height="14" rx="0.5" fill={APAGADO} />
    </>
  ),
  'barras-horizontales': (
    <>
      <rect x="0" y="2" width="20" height="4" rx="0.5" fill={MARCA} />
      <rect x="0" y="8.5" width="14" height="4" rx="0.5" fill={MARCA} />
      <rect x="0" y="15" width="9" height="4" rx="0.5" fill={MARCA} />
    </>
  ),
  'barras-horizontales-agrupadas': (
    <>
      <rect x="0" y="1.5" width="20" height="3" rx="0.5" fill={MARCA} />
      <rect x="0" y="5.5" width="15" height="3" rx="0.5" fill={APAGADO} />
      <rect x="0" y="11.5" width="12" height="3" rx="0.5" fill={MARCA} />
      <rect x="0" y="15.5" width="17" height="3" rx="0.5" fill={APAGADO} />
    </>
  ),
  'linea': (
    <>
      <polyline points="1,16 8,10 15,13 23,4" fill="none" stroke={MARCA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="4" r="2" fill={MARCA} />
    </>
  ),
  'lineas-multiples': (
    <>
      <polyline points="1,16 8,9 15,12 23,4" fill="none" stroke={MARCA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="1,19 8,17 15,18 23,14" fill="none" stroke={APAGADO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'combo-barras-lineas': (
    <>
      {barras([7, 11, 15, 9], APAGADO)}
      <polyline points="3,10 10,7 17,8 23,3" fill="none" stroke={MARCA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'area': (
    <>
      <polygon points="1,20 1,14 8,8 15,11 23,3 23,20" fill={MARCA} fillOpacity="0.25" />
      <polyline points="1,14 8,8 15,11 23,3" fill="none" stroke={MARCA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'dona': (
    <>
      {/* El anillo se dibuja con un trazo grueso sobre la circunferencia: un
          `stroke-dasharray` reparte el arco sin necesidad de calcular rutas. */}
      <circle cx="12" cy="11" r="7" fill="none" stroke={APAGADO} strokeWidth="5" />
      <circle
        cx="12" cy="11" r="7" fill="none" stroke={MARCA} strokeWidth="5"
        strokeDasharray="26 44" transform="rotate(-90 12 11)"
      />
    </>
  ),
}

export function IconoGrafico({ tipo }: { tipo: TipoGrafico }) {
  return (
    <svg viewBox="0 0 24 22" className={estilos.iconoGrafico} aria-hidden>
      {DIBUJOS[tipo]}
    </svg>
  )
}
