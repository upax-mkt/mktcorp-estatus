import { describe, it, expect, vi, afterEach } from 'vitest'
import { sincronizarCambio } from './sincronizar'

/**
 * `sincronizarCambio` sin base de datos (como corre toda la suite: vitest no
 * define DATABASE_URL — ver src/db/cliente.ts) es exactamente el caso "sin
 * mondayId": `mondayIdDe` no tiene de dónde leer la fila y devuelve null. Es
 * el caso real, no un simulacro: así corre `sincronizarCambio` en todos los
 * demás tests de la suite que pasan por `editarAcuerdo`/`moverEstatus`.
 *
 * Estos dos tests son el candado de la regla central de la tarea 6: sin ellos,
 * alguien podría reintroducir el "si no hay mondayId, créalo" de antes y la
 * suite seguiría en verde — el mismo hueco que la revisión de la tarea 5
 * encontró para `crearAcuerdo`.
 */
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const DATOS = {
  salaSlug: 'mexa-creativa',
  que: 'Enviar propuesta de paid media',
  estatus: 'abierto' as const,
  fechaCompromiso: null,
}

describe('sincronizarCambio', () => {
  it('sin mondayId no crea nada: no llama a Monday y lo devuelve como no intentado', async () => {
    const espia = vi.fn()
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubEnv('MONDAY_GRUPO', 'group_mm15cfz2')
    vi.stubEnv('MONDAY_ESCRITURA', 'si')
    vi.stubGlobal('fetch', espia)

    const resultado = await sincronizarCambio('acuerdo-sin-monday-id', DATOS)

    expect(resultado).toEqual({ intentado: false, ok: false })
    expect(espia).not.toHaveBeenCalled()
  })

  it('con la escritura apagada, tampoco llama a Monday', async () => {
    const espia = vi.fn()
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    // Sin MONDAY_ESCRITURA=si: escrituraActiva() es falso antes de mirar mondayId.
    vi.stubGlobal('fetch', espia)

    const resultado = await sincronizarCambio('acuerdo-cualquiera', DATOS)

    expect(resultado).toEqual({ intentado: false, ok: false })
    expect(espia).not.toHaveBeenCalled()
  })
})
