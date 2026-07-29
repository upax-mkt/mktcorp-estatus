import { describe, it, expect } from 'vitest'
import { estadoInicialDeBandeja, entraALaBandeja } from './bandeja'

describe('estadoInicialDeBandeja', () => {
  it('con responsable de Mkt Corp, queda pendiente de subir', () => {
    expect(estadoInicialDeBandeja('65476480')).toBe('pendiente')
  })

  it('con responsable de la UDN, no aplica', () => {
    expect(estadoInicialDeBandeja(null)).toBe('no_aplica')
  })
})

describe('entraALaBandeja', () => {
  const base = { responsableMondayId: '65476480', bandeja: 'pendiente' as const, salaActiva: true }

  it('sí cuando está pendiente, tiene dueño de Mkt Corp y su sala está viva', () => {
    expect(entraALaBandeja(base)).toBe(true)
  })

  it('no si ya se subió', () => {
    expect(entraALaBandeja({ ...base, bandeja: 'subido' })).toBe(false)
  })

  it('no si alguien lo descartó — descartar es definitivo', () => {
    expect(entraALaBandeja({ ...base, bandeja: 'descartado' })).toBe(false)
  })

  it('no si su sala está en pausa: lo congelado no se sube', () => {
    expect(entraALaBandeja({ ...base, salaActiva: false })).toBe(false)
  })

  it('no si perdió a su responsable de Mkt Corp por una edición', () => {
    expect(entraALaBandeja({ ...base, responsableMondayId: null })).toBe(false)
  })
})
