import { hexAHsl, hslAHex, contraste, luminancia } from './color'
import { distanciaPerceptual, distanciaVisionNormal } from './distancia-color'

/** 3.2 y no 3: con 3 exacto salían colores a 3.01:1, sin margen ninguno. */
const CONTRASTE_MINIMO = 3.2

/**
 * Pisos de separación entre dos colores de la escala.
 *
 * `SEPARACION_MINIMA` se mide con el ojo menos favorecido (protanopia o
 * deuteranopia); `SEPARACION_VISION_NORMAL` es el piso adicional para que un
 * lector con visión plena tampoco tenga que dudar.
 */
const SEPARACION_MINIMA = 8
const SEPARACION_VISION_NORMAL = 15

/**
 * Los colores con los que se dibujan las series de un gráfico, derivados del
 * primario de cada marca.
 *
 * POR QUÉ NO SE ROTA EL MATIZ. La versión anterior repartía seis colores
 * girando el tono 56° cada vez. Suena razonable y no lo es: el matiz de HSL no
 * es distancia percibida — 56° entre dos azules los separan y entre dos verdes
 * no. Medido con el validador de daltonismo sobre las diez marcas, la escala
 * fallaba a partir de la TERCERA serie en todas: pares de verdes contiguos a
 * ΔE 0.9–2.4, indistinguibles incluso con visión plena.
 *
 * No dolía porque los gráficos de hoy usan dos series. El primer gráfico de
 * cuatro habría salido ilegible en las diez salas a la vez, y eso se descubre
 * en la reunión.
 *
 * CÓMO SE ELIGEN AHORA. La primera ranura conserva el matiz de la marca, que
 * es lo que hace que el gráfico se vea de la sala. Cada ranura siguiente se
 * ELIGE entre muchos candidatos: la que quede más lejos del color más cercano
 * ya elegido, midiendo en OKLab y simulando protanopia y deuteranopia. Es
 * decir, se maximiza la separación del par peor — que es el par que decide si
 * el gráfico se lee.
 */
export function derivarEscalaDatos(primario: string, superficie: string, cantidad = 6): string[] {
  const base = hexAHsl(primario)
  const superficieClara = luminancia(superficie) >= 0.179
  const s = Math.max(45, Math.min(95, base.s))

  const primero = ajustarPorContraste(base.h, s, base.l, superficie, superficieClara)
  const elegidos = [primero]
  if (cantidad <= 1) return elegidos

  // Candidatos: todo el círculo de matiz en pasos de 15°, en tres niveles de
  // luminosidad. Tres niveles y no más porque lo que separa de verdad es el
  // matiz; la luminosidad sirve para desempatar cuando el matiz se agota.
  const candidatos: string[] = []
  for (let paso = 1; paso < 24; paso++) {
    for (const desplazamientoL of [-14, 0, 12]) {
      const h = (base.h + paso * 15) % 360
      const l = Math.max(22, Math.min(78, base.l + desplazamientoL))
      const hex = ajustarPorContraste(h, s, l, superficie, superficieClara)
      if (!candidatos.includes(hex)) candidatos.push(hex)
    }
  }

  while (elegidos.length < cantidad) {
    let mejor: string | null = null
    let mejorDistancia = -1

    for (const candidato of candidatos) {
      if (elegidos.includes(candidato)) continue
      // La distancia de un candidato al conjunto es la de su vecino MÁS
      // CERCANO: de nada sirve que esté lejos de cuatro si se confunde con el
      // quinto.
      let cercano = Infinity
      for (const elegido of elegidos) {
        cercano = Math.min(
          cercano,
          distanciaPerceptual(elegido, candidato),
          // El piso de visión normal se normaliza contra el suyo para que las
          // dos condiciones pesen igual al comparar candidatos.
          (distanciaVisionNormal(elegido, candidato) * SEPARACION_MINIMA) / SEPARACION_VISION_NORMAL,
        )
      }
      if (cercano > mejorDistancia) {
        mejorDistancia = cercano
        mejor = candidato
      }
    }

    if (!mejor) break
    elegidos.push(mejor)
  }

  return elegidos
}

/** El piso que la escala se compromete a cumplir. Lo usa el test. */
export const PISOS_DE_SEPARACION = {
  daltonismo: SEPARACION_MINIMA,
  visionNormal: SEPARACION_VISION_NORMAL,
  contraste: CONTRASTE_MINIMO,
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

  // Último recurso: ningún intento cruzó el umbral dentro del rango explorado.
  // Devolvemos el extremo de luminosidad más alejado de la superficie (8 sobre
  // clara, 92 sobre oscura), que maximiza el contraste alcanzable en esa
  // dirección — no garantiza cumplir CONTRASTE_MINIMO para superficies muy
  // saturadas o de luminancia intermedia.
  return hslAHex(h, s, superficieClara ? 8 : 92)
}
