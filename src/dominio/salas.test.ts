import { describe, it, expect } from 'vitest'
import { sesionesSinMinuta, salaMasDesatendida, estatusVigente, type EstadoSala } from './salas'

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
    diasDesdeUltima: 3,
    ultimaSesion: '2026-06-30',
    proximaSesion: null,
    enPreparacion: false,
    acuerdos: [],
    presentaciones: [],
    minutas: [],
    cadencia: 'mensual',
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
