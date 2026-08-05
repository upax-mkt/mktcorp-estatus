import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `guardarMinuta` — la política que `LevantarMinuta` promete en pantalla
 * (Tarea 8c, 5-ago): "Si la asignas a una sala, su minuta y sus acuerdos
 * quedan ahí; sin sala, la minuta existe igual y sus acuerdos se quedan en
 * el texto." Los acuerdos CONFIRMADOS que llegan aquí ya salieron del texto
 * de la minuta (`MinutaCliente`) — lo que decide esta política es si,
 * ADEMÁS, nacen como FILA en `acuerdos` (spec §4: un acuerdo cuelga de una
 * SALA) o se quedan tal cual, solo en el texto ya guardado.
 *
 * SIN DOBLE para `@/db/reuniones` (`crearReunion`, real): mismo patrón que
 * src/db/reuniones.test.ts — comparte el store en memoria con
 * `guardarMinuta` (las dos pasan por `store-memoria.ts`), así que crear la
 * reunión de verdad es más simple y más honesto que construir a mano una
 * fila. Siempre `estado: 'dada'`: no es el freeze de sala lo que este
 * archivo prueba, y así se evita rozarlo (mismo criterio que ya usa
 * reuniones.test.ts para su segundo caso).
 *
 * CON DOBLE para `./acuerdos` (`crearAcuerdo`): lo único que `guardarMinuta`
 * decide aquí es SI lo llama y con qué sala — no cómo se comporta
 * `crearAcuerdo` por dentro, eso ya lo cubre src/db/acuerdos.test.ts. Espiar
 * la llamada (no su resultado) es la prueba más directa de la política.
 */

const crearAcuerdoMock = vi.fn()
vi.mock('./acuerdos', () => ({
  crearAcuerdo: (...args: unknown[]) => crearAcuerdoMock(...args),
}))

const { crearReunion, obtenerReunion } = await import('./reuniones')
const { guardarMinuta, obtenerMinuta } = await import('./minutas')
const { reiniciarStoreMemoria } = await import('./store-memoria')

/** Un acuerdo confirmado cualquiera — la forma que produce MinutaCliente al revisar la propuesta de la IA. */
const ACUERDO_CONFIRMADO = {
  que: 'Mandar la propuesta revisada',
  responsable: 'Pablo Levy',
  prioridad: 'alta',
  fechaCompromiso: null as string | null,
}

beforeEach(() => {
  reiniciarStoreMemoria()
  crearAcuerdoMock.mockReset().mockResolvedValue({ id: 'acuerdo-1' })
})

describe('guardarMinuta', () => {
  it('con sala: guarda la minuta y publica cada acuerdo confirmado como fila, en ESA sala', async () => {
    const { id: reunionId } = await crearReunion({
      salaSlug: 'neracode',
      fecha: new Date('2026-08-01T16:00:00.000Z'),
      titulo: 'Mensual NeraCode',
      tipo: 'mensual',
      estado: 'dada',
    })

    await guardarMinuta(reunionId, 'transcripción cruda', 'texto final del correo', [ACUERDO_CONFIRMADO])

    expect(crearAcuerdoMock).toHaveBeenCalledTimes(1)
    expect(crearAcuerdoMock).toHaveBeenCalledWith(
      'neracode',
      expect.objectContaining({ que: 'Mandar la propuesta revisada', reunionOrigenId: reunionId }),
    )

    const minuta = await obtenerMinuta(reunionId)
    expect(minuta?.textoFinal).toBe('texto final del correo')
  })

  it('sin sala (comité, interna de Mkt Corp): guarda la minuta igual, pero NO crea ningún acuerdo como fila', async () => {
    const { id: reunionId } = await crearReunion({
      salaSlug: null,
      fecha: new Date('2026-08-01T16:00:00.000Z'),
      titulo: 'Comité de dirección · agosto',
      tipo: 'mensual',
      estado: 'dada',
    })

    const textoConAcuerdoEscrito = 'Texto final. Acuerdo: Mandar la propuesta revisada — Pablo Levy.'
    await guardarMinuta(reunionId, 'transcripción cruda', textoConAcuerdoEscrito, [ACUERDO_CONFIRMADO])

    // LA POLÍTICA: sin sala no hay dónde colgar una fila de `acuerdos` (spec
    // §4, cuelgan de una sala) — se quedan escritos en el texto, no como
    // fila aparte.
    expect(crearAcuerdoMock).not.toHaveBeenCalled()

    // La minuta sí existe, con el acuerdo tal cual quedó en el texto — y la
    // reunión persiste con `salaSlug: null`, no con un valor inventado.
    const minuta = await obtenerMinuta(reunionId)
    expect(minuta?.textoFinal).toBe(textoConAcuerdoEscrito)
    expect((await obtenerReunion(reunionId))?.salaSlug).toBeNull()
  })

  it('sin sala y sin acuerdos confirmados: tampoco llama a crearAcuerdo (caso trivial, sin reventar)', async () => {
    const { id: reunionId } = await crearReunion({
      salaSlug: null,
      fecha: new Date('2026-08-01T16:00:00.000Z'),
      titulo: 'Arranque de campaña',
      tipo: 'mensual',
      estado: 'dada',
    })

    await guardarMinuta(reunionId, 'transcripción', 'texto final', [])

    expect(crearAcuerdoMock).not.toHaveBeenCalled()
    const minuta = await obtenerMinuta(reunionId)
    expect(minuta?.textoFinal).toBe('texto final')
  })
})
