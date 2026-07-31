import { describe, it, expect } from 'vitest'
import {
  sesionesSinMinuta, salaMasDesatendida, estatusVigente, estatusEfectivo, estaCongelado,
  ordenarPorProximaReunion, acuerdosVencidos, acuerdosAbiertos, type EstadoSala,
} from './salas'

/**
 * De qué sesiones falta minuta. Es lo que decide qué ofrece el botón
 * "Levantar minuta" de la sala: si se equivoca, o propone minutar algo que ya
 * tiene minuta —y se publicarían sus acuerdos dos veces— o esconde la sesión
 * que de verdad falta.
 */

function sala(parcial: Partial<EstadoSala>): EstadoSala {
  return {
    slug: 'mexa-creativa',
    nombre: 'Mexa Creativa',
    color: '#ff0080',
    logoUrl: null,
    diasDesdeUltima: 3,
    ultimaSesion: '2026-06-30',
    proximaSesion: null,
    enPreparacion: false,
    acuerdos: [],
    presentaciones: [],
    minutas: [],
    cadencia: 'mensual',
    activa: true,
    pausadaDesde: null,
    ...parcial,
  }
}

const JUNIO = { fecha: '2026-06-30', titulo: 'Estatus de junio', tipo: 'mensual' as const, sesionId: 'ses-jun' }
const MAYO = { fecha: '2026-05-28', titulo: 'Estatus de mayo', tipo: 'mensual' as const, sesionId: 'ses-may' }

describe('sesionesSinMinuta', () => {
  it('ofrece las presentadas que no tienen minuta', () => {
    const pendientes = sesionesSinMinuta(
      sala({
        presentaciones: [JUNIO, MAYO],
        minutas: [{ fecha: MAYO.fecha, titulo: MAYO.titulo, enviadaA: 4, sesionId: 'ses-may' }],
      }),
    )
    expect(pendientes.map((p) => p.id)).toEqual(['ses-jun'])
  })

  it('con todo minutado no ofrece nada', () => {
    const pendientes = sesionesSinMinuta(
      sala({
        presentaciones: [JUNIO],
        minutas: [{ fecha: JUNIO.fecha, titulo: JUNIO.titulo, enviadaA: 0, sesionId: 'ses-jun' }],
      }),
    )
    expect(pendientes).toEqual([])
  })

  it('una presentación sin sesión detrás no se ofrece: no hay dónde colgar la minuta', () => {
    const pendientes = sesionesSinMinuta(
      sala({ presentaciones: [{ fecha: '2026-04-30', titulo: 'Vieja', tipo: 'mensual' }] }),
    )
    expect(pendientes).toEqual([])
  })

  it('lleva el título y la fecha, que es lo que la lista muestra para elegir', () => {
    const [primera] = sesionesSinMinuta(sala({ presentaciones: [JUNIO] }))
    expect(primera).toEqual({ id: 'ses-jun', titulo: 'Estatus de junio', fecha: '2026-06-30' })
  })

  it('una sala sin presentaciones no revienta', () => {
    expect(sesionesSinMinuta(sala({}))).toEqual([])
  })
})

describe('salaMasDesatendida', () => {
  const conDias = (nombre: string, diasDesdeUltima: number | null) =>
    sala({ nombre, diasDesdeUltima })

  it('una sala que NUNCA ha tenido sesión es lo más desatendido que hay', () => {
    // Antes se descartaban por tener `diasDesdeUltima` nulo, que es
    // exactamente al revés de lo que significa.
    expect(salaMasDesatendida([conDias('Al día', 3), conDias('Nunca', null)])).toEqual({
      nombre: 'Nunca',
      dias: null,
    })
  })

  it('entre dos con historial, la que lleva más tiempo', () => {
    expect(salaMasDesatendida([conDias('Hace 40', 40), conDias('Hace 25', 25)])?.nombre).toBe('Hace 40')
  })

  it('si todas están al día no anuncia ninguna', () => {
    // El bug visible: con una sola sala con historial, el hub decía "más
    // desatendida: Mexa Creativa · 0 d" — la que tuvo sesión HOY.
    expect(salaMasDesatendida([conDias('Hoy', 0), conDias('Ayer', 1)])).toBeNull()
  })

  it('sin salas no revienta', () => {
    expect(salaMasDesatendida([])).toBeNull()
  })

  it('respeta la cadencia: 12 días es tibio en mensual y frío en semanal', () => {
    const mensual = sala({ nombre: 'Mensual', diasDesdeUltima: 12, cadencia: 'mensual' })
    expect(salaMasDesatendida([mensual])).toBeNull()

    const semanal = sala({ nombre: 'Semanal', diasDesdeUltima: 12, cadencia: 'semanal' })
    expect(salaMasDesatendida([semanal])?.nombre).toBe('Semanal')
  })
})

