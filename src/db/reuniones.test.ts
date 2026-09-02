import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
const clienteDB = await import('./cliente')
const temasDB = await import('./temas')
const esquema = await import('./esquema')

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

  /**
   * I3 (revisión final, ronda 14.2). `agendarReunionAction`
   * (`src/app/reuniones/acciones.ts`) manda `datos.plantilla` CRUDO, tal cual
   * llega del formulario — sin este guardián, una cadena basura (o el `id` de
   * una vieja plantilla que se haya borrado del catálogo) se guardaba tal
   * cual y luego se pintaba como "Estatus de UDN" por el fallback de
   * `obtenerPlantilla`: un dato inventado presentado como real.
   */
  it('I3: una clase de junta que el catálogo no reconoce se rechaza, no se guarda', async () => {
    await expect(
      crearReunion({ salaSlug: 'zeus', fecha: new Date(), titulo: 'x', tipo: 'mensual', plantilla: 'no-existe' }),
    ).rejects.toThrow('Plantilla desconocida: "no-existe"')
  })

  /**
   * I3: `null` y `''` NO son "una plantilla basura" — son el estado "sin
   * clasificar" de las 6 reuniones reales que hoy no tienen clase. El
   * guardián de arriba tiene que dejarlos pasar tal cual, sin rechazarlos.
   * (Que `''` se guarde tal cual o se traduzca a `null` es cosa de quien
   * llama — `agendarReunionAction` ya lo hace, `'' || null` — no de esta
   * validación, que solo decide "¿se admite?", no "¿cómo se normaliza?".)
   */
  it('I3: `null` y `\'\'` siguen siendo clases válidas — "sin clasificar", no un rechazo', async () => {
    // Las dos juntas llevan fecha y título DISTINTOS a propósito: al test solo
    // le importa la plantilla, pero las dos `new Date()` que tenía antes caían
    // en el mismo milisegundo con el mismo título y la misma sala, y desde la
    // guarda anti-duplicado (1-sep) eso es exactamente lo que se rechaza. El
    // fallo era del test, no de la regla.
    const { id: idNulo } = await crearReunion({
      salaSlug: 'zeus', fecha: new Date('2026-09-01T16:00:00Z'), titulo: 'Sin clase', tipo: 'mensual', plantilla: null,
    })
    expect((await obtenerReunion(idNulo))!.plantilla).toBeNull()

    await expect(
      crearReunion({
        salaSlug: 'zeus', fecha: new Date('2026-09-02T16:00:00Z'), titulo: 'Con clase vacía', tipo: 'mensual', plantilla: '',
      }),
    ).resolves.toBeDefined()
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

  /**
   * LA MISMA JUNTA NO SE AGENDA DOS VECES (1-sep-2026, hallazgo de Franco:
   * "veo muchísimas reuniones creadas repetidas").
   *
   * El 31-ago aparecieron en la base 7 copias de "Estatus de agosto" de Zeus
   * —misma sala, misma fecha, mismo título— nacidas en 26 segundos. Aquel
   * caso concreto resultó ser basura de una sesión de desarrollo apuntando a
   * la base de producción, no un doble clic de nadie; pero al investigarlo
   * quedó claro que NADA lo impedía: `crearReunion` genera un `crypto.randomUUID()`
   * nuevo en cada llamada y la tabla solo tenía índice único en `id`. Un
   * doble envío del formulario —o dos personas agendando la misma junta— las
   * creaba por duplicado sin protestar.
   *
   * QUÉ CUENTA COMO "LA MISMA": sala + instante + título. Es la definición
   * conservadora a propósito. Dos juntas de la misma sala a la misma hora con
   * títulos distintos son plausibles (se parte un estatus en dos bloques);
   * dos con el MISMO título no lo son nunca.
   *
   * VIVE AQUÍ, en la capa de datos, por el mismo motivo que `esPlantillaConocida`
   * (ver su comentario en `reuniones.ts`): es la única puerta por la que todos
   * los llamadores pasan. Y se dobla con un índice único en la base
   * (migración 0046, `NULLS NOT DISTINCT` para que los comités sin sala
   * también queden cubiertos) porque un `if` en el servidor no protege contra
   * dos peticiones que llegan a la vez — la carrera que produce justo el
   * doble clic que esto quiere evitar.
   */
  it('no admite dos veces la misma junta: misma sala, misma fecha, mismo título', async () => {
    const fecha = new Date('2026-08-19T16:00:00Z')
    await crearReunion({ salaSlug: 'zeus', fecha, titulo: 'Estatus de agosto', tipo: 'mensual' })
    await expect(crearReunion({ salaSlug: 'zeus', fecha, titulo: 'Estatus de agosto', tipo: 'mensual' }))
      .rejects.toThrow(/ya está agendada/i)
  })

  it('...y tampoco para un comité sin sala, donde el NULL no debe eximir de la regla', async () => {
    const fecha = new Date('2026-08-31T17:00:00Z')
    await crearReunion({ salaSlug: null, fecha, titulo: 'Comité de marca', tipo: 'mensual' })
    await expect(crearReunion({ salaSlug: null, fecha, titulo: 'Comité de marca', tipo: 'mensual' }))
      .rejects.toThrow(/ya está agendada/i)
  })

  it('pero dos juntas distintas a la misma hora sí pasan: lo que se repite es el título, no el hueco', async () => {
    const fecha = new Date('2026-08-19T16:00:00Z')
    await crearReunion({ salaSlug: 'zeus', fecha, titulo: 'Estatus de agosto', tipo: 'mensual' })
    await expect(crearReunion({ salaSlug: 'zeus', fecha, titulo: 'Comité aparte', tipo: 'mensual' }))
      .resolves.toBeTruthy()
  })

  it('y la misma junta en OTRA sala no es la misma junta', async () => {
    const fecha = new Date('2026-08-19T16:00:00Z')
    await crearReunion({ salaSlug: 'zeus', fecha, titulo: 'Estatus de agosto', tipo: 'mensual' })
    await expect(crearReunion({ salaSlug: 'neracode', fecha, titulo: 'Estatus de agosto', tipo: 'mensual' }))
      .resolves.toBeTruthy()
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

  /**
   * CRÍTICO C1 (ronda 14-2, fix 3/4) — rama en memoria.
   *
   * El bloque de `editarReunion` que arma `columnas` (src/db/reuniones.ts,
   * ~372-388) tiene una línea por `fecha`/`titulo`/`tipo`/`alcance`/
   * `participantes`/`lugar` pero NINGUNA para `plantilla` — aunque el TIPO
   * de la función (`Omit<Partial<DatosDeReunion>, 'salaSlug'>`) sí la admite.
   * Corregir la clase de una junta ya creada es hoy un no-op silencioso: no
   * revienta, no avisa, simplemente no se guarda. Este test corre contra el
   * store en memoria REAL (sin `hayDB()`, mismo patrón que el resto de este
   * archivo) — es la "capa de datos real" que menciona el encargo, no un
   * doble que finja escribir.
   */
  it('CRÍTICO C1: la clase de la junta (plantilla) SÍ se guarda al editar — rama en memoria', async () => {
    const { id } = await crearReunion({
      salaSlug: 'zeus', tipo: 'mensual', fecha: new Date('2026-08-19T16:00:00Z'),
      titulo: 'Estatus de agosto', plantilla: 'sync-comercial',
    })
    await editarReunion(id, { plantilla: 'comite' })
    expect((await obtenerReunion(id))!.plantilla).toBe('comite')
  })

  /**
   * CRÍTICO C1 — EL CASO QUE DE VERDAD CAZA UN GUARD ROTO (ronda de arreglo
   * 2/5: hueco señalado por la re-revisión). El test de arriba mueve
   * 'sync-comercial' → 'comite' (no-nulo a no-nulo); el de "costura
   * completa", más abajo, arranca en `null` y espera `null` — mismo valor al
   * principio y al final, así que pasa igual con el guard entero, con un
   * guard truthy (`if (cambios.plantilla)`, que trataría `null` como
   * "no tocar") o sin guard alguno: nada distingue ahí "no toqué el campo" de
   * "sí lo toqué, a lo mismo que ya tenía". Ninguno de los dos cubre la
   * transición que SÍ separa un `!== undefined` correcto de uno que se coma
   * el `null` (`??`/`||`/truthy): no-nulo → `null` explícito, "quítale la
   * clase" en el sentido estricto. Con el guard borrado, este test cae
   * (`'sync-comercial'` se queda pegado); con el guard real, `null` gana
   * porque `null !== undefined`.
   */
  it('CRÍTICO C1: un `plantilla: null` explícito SÍ borra una clase existente — no se queda pegada a la anterior', async () => {
    const { id } = await crearReunion({
      salaSlug: 'zeus', tipo: 'mensual', fecha: new Date('2026-08-19T16:00:00Z'),
      titulo: 'Estatus de agosto', plantilla: 'sync-comercial',
    })
    await editarReunion(id, { plantilla: null })
    expect((await obtenerReunion(id))!.plantilla).toBeNull()
  })

  /**
   * I3 (revisión final, ronda 14.2). `editarReunionAction`
   * (`src/app/reuniones/acciones.ts`) es una Server Action alcanzable por
   * cualquier `editor` y escribía la cadena que llegara sin comprobar nada —
   * corregir la clase de una junta YA CREADA con un valor basura se guardaba
   * tal cual. Mismo guardián que `crearReunion`, ver `esPlantillaConocida`.
   */
  it('I3: editar hacia una clase de junta que el catálogo no reconoce se rechaza — la clase anterior no se toca', async () => {
    const { id } = await crearReunion({
      salaSlug: 'zeus', tipo: 'mensual', fecha: new Date('2026-08-19T16:00:00Z'),
      titulo: 'Estatus de agosto', plantilla: 'sync-comercial',
    })
    await expect(editarReunion(id, { plantilla: 'no-existe' })).rejects.toThrow('Plantilla desconocida: "no-existe"')
    expect((await obtenerReunion(id))!.plantilla).toBe('sync-comercial')
  })

  /**
   * NO ES UN TEST DE REGRESIÓN DE C1 (renombrado y re-anotado en la ronda de
   * arreglo 2/5, hallazgo de la re-revisión: "un test tiene que representar
   * lo que su nombre promete"). Arranca en `plantilla: null` y termina en
   * `plantilla: null` — el mismo valor al principio y al final — así que
   * PASA con el guard de C1 entero, roto o borrado por completo: no hay
   * ninguna mutación de ese guard que este `expect` pueda cazar por sí sola
   * (la prueba que sí puede caer es la de arriba, "un `plantilla: null`
   * explícito SÍ borra una clase existente"). Lo que SÍ verifica, y para lo
   * que sigue siendo útil, es que editar OTRO campo (`lugar`) junto con un
   * `plantilla: null` explícito no deja que ese `null` se sustituya por algo
   * inventado en el camino — el escenario literal que motivó el encargo
   * original ("editar el lugar de una junta SIN clase la deja SIN clase").
   */
  it('editar OTRO campo (lugar) de una junta sin clase no le pega una clase inventada — no protege contra un guard de C1 roto, ver el test de arriba para eso', async () => {
    const { id } = await crearReunion({
      salaSlug: 'zeus', tipo: 'mensual', fecha: new Date('2026-08-19T16:00:00Z'), titulo: 'Sin clasificar',
      // Sin `plantilla`: nace `null`, igual que las 6 reuniones reales sin clase.
    })
    expect((await obtenerReunion(id))!.plantilla).toBeNull()

    // Exactamente lo que manda `editarReunionAction` cuando el usuario edita
    // SOLO el lugar sin tocar "¿Qué junta es?" en una junta sin clase, una
    // vez arreglado C2 (`datos.plantilla` llega `''` del formulario,
    // `'' || null` es `null` — ver el comentario de esa acción).
    await editarReunion(id, { lugar: 'Sala 4', plantilla: null })

    const r = (await obtenerReunion(id))!
    expect(r.lugar).toBe('Sala 4')
    expect(r.plantilla).toBeNull()
    expect(r.plantilla).not.toBe('estatus-udn')
    expect(r.plantilla).not.toBe('')
  })
})

/**
 * CRÍTICO C1 (ronda 14-2, fix 3/4) — rama de Postgres.
 *
 * `reuniones.test.ts` corre contra el store en memoria (sin `DATABASE_URL`,
 * `hayDB()` real es falso en vitest) — el resto de este archivo nunca
 * ejercita la rama de Postgres de `editarReunion`. Mismo idioma que
 * `src/db/acuerdos.test.ts` (describe "rama Postgres"): un doble mínimo de
 * `db()` que solo sabe responder `select().from().where()` y
 * `update().set().where()`, más `cargarTemas` mockeada directamente (evita
 * que `obtenerReunion` —que `editarReunion` llama primero, para comprobar
 * que la reunión existe— dispare una segunda consulta real contra
 * `esquema.salas` que este doble no modela).
 *
 * Este test inspecciona el PARCHE (`columnas`) que de verdad le llega a
 * `.set()`: es la comprobación más directa de "qué columnas arma ese bloque"
 * — si `plantilla` no está en `columnas`, el `Object.assign` del doble ni la
 * toca, y el `expect` de abajo cae.
 */
describe('editarReunion — rama de Postgres: qué columnas arma de verdad el bloque de `columnas`', () => {
  interface FilaReunionDB {
    id: string
    salaSlug: string | null
    fecha: Date
    titulo: string
    tipo: 'semanal' | 'quincenal' | 'mensual'
    plantilla: string | null
    estado: 'agendada' | 'dada'
    noDadaEn: Date | null
    lugar: string | null
    alcance: string
    participantes: unknown
    updatedAt: Date
  }

  let fila: FilaReunionDB
  let parcheCapturado: Record<string, unknown> | undefined

  function dobleDB() {
    return {
      select() {
        return {
          from: (tabla: unknown) => ({
            where: () => {
              // `obtenerReunion` (llamado primero por `editarReunion`, y
              // también por el propio test al leer el resultado) consulta
              // `esquema.reuniones` y, aparte, `documentos`/`minutas`/
              // `archivos` para `tieneDocumento`/`tieneMinuta`/`archivos` —
              // sin ninguno en juego aquí, basta con la lista vacía para
              // cualquier tabla que no sea `reuniones`.
              if (tabla === esquema.reuniones) return Promise.resolve([{ ...fila }])
              return Promise.resolve([])
            },
          }),
        }
      },
      update(tabla: unknown) {
        return {
          set: (parche: Record<string, unknown>) => ({
            where: () => {
              if (tabla === esquema.reuniones) {
                parcheCapturado = parche
                Object.assign(fila, parche)
              }
              return Promise.resolve(undefined)
            },
          }),
        }
      },
    }
  }

  beforeEach(() => {
    fila = {
      id: 'r1', salaSlug: 'zeus', fecha: new Date('2026-08-19T16:00:00Z'),
      titulo: 'Estatus de agosto', tipo: 'mensual', plantilla: 'sync-comercial',
      estado: 'agendada', noDadaEn: null, lugar: null, alcance: 'todos',
      participantes: [], updatedAt: new Date('2026-08-01T00:00:00Z'),
    }
    parcheCapturado = undefined
    vi.spyOn(temasDB, 'cargarTemas').mockResolvedValue({})
    vi.spyOn(clienteDB, 'hayDB').mockReturnValue(true)
    vi.spyOn(clienteDB, 'db').mockReturnValue(dobleDB() as unknown as ReturnType<typeof clienteDB.db>)
  })

  afterEach(() => vi.restoreAllMocks())

  it('CRÍTICO C1: el UPDATE real manda la columna plantilla — hoy el bloque de columnas no la incluye, y el cambio se pierde en silencio', async () => {
    await editarReunion('r1', { plantilla: 'comite' })
    expect(parcheCapturado).toHaveProperty('plantilla', 'comite')
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
