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
 * Ajusta `color` en luminosidad (conservando matiz y saturación) hasta que
 * contraste ≥ minimo contra `contra` (un color de referencia fijo — texto o
 * superficie, no importa cuál sea semánticamente: la función es simétrica).
 * Si `color` ya cumple, lo devuelve intacto. Si ni siquiera el extremo (negro
 * o blanco puros del mismo matiz/saturación) alcanza el mínimo, devuelve ese
 * extremo — nunca falla.
 *
 * Es la maquinaria compartida detrás de `ajustarGradienteParaTexto` (una
 * parada de degradado ajustada contra el texto fijo) y de
 * `--primario-sobre-superficie` en ProveedorTema (el primario de marca
 * ajustado contra la superficie fija): mismo problema — un color de marca
 * que debe volverse legible sin perder su identidad — a dos niveles
 * distintos del render.
 */
export function ajustarColorParaContraste(color: string, contra: string, minimo: number): string {
  if (contraste(color, contra) >= minimo) return color

  const { h, s, l } = hexAHsl(color)

  // Determina hacia qué extremo (L=0 o L=100) crece el contraste, probando
  // ambos: así no dependemos de asumir qué tan "claro" es el color original,
  // sólo de la función `contraste` real.
  const extremoOscuro = hslAHex(h, s, 0)
  const extremoClaro = hslAHex(h, s, 100)
  const extremoL = contraste(extremoOscuro, contra) >= contraste(extremoClaro, contra) ? 0 : 100
  const extremoHex = extremoL === 0 ? extremoOscuro : extremoClaro

  // Ni el extremo alcanza el mínimo: no hay forma de cumplir sin cambiar
  // matiz/saturación, así que llevamos el color al extremo y no fallamos.
  if (contraste(extremoHex, contra) < minimo) return extremoHex

  // Búsqueda binaria del punto más cercano a la luminosidad original que
  // todavía cumple el mínimo, para alejarse de la marca lo menos posible.
  let desdeL = l
  let hastaL = extremoL
  for (let i = 0; i < ITERACIONES_BUSQUEDA_BINARIA; i++) {
    const medioL = (desdeL + hastaL) / 2
    const candidato = hslAHex(h, s, medioL)
    if (contraste(candidato, contra) >= minimo) {
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
  return paradas.map((parada) => ajustarColorParaContraste(parada, texto, minimo))
}
