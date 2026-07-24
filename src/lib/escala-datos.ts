import { hexAHsl, hslAHex, contraste } from './color'

const CONTRASTE_MINIMO = 3
const SEPARACION_MATIZ = 360 / 6.4 // ≈56° — con 6 colores garantiza más de 20° entre cualquier par

/**
 * Deriva colores de datos desde el primario de una marca.
 * El primero conserva el matiz del primario; el resto rota el matiz.
 * De cada uno se ajusta la luminosidad hasta alcanzar contraste suficiente
 * contra la superficie sobre la que se va a pintar.
 */
export function derivarEscalaDatos(primario: string, superficie: string, cantidad = 6): string[] {
  const base = hexAHsl(primario)
  const superficieClara = hexAHsl(superficie).l >= 50

  return Array.from({ length: cantidad }, (_, i) => {
    const h = (base.h + i * SEPARACION_MATIZ) % 360
    const s = Math.max(45, Math.min(95, base.s))
    return ajustarPorContraste(h, s, base.l, superficie, superficieClara)
  })
}

/**
 * Oscurece (sobre superficie clara) o aclara (sobre superficie oscura)
 * hasta cruzar el umbral de contraste. Devuelve el primer valor que cumple.
 */
function ajustarPorContraste(
  h: number,
  s: number,
  lInicial: number,
  superficie: string,
  superficieClara: boolean,
): string {
  const paso = superficieClara ? -2 : 2
  const limite = superficieClara ? 8 : 92

  let l = Math.max(8, Math.min(92, lInicial))

  for (let intento = 0; intento < 60; intento++) {
    const candidato = hslAHex(h, s, l)
    if (contraste(candidato, superficie) >= CONTRASTE_MINIMO) return candidato
    if (superficieClara ? l <= limite : l >= limite) break
    l += paso
  }

  // Último recurso: el extremo del rango, que siempre contrasta contra su opuesto.
  return hslAHex(h, s, superficieClara ? 8 : 92)
}
