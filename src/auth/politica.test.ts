import { describe, it, expect } from 'vitest'
import { puedeVerSala, puedeVerRuta, esRutaPublica, puedeEditarContenido } from './politica'
import type { Sesion } from './firma'

const EQUIPO: Sesion = { rol: 'equipo', sub: 'franco@upax.com.mx', exp: Date.now() + 1000 }
const SALA_NC: Sesion = { rol: 'sala', sala: 'neracode', exp: Date.now() + 1000 }

// Los tres niveles de la ronda 9 (tarea 2). Antes de la revisión final de la
// rama (punto 1) el resto del archivo seguía usando el `EQUIPO` de arriba
// (sin `rolApp`) para las rutas que no son /salas ni /personas, porque a ESAS
// les bastaba con `rol: 'equipo'` sin importar el nivel — ya no: `puedeVerRuta`
// exige `puedeLeer(sesion)` (un `rolApp` válido) para CUALQUIER ruta de
// equipo, así que de aquí para abajo `EQUIPO` solo se usa donde el punto es,
// precisamente, que una sesión sin rol no entra a ningún lado.
const ADMIN: Sesion = { rol: 'equipo', rolApp: 'admin', exp: Date.now() + 1000 }
const EDITOR: Sesion = { rol: 'equipo', rolApp: 'editor', exp: Date.now() + 1000 }
const VIEWER: Sesion = { rol: 'equipo', rolApp: 'viewer', exp: Date.now() + 1000 }

/**
 * LA SALA DE UN CLIENTE SE LEE SIN SESIÓN (12-ago).
 *
 * Franco: *"esta es la URL que le compartiré a las UDNs y directores; pedir
 * que se logueen, o pasarles una URL larguísima o una clave, se les va a
 * terminar olvidando"*. Preguntado por el alcance con la exposición sobre la
 * mesa —los slugs son los nombres de las UDNs, así que la URL se adivina—
 * respondió: *"todo sin login, pueden descargar pero no pueden editar nada"*.
 *
 * Lo que estas pruebas fijan no es que se abra —eso es una línea— sino QUÉ
 * NO se abrió con ella.
 */
describe('puedeVerSala — la sala se lee sin entrar', () => {
  it('cualquiera ve cualquier sala, con sesión o sin ella', () => {
    expect(puedeVerSala(EQUIPO, 'neracode')).toBe(true)
    expect(puedeVerSala(SALA_NC, 'zeus')).toBe(true)
    expect(puedeVerSala(null, 'neracode')).toBe(true)
  })

  /** VER no es TOCAR: lo segundo lo sigue decidiendo `puedeEditarContenido`. */
  it('pero nadie de fuera escribe', () => {
    expect(puedeEditarContenido(null)).toBe(false)
    expect(puedeEditarContenido(SALA_NC)).toBe(false)
    // `ADMIN` y no `EQUIPO`: esa fija no lleva `rolApp`, y una sesión de
    // equipo sin rol de app falla cerrado a propósito (ronda 9).
    expect(puedeEditarContenido(ADMIN)).toBe(true)
  })
})

