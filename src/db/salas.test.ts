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

/**
 * `grupo-upax` SE PUEDE PAUSAR (ronda 10, tarea 15b) — "¿existe esta sala?"
 * ya no es "¿es una de las nueve salas de cliente?" (`slugsDeSalas()`, que
 * EXCLUYE a `grupo-upax` a propósito desde el 24-jul, ver `src/db/temas.ts`).
 * `grupo-upax` es una fila real y activa en `salas` — sigue en `cargarTemas()`
 * aunque no sea una de las nueve — así que validarSala ya no debe rechazarla.
 *
 * Sin DB (el caso de vitest), `cargarTemas()` cae a `SEMILLA_DE_TEMAS`, que
 * trae las DIEZ marcas de siempre —`grupo-upax` incluida, ver
 * `src/temas/semilla.ts`— así que esta validación se comporta igual con o
 * sin base: no hace falta mockear Postgres para probar la distinción.
 */
describe('validarSala — "existe" ya no es "es una de las nueve" (ronda 10, tarea 15b)', () => {
  it('pausarSala YA NO rechaza grupo-upax: la fila existe, aunque no sea una sala de cliente', async () => {
    await expect(pausarSala('grupo-upax')).resolves.toBeUndefined()
  })

  it('reactivarSala tampoco rechaza grupo-upax, por el mismo motivo', async () => {
    await expect(reactivarSala('grupo-upax')).resolves.toBeUndefined()
  })

  it('un slug inventado sigue rechazado: aflojar "existe" no es dejar pasar cualquier cosa', async () => {
    await expect(pausarSala('udn-inventada')).rejects.toThrow('Sala desconocida: "udn-inventada"')
  })

  it('un slug que coincide con una propiedad heredada de Object (constructor) también se rechaza — la comprobación mira las llaves propias del registro, no la cadena de prototipos', async () => {
    await expect(pausarSala('constructor')).rejects.toThrow('Sala desconocida: "constructor"')
  })
})
