import { describe, it, expect } from 'vitest'
import { urlDeRetornoSlack } from './slack-rutas'

describe('urlDeRetornoSlack', () => {
  it('construye el retorno sobre el mismo origen de la petición', () => {
    expect(urlDeRetornoSlack('https://mktcorp-estatus.vercel.app/api/auth/slack/inicio')).toBe(
      'https://mktcorp-estatus.vercel.app/api/auth/slack/retorno',
    )
  })

  it('sirve igual en local', () => {
    expect(urlDeRetornoSlack('http://localhost:3000/api/auth/slack/inicio')).toBe(
      'http://localhost:3000/api/auth/slack/retorno',
    )
  })

  it('descarta el query de la petición original', () => {
    expect(urlDeRetornoSlack('https://app.test/api/auth/slack/inicio?x=1')).toBe(
      'https://app.test/api/auth/slack/retorno',
    )
  })

  it('prefiere el origen público declarado cuando existe (dominio propio tras proxy)', () => {
    expect(
      urlDeRetornoSlack('https://interno.vercel.app/api/auth/slack/inicio', 'https://estatus.upax.com.mx'),
    ).toBe('https://estatus.upax.com.mx/api/auth/slack/retorno')
  })
})
