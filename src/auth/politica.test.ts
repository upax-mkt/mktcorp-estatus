import { describe, it, expect } from 'vitest'
import { puedeVerSala, puedeEditar, puedeVerRuta, esRutaPublica } from './politica'
import type { Sesion } from './firma'

const EQUIPO: Sesion = { rol: 'equipo', sub: 'franco@upax.com.mx', exp: Date.now() + 1000 }
const SALA_NC: Sesion = { rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 }

// Los tres niveles de la ronda 9 (tarea 2), solo para las pruebas de
// /salas y /personas más abajo — el resto del archivo sigue usando el
// `EQUIPO` de arriba (sin `rolApp`) porque a ESAS rutas les basta con
// `rol: 'equipo'`, sin importar el nivel.
const ADMIN: Sesion = { rol: 'equipo', rolApp: 'admin', exp: Date.now() + 1000 }
const EDITOR: Sesion = { rol: 'equipo', rolApp: 'editor', exp: Date.now() + 1000 }
const VIEWER: Sesion = { rol: 'equipo', rolApp: 'viewer', exp: Date.now() + 1000 }

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
    expect(esRutaPublica('/cliente/neracode')).toBe(false)
    expect(esRutaPublica('/deck')).toBe(false)
  })

  it('no se deja engañar por rutas que solo empiezan parecido', () => {
    expect(esRutaPublica('/entrarse-por-la-puerta')).toBe(false)
    expect(esRutaPublica('/api/auth/slackear')).toBe(false)
  })
})

