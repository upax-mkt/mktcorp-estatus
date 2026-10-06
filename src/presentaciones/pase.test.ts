import { describe, it, expect } from 'vitest'
import { firmarPase, paseValido, cookieDePase, DIAS_DE_PASE } from './pase'
import { firmar, verificar, firmarDato } from '@/auth/firma'

const SECRETO = 'secreto-de-prueba-no-usar-en-produccion'
const AHORA = new Date('2026-10-06T18:00:00Z')
const PRES = 'nueva-estructura-comercial-2027'

describe('pase de una presentación con clave', () => {
  it('abre la presentación y la sala para las que se firmó', async () => {
    const t = await firmarPase(PRES, 'research-land', SECRETO, AHORA)
    expect(await paseValido(t, SECRETO, PRES, 'research-land', AHORA)).toBe(true)
  })

  it('no abre otra presentación ni la misma desde otra sala', async () => {
    const t = await firmarPase(PRES, 'research-land', SECRETO, AHORA)
    expect(await paseValido(t, SECRETO, 'q3-2026', 'research-land', AHORA)).toBe(false)
    expect(await paseValido(t, SECRETO, PRES, 'neracode', AHORA)).toBe(false)
  })

  it(`vence a los ${DIAS_DE_PASE} días`, async () => {
    const t = await firmarPase(PRES, 'research-land', SECRETO, AHORA)
    const despues = new Date(AHORA.getTime() + (DIAS_DE_PASE + 1) * 86_400_000)
    expect(await paseValido(t, SECRETO, PRES, 'research-land', despues)).toBe(false)
  })

  it('rechaza otro secreto, un contenido alterado, basura y la ausencia de cookie', async () => {
    const t = await firmarPase(PRES, 'research-land', SECRETO, AHORA)
    expect(await paseValido(t, 'otro-secreto', PRES, 'research-land', AHORA)).toBe(false)
    const [, firma] = t.split('.')
    const alterado = `${btoa(JSON.stringify({ tipo: 'pase', pres: PRES, sala: 'research-land', exp: 9e15 })).replace(/=+$/, '')}.${firma}`
    expect(await paseValido(alterado, SECRETO, PRES, 'research-land', AHORA)).toBe(false)
    for (const basura of [undefined, '', 'x', 'a.b.c', 'sinpunto']) {
      expect(await paseValido(basura, SECRETO, PRES, 'research-land', AHORA)).toBe(false)
    }
  })

  it('una sesión no sirve como pase, y un pase no sirve como sesión', async () => {
    const sesion = await firmar({ rol: 'sala', sala: 'research-land', exp: AHORA.getTime() + 3_600_000 }, SECRETO)
    expect(await paseValido(sesion, SECRETO, PRES, 'research-land', AHORA)).toBe(false)
    const pase = await firmarPase(PRES, 'research-land', SECRETO, AHORA)
    expect(await verificar(pase, SECRETO, AHORA)).toBeNull()
  })

  it('un dato firmado sin `tipo: pase` no es un pase aunque traiga lo demás', async () => {
    const t = await firmarDato({ pres: PRES, sala: 'research-land', exp: AHORA.getTime() + 3_600_000 }, SECRETO)
    expect(await paseValido(t, SECRETO, PRES, 'research-land', AHORA)).toBe(false)
  })

  it('cada presentación tiene su propia cookie', () => {
    expect(cookieDePase(PRES)).toBe('mktcorp_pase_nueva-estructura-comercial-2027')
    expect(cookieDePase('otra')).not.toBe(cookieDePase(PRES))
  })
})
