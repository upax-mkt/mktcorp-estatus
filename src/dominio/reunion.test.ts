import { describe, it, expect } from 'vitest'
import {
  reunionesDeSala, fueDada, tienePresentacion, reunionesMinutables, reunionesPorConfirmar,
  type Reunion,
} from './reunion'

/**
 * LA REUNIÓN COMO ENTIDAD (ronda 10, tarea 6, spec §1): ¿cuándo se dio una
 * junta? Antes, solo si su documento estaba maquetado — un PDF subido de una
 * junta que ya ocurrió no bastaba para que contara. Ahora: si ALGO la
 * respalda — su documento TERMINADO, un archivo, o su minuta.
 */

const hoy = '2026-08-04'
const base: Reunion = {
  id: 'r1',
  fecha: '2026-08-03T19:00:00Z',
  titulo: 'Quincenal Comercial',
  tipo: 'quincenal' as const,
  estado: 'agendada' as const,
  noDadaEn: null,
  documentoListo: false,
  archivos: [],
  acuerdos: [],
}

describe('fueDada', () => {
  it('una reunión con archivo y el día pasado se da por dada, aunque no tenga documento', () => {
    // EL CASO QUE HOY NO EXISTE: sin documento, `fueDada` nunca decía que sí,
    // y por eso un PDF no bastaba para que la junta contara como dada.
    expect(
      fueDada({ ...base, archivos: [{ id: 'a', titulo: 'Estatus', nombreOriginal: 'e.pdf', url: '/x' }] }, hoy),
    ).toBe(true)
  })

  it('lo explícito manda: dada es dada aunque no haya nada cargado', () => {
    expect(fueDada({ ...base, estado: 'dada' }, hoy)).toBe(true)
  })

  it('"no se dio" gana a la deducción', () => {
    expect(
      fueDada(
        { ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }], noDadaEn: '2026-08-03' },
        hoy,
      ),
    ).toBe(false)
  })

  it('hoy nunca es "ya pasado", pase lo que pase con el reloj', () => {
    expect(fueDada({ ...base, fecha: '2026-08-04T09:00:00Z', documentoListo: true }, hoy)).toBe(false)
  })

  it('una reunión vacía con el día pasado no se da por dada: no hay nada que lo respalde', () => {
    expect(fueDada(base, hoy)).toBe(false)
  })

  it('tener documento no es respaldo: la plantilla nace al agendar, no al reunirse', () => {
    // EL CASO QUE ROMPÍA. `Boolean(documentoId)` daba true para toda reunión
    // agendada desde `/agenda` —las 7 de la base real llevan su plantilla de
    // 8 secciones vacías—, así que cualquier junta pasada se daba por dada
    // sola. El umbral es el documento TERMINADO, igual que el viejo `lista`.
    expect(fueDada({ ...base, documentoId: 'd1', documentoListo: false }, hoy)).toBe(false)
    expect(fueDada({ ...base, documentoId: 'd1', documentoListo: true }, hoy)).toBe(true)
  })
})

