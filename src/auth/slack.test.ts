import { describe, it, expect } from 'vitest'
import { esEquipoPermitido, leerIdToken, urlDeAutorizacion } from './slack'

// No hay `describe('esCorreoPermitido', ...)` aquí a propósito: la función (y
// `dominioExigido()`) se retiraron en la ronda 9 — ver el comentario que
// quedó en su lugar en `./slack.ts` y el de cabecera de
// `src/app/api/auth/slack/retorno/route.ts` para el porqué. El test que fija
// el comportamiento nuevo —un correo de otro dominio, con fila en el
// directorio y activa, entra— vive en
// `src/app/api/auth/slack/retorno/route.test.ts`, junto al resto de puertas
// de esa ruta.

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

  it('acepta un ID de organización Enterprise Grid — el caso de UPAX', () => {
    // Configurado E…, y Slack devuelve el workspace T… más su organización E….
    // Comparar solo contra el workspace rechazaría a todo el mundo.
    expect(esEquipoPermitido('T123', 'E081PBW2ZV2', 'E081PBW2ZV2')).toBe(true)
  })

  it('rechaza una organización distinta a la configurada', () => {
    expect(esEquipoPermitido('T123', 'E081PBW2ZV2', 'E999OTRA')).toBe(false)
  })

  it('rechaza cuando se exige una organización y Slack no devuelve ninguna', () => {
    expect(esEquipoPermitido('T123', 'E081PBW2ZV2')).toBe(false)
  })
})

describe('leerIdToken', () => {
  function armarToken(carga: Record<string, unknown>): string {
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString('base64url')
    return `${b64({ alg: 'RS256' })}.${b64(carga)}.firma-de-slack`
  }

  it('saca correo, nombre, workspace y organización de la carga', () => {
    const token = armarToken({
      email: 'franco.cruzat@upax.com.mx',
      name: 'Franco Cruzat',
      'https://slack.com/team_id': 'T123',
      'https://slack.com/enterprise_id': 'E081PBW2ZV2',
    })
    expect(leerIdToken(token)).toEqual({
      email: 'franco.cruzat@upax.com.mx',
      nombre: 'Franco Cruzat',
      equipo: 'T123',
      organizacion: 'E081PBW2ZV2',
    })
  })

  it('deja la organización sin definir cuando el workspace no está en Enterprise Grid', () => {
    const token = armarToken({ email: 'a@upax.com.mx', 'https://slack.com/team_id': 'T123' })
    expect(leerIdToken(token)?.organizacion).toBeUndefined()
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

  it('omite el hint cuando lo configurado es una organización Enterprise Grid', () => {
    // `team` espera un workspace (T…); con un E-ID no significa nada para Slack.
    const url = new URL(
      urlDeAutorizacion({
        clientId: 'cid',
        redirectUri: 'https://app.test/r',
        state: 's',
        equipo: 'E081PBW2ZV2',
      }),
    )
    expect(url.searchParams.has('team')).toBe(false)
  })
})
