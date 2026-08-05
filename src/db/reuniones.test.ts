import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * MISMO PATRÓN QUE `src/db/sesiones.test.ts` (léelo antes de tocar esto):
 * `salaEstaActiva` va mockeada porque el store en memoria no modela la tabla
 * `salas` ni su columna `activa` — es lo mínimo necesario para probar el
 * rechazo de sala en pausa. El resto del módulo (`./store-memoria`,
 * `./esquema`, `./temas`, `./acuerdos`) sigue siendo el real.
 */

const salaEstaActivaMock = vi.fn()
vi.mock('./salas', () => ({
  salaEstaActiva: (...args: unknown[]) => salaEstaActivaMock(...args),
}))

const {
  crearReunion, obtenerReunion, editarReunion, marcarDada, marcarNoDada, desmarcarNoDada, eliminarReunion,
  reunionesPublicasDelMes,
} = await import('./reuniones')
const { reiniciarStoreMemoria, obtenerAcuerdoMemoria } = await import('./store-memoria')
const { crearAcuerdo } = await import('./acuerdos')

beforeEach(() => {
  reiniciarStoreMemoria()
  salaEstaActivaMock.mockReset().mockResolvedValue(true)
})

describe('crearReunion', () => {
  it('una sala en pausa no admite reuniones nuevas', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(crearReunion({ salaSlug: 'zeus', fecha: new Date(), titulo: 'x', tipo: 'mensual' }))
      .rejects.toThrow(/pausada/i)
  })

  /**
   * RESTAURADO EL 5-AGO (hallazgo de la revisión de la Tarea 5b): al mudar
   * `crearSesion` a `crearReunion`, `DatosDeReunion` se quedó sin `estado` y
   * con él desapareció esta excepción. Es el caso de uso central de la
   * ronda: cargar una junta que ya pasó con lo que sea que se tenga de ella.
   *
   * `salaEstaActivaMock` en `false` A PROPÓSITO (el ejemplo del plan no la
   * tocaba, y así solo probaba que el campo se guarda — no que la excepción
   * bloquea el freeze de verdad, que es justo lo que dice el nombre del
   * test). Con la sala en pausa de verdad, esto solo pasa si `esTrabajoNuevo`
   * corta el `&&` antes de preguntarle a `salaEstaActiva` — por eso el
   * `not.toHaveBeenCalled()` de abajo, no un detalle de implementación
   * gratuito: es la prueba de que la excepción actuó.
   */
  it('...pero sí admite registrar una que YA SE DIO: eso es historia, no trabajo nuevo', async () => {
    // La regla que Franco dejó explícita: "consultar su historia sí; empezar
    // trabajo nuevo no". Sin esto, pausar una sala impide para siempre
    // registrar las juntas que se tuvieron con ella antes de la pausa.
    salaEstaActivaMock.mockResolvedValue(false)
    const { id } = await crearReunion({
      salaSlug: 'zeus', fecha: new Date(), titulo: 'La última antes de la pausa',
      tipo: 'mensual', estado: 'dada',
    })
    expect((await obtenerReunion(id))!.estado).toBe('dada')
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })

  /**
   * Mudado de `sesiones.test.ts` (ronda 10, tarea 5b — el archivo desaparece
   * con `sesiones.ts`; este test no estaba cubierto aquí todavía). Mismo
   * criterio que el resto del guardián de freeze: el mensaje lo lee una
   * persona, no debe decir el slug interno.
   */
  it('el mensaje usa el NOMBRE de marca, no el slug — es lo que lee quien lo ve', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(crearReunion({ salaSlug: 'zeus', fecha: new Date(), titulo: 'x', tipo: 'mensual' }))
      .rejects.toThrow(/^Zeus está pausada/)
  })

  /** Mudado de `sesiones.test.ts`: una sala inventada se rechaza ANTES de preguntar por el freeze. */
  it('una sala que no existe sigue rechazándose por su cuenta, antes de preguntar por el freeze', async () => {
    await expect(crearReunion({ salaSlug: 'no-existe', fecha: new Date(), titulo: 'x', tipo: 'mensual' }))
      .rejects.toThrow('Sala desconocida: "no-existe"')
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })

  it('nace agendada, no dada: agendar no es haber ocurrido', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    expect((await obtenerReunion(id))!.estado).toBe('agendada')
  })

  /**
   * Mudado de `ciclo-sesion.test.ts` (describe "agendar"). A diferencia del
   * original, no hay parámetro `estado` que pasar (`DatosDeReunion` no lo
   * tiene: toda reunión nace agendada) — lo que sí se conserva y se prueba
   * aquí es la fidelidad de campos, incluidos `alcance`/`participantes`, que
   * `ReunionResumen` no exponía hasta esta tarea (ver el reporte, "deuda
   * participantes").
   */
  it('conserva fecha, título, participantes, lugar y alcance tal cual se agendaron', async () => {
    const { id } = await crearReunion({
      salaSlug: 'zeus',
      tipo: 'mensual',
      fecha: new Date('2026-08-19T16:00:00Z'),
      titulo: 'Estatus de agosto',
      participantes: ['Ceci', 'Franco'],
      lugar: 'Teams',
      alcance: 'campaña de fin de año',
    })
    const r = (await obtenerReunion(id))!
    expect(r.titulo).toBe('Estatus de agosto')
    expect(r.participantes).toEqual(['Ceci', 'Franco'])
    expect(r.lugar).toBe('Teams')
    expect(r.alcance).toBe('campaña de fin de año')
    expect(r.fecha).toBe('2026-08-19T16:00:00.000Z')
  })

  /**
   * RESTAURADO EN LA TAREA 8b (5-ago), pedido de Franco: "necesito poder
   * utilizar el componente para crear minutas de otras reuniones". La
   * capacidad existía en el modelo viejo (`DatosDeSesion.salaSlug: string |
   * null`, `src/db/sesiones.ts`) y se perdió en la Tarea 4 al volver
   * `DatosDeReunion.salaSlug` obligatorio — recuperable con `git show
   * d5396be:src/db/sesiones.ts`. Los tres tests son verbatim los del brief.
   */
  it('una reunión puede no ser de ninguna sala: un comité no es una UDN', async () => {
    const { id } = await crearReunion({
      salaSlug: null, fecha: new Date(), titulo: 'Comité de marca', tipo: 'mensual',
    })
    expect((await obtenerReunion(id))!.salaSlug).toBeNull()
  })

  it('sin sala lleva la identidad de quien la convoca: Marketing Corp', async () => {
    const { id } = await crearReunion({
      salaSlug: null, fecha: new Date(), titulo: 'Comité de marca', tipo: 'mensual',
    })
    const r = (await obtenerReunion(id))!
    expect(r.salaNombre).toBe('Marketing Corp')
    expect(r.salaColor).toBe('#E34714')
  })

  it('sin sala no hay freeze que comprobar: nadie pausa un comité', async () => {
    // `salaEstaActiva` ni se llama — no hay sala de la que preguntar.
    await crearReunion({ salaSlug: null, fecha: new Date(), titulo: 'x', tipo: 'mensual' })
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })
})