describe('esRutaPublica', () => {
  it('deja pasar el login y el retorno de Slack', () => {
    expect(esRutaPublica('/entrar')).toBe(true)
    expect(esRutaPublica('/api/auth/slack/inicio')).toBe(true)
    expect(esRutaPublica('/api/auth/slack/retorno')).toBe(true)
  })

  it('abre la sala de un cliente, su benchmark, sus documentos y sus archivos', () => {
    expect(esRutaPublica('/cliente/neracode')).toBe(true)
    expect(esRutaPublica('/cliente/neracode/benchmark')).toBe(true)
    expect(esRutaPublica('/reunion/abc-123')).toBe(true)
    expect(esRutaPublica('/api/archivo/abc-123')).toBe(true)
  })

  /**
   * LA IMAGEN DE VISTA PREVIA la piden Slack, WhatsApp y LinkedIn desde sus
   * propios servidores y SIN sesión. Protegida, el enlace compartido se queda
   * sin imagen — que es justo lo que pasó al desplegarla: 307 a `/entrar`.
   */
  it('abre la imagen de vista previa de una sala: la piden las redes sin sesión', () => {
    expect(esRutaPublica('/cliente/neracode/opengraph-image')).toBe(true)
    expect(puedeVerRuta(null, '/cliente/neracode/opengraph-image')).toBe(true)
  })

  /**
   * LO QUE NO SE ABRIÓ. Es la mitad que importa de este cambio: los ajustes
   * de una sala guardan su clave y su enlace firmado, y todo lo de Marketing
   * Corp es de Marketing Corp.
   */
  it('NO abre los ajustes de una sala: ahí viven su clave y su enlace firmado', () => {
    expect(esRutaPublica('/cliente/neracode/ajustes')).toBe(false)
    expect(puedeVerRuta(null, '/cliente/neracode/ajustes')).toBe(false)
  })

  it('NO abre nada de Marketing Corp', () => {
    for (const ruta of ['/', '/deck', '/deck/abc', '/reuniones', '/acuerdos', '/acuerdos/bandeja', '/salas', '/personas']) {
      expect(esRutaPublica(ruta), `${ruta} quedó abierta`).toBe(false)
      expect(puedeVerRuta(null, ruta), `${ruta} se abre sin sesión`).toBe(false)
    }
  })

  /** Lista blanca de hijas: una pantalla nueva bajo /cliente/<slug>/ no se abre sola. */
  it('una hija de sala que no esté en la lista no se abre', () => {
    expect(esRutaPublica('/cliente/neracode/lo-que-sea')).toBe(false)
    expect(esRutaPublica('/cliente/neracode/benchmark/detalle')).toBe(false)
  })

  it('no se deja engañar por rutas que solo empiezan parecido', () => {
    expect(esRutaPublica('/entrarse-por-la-puerta')).toBe(false)
    expect(esRutaPublica('/api/auth/slackear')).toBe(false)
  })
})

