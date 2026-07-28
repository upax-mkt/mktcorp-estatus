import { describe, it, expect } from 'vitest'
import { puedeVerSala, puedeEditar, puedeVerRuta, esRutaPublica } from './politica'
import type { Sesion } from './firma'

const EQUIPO: Sesion = { rol: 'equipo', sub: 'franco@upax.com.mx', exp: Date.now() + 1000 }
const SALA_NC: Sesion = { rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 }

describe('puedeEditar', () => {
  it('solo el equipo Mkt Corp mueve acuerdos', () => {
    expect(puedeEditar(EQUIPO)).toBe(true)
    expect(puedeEditar(SALA_NC)).toBe(false)
    expect(puedeEditar(null)).toBe(false)
  })
})

describe('puedeVerSala', () => {
  it('el equipo ve cualquier sala', () => {
    expect(puedeVerSala(EQUIPO, 'neracode')).toBe(true)
    expect(puedeVerSala(EQUIPO, 'zeus')).toBe(true)
  })

  it('un acceso de sala ve la suya y ninguna otra', () => {
    expect(puedeVerSala(SALA_NC, 'neracode')).toBe(true)
    expect(puedeVerSala(SALA_NC, 'zeus')).toBe(false)
  })

  it('sin sesión no se ve nada', () => {
    expect(puedeVerSala(null, 'neracode')).toBe(false)
  })
})

describe('esRutaPublica', () => {
  it('deja pasar el login y el retorno de Slack', () => {
    expect(esRutaPublica('/entrar')).toBe(true)
    expect(esRutaPublica('/api/auth/slack/inicio')).toBe(true)
    expect(esRutaPublica('/api/auth/slack/retorno')).toBe(true)
  })

  it('no abre el resto de la app', () => {
    expect(esRutaPublica('/')).toBe(false)
    expect(esRutaPublica('/sala/neracode')).toBe(false)
    expect(esRutaPublica('/preparar')).toBe(false)
  })

  it('no se deja engañar por rutas que solo empiezan parecido', () => {
    expect(esRutaPublica('/entrarse-por-la-puerta')).toBe(false)
    expect(esRutaPublica('/api/auth/slackear')).toBe(false)
  })
})

describe('puedeVerRuta', () => {
  it('sin sesión no se entra a ninguna ruta protegida', () => {
    expect(puedeVerRuta(null, '/')).toBe(false)
    expect(puedeVerRuta(null, '/sala/neracode')).toBe(false)
    expect(puedeVerRuta(null, '/preparar/abc')).toBe(false)
  })

  it('el equipo entra a todo', () => {
    for (const ruta of ['/', '/sala/zeus', '/preparar', '/preparar/abc/minuta']) {
      expect(puedeVerRuta(EQUIPO, ruta)).toBe(true)
    }
  })

  it('un acceso de sala entra a su sala y a su deck, nada más', () => {
    expect(puedeVerRuta(SALA_NC, '/sala/neracode')).toBe(true)
    // La sesión publicada pasa el filtro optimista; la página comprueba de qué
    // sala es, porque la ruta lleva un id y no un slug.
    expect(puedeVerRuta(SALA_NC, '/sesion/abc-123')).toBe(true)
    expect(puedeVerRuta(SALA_NC, '/sala/zeus')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/sala/zeus')).toBe(false)
  })

  it('un acceso de sala descarga los archivos de su sala', () => {
    // Mismo caso que /sesion/<id>: pasa el filtro optimista y la ruta
    // comprueba de qué sala es el archivo. Sin esto, un director no podría
    // abrir los archivos de su propia sala.
    expect(puedeVerRuta(SALA_NC, '/api/archivo/abc-123')).toBe(true)
    // Pero NO puede pedir un token para subir: eso es del equipo.
    expect(puedeVerRuta(SALA_NC, '/api/archivos/subir')).toBe(false)
    // Y nada más bajo /api se abre por parecerse.
    expect(puedeVerRuta(SALA_NC, '/api/archivo')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/api/archivos/abc-123')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/api/otra/cosa')).toBe(false)
  })

  it('un acceso de sala abre el benchmark de SU sala y no el de otra', () => {
    expect(puedeVerRuta(SALA_NC, '/sala/neracode/benchmark')).toBe(true)
    expect(puedeVerRuta(SALA_NC, '/sala/zeus/benchmark')).toBe(false)
    // Lista blanca de hijas: una página nueva bajo /sala/<slug>/ no se abre
    // por olvido.
    expect(puedeVerRuta(SALA_NC, '/sala/neracode/lo-que-sea')).toBe(false)
  })

  it('un acceso de sala no entra al hub ni a la preparación ni al motor', () => {
    expect(puedeVerRuta(SALA_NC, '/')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/preparar')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/preparar/abc')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/preparar/abc')).toBe(false)
  })

  it('no se deja engañar por un slug que empieza igual que el suyo', () => {
    expect(puedeVerRuta(SALA_NC, '/sala/neracode-falsa')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/sala/neracode/../zeus')).toBe(false)
  })

  it('una ruta desconocida se niega por defecto en vez de abrirse', () => {
    expect(puedeVerRuta(SALA_NC, '/admin')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/loquesea')).toBe(false)
  })
})