describe('marcarNoDada', () => {
  it('deja constancia sin borrar que estaba agendada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    const r = (await obtenerReunion(id))!
    expect(r.noDadaEn).not.toBeNull()
    expect(r.estado).toBe('agendada')
  })

  it('se puede deshacer', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    await desmarcarNoDada(id)
    expect((await obtenerReunion(id))!.noDadaEn).toBeNull()
  })

  /**
   * MISMO FREEZE QUE `crearReunion` (regla #5 del brief: "el rechazo de sala
   * en pausa" se conserva íntegra, y no solo para crear). No viene dado
   * verbatim en el brief, pero implementar el guardián sin un test que lo
   * ejerza sería exactamente lo que la autorevisión pide no hacer.
   */
  it('una sala en pausa también rechaza marcarNoDada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarNoDada(id)).rejects.toThrow(/pausada/i)
  })

  /** Mudado de `sesiones.test.ts`: el mensaje de marcarNoDada es el suyo propio, distinto del de marcarDada. */
  it('el mensaje es el suyo propio, no el de marcarDada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarNoDada(id)).rejects.toThrow(/reactívala antes de marcar esta reunión/)
  })

  /** Mismo guardián y mismo motivo que su equivalente en `describe('marcarDada')` — ver ese comentario. */
  it('sin sala tampoco hay freeze que comprobar en marcarNoDada', async () => {
    const { id } = await crearReunion({ salaSlug: null, fecha: new Date(), titulo: 'Comité de marca', tipo: 'mensual' })
    await marcarNoDada(id)
    expect((await obtenerReunion(id))!.noDadaEn).not.toBeNull()
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })

  /** Mudado de `ciclo-sesion.test.ts`: no revienta si nunca se había marcado — no-op honesto. */
  it('deshacerlo (desmarcarNoDada) sin haberlo marcado antes no revienta', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await expect(desmarcarNoDada(id)).resolves.toBeUndefined()
    expect((await obtenerReunion(id))!.noDadaEn).toBeNull()
  })

  /** Mudado de `ciclo-sesion.test.ts`: una reunión ya dada es un hecho confirmado, no se puede negar. */
  it('una reunión ya dada no se puede decir que no se dio: es un hecho confirmado', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarDada(id)
    await expect(marcarNoDada(id)).rejects.toThrow(/ya se marcó como dada/i)
  })

  /** Mudado de `ciclo-sesion.test.ts`: se dice, no se ignora en silencio. */
  it('una reunión que no existe se dice, no se ignora en silencio', async () => {
    await expect(marcarNoDada('no-existe')).rejects.toThrow(/no encontrada/i)
  })
})

