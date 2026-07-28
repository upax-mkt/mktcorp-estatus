import { describe, it, expect } from 'vitest'
import { firmar, verificar } from './firma'
import { puedeVerRuta } from './politica'

/**
 * EL LINK DE SALA NO PUEDE ENCERRAR A NADIE.
 *
 * Le pasó a Franco en producción: copió el link de solo lectura de Mexa
 * Creativa para compartirlo, lo abrió para comprobar que funcionaba, y su
 * sesión de equipo quedó reemplazada por una de solo lectura de esa sala. A
 * partir de ahí la raíz lo mandaba a Mexa, la sala no ofrecía ninguna salida,
 * y la cookie dura 30 días.
 *
 * Dos reglas salieron de ahí, y las dos se prueban aquí porque son de
 * seguridad y de recuperación, no de estilo:
 *
 * 1. Una sesión de equipo NO se degrada al abrir un link de sala.
 * 2. Una sesión de sala SIEMPRE se puede terminar.
 */

const SECRETO = 'secreto-de-prueba-que-no-es-el-de-nadie'

/**
 * La decisión del proxy, extraída tal cual: si ya hay sesión de equipo, el
 * link no reemplaza la cookie.
 *
 * Se prueba la REGLA y no el proxy entero porque el proxy corre en Edge y
 * necesita un `NextRequest`; lo que importa —y lo que estaba mal— es esta
 * decisión.
 */
function reemplazaLaCookie(rolActual: 'equipo' | 'sala' | null): boolean {
  return rolActual !== 'equipo'
}

describe('abrir un link de sala teniendo sesión', () => {
  it('con sesión de EQUIPO, el link no reemplaza nada', () => {
    expect(reemplazaLaCookie('equipo')).toBe(false)
  })

  it('sin sesión, el link sí entra: es para eso', () => {
    expect(reemplazaLaCookie(null)).toBe(true)
  })

  it('con una sesión de OTRA sala, el link entra: es un director cambiando de link', () => {
    expect(reemplazaLaCookie('sala')).toBe(true)
  })
})

describe('el token del link', () => {
  it('lleva el rol de sala y su slug, nunca el de equipo', async () => {
    const token = await firmar(
      { rol: 'sala', sala: 'mexa-creativa', exp: Date.now() + 30 * 24 * 3600_000 },
      SECRETO,
    )
    const s = await verificar(token, SECRETO)
    expect(s?.rol).toBe('sala')
    expect(s?.sala).toBe('mexa-creativa')
  })

  it('un token de sala NO abre la raíz: por eso el proxy redirigía', async () => {
    const token = await firmar(
      { rol: 'sala', sala: 'mexa-creativa', exp: Date.now() + 3600_000 },
      SECRETO,
    )
    const s = await verificar(token, SECRETO)
    // Esta es la condición exacta que mandaba a Franco a /sala/mexa-creativa
    // una y otra vez. El comportamiento es correcto; lo que faltaba era no
    // haberle puesto esa cookie encima, y una salida.
    expect(puedeVerRuta(s, '/')).toBe(false)
    expect(puedeVerRuta(s, '/sala/mexa-creativa')).toBe(true)
    expect(puedeVerRuta(s, '/sala/zeus')).toBe(false)
  })

  it('/entrar es pública: la salida siempre lleva a algún sitio', async () => {
    const token = await firmar(
      { rol: 'sala', sala: 'mexa-creativa', exp: Date.now() + 3600_000 },
      SECRETO,
    )
    const s = await verificar(token, SECRETO)
    // Sin esto, cerrar sesión desde una sala dejaría al navegador dando
    // vueltas entre / y /entrar.
    expect(puedeVerRuta(s, '/entrar')).toBe(true)
    expect(puedeVerRuta(null, '/entrar')).toBe(true)
  })
})

/**
 * La decisión del proxy al abrir /entrar a mano, extraída tal cual.
 *
 * Ir a la pantalla de login significa "quiero entrar como alguien": si había
 * una sesión, sobra. Sin esto, quien llegaba con una sesión de sala encima
 * veía el formulario pero seguía con su cookie, y bastaba equivocarse de clave
 * una vez para quedarse igual de atascado.
 */
function limpiaLaSesion(pathname: string, metodo: string, hayCookie: boolean): boolean {
  return pathname === '/entrar' && metodo === 'GET' && hayCookie
}

describe('/entrar como salida garantizada', () => {
  it('abrirlo con una sesión encima la borra', () => {
    expect(limpiaLaSesion('/entrar', 'GET', true)).toBe(true)
  })

  it('el ENVÍO del formulario no la borra: competiría con la que acaba de poner', () => {
    // El formulario hace POST a esta misma ruta. Borrar ahí dejaría a quien
    // acaba de teclear bien su clave sin sesión.
    expect(limpiaLaSesion('/entrar', 'POST', true)).toBe(false)
  })

  it('sin cookie no hay nada que borrar', () => {
    expect(limpiaLaSesion('/entrar', 'GET', false)).toBe(false)
  })

  it('ninguna otra ruta borra la sesión al visitarla', () => {
    for (const ruta of ['/', '/agenda', '/sala/zeus', '/preparar']) {
      expect(limpiaLaSesion(ruta, 'GET', true)).toBe(false)
    }
  })
})