describe('reunionesDeSala', () => {
  it('un archivo y una minuta de la misma reunión son UNA reunión, no dos', () => {
    const rs = reunionesDeSala({
      reuniones: [{ ...base, id: 'r1' }],
      archivos: [{ reunionId: 'r1', id: 'a1', titulo: 'Estatus RL', nombreOriginal: 'rl.pdf', url: '/x' }],
      // `Minuta` (dominio/salas.ts) no lleva `id` propio — su identidad es la
      // reunión de la que cuelga, ver la cabecera de ese tipo.
      minutas: [{ reunionId: 'r1', titulo: 'Minuta', fecha: base.fecha, texto: 'algo', enviadaA: 0 }],
      acuerdos: [],
    })
    expect(rs).toHaveLength(1)
    expect(rs[0].archivos).toHaveLength(1)
    expect(rs[0].minuta).toBeDefined()
  })

  it('ordena de la más reciente a la más antigua', () => {
    const rs = reunionesDeSala({
      reuniones: [
        { ...base, id: 'may', fecha: '2026-05-21T16:00:00Z' },
        { ...base, id: 'ago', fecha: '2026-08-03T19:00:00Z' },
        { ...base, id: 'jun', fecha: '2026-06-23T16:00:00Z' },
      ],
      archivos: [],
      minutas: [],
      acuerdos: [],
    })
    expect(rs.map((r) => r.id)).toEqual(['ago', 'jun', 'may'])
  })

  it('los acuerdos van con la reunión donde nacieron, cerrados incluidos', () => {
    const rs = reunionesDeSala({
      reuniones: [{ ...base, id: 'r1' }],
      archivos: [],
      minutas: [],
      acuerdos: [
        { id: 'a1', reunionOrigenId: 'r1', que: 'Cruce de paid media', responsable: 'Fernando', estatus: 'cumplido', fechaCompromiso: '2026-07-31' },
        { id: 'a2', reunionOrigenId: 'r1', que: 'Negocios perdidos', responsable: 'Norma', estatus: 'abierto', fechaCompromiso: '2026-08-08' },
        { id: 'a3', reunionOrigenId: 'otra', que: 'De otra junta', responsable: 'Iris', estatus: 'abierto', fechaCompromiso: null },
      ],
    })
    expect(rs[0].acuerdos.map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})

describe('reunionesPorConfirmar', () => {
  it('ofrece las que la deducción ya cuenta como dadas, para poder negarlas', () => {
    const conArchivo = { ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }
    expect(reunionesPorConfirmar([conArchivo], hoy).map((r) => r.id)).toEqual(['r1'])
  })

  it('sigue ofreciendo la ya marcada "no se dio": si desapareciera no habría cómo arrepentirse', () => {
    const negada = { ...base, noDadaEn: '2026-08-03', archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }
    expect(reunionesPorConfirmar([negada], hoy)).toHaveLength(1)
  })

  it('una reunión ya confirmada no se pregunta: es un hecho, no una duda', () => {
    expect(reunionesPorConfirmar([{ ...base, estado: 'dada' }], hoy)).toHaveLength(0)
  })
})

describe('tienePresentacion', () => {
  it('un documento listo cuenta como presentación', () => {
    expect(tienePresentacion({ ...base, documentoId: 'd1', documentoListo: true })).toBe(true)
  })

  it('un documento a medio maquetar todavía no es una presentación', () => {
    // Mismo umbral que `fueDada`: `documentoListo`, no `documentoId`.
    expect(tienePresentacion({ ...base, documentoId: 'd1', documentoListo: false })).toBe(false)
  })

  it('un archivo cargado también cuenta, sin documento de por medio', () => {
    expect(tienePresentacion({ ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] })).toBe(true)
  })

  it('sin documento listo ni archivo, no hay nada que enseñar', () => {
    expect(tienePresentacion(base)).toBe(false)
  })
})

describe('reunionesMinutables', () => {
  it('una reunión respaldada y sin minuta es minutable', () => {
    const conArchivo = { ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }
    expect(reunionesMinutables([conArchivo], hoy).map((r) => r.id)).toEqual(['r1'])
  })

  it('ya con minuta, no se vuelve a ofrecer', () => {
    const conMinuta: Reunion = {
      ...base,
      archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }],
      minuta: { fecha: base.fecha, titulo: 'Minuta', enviadaA: 3 },
    }
    expect(reunionesMinutables([conMinuta], hoy)).toHaveLength(0)
  })

  it('sin nada que la respalde, no hay qué minutar', () => {
    expect(reunionesMinutables([base], hoy)).toHaveLength(0)
  })

  it('"no se dio" tampoco se minuta: no hay nada que transcribir', () => {
    const negada = { ...base, noDadaEn: '2026-08-03', archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }
    expect(reunionesMinutables([negada], hoy)).toHaveLength(0)
  })

  it('un documento listo hoy mismo ya es minutable, aunque `fueDada` todavía diga que no', () => {
    // A diferencia de `fueDada` —donde hoy nunca es "ya pasado"— minutar no
    // espera al día siguiente: si la junta ya ocurrió esta mañana, hay algo
    // que transcribir esta tarde.
    const hoyMismo = { ...base, fecha: '2026-08-04T09:00:00Z', documentoListo: true }
    expect(fueDada(hoyMismo, hoy)).toBe(false)
    expect(reunionesMinutables([hoyMismo], hoy)).toHaveLength(1)
  })

  it('una reunión futura no es minutable: todavía no pasa', () => {
    const futura = { ...base, fecha: '2026-08-10T19:00:00Z', estado: 'dada' as const }
    expect(reunionesMinutables([futura], hoy)).toHaveLength(0)
  })
})