describe('marcarDada', () => {
  it('una reunión sin documento y sin archivo también se puede dar por dada', async () => {
    // El caso de Franco: la junta ocurrió, todavía no se ha cargado nada.
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    await marcarDada(id)
    expect((await obtenerReunion(id))!.estado).toBe('dada')
  })

  /** Mismo freeze — ver el comentario en 'marcarNoDada' arriba. */
  it('una sala en pausa también rechaza marcarDada', async () => {
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarDada(id)).rejects.toThrow(/pausada/i)
  })

  /** Mudado de `sesiones.test.ts`: el mensaje usa el NOMBRE de marca, no el slug. */
  it('el mensaje usa el NOMBRE de marca, no el slug', async () => {
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(marcarDada(id)).rejects.toThrow(/^Research Land está pausada/)
  })

  /**
   * TAREA 8b: `reunion.salaSlug` ahora puede ser `null`, y `salaEstaActiva`
   * sigue exigiendo un slug real — el mismo guardián de `crearReunion` hace
   * falta aquí. El original (`marcarPresentada`, `sesiones.ts`, commit
   * `d5396be`) ya lo resolvía así, con esta misma frase: "sin sala... no hay
   * freeze que preguntar". Nace `agendada` (sin `estado`) a propósito: si
   * naciera `dada`, `marcarDada` volvería sin tocar el freeze por el propio
   * `if (reunion.estado === 'dada') return` de arriba, y el test no probaría
   * nada.
   */
  it('sin sala tampoco hay freeze que comprobar en marcarDada', async () => {
    const { id } = await crearReunion({ salaSlug: null, fecha: new Date(), titulo: 'Comité de marca', tipo: 'mensual' })
    await marcarDada(id)
    expect((await obtenerReunion(id))!.estado).toBe('dada')
    expect(salaEstaActivaMock).not.toHaveBeenCalled()
  })

  /**
   * Mudado de `ciclo-sesion.test.ts` ("pulsar dos veces no rompe nada" / "no
   * retrocede"). El original probaba que una sesión `minutada` no retrocedía
   * a `presentada` al reinvocar `marcarPresentada` — ese tercer estado
   * (`minutada` como terminal del mismo enum) no existe en `EstadoReunion`
   * (`agendada` | `dada`): `tieneMinuta` es un campo aparte, independiente
   * del estado (spec §1). Lo que SÍ sigue siendo cierto, y es lo que prueba
   * esto, es la idempotencia simple: pulsar dos veces no rompe nada.
   */
  it('es idempotente: llamarlo dos veces no rompe nada', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarDada(id)
    await marcarDada(id)
    expect((await obtenerReunion(id))!.estado).toBe('dada')
  })

  /** Mudado de `ciclo-sesion.test.ts`: se dice, no se ignora en silencio. */
  it('una reunión que no existe se dice, no se ignora en silencio', async () => {
    await expect(marcarDada('no-existe')).rejects.toThrow(/no encontrada/i)
  })

  /** Mudado de `ciclo-sesion.test.ts`: confirmar limpia una "no dada" vieja — las dos a la vez serían una contradicción. */
  it('limpia una "no dada" vieja: las dos cosas a la vez serían una contradicción', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await marcarNoDada(id)
    expect((await obtenerReunion(id))!.noDadaEn).not.toBeNull()

    await marcarDada(id)
    expect((await obtenerReunion(id))!.estado).toBe('dada')
    expect((await obtenerReunion(id))!.noDadaEn).toBeNull()
  })
})

