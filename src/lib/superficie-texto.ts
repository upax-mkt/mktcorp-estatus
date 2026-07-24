import { contraste, hexAHsl, hslAHex } from './color'

/**
 * De entre los candidatos de color de texto, devuelve el que tenga el mayor
 * contraste MÍNIMO contra todas las paradas del degradado. Optimiza el peor
 * caso (la parada donde el texto es menos legible), no el promedio: un
 * candidato que promedie alto pero sea ilegible en una sola parada pierde
 * frente a uno más parejo.
 */
export function mejorTextoSobre(paradas: string[], candidatos: string[]): string {
  if (candidatos.length === 0) {
    throw new Error('mejorTextoSobre requiere al menos un candidato')
  }
  if (paradas.length === 0) {
    return candidatos[0]
  }

  let mejor = candidatos[0]
  let mejorContrasteMinimo = -Infinity

  for (const candidato of candidatos) {
    const contrasteMinimo = Math.min(...paradas.map((parada) => contraste(candidato, parada)))
    if (contrasteMinimo > mejorContrasteMinimo) {
      mejorContrasteMinimo = contrasteMinimo
      mejor = candidato
    }
  }

  return mejor
}

const ITERACIONES_BUSQUEDA_BINARIA = 40

/**
 * Ajusta una sola parada en luminosidad (conservando matiz y saturación) hasta
 * que contraste ≥ minimo contra el color de texto. Si la parada ya cumple, la
 * devuelve intacta. Si ni siquiera el extremo (negro o blanco puros del mismo
 * matiz/saturación) alcanza el mínimo, devuelve ese extremo — nunca falla.
 */
function ajustarParada(parada: string, texto: string, minimo: number): string {
  if (contraste(parada, texto) >= minimo) return parada

  const { h, s, l } = hexAHsl(parada)

  // Determina hacia qué extremo (L=0 o L=100) crece el contraste, probando
  // ambos: así no dependemos de asumir qué tan "clara" es la parada original,
  // sólo de la función `contraste` real.
  const extremoOscuro = hslAHex(h, s, 0)
  const extremoClaro = hslAHex(h, s, 100)
  const extremoL = contraste(extremoOscuro, texto) >= contraste(extremoClaro, texto) ? 0 : 100
  const extremoHex = extremoL === 0 ? extremoOscuro : extremoClaro

  // Ni el extremo alcanza el mínimo: no hay forma de cumplir sin cambiar
  // matiz/saturación, así que llevamos la parada al extremo y no fallamos.
  if (contraste(extremoHex, texto) < minimo) return extremoHex

  // Búsqueda binaria del punto más cercano a la luminosidad original que
  // todavía cumple el mínimo, para alejarse de la marca lo menos posible.
  let desdeL = l
  let hastaL = extremoL
  for (let i = 0; i < ITERACIONES_BUSQUEDA_BINARIA; i++) {
    const medioL = (desdeL + hastaL) / 2
    const candidato = hslAHex(h, s, medioL)
    if (contraste(candidato, texto) >= minimo) {
      hastaL = medioL
    } else {
      desdeL = medioL
    }
  }

  return hslAHex(h, s, hastaL)
}

/**
 * Devuelve las paradas del degradado ajustadas en luminosidad —conservando su
 * matiz y su saturación— hasta que cada una alcance `minimo` (por defecto
 * 4.5, el umbral WCAG AA para texto normal) de contraste contra `texto`.
 * La identidad de marca se reconoce por el matiz: oscurecer o aclarar una
 * parada la mantiene reconocible, cambiar el matiz la destruye.
 */
export function ajustarGradienteParaTexto(
  paradas: string[],
  texto: string,
  minimo = 4.5,
): string[] {
  return paradas.map((parada) => ajustarParada(parada, texto, minimo))
}
