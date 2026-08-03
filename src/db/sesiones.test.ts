import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * EL FREEZE DE SALAS BLOQUEA `crearSesion` (tarea 12, ronda 7).
 *
 * `crearSesion` es el único punto por el que pasan los tres caminos de la UI
 * que crean una sesión nueva —la propia sala, `/deck/nueva` y la agenda—, así
 * que es aquí donde se prueba que una sala en pausa la rechaza: si el test
 * viviera en una sola de las tres pantallas, no probaría nada sobre las otras
 * dos.
 *
 * `salaEstaActiva` real hace una consulta a Postgres; en el store en memoria
 * (el que usa vitest, que no carga .env.local) no hay tabla `salas` que
 * modele `activa`, así que no hay forma honesta de simular una sala pausada
 * sin mockear. Se mockea justo esa función — mínimo necesario, el resto del
 * módulo (`./store-memoria`, `./esquema`, etc.) sigue siendo el real.
 */

const salaEstaActivaMock = vi.fn()
vi.mock('./salas', () => ({
  salaEstaActiva: (...args: unknown[]) => salaEstaActivaMock(...args),
}))

const {
  crearSesion, sesionesPublicasDelMes, anadirSeccion, obtenerSesion, marcarPresentada, marcarNoDada,
} = await import('./sesiones')
const {
  reiniciarStoreMemoria, actualizarContenidoItemMemoria, actualizarDecisionItemMemoria, actualizarEstadoSesionMemoria,
} = await import('./store-memoria')

beforeEach(() => {
  reiniciarStoreMemoria()
  salaEstaActivaMock.mockReset().mockResolvedValue(true)
})