/**
 * Mudado de `ciclo-sesion.test.ts` (describe "editar los datos de la
 * reunión"): `editarReunion` no tenía cobertura propia en este archivo.
 * Incluye el test que fija la deuda de la Tarea 4: `editarSesion`
 * sanitizaba `participantes` (trim + sin vacíos + sin repetidos) y
 * `editarReunion` lo había perdido al pasar el tipo a `unknown[]`. Ver el
 * reporte de esta tarea para la decisión completa (`participantes` vuelve a
 * ser `string[]`).
 */
describe('editarReunion', () => {
  async function agendada() {
    const { id } = await crearReunion({
      salaSlug: 'zeus', tipo: 'mensual', fecha: new Date('2026-08-19T16:00:00Z'), titulo: 'Estatus de agosto',
    })
    return id
  }

  it('mueve la fecha sin tocar lo demás', async () => {
    const id = await agendada()
    await editarReunion(id, { fecha: new Date('2026-08-26T16:00:00Z') })
    const r = (await obtenerReunion(id))!
    expect(r.fecha).toBe('2026-08-26T16:00:00.000Z')
    expect(r.titulo).toBe('Estatus de agosto')
  })

  it('limpia la lista de participantes: sin vacíos ni repetidos', async () => {
    // "Ceci, , Pablo, Ceci," es lo normal al escribir a mano, no la excepción.
    const id = await agendada()
    await editarReunion(id, { participantes: ['Ceci', '  ', ' Pablo ', 'Ceci', ''] })
    expect((await obtenerReunion(id))!.participantes).toEqual(['Ceci', 'Pablo'])
  })

  it('vaciar el título se rechaza en vez de dejar la reunión sin nombre', async () => {
    const id = await agendada()
    await expect(editarReunion(id, { titulo: '   ' })).rejects.toThrow(/título/i)
    expect((await obtenerReunion(id))!.titulo).toBe('Estatus de agosto')
  })

  it('un lugar en blanco se guarda como "sin lugar", no como cadena vacía', async () => {
    const id = await agendada()
    await editarReunion(id, { lugar: '   ' })
    expect((await obtenerReunion(id))!.lugar).toBeNull()
  })

  it('una reunión que no existe se dice, no se ignora', async () => {
    await expect(editarReunion('no-existe', { lugar: 'Teams' })).rejects.toThrow(/no encontrada/i)
  })
})

describe('eliminarReunion', () => {
  it('sus acuerdos sobreviven: un compromiso no desaparece porque se borre la junta', async () => {
    // `obtenerAcuerdoMemoria` es como leen los tests de acuerdos que ya
    // existen (src/db/acuerdos.test.ts) — no hay `obtenerAcuerdo` público.
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const acuerdo = await crearAcuerdo('neracode', {
      que: 'Cruce de paid media', responsable: 'Fernando',
      fechaCompromiso: null, reunionOrigenId: id,
    })
    await eliminarReunion(id)
    const vivo = obtenerAcuerdoMemoria(acuerdo.id)
    expect(vivo).not.toBeNull()
    expect(vivo!.reunionOrigenId).toBeNull()   // la clave ajena se anula, no cascada
  })
})

/**
 * SIN DB, `reunionesPublicasDelMes` NO PUEDE FINGIR — mismo motivo que la
 * `sesionesPublicasDelMes` de la que viene (ver src/db/sesiones.test.ts): el
 * store en memoria no modela `salas.activa`, así que no hay forma honesta de
 * decidir qué sala está en pausa sin una DB real.
 */
describe('reunionesPublicasDelMes — sin DB no hay nada que anunciar', () => {
  it('devuelve la lista vacía, no una mentira sobre qué salas están activas', async () => {
    const reuniones = await reunionesPublicasDelMes(2026, 8)
    expect(reuniones).toEqual([])
  })
})
