import { describe, it, expect } from 'vitest'
import {
  reunionesDeSala, fueDada, tienePresentacion, reunionesMinutables, reunionesPorConfirmar,
  reunionesPorVenir, historialDeReuniones, seEstaArmando, documentoCuentaComoPresentacion,
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
  plantilla: null,
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

  /**
   * REGRESIÓN CERRADA (Tarea 7). La antecesora de esta función,
   * `sesionesPorConfirmar` (dominio/salas.ts:435), filtra por
   * `salaActiva !== false` desde el 3-ago —el día antes de esta ronda,
   * commit `f51ef38`— porque confirmar o negar una reunión es la "gestión"
   * que el freeze comercial congela (mismo criterio que `crearReunion`,
   * que bloquea trabajo nuevo para una sala en pausa). `Reunion` no lleva
   * `salaActiva` —no es una propiedad de la reunión, es de su sala— así que
   * viaja como campo adicional opcional en la entrada, igual que hacía la
   * vieja función con su objeto de sesión.
   */
  describe('respeta el freeze de la sala', () => {
    const conArchivo = { ...base, archivos: [{ id: 'a', titulo: 'x', nombreOriginal: 'x.pdf', url: '/x' }] }

    it('salaActiva: false — no aparece, aunque tenga respaldo y el día ya pasado', () => {
      expect(reunionesPorConfirmar([{ ...conArchivo, salaActiva: false }], hoy)).toHaveLength(0)
    })

    it('salaActiva: true — aparece con normalidad', () => {
      expect(reunionesPorConfirmar([{ ...conArchivo, salaActiva: true }], hoy)).toHaveLength(1)
    })

    it('salaActiva ausente (el llamador no lo sabe): se trata como activa', () => {
      expect(reunionesPorConfirmar([conArchivo], hoy)).toHaveLength(1)
    })

    it('una marcada "no se dio" en una sala pausada tampoco aparece: ni para deshacerla mientras dure la pausa', () => {
      const negada = { ...conArchivo, noDadaEn: '2026-08-03', salaActiva: false }
      expect(reunionesPorConfirmar([negada], hoy)).toHaveLength(0)
    })

    it('con varias reuniones, solo se excluye la de la sala pausada — las demás siguen ofreciéndose', () => {
      const r = reunionesPorConfirmar(
        [
          { ...conArchivo, id: 'activa', salaActiva: true },
          { ...conArchivo, id: 'pausada', salaActiva: false },
        ],
        hoy,
      )
      expect(r.map((x) => x.id)).toEqual(['activa'])
    })
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

/**
 * LO QUE VIENE Y LO QUE YA PASÓ (Franco: *"sigue estando rara la lógica en el
 * módulo de reuniones dentro de la sala"*).
 *
 * La sala repartía la misma reunión en tres bloques que no se hablaban. Estas
 * dos funciones parten la lista por la única frontera que cambia lo que se
 * puede hacer con una reunión —si su día ya pasó— y son complementarias por
 * construcción, que es lo que impide que la duplicación vuelva por un filtro
 * nuevo.
 */
describe('reunionesPorVenir / historialDeReuniones', () => {
  const futura: Reunion = { ...base, id: 'futura', fecha: '2026-08-20T19:00:00Z' }
  const hoyMismo: Reunion = { ...base, id: 'hoy', fecha: '2026-08-04T19:00:00Z' }
  const pasada: Reunion = { ...base, id: 'pasada', fecha: '2026-07-15T19:00:00Z' }

  it('lo que viene son las que todavía no han ocurrido, de la más próxima a la más lejana', () => {
    expect(reunionesPorVenir([futura, pasada, hoyMismo], hoy).map((r) => r.id))
      .toEqual(['hoy', 'futura'])
  })

  /** Hoy todavía se prepara: la junta es esta tarde. */
  it('la de HOY está por venir, no en el historial', () => {
    expect(reunionesPorVenir([hoyMismo], hoy).map((r) => r.id)).toEqual(['hoy'])
    expect(historialDeReuniones([hoyMismo], hoy)).toHaveLength(0)
  })

  it('lo explícito manda: una futura ya marcada como dada va al historial', () => {
    const adelantada = { ...futura, estado: 'dada' as const }
    expect(reunionesPorVenir([adelantada], hoy)).toHaveLength(0)
    expect(historialDeReuniones([adelantada], hoy).map((r) => r.id)).toEqual(['futura'])
  })

  it('una futura marcada "no se dio" tampoco se sigue preparando', () => {
    const cancelada = { ...futura, noDadaEn: '2026-08-04T00:00:00Z' }
    expect(reunionesPorVenir([cancelada], hoy)).toHaveLength(0)
    expect(historialDeReuniones([cancelada], hoy).map((r) => r.id)).toEqual(['futura'])
  })

  /**
   * LA INVARIANTE QUE IMPIDE QUE VUELVA EL BUG: toda reunión está en
   * exactamente una de las dos listas. Si algún día alguien añade un filtro a
   * `reunionesPorVenir`, el historial lo recoge solo — porque se define como
   * su complemento, no con criterios paralelos.
   */
  it('cada reunión cae en exactamente una lista, nunca en las dos ni en ninguna', () => {
    const todas = [futura, hoyMismo, pasada,
      { ...pasada, id: 'negada', noDadaEn: '2026-08-01T00:00:00Z' },
      { ...futura, id: 'adelantada', estado: 'dada' as const }]
    const porVenir = reunionesPorVenir(todas, hoy).map((r) => r.id)
    const historial = historialDeReuniones(todas, hoy).map((r) => r.id)
    expect([...porVenir, ...historial].sort()).toEqual(todas.map((r) => r.id).sort())
    expect(porVenir.filter((id) => historial.includes(id))).toEqual([])
  })
})

/**
 * `seEstaArmando` mira si EXISTE el documento, no si está listo: son dos
 * preguntas distintas y confundirlas es lo que hacía que la sala ofreciera
 * "Seguir editando" a una reunión cuya presentación se acababa de descartar.
 */
describe('seEstaArmando', () => {
  it('sin documento no hay nada que seguir editando', () => {
    expect(seEstaArmando(base)).toBe(false)
  })

  it('un documento a medio armar cuenta, aunque no esté listo', () => {
    expect(seEstaArmando({ ...base, documentoId: 'doc-1', documentoListo: false })).toBe(true)
  })
})

/**
 * EL DOCUMENTO FANTASMA (ronda 13, 13-ago). Franco, sobre la reunión de junio
 * de Marketing United: *"aparece un elemento llamado 'documento', no sé qué
 * hace ahí y no lo puedo eliminar"*.
 *
 * Lo que había: un documento en estado `listo` con CERO secciones —
 * `{"items":[],"titulo":"Estatus Mensual Junio"}`, creado el 28-jul y nunca
 * tocado—. `/deck/<id>` CREA el documento al abrirlo, así que basta con que
 * alguien entrara a mirar para que la reunión quedara con una presentación
 * que nadie armó, y la tarjeta la ofrecía como si tuviera contenido porque
 * solo miraba el estado.
 */
describe('un documento vacío no es una presentación', () => {
  it('listo y con secciones: sí cuenta', () => {
    expect(documentoCuentaComoPresentacion('listo', 8)).toBe(true)
  })

  it('listo pero sin una sola sección: NO cuenta — no hay nada que enseñarle a la UDN', () => {
    expect(documentoCuentaComoPresentacion('listo', 0)).toBe(false)
  })

  it('con secciones pero a medio armar: tampoco — ese umbral no cambia', () => {
    expect(documentoCuentaComoPresentacion('borrador', 8)).toBe(false)
  })

  it('sin documento: no cuenta', () => {
    expect(documentoCuentaComoPresentacion(null, 0)).toBe(false)
    expect(documentoCuentaComoPresentacion(undefined, 3)).toBe(false)
  })
})
