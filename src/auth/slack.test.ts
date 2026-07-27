import { describe, it, expect } from 'vitest'
import { esCorreoPermitido, esEquipoPermitido, leerIdToken, urlDeAutorizacion } from './slack'

describe('esCorreoPermitido', () => {
  it('acepta el dominio corporativo', () => {
    expect(esCorreoPermitido('franco.cruzat@upax.com.mx', 'upax.com.mx')).toBe(true)
  })

  it('no distingue mayúsculas ni espacios sobrantes', () => {
    expect(esCorreoPermitido('  Franco.Cruzat@UPAX.com.MX ', 'upax.com.mx')).toBe(true)
  })

  it('rechaza otros dominios', () => {
    expect(esCorreoPermitido('alguien@gmail.com', 'upax.com.mx')).toBe(false)
  })

  it('no se deja engañar por un dominio que solo termina igual', () => {
    expect(esCorreoPermitido('atacante@noesupax.com.mx', 'upax.com.mx')).toBe(false)
    expect(esCorreoPermitido('atacante@upax.com.mx.evil.com', 'upax.com.mx')).toBe(false)
  })

  it('rechaza correos vacíos o mal formados', () => {
    expect(esCorreoPermitido('', 'upax.com.mx')).toBe(false)
    expect(esCorreoPermitido('sin-arroba', 'upax.com.mx')).toBe(false)
    expect(esCorreoPermitido('doble@@upax.com.mx', 'upax.com.mx')).toBe(false)
  })

  it('acepta cualquier dominio si no se restringió ninguno', () => {
    expect(esCorreoPermitido('alguien@gmail.com', undefined)).toBe(true)
  })
})

describe('esEquipoPermitido', () => {
  it('exige el workspace configurado', () => {
    expect(esEquipoPermitido('T123', 'T123')).toBe(true)
    expect(esEquipoPermitido('T999', 'T123')).toBe(false)
  })

  it('acepta cualquiera si no se configuró workspace', () => {
    expect(esEquipoPermitido('T999', undefined)).toBe(true)
  })

  it('rechaza si Slack no devolvió workspace pero sí se exigía uno', () => {
    expect(esEquipoPermitido(undefined, 'T123')).toBe(false)
  })
})

describe('leerIdToken', () => {
  function armarToken(carga: Record<string, unknown>): string {
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString('base64url')
    return `${b64({ alg: 'RS256' })}.${b64(carga)}.firma-de-slack`
  }

  it('saca correo, nombre y workspace de la carga', () => {
    const token = armarToken({
      email: 'franco.cruzat@upax.com.mx',
      name: 'Franco Cruzat',
      'https://slack.com/team_id': 'T123',
    })
    expect(leerIdToken(token)).toEqual({
      email: 'franco.cruzat@upax.com.mx',
      nombre: 'Franco Cruzat',
      equipo: 'T123',
    })
  })

  it('devuelve null si el token no tiene tres partes', () => {
    expect(leerIdToken('a.b')).toBeNull()
    expect(leerIdToken('')).toBeNull()
  })

  it('devuelve null si la carga no trae correo', () => {
    expect(leerIdToken(armarToken({ name: 'Sin Correo' }))).toBeNull()
  })

  it('devuelve null si la carga no es JSON', () => {
    expect(leerIdToken('a.no-es-json.c')).toBeNull()
  })
})

describe('urlDeAutorizacion', () => {
  it('pide los alcances mínimos de identidad y devuelve al retorno indicado', () => {
    const url = new URL(
      urlDeAutorizacion({
        clientId: 'cid',
        redirectUri: 'https://app.test/api/auth/slack/retorno',
        state: 'st4te',
        equipo: 'T123',
      }),
    )
    expect(url.origin + url.pathname).toBe('https://slack.com/openid/connect/authorize')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('scope')).toBe('openid profile email')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('state')).toBe('st4te')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.test/api/auth/slack/retorno')
    expect(url.searchParams.get('team')).toBe('T123')
  })

  it('omite el workspace si no se configuró', () => {
    const url = new URL(
      urlDeAutorizacion({ clientId: 'cid', redirectUri: 'https://app.test/r', state: 's' }),
    )
    expect(url.searchParams.has('team')).toBe(false)
  })
})
