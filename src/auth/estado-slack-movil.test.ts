import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * EL LOGIN DE SLACK NO SE CAE PORQUE FALTE LA COOKIE DE STATE (28-ago-2026).
 *
 * Franco: *«el login en móvil tira error después de meter las credenciales
 * correctas; en desktop funciona todo bien»*.
 *
 * La causa es el viaje de ida y vuelta del teléfono: el flujo empieza en un
 * navegador, salta a la app de Slack para autorizar y vuelve, y ese salto no
 * siempre conserva el mismo contenedor de cookies. Si el retorno aterriza donde
 * la cookie no está, la comprobación `state !== estadoEsperado` se cumple con
 * `estadoEsperado` vacío y el login falla DESPUÉS de teclear bien la
 * contraseña — el peor momento para fallar.
 *
 * La garantía fuerte nunca fue la cookie: es la FIRMA del `state`, hecha con
 * `SESSION_SECRET` y con diez minutos de vigencia. La cookie añade la defensa
 * contra un CSRF de login, y por eso se sigue exigiendo CUANDO ESTÁ.
 *
 * Se comprueba leyendo la ruta y no ejecutándola porque montar `next/headers`,
 * `redirect()` y el canje real contra Slack en un test daría un test que prueba
 * el mock. Lo que hay que impedir es que alguien «arregle» esto devolviendo la
 * comprobación a su forma anterior, y eso sí se lee en la fuente.
 */
const RUTA = readFileSync(
  join(__dirname, '../app/api/auth/slack/retorno/route.ts'),
  'utf8',
)

/** Sin comentarios: este archivo EXPLICA el cambio, y citarlo no es aplicarlo. */
const CODIGO = RUTA.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('el retorno de Slack en un teléfono', () => {
  it('exige la cookie solo cuando existe', () => {
    // La forma tolerante: `estadoEsperado && state !== estadoEsperado`.
    expect(CODIGO).toMatch(/estadoEsperado\s*&&\s*state\s*!==\s*estadoEsperado/)
  })

  it('no vuelve a tumbar el login por una cookie ausente', () => {
    // La forma vieja, que fallaba en móvil: exigirla dentro de la misma guarda
    // que el código y el state.
    expect(CODIGO).not.toMatch(/!estadoEsperado\s*\|\|/)
  })

  /**
   * Esto es lo que NO puede relajarse: sin firma válida no se entra, con cookie
   * o sin ella. Es la única prueba de que el `state` lo emitimos nosotros.
   */
  it('sigue verificando la firma del state, que es la garantía real', () => {
    expect(CODIGO).toMatch(/verificar\(state, secreto\)/)
  })

  it('y sigue comprobando que la cuenta es del workspace de UPAX', () => {
    expect(CODIGO).toMatch(/esEquipoPermitido\(/)
  })

  /**
   * Un error que no distingue causas obliga a adivinar. Cada motivo lleva su
   * código para que un fallo en el móvil de alguien se pueda diagnosticar
   * preguntándole qué mensaje vio.
   */
  it('distingue los motivos de fallo en vez de decir siempre lo mismo', () => {
    for (const codigo of ['slack-estado', 'slack-caducado', 'slack-codigo', 'slack-workspace']) {
      expect(CODIGO, `falta el código ${codigo}`).toContain(codigo)
    }
  })

  it('y la pantalla de entrada sabe traducir cada uno', () => {
    const entrar = readFileSync(join(__dirname, '../app/entrar/page.tsx'), 'utf8')
    for (const codigo of ['slack-estado', 'slack-caducado', 'slack-codigo', 'slack-workspace']) {
      expect(entrar, `${codigo} llegaría sin mensaje`).toContain(`'${codigo}'`)
    }
  })
})
