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

const { crearSesion } = await import('./sesiones')
const { reiniciarStoreMemoria } = await import('./store-memoria')

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