describe('crearSesion — freeze de salas', () => {
  it('rechaza crear una sesión para una sala en pausa', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(
      crearSesion({ salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos' }),
    ).rejects.toThrow(/zeus.*en pausa/i)
  })

  it('el mensaje usa el NOMBRE de marca, no el slug — es lo que lee quien lo ve', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(
      crearSesion({ salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos' }),
    ).rejects.toThrow(/^Zeus está en pausa/)
  })

  it('con la sala activa, crea la sesión con normalidad', async () => {
    salaEstaActivaMock.mockResolvedValue(true)
    const { id } = await crearSesion({ salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos' })
    expect(id).toBeTruthy()
    expect(salaEstaActivaMock).toHaveBeenCalledWith('zeus')
  })

  it('una reunión SIN sala (comité, arranque de campaña) no pregunta por ningún freeze', async () => {
    const { id } = await crearSesion({ salaSlug: null, tipo: 'mensual', alcance: 'todos' })
    expect(id).toBeTruthy()
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })

  it('una sala que no existe sigue rechazándose por su cuenta, antes de preguntar por el freeze', async () => {
    await expect(
      crearSesion({ salaSlug: 'no-existe', tipo: 'mensual', alcance: 'todos' }),
    ).rejects.toThrow('Sala desconocida: "no-existe"')
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })

  it('agendar (estado "agendada") para una sala en pausa también se rechaza', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(
      crearSesion({ salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos', estado: 'agendada' }),
    ).rejects.toThrow(/en pausa/i)
  })

  it('"presentada" —una reunión que YA SE DIO, registrada al publicar su minuta— NO se bloquea: es historia, no trabajo nuevo', async () => {
    // publicarMinutaAction (src/app/deck/[id]/minuta/acciones.ts) crea la
    // sesión así cuando alguien describe a mano una reunión que ocurrió
    // antes de esta herramienta. Franco fue explícito: "consultar su
    // historia sí; empezar trabajo nuevo no" — y completar el acta de algo
    // que ya pasó es justo lo primero, no lo segundo.
    salaEstaActivaMock.mockResolvedValue(false)
    const { id } = await crearSesion({
      salaSlug: 'zeus', tipo: 'mensual', alcance: 'todos', estado: 'presentada',
    })
    expect(id).toBeTruthy()
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })
})

/**
 * EL MISMO FREEZE, EN `marcarPresentada` / `marcarNoDada` (revisión
 * post-implementación, 2026-08-03).
 *
 * Confirmar o negar si una reunión se dio es gestión, y una sala en pausa no
 * admite gestión — mismo criterio que `crearSesion`, arriba. Franco pausó
 * Zeus mientras tanto: sin esta guarda, un editor podía confirmar o negar una
 * reunión `lista` con el día vencido de una sala en freeze, justo lo que el
 * freeze dice que no se puede hacer.
 */
describe('marcarPresentada / marcarNoDada — freeze de salas', () => {
  /** Una sesión `lista` (maquetada), sin pasar por el maquetado real: alcanza con el atajo de memoria. */
  async function sesionLista(salaSlug: string | null) {
    const { id } = await crearSesion({ salaSlug, tipo: 'mensual', alcance: 'todos' })
    actualizarEstadoSesionMemoria(id, 'lista')
    return id
  }

  it('marcarPresentada rechaza una sesión de una sala en pausa', async () => {
    const id = await sesionLista('zeus')
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarPresentada(id)).rejects.toThrow(/^Zeus está en pausa/)
  })

  it('marcarPresentada: con la sala activa, confirma con normalidad', async () => {
    const id = await sesionLista('zeus')
    salaEstaActivaMock.mockResolvedValue(true)
    await marcarPresentada(id)
    expect((await obtenerSesion(id))!.estado).toBe('presentada')
  })

  it('marcarPresentada: una reunión sin sala no pregunta por ningún freeze', async () => {
    const id = await sesionLista(null)
    await marcarPresentada(id)
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
    expect((await obtenerSesion(id))!.estado).toBe('presentada')
  })

  it('marcarNoDada rechaza una sesión de una sala en pausa', async () => {
    const id = await sesionLista('zeus')
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarNoDada(id)).rejects.toThrow(/^Zeus está en pausa/)
  })

  it('marcarNoDada: con la sala activa, marca con normalidad', async () => {
    const id = await sesionLista('zeus')
    salaEstaActivaMock.mockResolvedValue(true)
    await marcarNoDada(id)
    expect((await obtenerSesion(id))!.noDadaEn).not.toBeNull()
  })

  it('marcarNoDada: una reunión sin sala no pregunta por ningún freeze', async () => {
    const id = await sesionLista(null)
    await marcarNoDada(id)
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
    expect((await obtenerSesion(id))!.noDadaEn).not.toBeNull()
  })

  it('el mensaje de marcarPresentada usa el NOMBRE de marca, no el slug', async () => {
    const id = await sesionLista('zeus')
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarPresentada(id)).rejects.toThrow(/reactívala antes de confirmar esta reunión/)
  })

  it('el mensaje de marcarNoDada es el suyo propio, no el de marcarPresentada', async () => {
    const id = await sesionLista('zeus')
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarNoDada(id)).rejects.toThrow(/reactívala antes de marcar esta reunión/)
  })
})

/**
 * SIN DB, `sesionesPublicasDelMes` NO PUEDE FINGIR (ronda 8, tarea 3).
 *
 * Igual que `acuerdosPendientesDeSubir` (src/db/acuerdos.ts): el store en
 * memoria no modela la columna `salas.activa`, así que no hay forma honesta
 * de decidir qué sala está en pausa sin una DB real. Devolver `[]` es lo
 * único que no miente. En la práctica esta rama no se alcanza desde la
 * página pública: sin DB, `tokenValido` siempre da falso (ver
 * src/db/enlace-agenda.test.ts) y la página responde 404 antes de llegar
 * aquí — pero la función debe seguir siendo segura si algo la llamara
 * directamente.
 */
describe('sesionesPublicasDelMes — sin DB no hay nada que anunciar', () => {
  it('devuelve la lista vacía, no una mentira sobre qué salas están activas', async () => {
    const reuniones = await sesionesPublicasDelMes(2026, 8)
    expect(reuniones).toEqual([])
  })
})

/**
 * `imagen` VIVÍA COMO UNA URL SUELTA antes de la ronda 9, tarea 7 — no como
 * el objeto `{ url, anchoPorcentaje?, alineacion? }` de hoy.
 * `contenidoCrudo`/`decisionMaquetacion` son `jsonb` sin validar al leer, así
 * que una fila guardada con la forma vieja sigue en la base con esa forma:
 * en producción, la sesión de NeraCode "cd2e793b-…" — item "La pieza que
 * mejor funcionó" — es exactamente este caso.
 *
 * Se inyecta la forma vieja EN CRUDO, saltándose el tipo (`unknown` en
 * `actualizarContenidoItemMemoria`/`actualizarDecisionItemMemoria`, igual
 * que la fila real en Postgres no pasa por ningún `.parse()` al guardarse):
 * es la única forma honesta de simular datos que ya existían antes de que
 * el tipo cambiara, no algo que el código de hoy pudiera producir.
 */
describe('imagen con la forma vieja (string) sigue en la base — se normaliza al leer', () => {
  async function sesionConImagenVieja() {
    const { id: sesionId } = await crearSesion({ salaSlug: null, tipo: 'mensual', alcance: 'todos' })
    const { itemId } = await anadirSeccion(sesionId, 'imagen-a-sangre', 'La pieza que mejor funcionó')
    actualizarContenidoItemMemoria(itemId, {
      seccion: { layout: 'imagen-a-sangre', titulo: 'La pieza que mejor funcionó', imagen: '/logos/neracode-color.png' },
    })
    // `decisionMaquetacion` guarda un `ResultadoMaquetacion` —
    // `{ decision: {...}, degradado, motivo? }`—, no la `DecisionSlide`
    // suelta: así la escribe `guardarDecisiones` (src/db/sesiones.ts) y así
    // está la fila real en producción, confirmado leyendo
    // `decision_maquetacion->'decision'->>'imagen'`.
    actualizarDecisionItemMemoria(itemId, {
      degradado: false,
      decision: {
        layout: 'imagen-a-sangre',
        titulo: 'La pieza que mejor funcionó',
        razon: 'Sección compuesta por el equipo de Marketing Corporativo.',
        imagen: '/logos/neracode-color.png',
      },
    })
    return sesionId
  }

  it('el borrador del editor (contenido.seccion.imagen) llega como objeto, no como string', async () => {
    const sesionId = await sesionConImagenVieja()
    const sesion = await obtenerSesion(sesionId)
    const item = sesion!.items.find((i) => i.titulo === 'La pieza que mejor funcionó')!
    expect(item.contenido.seccion?.imagen).toEqual({ url: '/logos/neracode-color.png' })
  })

  it('la decisión ya maquetada (resultado.decision.imagen) llega como objeto, no como string', async () => {
    // El caso que rompía en silencio: `decision.imagen.url` sobre un string
    // da `undefined`, y `SeccionDocumento` no tiene ninguna marca de
    // degradado para avisarlo — la imagen sale rota sin que nadie lo note.
    const sesionId = await sesionConImagenVieja()
    const sesion = await obtenerSesion(sesionId)
    const item = sesion!.items.find((i) => i.titulo === 'La pieza que mejor funcionó')!
    expect(item.resultado?.decision.imagen).toEqual({ url: '/logos/neracode-color.png' })
  })

  it('el objeto normalizado tiene `url` de verdad: el tirador ya no lo puede descomponer en caracteres', async () => {
    // Antes del fix, `{ ...'/logos/x.png', anchoPorcentaje: 60 }` producía
    // `{ 0: '/', 1: 'l', ..., anchoPorcentaje: 60 }` — la URL desaparecía.
    // Con el objeto ya normalizado, el mismo spread solo toca `anchoPorcentaje`.
    const sesionId = await sesionConImagenVieja()
    const sesion = await obtenerSesion(sesionId)
    const item = sesion!.items.find((i) => i.titulo === 'La pieza que mejor funcionó')!
    const conAncho = { ...item.contenido.seccion!.imagen, anchoPorcentaje: 60 }
    expect(conAncho).toEqual({ url: '/logos/neracode-color.png', anchoPorcentaje: 60 })
  })
})
