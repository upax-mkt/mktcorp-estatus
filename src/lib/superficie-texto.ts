import { contraste, hexAHsl, hslAHex } from './color'

const ITERACIONES_BUSQUEDA_BINARIA = 40

/**
 * Ajusta `color` en luminosidad (conservando matiz y saturación) hasta que
 * contraste ≥ minimo contra `contra` (un color de referencia fijo — texto o
 * superficie, no importa cuál sea semánticamente: la función es simétrica).
 * Si `color` ya cumple, lo devuelve intacto. Si ni siquiera el extremo (negro
 * o blanco puros del mismo matiz/saturación) alcanza el mínimo, devuelve ese
 * extremo — nunca falla.
 *
 * Es la maquinaria detrás de `--primario-sobre-superficie` en ProveedorTema
 * (el primario de marca ajustado contra la superficie activa): un color de
 * marca que debe volverse legible como texto sin perder su identidad.
 *
 * Nota histórica: hasta la decisión de marca del 24-jul, esta misma función
 * también ajustaba las paradas del degradado para llevar texto encima
 * (`ajustarGradienteParaTexto`, ya retirada). Esa ruta se cerró: el degradado
 * ahora se pinta siempre exacto y nunca lleva texto, así que el único
 * consumidor que queda es --primario-sobre-superficie.
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