describe('estatusVigente', () => {
  const HOY = '2026-07-28'
  const acuerdo = (estatus: EstadoSala['acuerdos'][number]['estatus'], fechaCompromiso: string | null) =>
    ({ estatus, fechaCompromiso })

  it('un acuerdo abierto cuya fecha ya pasó está VENCIDO', () => {
    // El bug que esto guarda: `vencido` solo existía si alguien lo escribía a
    // mano, así que un compromiso de hace dos semanas seguía contando como
    // abierto y el hub anunciaba cero vencidos con tres encima.
    expect(estatusVigente(acuerdo('abierto', '2026-07-14'), HOY)).toBe('vencido')
  })

  it('el mismo día del compromiso todavía no está vencido', () => {
    expect(estatusVigente(acuerdo('abierto', HOY), HOY)).toBe('abierto')
  })

  it('con fecha por delante sigue abierto', () => {
    expect(estatusVigente(acuerdo('abierto', '2026-08-19'), HOY)).toBe('abierto')
  })

  it('sin fecha no vence: no hay plazo que incumplir', () => {
    expect(estatusVigente(acuerdo('abierto', null), HOY)).toBe('abierto')
  })

  it('lo cumplido no se desentierra aunque su fecha haya pasado', () => {
    expect(estatusVigente(acuerdo('cumplido', '2026-07-01'), HOY)).toBe('cumplido')
  })
})

describe('ordenarPorProximaReunion', () => {
  it('primero las que tienen fecha, de la más próxima a la más lejana', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'zeus', nombre: 'Zeus', proximaSesion: '2026-08-20' }),
      sala({ slug: 'neracode', nombre: 'NeraCode', proximaSesion: '2026-08-03' }),
      sala({ slug: 'uix', nombre: 'UiX', proximaSesion: '2026-08-11' }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['neracode', 'uix', 'zeus'])
  })

  it('las que no tienen fecha van después, por nombre', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'uix', nombre: 'UiX', proximaSesion: null }),
      sala({ slug: 'neracode', nombre: 'NeraCode', proximaSesion: null }),
      sala({ slug: 'zeus', nombre: 'Zeus', proximaSesion: '2026-08-20' }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['zeus', 'neracode', 'uix'])
  })

  it('las pausadas van al final, aunque tengan la fecha más próxima de todas', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'zeus', nombre: 'Zeus', proximaSesion: '2026-08-01', activa: false }),
      sala({ slug: 'neracode', nombre: 'NeraCode', proximaSesion: null }),
      sala({ slug: 'uix', nombre: 'UiX', proximaSesion: '2026-08-11' }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['uix', 'neracode', 'zeus'])
  })

  it('entre dos pausadas, por nombre', () => {
    const orden = ordenarPorProximaReunion([
      sala({ slug: 'zeus', nombre: 'Zeus', activa: false }),
      sala({ slug: 'neracode', nombre: 'NeraCode', activa: false }),
    ])
    expect(orden.map((s) => s.slug)).toEqual(['neracode', 'zeus'])
  })
})

