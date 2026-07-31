import { describe, it, expect } from 'vitest'
import { distanciaPerceptual, distanciaVisionNormal } from './distancia-color'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'
import { derivarEscalaDatos, PISOS_DE_SEPARACION } from './escala-datos'
import { contraste, hexAHsl } from './color'

const CASOS: Array<{ sala: string; primario: string; superficie: string }> = [
  { sala: 'NeraCode',        primario: '#3E31CC', superficie: '#FFFFFF' },
  { sala: 'Research Land',   primario: '#1E0FF2', superficie: '#FFFFFF' },
  { sala: 'Promo Espacio',   primario: '#F94700', superficie: '#FFFFFF' },
  { sala: 'Mexa Creativa',   primario: '#F72585', superficie: '#FFFFFF' },
  { sala: 'Marketing United',primario: '#0000FF', superficie: '#FFFFFF' },
  { sala: 'House of Films',  primario: '#3B7BF7', superficie: '#FFFFFF' },
  { sala: 'UiX',             primario: '#8C59FE', superficie: '#FFFFFF' },
  { sala: 'Zeus',            primario: '#FF004F', superficie: '#FFFFFF' },
  { sala: 'Grupo UPAX',      primario: '#E34714', superficie: '#FFFFFF' },
  { sala: 'NeraCode oscuro', primario: '#3E31CC', superficie: '#07184F' },
]

describe('derivarEscalaDatos', () => {
  it('devuelve la cantidad pedida', () => {
    expect(derivarEscalaDatos('#3E31CC', '#FFFFFF')).toHaveLength(6)
    expect(derivarEscalaDatos('#3E31CC', '#FFFFFF', 4)).toHaveLength(4)
  })

  it('el primer color conserva el matiz del primario', () => {
    const [primero] = derivarEscalaDatos('#F72585', '#FFFFFF')
    const matizPrimario = hexAHsl('#F72585').h
    const matizPrimero = hexAHsl(primero).h
    expect(Math.abs(matizPrimero - matizPrimario)).toBeLessThan(6)
  })

  it.each(CASOS)('$sala: los 6 colores contrastan lo suficiente contra su superficie', ({ primario, superficie }) => {
    for (const color of derivarEscalaDatos(primario, superficie)) {
      expect(contraste(color, superficie)).toBeGreaterThanOrEqual(PISOS_DE_SEPARACION.contraste)
    }
  })

  // El test que había aquí exigía 20° de separación de MATIZ, que es justo el
  // criterio que resultó estar equivocado: el matiz de HSL no es distancia
  // percibida. Dos verdes a 56° de matiz eran indistinguibles (ΔE 0.9) y el
  // test los daba por buenos. Lo sustituye la comprobación perceptual de más
  // abajo, que mide lo que de verdad decide si un gráfico se lee.

  it('es determinista: la misma entrada da la misma salida', () => {
    expect(derivarEscalaDatos('#00CFAB', '#FFFFFF')).toEqual(derivarEscalaDatos('#00CFAB', '#FFFFFF'))
  })

  it.each(['#0000FF', '#1E0FF2', '#770EB3', '#F94700'])(
    'cumple el umbral incluso sobre superficies saturadas: %s',
    (superficie) => {
      for (const color of derivarEscalaDatos('#3E31CC', superficie)) {
        expect(contraste(color, superficie)).toBeGreaterThanOrEqual(3)
      }
    },
  )
})

describe('ninguna sala puede desplegar una paleta ilegible', () => {
  // Este es el test que faltaba. La escala anterior fallaba a partir de la
  // TERCERA serie en las diez marcas —pares de verdes a ΔE 0.9— y nadie se
  // enteró porque los gráficos de entonces usaban dos series. El primer
  // gráfico de cuatro habría salido ilegible en las diez salas a la vez, y eso
  // se descubre proyectando en una reunión.
  const SUPERFICIES: Array<[string, string]> = [
    ['clara', '#FFFFFF'],
    ['oscura', '#141414'],
  ]

  for (const [slug, tema] of Object.entries(SEMILLA_DE_TEMAS)) {
    for (const [nombreSuperficie, superficie] of SUPERFICIES) {
      it(`${slug} sobre superficie ${nombreSuperficie}: seis series separables`, () => {
        const escala = derivarEscalaDatos(tema.primario, superficie, 6)
        expect(new Set(escala).size, 'hay colores repetidos').toBe(6)

        for (let i = 0; i < escala.length; i++) {
          for (let j = i + 1; j < escala.length; j++) {
            const bajoDaltonismo = distanciaPerceptual(escala[i], escala[j])
            const conVisionNormal = distanciaVisionNormal(escala[i], escala[j])

            expect(
              bajoDaltonismo,
              `series ${i + 1} y ${j + 1} (${escala[i]} / ${escala[j]}) se confunden bajo daltonismo`,
            ).toBeGreaterThanOrEqual(PISOS_DE_SEPARACION.daltonismo)

            expect(
              conVisionNormal,
              `series ${i + 1} y ${j + 1} (${escala[i]} / ${escala[j]}) se confunden con visión normal`,
            ).toBeGreaterThanOrEqual(PISOS_DE_SEPARACION.visionNormal)
          }
        }
      })
    }
  }
})
