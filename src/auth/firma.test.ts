import { describe, it, expect } from 'vitest'
import { firmar, verificar } from './firma'

const SECRETO = 'secreto-de-prueba-no-usar-en-produccion'
const AHORA = new Date('2026-07-27T18:00:00Z')
const EN_UNA_HORA = new Date(AHORA.getTime() + 3_600_000)

describe('firmar / verificar', () => {
  it('devuelve el mismo contenido que se firmó', async () => {
    const token = await firmar({ rol: 'equipo', sub: 'franco', exp: EN_UNA_HORA.getTime() }, SECRETO)
    const dentro = await verificar(token, SECRETO, AHORA)
    expect(dentro).toEqual({ rol: 'equipo', sub: 'franco', exp: EN_UNA_HORA.getTime() })
  })

  it('conserva el slug de sala en un acceso de sala', async () => {
    const token = await firmar({ rol: 'sala', sala: 'neracode', exp: EN_UNA_HORA.getTime() }, SECRETO)
    const dentro = await verificar(token, SECRETO, AHORA)
    expect(dentro?.rol).toBe('sala')
    expect(dentro?.sala).toBe('neracode')
  })

  it('rechaza un token firmado con otro secreto', async () => {
    const token = await firmar({ rol: 'equipo', exp: EN_UNA_HORA.getTime() }, 'otro-secreto')
    expect(await verificar(token, SECRETO, AHORA)).toBeNull()
  })

  it('rechaza un token cuyo contenido fue alterado', async () => {
    const token = await firmar({ rol: 'sala', sala: 'neracode', exp: EN_UNA_HORA.getTime() }, SECRETO)
    const [, firma] = token.split('.')
    const otroPayload = Buffer.from(
      JSON.stringify({ rol: 'equipo', exp: EN_UNA_HORA.getTime() }),
    ).toString('base64url')
    expect(await verificar(`${otroPayload}.${firma}`, SECRETO, AHORA)).toBeNull()
  })

  it('rechaza un token expirado', async () => {
    const token = await firmar({ rol: 'equipo', exp: AHORA.getTime() - 1 }, SECRETO)
    expect(await verificar(token, SECRETO, AHORA)).toBeNull()
  })

  it('acepta un token que expira justo ahora sin haber vencido todavía', async () => {
    const token = await firmar({ rol: 'equipo', exp: AHORA.getTime() }, SECRETO)
    expect(await verificar(token, SECRETO, AHORA)).not.toBeNull()
  })

  it('rechaza basura, cadenas vacías y tokens sin firma', async () => {
    for (const basura of ['', '.', 'sin-punto', 'a.b', 'a.b.c']) {
      expect(await verificar(basura, SECRETO, AHORA)).toBeNull()
    }
    expect(await verificar(undefined, SECRETO, AHORA)).toBeNull()
  })

  it('rechaza un payload válido en JSON pero que no es una sesión', async () => {
    // Firmado con el secreto correcto, pero el rol no existe: no debe pasar.
    const token = await firmar(
      { rol: 'dios', exp: EN_UNA_HORA.getTime() } as never,
      SECRETO,
    )
    expect(await verificar(token, SECRETO, AHORA)).toBeNull()
  })

  it('rechaza un acceso de sala sin sala declarada', async () => {
    const token = await firmar({ rol: 'sala', exp: EN_UNA_HORA.getTime() } as never, SECRETO)
    expect(await verificar(token, SECRETO, AHORA)).toBeNull()
  })

  it('conserva el rolApp de un acceso de equipo (ronda 9, tarea 2)', async () => {
    const token = await firmar(
      { rol: 'equipo', sub: 'franco', rolApp: 'editor', exp: EN_UNA_HORA.getTime() },
      SECRETO,
    )
    const dentro = await verificar(token, SECRETO, AHORA)
    expect(dentro?.rolApp).toBe('editor')
  })

  it('un acceso de equipo sin rolApp sigue siendo válido: es la sesión previa a esta ronda', async () => {
    const token = await firmar({ rol: 'equipo', sub: 'franco', exp: EN_UNA_HORA.getTime() }, SECRETO)
    const dentro = await verificar(token, SECRETO, AHORA)
    expect(dentro?.rol).toBe('equipo')
    expect(dentro?.rolApp).toBeUndefined()
  })

  it('rechaza un rolApp inventado: falla cerrado ya al deserializar', async () => {
    const token = await firmar(
      { rol: 'equipo', rolApp: 'superadmin', exp: EN_UNA_HORA.getTime() } as never,
      SECRETO,
    )
    expect(await verificar(token, SECRETO, AHORA)).toBeNull()
  })

  it('produce firmas distintas para contenidos distintos', async () => {
    const a = await firmar({ rol: 'sala', sala: 'neracode', exp: EN_UNA_HORA.getTime() }, SECRETO)
    const b = await firmar({ rol: 'sala', sala: 'zeus', exp: EN_UNA_HORA.getTime() }, SECRETO)
    expect(a).not.toBe(b)
  })
})