describe('acuerdos congelados', () => {
  it('una sala en pausa no tiene acuerdos vencidos: están congelados', () => {
    const enPausa = sala({
      slug: 'zeus',
      nombre: 'Zeus',
      activa: false,
      acuerdos: [
        { id: 'x', que: 'algo', responsable: 'quien', fechaCompromiso: '2026-01-01', estatus: 'vencido' },
      ],
    })
    expect(acuerdosVencidos(enPausa)).toBe(0)
  })

  it('tampoco cuenta abiertos: "no cuentan" es de los dos, no solo de los vencidos', () => {
    const enPausa = sala({
      slug: 'zeus',
      nombre: 'Zeus',
      activa: false,
      acuerdos: [
        { id: 'x', que: 'algo', responsable: 'quien', fechaCompromiso: null, estatus: 'abierto' },
      ],
    })
    expect(acuerdosAbiertos(enPausa)).toBe(0)
  })

  it('una sala activa sí cuenta los suyos con normalidad', () => {
    const activa = sala({
      acuerdos: [
        { id: 'x', que: 'algo', responsable: 'quien', fechaCompromiso: '2026-01-01', estatus: 'vencido' },
        { id: 'y', que: 'otra cosa', responsable: 'quien', fechaCompromiso: null, estatus: 'abierto' },
      ],
    })
    expect(acuerdosVencidos(activa)).toBe(1)
    expect(acuerdosAbiertos(activa)).toBe(1)
  })
})

describe('estaCongelado', () => {
  const salaActiva = { activa: true }
  const salaPausada = { activa: false }

  it('un abierto en una sala pausada está congelado', () => {
    expect(estaCongelado({ estatus: 'abierto' }, salaPausada)).toBe(true)
  })

  it('un abierto en una sala activa no está congelado', () => {
    expect(estaCongelado({ estatus: 'abierto' }, salaActiva)).toBe(false)
  })

  it('uno ya cumplido no está "congelado" aunque su sala esté en pausa: no tiene reloj que parar', () => {
    expect(estaCongelado({ estatus: 'cumplido' }, salaPausada)).toBe(false)
  })
})

describe('estatusEfectivo — la contrapartida de congelar es reactivar', () => {
  const HOY = '2026-07-29'
  // Un acuerdo abierto cuya fecha quedó atrás: exactamente lo que congela una
  // pausa y lo que una reactivación tiene que devolver a vencido.
  const abiertoVencido = { estatus: 'abierto' as const, fechaCompromiso: '2026-01-01' }

  it('con la sala activa, un abierto vencido se lee vencido (igual que estatusVigente)', () => {
    expect(estatusEfectivo(abiertoVencido, true, HOY)).toBe('vencido')
  })

  it('con la sala en pausa, el mismo acuerdo se congela: sigue abierto', () => {
    expect(estatusEfectivo(abiertoVencido, false, HOY)).toBe('abierto')
  })

  it('REACTIVAR le devuelve el vencimiento el mismo día — no lo deja en limbo permanente', () => {
    // El acuerdo no cambia para nada entre una llamada y otra: lo único que
    // se mueve es `salaActiva`, que es justo lo que hace `reactivarSalaAction`.
    expect(estatusEfectivo(abiertoVencido, false, HOY)).toBe('abierto')
    expect(estatusEfectivo(abiertoVencido, true, HOY)).toBe('vencido')
  })

  it('lo cumplido no resucita al reactivar: sigue cumplido, pausada o no', () => {
    const cumplido = { estatus: 'cumplido' as const, fechaCompromiso: '2026-01-01' }
    expect(estatusEfectivo(cumplido, false, HOY)).toBe('cumplido')
    expect(estatusEfectivo(cumplido, true, HOY)).toBe('cumplido')
  })
})

describe('salaMasDesatendida y pulsoDelMes no piden cuentas a una sala en pausa', () => {
  it('una sala pausada y desatendida no sale como "la más desatendida"', () => {
    const pausadaYVieja = sala({ nombre: 'Pausada', diasDesdeUltima: 200, activa: false })
    expect(salaMasDesatendida([pausadaYVieja])).toBeNull()
  })

  it('entre una pausada (aunque muy vieja) y una activa tibia, gana la activa', () => {
    const pausadaYVieja = sala({ nombre: 'Pausada', diasDesdeUltima: 400, activa: false })
    const activaTibia = sala({ nombre: 'Activa', diasDesdeUltima: 25, activa: true })
    expect(salaMasDesatendida([pausadaYVieja, activaTibia])?.nombre).toBe('Activa')
  })
})
