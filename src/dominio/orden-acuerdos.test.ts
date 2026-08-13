import { describe, it, expect } from 'vitest'
import { ordenarAcuerdosDeSala, tonoDeVencimiento } from './orden-acuerdos'

/**
 * CÓMO SE LEE LA LISTA DE ACUERDOS DE UNA SALA (ronda 13). Franco: *"los que
 * ya están cumplidos deberían pasar abajito y verse más chiquitos y grises, no
 * como que se vean cumplidos; los que están abiertos deben ordenarse por fecha
 * próxima a su vencimiento, y tal vez la fecha podría ir tiñéndose como
 * semáforo"*.
 *
 * Quien abre la sala de su UDN viene a ver QUÉ DEBE, no qué ya entregó. La
 * lista llegaba en el orden en que salieron de la base —el de creación—, así
 * que lo cumplido se mezclaba con lo urgente y había que leerlo todo para
 * saber qué corre prisa.
 */
const acuerdo = (parcial: Partial<{ id: string; que: string; responsable: string; estatus: 'abierto' | 'cumplido' | 'vencido'; fechaCompromiso: string | null }> = {}) => ({
  id: 'a', que: 'x', responsable: 'Iris', estatus: 'abierto' as const, fechaCompromiso: null,
  ...parcial,
})

const HOY = '2026-08-13'

describe('orden de los acuerdos en la sala', () => {
  it('lo cumplido baja al final, pase lo que pase con su fecha', () => {
    const orden = ordenarAcuerdosDeSala([
      acuerdo({ id: 'cumplido-de-hoy', estatus: 'cumplido', fechaCompromiso: '2026-08-13' }),
      acuerdo({ id: 'abierto-lejano', fechaCompromiso: '2026-12-01' }),
    ])

    expect(orden.map((a) => a.id)).toEqual(['abierto-lejano', 'cumplido-de-hoy'])
  })

  it('lo abierto se ordena por lo que vence antes: primero lo vencido, luego lo que corre', () => {
    const orden = ordenarAcuerdosDeSala([
      acuerdo({ id: 'en-un-mes', fechaCompromiso: '2026-09-15' }),
      acuerdo({ id: 'vencido', estatus: 'vencido', fechaCompromiso: '2026-07-30' }),
      acuerdo({ id: 'esta-semana', fechaCompromiso: '2026-08-16' }),
    ])

    expect(orden.map((a) => a.id)).toEqual(['vencido', 'esta-semana', 'en-un-mes'])
  })

  /**
   * Un acuerdo sin fecha no es urgente ni deja de serlo: no se sabe. Ponerlo
   * arriba diría que corre prisa y abajo lo escondería entre lo cumplido, así
   * que va al final de lo que sigue vivo — visible, sin gritar.
   */
  it('lo abierto sin fecha va al final de lo vivo, pero antes que lo cumplido', () => {
    const orden = ordenarAcuerdosDeSala([
      acuerdo({ id: 'cumplido', estatus: 'cumplido' }),
      acuerdo({ id: 'sin-fecha' }),
      acuerdo({ id: 'con-fecha', fechaCompromiso: '2026-09-01' }),
    ])

    expect(orden.map((a) => a.id)).toEqual(['con-fecha', 'sin-fecha', 'cumplido'])
  })

  it('no pierde ni duplica ninguno', () => {
    const entrada = [
      acuerdo({ id: '1', estatus: 'cumplido' }),
      acuerdo({ id: '2', fechaCompromiso: '2026-08-20' }),
      acuerdo({ id: '3', estatus: 'vencido', fechaCompromiso: '2026-08-01' }),
      acuerdo({ id: '4' }),
    ]
    expect(ordenarAcuerdosDeSala(entrada).map((a) => a.id).sort()).toEqual(['1', '2', '3', '4'])
  })

  it('no toca el arreglo que recibe', () => {
    const entrada = [acuerdo({ id: 'cumplido', estatus: 'cumplido' }), acuerdo({ id: 'abierto' })]
    ordenarAcuerdosDeSala(entrada)
    expect(entrada.map((a) => a.id)).toEqual(['cumplido', 'abierto'])
  })
})

describe('el semáforo de la fecha', () => {
  it('lo vencido va en rojo', () => {
    expect(tonoDeVencimiento('2026-08-12', 'vencido', HOY)).toBe('vencida')
  })

  it('lo que vence hoy o dentro de una semana, en ámbar', () => {
    expect(tonoDeVencimiento('2026-08-13', 'abierto', HOY)).toBe('urgente')
    expect(tonoDeVencimiento('2026-08-20', 'abierto', HOY)).toBe('urgente')
  })

  it('más allá de una semana, en verde: hay margen', () => {
    expect(tonoDeVencimiento('2026-08-21', 'abierto', HOY)).toBe('holgada')
  })

  /**
   * Un compromiso cumplido ya no corre: pintarlo de rojo o de ámbar sería
   * alarmar por una fecha que dejó de importar el día que se entregó.
   */
  it('lo cumplido no se tiñe, aunque su fecha haya pasado', () => {
    expect(tonoDeVencimiento('2026-01-01', 'cumplido', HOY)).toBe('apagada')
  })

  it('sin fecha no hay semáforo que encender', () => {
    expect(tonoDeVencimiento(null, 'abierto', HOY)).toBe('pordef')
  })
})
