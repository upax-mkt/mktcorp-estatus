import { describe, it, expect } from 'vitest'
import { contraste } from './color'
import {
  componerSobre,
  textoYVeloSobreGradiente,
  veloParaGradiente,
  puntoDelGradiente,
  CONTRASTE_MINIMO_GRADIENTE,
} from './texto-sobre-gradiente'

/**
 * EL CASO QUE TRAJO TODO ESTO. La barra de un módulo plegado pinta
 * `linear-gradient(120deg, parada0, parada1)` a lo ancho de 1000 px y pone
 * contenido en LOS DOS EXTREMOS: el icono y el título pegados al borde
 * izquierdo, la cifra y el chevron al 96% del ancho. Hasta hoy el color del
 * texto se validaba SOLO contra `parada0`, así que la cifra de la derecha
 * caía sobre un color que nadie había medido.
 *
 * Medido en producción el 26-ago-2026 con las diez salas reales: seis fallaban
 * contra su segunda parada. El peor, Promo Espacio: texto `#212121` sobre el
 * negro con el que acaba su degradado da **1,30:1** — invisible, y así se veía
 * en el print.
 */
const PROMO_ESPACIO = ['#f94701', '#000000']
const NERACODE = ['#3E31CC', '#1BE4BA']
const CECI = ['#D72A5A', '#5367E1']

/** El contraste del texto contra la peor de las paradas, ya compuestas con el velo. */
function peorContraste(texto: string, paradas: string[], velo: string | null): number {
  return Math.min(...paradas.map((p) => contraste(texto, velo ? componerSobre(velo, p) : p)))
}

describe('componerSobre', () => {
  it('un velo opaco tapa el fondo entero', () => {
    expect(componerSobre('rgba(0, 0, 0, 1)', '#f94701')).toBe('#000000')
  })

  it('un velo transparente deja el fondo intacto', () => {
    expect(componerSobre('rgba(0, 0, 0, 0)', '#f94701')).toBe('#F94701')
  })

  it('un velo negro a la mitad oscurece el fondo a la mitad', () => {
    expect(componerSobre('rgba(0, 0, 0, 0.5)', '#ffffff')).toBe('#808080')
  })

  it('un velo blanco aclara', () => {
    expect(componerSobre('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080')
  })
})

describe('veloParaGradiente', () => {
  it('no pide velo cuando el texto ya se lee sobre todas las paradas', () => {
    // Blanco sobre los dos morados de Ceci: 4,81 y 4,78. Ya cumple.
    expect(veloParaGradiente('#ffffff', CECI, CONTRASTE_MINIMO_GRADIENTE)).toBeNull()
  })

  it('el velo deja el texto legible sobre TODAS las paradas, no solo la primera', () => {
    const velo = veloParaGradiente('#ffffff', PROMO_ESPACIO, CONTRASTE_MINIMO_GRADIENTE)
    expect(velo).not.toBeNull()
    expect(peorContraste('#ffffff', PROMO_ESPACIO, velo)).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO_GRADIENTE,
    )
  })

  it('un texto claro pide un velo oscuro, y uno oscuro un velo claro', () => {
    expect(veloParaGradiente('#ffffff', PROMO_ESPACIO, CONTRASTE_MINIMO_GRADIENTE)).toMatch(
      /^rgba\(0, 0, 0, /,
    )
    expect(veloParaGradiente('#000000', NERACODE, CONTRASTE_MINIMO_GRADIENTE)).toMatch(
      /^rgba\(255, 255, 255, /,
    )
  })

  /**
   * EL VELO ES EL MÍNIMO QUE HACE FALTA, y esto no es cosmética: cada décima
   * de más apaga la marca de una sala. Con uno menor el texto deja de leerse.
   */
  it('no pide más velo del imprescindible', () => {
    const velo = veloParaGradiente('#ffffff', PROMO_ESPACIO, CONTRASTE_MINIMO_GRADIENTE)!
    const alfa = Number(velo.match(/([\d.]+)\)$/)![1])
    const unPocoMenos = `rgba(0, 0, 0, ${(alfa - 0.02).toFixed(3)})`
    expect(peorContraste('#ffffff', PROMO_ESPACIO, unPocoMenos)).toBeLessThan(
      CONTRASTE_MINIMO_GRADIENTE,
    )
  })

  it('el velo nunca llega a tapar del todo la marca', () => {
    for (const paradas of [PROMO_ESPACIO, NERACODE, CECI]) {
      const velo = veloParaGradiente('#ffffff', paradas, CONTRASTE_MINIMO_GRADIENTE)
      if (!velo) continue
      expect(Number(velo.match(/([\d.]+)\)$/)![1])).toBeLessThan(1)
    }
  })
})