describe('puedeVerRuta', () => {
  it('sin sesión se entra a la sala de un cliente y a nada de Mkt Corp', () => {
    expect(puedeVerRuta(null, '/cliente/neracode')).toBe(true)
    expect(puedeVerRuta(null, '/')).toBe(false)
    expect(puedeVerRuta(null, '/deck/abc')).toBe(false)
  })

  it('el equipo con un rolApp válido entra a todo', () => {
    for (const ruta of ['/', '/cliente/zeus', '/deck', '/deck/abc/minuta']) {
      expect(puedeVerRuta(ADMIN, ruta)).toBe(true)
      expect(puedeVerRuta(EDITOR, ruta)).toBe(true)
      expect(puedeVerRuta(VIEWER, ruta)).toBe(true)
    }
  })

  /**
   * Revisión final de la rama, punto 1 — el hallazgo que motivó el fix de
   * `puedeVerRuta`: todo el equipo tenía una cookie de 7 días SIN `rolApp`
   * (sesiones abiertas antes de la ronda 9). Antes de este fix, esa sesión
   * pasaba el filtro optimista de CUALQUIER ruta salvo /salas y /personas —
   * incluido el Home, que no tiene guarda de página propia — y solo tropezaba
   * en el primer `exigir*()` real, que lanza. Sin `error.tsx`, eso era la
   * pantalla genérica de Next. Ahora falla cerrado aquí mismo, igual que ya
   * fallaba en /salas y /personas: el proxy manda derecho a /entrar.
   */
  it('una sesión de equipo SIN rolApp no entra a ninguna ruta de equipo, ni siquiera las que no son de admin', () => {
    // Sin `/cliente/zeus`: la sala de un cliente ya no es ruta de equipo, se
    // lee sin sesión — que es justo lo que comprueba el caso de abajo.
    for (const ruta of ['/', '/deck', '/deck/abc/minuta', '/acuerdos', '/acuerdos/bandeja']) {
      expect(puedeVerRuta(EQUIPO, ruta)).toBe(false)
    }
  })

  /** Y la sala sí, porque es pública: no depende del rol de nadie. */
  it('una sesión de equipo sin rolApp entra a una sala igual que un desconocido', () => {
    expect(puedeVerRuta(EQUIPO, '/cliente/zeus')).toBe(true)
  })

  /**
   * Desde que la sala es pública, un acceso de sala ya no restringe NADA de
   * lo que se ve: entra a cualquier sala igual que un desconocido. Lo que
   * sigue cerrado para él es todo lo de Marketing Corp — lo comprueba el caso
   * "no entra al hub ni a la preparación ni al motor", más abajo.
   */
  it('un acceso de sala entra a cualquier sala, como cualquiera', () => {
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode')).toBe(true)
    expect(puedeVerRuta(SALA_NC, '/cliente/zeus')).toBe(true)
    // La ruta lleva un id y no un slug: pasa el filtro optimista y la PÁGINA
    // comprueba de qué sala es.
    expect(puedeVerRuta(SALA_NC, '/reunion/abc-123')).toBe(true)
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

  it('el benchmark de cualquier sala se abre; sus ajustes no', () => {
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/benchmark')).toBe(true)
    expect(puedeVerRuta(SALA_NC, '/cliente/zeus/benchmark')).toBe(true)
    // Lista blanca de hijas: los ajustes guardan la clave de la sala y su
    // enlace firmado, así que NO entran — ni una página nueva por olvido.
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/ajustes')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/lo-que-sea')).toBe(false)
  })

  it('un acceso de sala no entra al hub ni a la preparación ni al motor', () => {
    expect(puedeVerRuta(SALA_NC, '/')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/deck')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/deck/abc')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/deck/abc')).toBe(false)
  })

  /**
   * Con la sala pública, un slug parecido ya no es un problema de acceso —
   * cualquier sala se ve— pero uno INEXISTENTE tiene que seguir muriendo en
   * la página con un 404, no pintando media pantalla. Eso lo comprueba
   * `page.test.ts` contra `slugsDeSalas()`; aquí solo se fija que una ruta
   * con `..` no se cuela como si fuera una sala.
   */
  it('una ruta con .. no se cuela como sala', () => {
    expect(puedeVerRuta(SALA_NC, '/cliente/neracode/../zeus')).toBe(false)
    expect(esRutaPublica('/cliente/neracode/../zeus')).toBe(false)
  })

  it('una ruta desconocida se niega por defecto en vez de abrirse', () => {
    expect(puedeVerRuta(SALA_NC, '/admin')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/loquesea')).toBe(false)
  })

  /**
   * El espacio de acuerdos (tarea 11, ronda 7) es de equipo: cruza las diez
   * salas, y eso no es asunto de un solo director. Sin entrada explícita en
   * la lista blanca cae en el mismo "se niega por defecto" que el caso de
   * arriba — este test lo deja dicho por su nombre, no solo por coincidencia
   * con /admin. Y con sus subrutas, sean las que sean: hasta el 20-ago-2026
   * de aquí colgaba `/acuerdos/bandeja`.
   */
  it('un acceso de sala no entra al espacio de acuerdos ni a ninguna subruta suya', () => {
    expect(puedeVerRuta(SALA_NC, '/acuerdos')).toBe(false)
    expect(puedeVerRuta(SALA_NC, '/acuerdos/lo-que-sea')).toBe(false)
  })

  it('el equipo con rolApp sí entra al espacio de acuerdos y a su bandeja', () => {
    expect(puedeVerRuta(EDITOR, '/acuerdos')).toBe(true)
    expect(puedeVerRuta(EDITOR, '/acuerdos/bandeja')).toBe(true)
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
    // Sin `/cliente/neracode`: la sala de un cliente se abrió a propósito, y
    // que siga cerrada TODO lo demás es lo que este caso protege.
    for (const ruta of ['/', '/acuerdos', '/acuerdos/bandeja', '/deck', '/deck/nueva', '/salas']) {
      expect(puedeVerRuta(null, ruta)).toBe(false)
    }
  })

  it('el rol sala tampoco gana acceso a nada nuevo', () => {
    const dir = { rol: 'sala' as const, sala: 'neracode', exp: 9e12 }
    expect(puedeVerRuta(dir, '/agenda')).toBe(false)
    expect(puedeVerRuta(dir, '/salas')).toBe(false)
    // `/cliente/zeus` ya no prueba nada de su rol: esa sala la ve cualquiera.
    expect(puedeVerRuta(dir, '/cliente/zeus/ajustes')).toBe(false)
  })
})
