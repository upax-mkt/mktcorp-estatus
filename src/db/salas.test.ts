import { describe, it, expect } from 'vitest'
import { salaEstaActiva, slugsDeSalasPausadas, pausarSala, reactivarSala } from './salas'

/**
 * Sin DATABASE_URL (el caso de vitest: no carga .env.local, ver vitest.config.ts)
 * este módulo no tiene tabla `salas` que consultar. Lo que sí se puede probar
 * aquí, honestamente, es exactamente eso: que "sin base, toda sala está
 * activa" y que la validación del slug —que no depende de la base— sigue
 * corriendo antes que cualquier otra cosa. El camino de Postgres (el UPDATE
 * con guarda `activa = true/false`) lo ejercita `crearSesion` de forma
 * indirecta en src/db/sesiones.test.ts, con un doble de `salaEstaActiva`.
 */

describe('salaEstaActiva, sin base de datos', () => {
  it('toda sala se trata como activa: no hay freeze que consultar', async () => {
    expect(await salaEstaActiva('zeus')).toBe(true)
  })
})

describe('slugsDeSalasPausadas, sin base de datos', () => {
  it('no hay ninguna pausada porque no hay dónde guardarlo', async () => {
    expect(await slugsDeSalasPausadas()).toEqual(new Set())
  })
})

describe('pausarSala / reactivarSala — validación de slug', () => {
  it('pausarSala rechaza una sala que no existe, antes de tocar nada', async () => {
    await expect(pausarSala('no-existe')).rejects.toThrow('Sala desconocida: "no-existe"')
  })

  it('reactivarSala rechaza una sala que no existe', async () => {
    await expect(reactivarSala('no-existe')).rejects.toThrow('Sala desconocida: "no-existe"')
  })

  it('con una sala real y sin DB, pausar y reactivar no revientan (no-op honesto)', async () => {
    await expect(pausarSala('zeus')).resolves.toBeUndefined()
    await expect(reactivarSala('zeus')).resolves.toBeUndefined()
  })
})
