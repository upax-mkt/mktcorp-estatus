import { describe, it, expect } from 'vitest'
import { sesionesSinMinuta, type EstadoSala } from './salas'

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
