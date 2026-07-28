import { hexARgb } from './color'

/**
 * CUÁNTO SE PARECEN DOS COLORES A LA VISTA — incluida la de quien no
 * distingue rojo y verde.
 *
 * Existe porque separar colores rotando el matiz no funciona: 56° entre dos
 * azules los separan y entre dos verdes no. La escala de datos derivada por
 * rotación fallaba a partir de la tercera serie en las diez marcas, con pares
 * a ΔE 0.9 — indistinguibles incluso con visión plena.
 *
 * Se mide en OKLab, que sí está construido para que la distancia euclídea se
 * parezca a la diferencia percibida, y se mide TRES veces: con visión normal y
 * simulando protanopia y deuteranopia, que juntas cubren a la gran mayoría de
 * quienes confunden rojo y verde (~8% de los hombres). El resultado es la peor
 * de las tres: un par solo está separado si lo está para todos.
 */

type Lineal = [number, number, number]

/** sRGB (0-255, con gamma) a lineal (0-1). */
function aLineal(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function hexALineal(hex: string): Lineal {
  const { r, g, b } = hexARgb(hex)
  return [aLineal(r), aLineal(g), aLineal(b)]
}

/**
 * Simulación de dicromatismo (Viénot, Brettel y Mollon, 1999) sobre RGB
 * lineal. Es el método estándar y el que usan las herramientas de referencia.
 */
const MATRICES: Record<'protan' | 'deutan', number[][]> = {
  // Sin conos L: el rojo se reconstruye desde verde y azul.
  protan: [
    [0.0, 1.05118294, -0.05116099],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
  ],
  // Sin conos M: el verde se reconstruye desde rojo y azul.
  deutan: [
    [1.0, 0.0, 0.0],
    [0.9513092, 0.0, 0.04866992],
    [0.0, 0.0, 1.0],
  ],
}

function simular(lineal: Lineal, tipo: 'protan' | 'deutan'): Lineal {
  const m = MATRICES[tipo]
  return [
    m[0][0] * lineal[0] + m[0][1] * lineal[1] + m[0][2] * lineal[2],
    m[1][0] * lineal[0] + m[1][1] * lineal[1] + m[1][2] * lineal[2],
    m[2][0] * lineal[0] + m[2][1] * lineal[1] + m[2][2] * lineal[2],
  ]
}

/** RGB lineal a OKLab (Björn Ottosson). */
function aOklab([r, g, b]: Lineal): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Distancia euclídea en OKLab, escalada a un rango cómodo de leer (0-100). */
function deltaE(a: Lineal, b: Lineal): number {
  const [l1, a1, b1] = aOklab(a)
  const [l2, a2, b2] = aOklab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100
}

/**
 * Lo separados que están dos colores para el ojo MENOS favorecido: el mínimo
 * entre visión normal, protanopia y deuteranopia.
 *
 * Referencia práctica: por debajo de 8 dos series contiguas se confunden bajo
 * daltonismo; por debajo de 15 en visión normal, se confunden para cualquiera.
 */
export function distanciaPerceptual(hexA: string, hexB: string): number {
  const a = hexALineal(hexA)
  const b = hexALineal(hexB)
  return Math.min(
    deltaE(a, b),
    deltaE(simular(a, 'protan'), simular(b, 'protan')),
    deltaE(simular(a, 'deutan'), simular(b, 'deutan')),
  )
}

/** La misma distancia, pero solo con visión normal. */
export function distanciaVisionNormal(hexA: string, hexB: string): number {
  return deltaE(hexALineal(hexA), hexALineal(hexB))
}