describe('textoYVeloSobreGradiente', () => {
  it('deja intacto un texto que ya se lee, y no le pone velo', () => {
    const { texto, velo } = textoYVeloSobreGradiente(CECI, '#ffffff')
    expect(texto).toBe('#ffffff')
    expect(velo).toBeNull()
  })

  /**
   * Franco, sobre el magenta de Mexa: *"devuelve casi negro sobre su propia
   * franja de marca"*. El derivado partía del blanco y, cuando el blanco no
   * llegaba, se iba al otro extremo sin mirar qué pasaba en el resto de la
   * barra. Aquí el criterio cambia: entre blanco y negro gana el que necesite
   * MENOS velo, porque menos velo es más marca a la vista.
   */
  it('cuando el derivado no se lee, elige el extremo que menos apague la marca', () => {
    const { texto, velo } = textoYVeloSobreGradiente(PROMO_ESPACIO, '#212121')
    expect(texto).toBe('#ffffff')
    expect(peorContraste(texto, PROMO_ESPACIO, velo)).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO_GRADIENTE,
    )
  })

  /**
   * LO ESCRITO MANDA (decisión de Franco del 20-ago-2026, `editarSalaAction`).
   * Un color elegido a mano en los ajustes de la sala no se sustituye nunca:
   * se le calcula el velo que haga falta para que se lea, y ya.
   */
  it('respeta el color escrito a mano y le calcula su velo', () => {
    const { texto, velo } = textoYVeloSobreGradiente(NERACODE, '#212121', '#ff00ff')
    expect(texto).toBe('#ff00ff')
    expect(peorContraste('#ff00ff', NERACODE, velo)).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO_GRADIENTE,
    )
  })

  it('una sola parada también vale: es el degradado degenerado', () => {
    const { texto, velo } = textoYVeloSobreGradiente(['#000000'], '#ffffff')
    expect(texto).toBe('#ffffff')
    expect(velo).toBeNull()
  })

  /**
   * LAS DIEZ SALAS REALES, tal como estaban en la base el 26-ago-2026. Este
   * test es el que habría cazado el defecto: recorre las paradas de verdad y
   * exige que el peor punto de la barra se lea.
   */
  it('deja legibles las diez salas de producción', () => {
    const salas: Record<string, string[]> = {
      ceci: ['#D72A5A', '#5367E1'],
      'grupo-upax': ['#E34714', '#D72A5A'],
      'house-of-films': ['#000000', '#3a7cf7'],
      'marketing-united': ['#000000', '#000075'],
      'mexa-creativa': ['#F72585', '#198FF9'],
      neracode: ['#3E31CC', '#1BE4BA'],
      'promo-espacio': ['#f94701', '#000000'],
      'research-land': ['#770eb3', '#28053d'],
      uix: ['#2d0e6a', '#5b78fe'],
      zeus: ['#614ACA', '#FF004F'],
    }
    for (const [slug, paradas] of Object.entries(salas)) {
      const { texto, velo } = textoYVeloSobreGradiente(paradas, '#ffffff')
      expect(
        peorContraste(texto, paradas, velo),
        `${slug} no se lee en el peor punto de su barra`,
      ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO_GRADIENTE)
    }
  })
})

