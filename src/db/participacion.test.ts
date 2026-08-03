import { describe, it, expect } from 'vitest'
import { resumirParticipacion, registrarEdicion, registrarPresentacion, participantesDe } from './participacion'
import { hayDB } from './cliente'

const P = (nombre: string, ediciones: number, presento = false) =>
  ({ correo: `${nombre}@x.mx`, nombre, ediciones, presento, ultimaEdicion: new Date('2026-07-20') })

describe('resumirParticipacion', () => {
  it('separa a quien preparó de quien presentó', () => {
    const r = resumirParticipacion([P('Iris', 5, true), P('César', 3), P('Fernando', 1)])
    expect(r.prepararon).toEqual(['Iris', 'César', 'Fernando'])
    expect(r.presentaron).toEqual(['Iris'])
  })

  it('ordena por cuánto editó cada quien: el que más tocó, primero', () => {
    const r = resumirParticipacion([P('César', 2), P('Iris', 9)])
    expect(r.prepararon).toEqual(['Iris', 'César'])
  })

  it('quien solo presentó sin editar no aparece como que preparó', () => {
    const r = resumirParticipacion([{ ...P('Pablo', 0), presento: true }])
    expect(r.prepararon).toEqual([])
    expect(r.presentaron).toEqual(['Pablo'])
  })

  it('sin nadie, dos listas vacías y no revienta', () => {
    const r = resumirParticipacion([])
    expect(r.prepararon).toEqual([])
    expect(r.presentaron).toEqual([])
  })
})

// Mismo patrón que src/db/enlace-agenda.test.ts: en vitest, hayDB() es false
// porque no hay DATABASE_URL en el entorno de test — estas tres son bitácora
// y no deben lanzar ni exigir base de datos para no tumbar a quien las llama.
describe('sin base de datos — no tumban la acción real que las dispara', () => {
  it('registrarEdicion no lanza y no escribe nada', async () => {
    if (!hayDB()) {
      await expect(registrarEdicion('s1', 'a@upax.com.mx')).resolves.toBeUndefined()
    }
  })

  it('registrarPresentacion no lanza y no escribe nada', async () => {
    if (!hayDB()) {
      await expect(registrarPresentacion('s1', 'a@upax.com.mx')).resolves.toBeUndefined()
    }
  })

  it('participantesDe devuelve lista vacía', async () => {
    if (!hayDB()) {
      expect(await participantesDe('s1')).toEqual([])
    }
  })
})