describe('puedeVerRuta', () => {
  it('sin sesión no se entra a ninguna ruta protegida', () => {
    expect(puedeVerRuta(null, '/')).toBe(false)
    expect(puedeVerRuta(null, '/cliente/neracode')).toBe(false)
    expect(puedeVerRuta(null, '/deck/abc')).toBe(false)
  })

  it('el equipo entra a todo', () => {
    for (const ruta of ['/', '/cliente/zeus', '/deck', '/deck/abc/minuta']) {
      expect(puedeVerRuta(EQUIPO, ruta)).toBe(true)
    }
  })

  it('un acceso de sala entra a su sala y a su deck, nada más', () => {
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode')).toBe(true)
    // La sesión publicada pasa el filtro optimista; la página comprueba de qué
    // sala es, porque la ruta lleva un id y no un slug.
    expect(puedeVerRuta(SALA_NC, '/reunion/abc-123')).toBe(true)
    expect(puedeVerRuta(SALA_NC, '/cliente/zeus')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/cliente/zeus')).toBe(false)
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
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/benchmark')).toBe(true)
    expect(puedeVerRuta(SALA_NC, '/cliente/zeus/benchmark')).toBe(false)
    // Lista blanca de hijas: una página nueva bajo /sala/<slug>/ no se abre
    // por olvido.
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/lo-que-sea')).toBe(false)
  })

  it('un acceso de sala no entra al hub ni a la preparación ni al motor', () => {
    expect(puedeVerRuta(SALA_NC, '/')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/deck')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/deck/abc')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/deck/abc')).toBe(false)
  })

  it('no se deja engañar por un slug que empieza igual que el suyo', () => {
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode-falsa')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/../zeus')).toBe(false)
  })

  it('una ruta desconocida se niega por defecto en vez de abrirse', () => {
    expect(puedeVerRuta(SALA_NC, '/admin')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/loquesea')).toBe(false)
  })

  /**
   * El espacio de acuerdos (tarea 11, ronda 7) y su bandeja son de equipo:
   * cruzan las diez salas y la bandeja sube al tablero compartido de Monday,
   * ninguna de las dos cosas es asunto de un solo director. Sin entrada
   * explícita en la lista blanca, caen en el mismo "se niega por defecto" que
   * el caso de arriba — este test lo deja dicho por su nombre, no solo por
   * coincidencia con /admin.
   */
  it('un acceso de sala no entra al espacio de acuerdos ni a su bandeja', () => {
    expect(puedeVerRuta(SALA_NC, '/acuerdos')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/acuerdos/bandeja')).toBe(false)
  })

  it('el equipo sí entra al espacio de acuerdos y a su bandeja', () => {
    expect(puedeVerRuta(EQUIPO, '/acuerdos')).toBe(true)
    expect(puedeVerRuta(EQUIPO, '/acuerdos/bandeja')).toBe(true)
  })
})

/**
 * Ronda 9, tarea 2, paso 7: /salas y /personas pasan a ser de admin, incluso
 * a este nivel optimista. `/personas` se prueba ya, aunque la pantalla la
 * construya la tarea 3 — la política no tiene por qué esperar a que exista
 * la ruta para protegerla.
 */
describe('puedeVerRuta: /salas y /personas son de admin', () => {
  it('el admin entra a /salas y /personas', () => {
    expect(puedeVerRuta(ADMIN, '/salas')).toBe(true)
    expect(puedeVerRuta(ADMIN, '/personas')).toBe(true)
  })

  it('un editor NO entra a /salas ni a /personas', () => {
    expect(puedeVerRuta(EDITOR, '/salas')).toBe(false)
    expect(puedeVerRuta(EDITOR, '/personas')).toBe(false)
  })

  it('un viewer NO entra a /salas ni a /personas', () => {
    expect(puedeVerRuta(VIEWER, '/salas')).toBe(false)
    expect(puedeVerRuta(VIEWER, '/personas')).toBe(false)
  })

  it('una sesión de equipo sin rolApp tampoco: falla cerrado', () => {
    expect(puedeVerRuta(EQUIPO, '/salas')).toBe(false)
    expect(puedeVerRuta(EQUIPO, '/personas')).toBe(false)
  })

  it('un acceso de sala tampoco, como con cualquier otra ruta de equipo', () => {
    expect(puedeVerRuta(SALA_NC, '/salas')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/personas')).toBe(false)
  })

  it('el resto de la app no cambió: editor y viewer siguen entrando a todo lo demás', () => {
    for (const ruta of ['/', '/cliente/zeus', '/deck', '/deck/abc/minuta', '/acuerdos', '/acuerdos/bandeja']) {
      expect(puedeVerRuta(EDITOR, ruta)).toBe(true)
      expect(puedeVerRuta(VIEWER, ruta)).toBe(true)
    }
  })
})

describe('la agenda pública, y solo ella', () => {
  it('deja pasar /agenda/<token> sin sesión', () => {
    expect(esRutaPublica('/agenda/abc123')).toBe(true)
    expect(puedeVerRuta(null, '/agenda/abc123')).toBe(true)
  })

  it('NO deja pasar /agenda a secas: es la pantalla interna del equipo', () => {
    expect(esRutaPublica('/agenda')).toBe(false)
    expect(puedeVerRuta(null, '/agenda')).toBe(false)
  })

  it('NO deja pasar nada por debajo de la agenda pública', () => {
    expect(esRutaPublica('/agenda/abc123/editar')).toBe(false)
    expect(puedeVerRuta(null, '/agenda/abc123/editar')).toBe(false)
  })

  /**
   * Revisión final de la rama, punto 2: los 22 tests de este archivo pasaban
   * igual si la comparación se aflojara a `partes[0].startsWith('agenda')` o
   * a `ruta.includes('agenda')` — ninguno de los casos de arriba distingue
   * "empieza como agenda" o "contiene agenda en algún segmento" de "ES,
   * exactamente, /agenda/<token>". Estos dos son la red: con un `startsWith`
   * el primero se abriría (el primer segmento de '/agendas/x' empieza como
   * 'agenda'), y con un `includes` el segundo también (la palabra 'agenda'
   * aparece, aunque como segundo segmento de una ruta de equipo).
   */
  it('no se deja engañar por rutas que solo se PARECEN a la agenda pública', () => {
    expect(esRutaPublica('/agendas/x')).toBe(false)
    expect(esRutaPublica('/salas/agenda')).toBe(false)
  })

  it('el resto de la app sigue cerrado sin sesión', () => {
    for (const ruta of ['/', '/acuerdos', '/acuerdos/bandeja', '/cliente/neracode', '/deck', '/deck/nueva', '/salas']) {
      expect(puedeVerRuta(null, ruta)).toBe(false)
    }
  })

  it('el rol sala tampoco gana acceso a nada nuevo', () => {
    const dir = { rol: 'sala' as const, sala: 'neracode', exp: 9e12 }
    expect(puedeVerRuta(dir, '/agenda')).toBe(false)
    expect(puedeVerRuta(dir, '/salas')).toBe(false)
    expect(puedeVerRuta(dir, '/cliente/zeus')).toBe(false)
  })
})