describe('la convención del blanco', () => {
  /**
   * Grupo UPAX pide 0,063 de velo con blanco y 0,028 con negro: las dos son
   * imperceptibles, así que cambiarle el color del texto a media casa por 35
   * milésimas sería ruido. Se queda con el blanco que ya usa.
   */
  it('no cambia a negro por una diferencia de velo imperceptible', () => {
    const { texto } = textoYVeloSobreGradiente(['#E34714', '#D72A5A'], '#151515')
    expect(texto).toBe('#ffffff')
  })

  /**
   * NeraCode sí: su degradado cruza de azul oscuro a turquesa brillante, y
   * sostener el blanco cuesta 0,415 de velo —el turquesa se apaga entero—
   * contra 0,250 del negro.
   */
  it('cambia a negro cuando sostener el blanco apagaría la marca', () => {
    const { texto } = textoYVeloSobreGradiente(NERACODE, '#ffffff')
    expect(texto).toBe('#000000')
  })
})

/**
 * ⚠️ EL DEFECTO QUE SE ESCONDIÓ DENTRO DE LA PROPIA MEDICIÓN (26-ago-2026).
 *
 * La primera versión de esto validaba el texto contra LAS PARADAS del
 * degradado y daba todo por bueno. Medido después en el navegador, sala por
 * sala y ancho por ancho, apareció Mexa Creativa a 390 px con sus cifras en
 * 4,08:1 — por debajo de AA, con las dos paradas cumpliendo.
 *
 * La causa: un degradado interpola en sRGB, y el camino entre dos colores
 * puede pasar por sitios MÁS OSCUROS que sus dos extremos. El magenta
 * (#F72585) y el azul (#198FF9) de Mexa se cruzan por morados que ninguno de
 * los dos anticipa. Validar los extremos de un recorrido no es validar el
 * recorrido, y en una barra estrecha —donde la inclinación de 120° hace que el
 * texto caiga en mitad del camino— es justo el tramo que importa.
 */
describe('el recorrido entero del degradado, no solo sus paradas', () => {
  const MEXA = ['#F72585', '#198FF9']

  it('cubre los puntos intermedios más oscuros que las dos paradas', () => {
    const { texto, velo } = textoYVeloSobreGradiente(MEXA, '#1c1c1c')
    for (let i = 0; i <= 20; i++) {
      const punto = puntoDelGradiente(MEXA, i / 20)
      expect(
        contraste(texto, velo ? componerSobre(velo, punto) : punto),
        `el ${i * 5}% del recorrido de Mexa no llega a AA`,
      ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO_GRADIENTE)
    }
  })

  it('las diez salas se leen en TODO su recorrido, no solo en las paradas', () => {
    const salas: Record<string, string[]> = {
      ceci: ['#D72A5A', '#5367E1'],
      'grupo-upax': ['#E34714', '#D72A5A'],
      'house-of-films': ['#000000', '#3a7cf7'],
      'marketing-united': ['#000000', '#000075'],
      'mexa-creativa': MEXA,
      neracode: ['#3E31CC', '#1BE4BA'],
      'promo-espacio': ['#f94701', '#000000'],
      'research-land': ['#770eb3', '#28053d'],
      uix: ['#2d0e6a', '#5b78fe'],
      zeus: ['#614ACA', '#FF004F'],
    }
    for (const [slug, paradas] of Object.entries(salas)) {
      const { texto, velo } = textoYVeloSobreGradiente(paradas, '#ffffff')
      const peor = Math.min(
        ...Array.from({ length: 21 }, (_, i) => {
          const punto = puntoDelGradiente(paradas, i / 20)
          return contraste(texto, velo ? componerSobre(velo, punto) : punto)
        }),
      )
      expect(peor, `${slug} tiene un tramo de su barra por debajo de AA`).toBeGreaterThanOrEqual(
        CONTRASTE_MINIMO_GRADIENTE,
      )
    }
  })
})
