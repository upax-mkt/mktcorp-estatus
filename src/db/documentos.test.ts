import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * MISMO PATRÓN QUE `src/db/reuniones.test.ts` y `src/db/sesiones.test.ts`
 * (léelos antes de tocar esto): `salaEstaActiva` va mockeada porque el store
 * en memoria no modela la tabla `salas` ni su columna `activa`. El resto del
 * módulo (`./store-memoria`, `./esquema`, `./reuniones`, `./acuerdos`) sigue
 * siendo el real.
 */

const salaEstaActivaMock = vi.fn()
vi.mock('./salas', () => ({
  salaEstaActiva: (...args: unknown[]) => salaEstaActivaMock(...args),
}))

const {
  crearDocumento, documentoDeReunion, marcarListo, crearReunionConDocumento, eliminarDocumentoDeReunion,
  guardarItemContenido, guardarSeccion, anadirSeccion, eliminarSeccion, reordenarItems, moverItem,
  guardarDecisiones, esLlenado, itemDeAcuerdosPendientes, anadirAcuerdoRetomado, entradasCrudasDeDocumento,
  parsearCifrasTexto, formatearCifrasTexto, parsearTablaTexto, formatearTablaTexto,
} = await import('./documentos')
const { crearReunion, obtenerReunion, eliminarReunion } = await import('./reuniones')
const { crearAcuerdo } = await import('./acuerdos')
// Import dinámico como el resto del archivo: los mocks de arriba se izan.
const { RAZON_MANUAL } = await import('@/secciones/borrador')
const {
  reiniciarStoreMemoria, obtenerAcuerdoMemoria, actualizarContenidoItemMemoria, actualizarDecisionItemMemoria,
} = await import('./store-memoria')

beforeEach(() => {
  reiniciarStoreMemoria()
  salaEstaActivaMock.mockReset().mockResolvedValue(true)
})

describe('documentoDeReunion', () => {
  it('una reunión tiene como mucho un documento — la base lo impide, no el código', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await crearDocumento(id)
    await expect(crearDocumento(id)).rejects.toThrow()
  })

  it('una reunión puede no tener documento: el PDF también es una presentación', async () => {
    const { id } = await crearReunion({ salaSlug: 'research-land', fecha: new Date(), titulo: 'Quincenal Comercial', tipo: 'quincenal' })
    expect(await documentoDeReunion(id)).toBeNull()
  })

  it('el documento nace en borrador y pasa a listo, y eso no dice nada de si la junta se dio', async () => {
    const { id } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const doc = await crearDocumento(id)
    expect((await documentoDeReunion(id))!.estado).toBe('borrador')
    await marcarListo(doc.id)
    expect((await documentoDeReunion(id))!.estado).toBe('listo')
    expect((await obtenerReunion(id))!.estado).toBe('agendada')
  })
})

/**
 * `crearReunionConDocumento` sustituye a la vieja `crearSesionConEstructura`
 * (sesiones.ts:454) — mismo comportamiento de plantilla, adaptado a que
 * `DatosDeReunion.salaSlug` (reuniones.ts, Tarea 4) ya NO admite `null`: "una
 * reunión sin sala" (comité, arranque de campaña) queda fuera del modelo
 * nuevo por ahora — es una limitación heredada de la T4, no algo que esta
 * tarea introduzca o deba resolver (ver el reporte).
 */
describe('crearReunionConDocumento', () => {
  it('nace con las secciones de SU plantilla, no con las de estatus-udn', async () => {
    const { reunionId, documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Comité', tipo: 'mensual', plantilla: 'comite',
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.id).toBe(documentoId)
    expect(documento.items.map((i) => i.titulo)).toEqual([
      'Portada', 'La situación', 'Las opciones', 'Lo que se pide', 'Cierre',
    ])
  })

  it('la de "en blanco" arranca con una sola sección', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Libre', tipo: 'mensual', plantilla: 'en-blanco',
    })
    expect((await documentoDeReunion(reunionId))!.items).toHaveLength(1)
  })

  it('sin plantilla sigue naciendo como estatus de UDN: el flujo viejo no cambia', async () => {
    const { reunionId, documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual',
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items).toHaveLength(8)
    expect(documento.plantilla).toBe('estatus-udn')
    // El documento nace en 'borrador'; la junta, 'agendada' — dos preguntas
    // distintas desde que el spec §1 separó las dos vidas de la vieja sesión.
    expect(documento.estado).toBe('borrador')
    expect((await obtenerReunion(reunionId))!.estado).toBe('agendada')
    void documentoId
  })

  it('sin título propio se pone uno legible, no una cadena vacía', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date('2026-08-19T16:00:00Z'), titulo: '', tipo: 'mensual',
    })
    expect((await obtenerReunion(reunionId))!.titulo).toMatch(/agosto/i)
  })

  /**
   * EL BUG PREEXISTENTE DE `tituloPorDefecto` (sesiones.ts:186), arreglado al
   * mudarlo: sin fijar `timeZone`, `toLocaleDateString` usa la zona del
   * PROCESO. En Vercel eso es UTC, así que una junta creada un día 31 a las
   * 19:00 CDMX —que ya es la 01:00 UTC del día 1 siguiente— recibía el mes
   * SIGUIENTE en su título. Aquí se ancla con `fechaCompleta`
   * (src/lib/fecha.ts, misma familia de helpers que `diaCivil`), así que el
   * resultado no depende de en qué zona corra el proceso que ejecuta este
   * test — ahora a nivel de DÍA, no solo de mes (ver el describe de abajo,
   * "dos reuniones... el día las distingue").
   */
  it('ancla el día por defecto a CDMX, no al proceso: el 31 a las 19:00 CDMX no cruza a agosto', async () => {
    // 31-jul-2026 19:00 CDMX (UTC-6) = 01:00 UTC del 1-ago-2026.
    const fecha = new Date('2026-08-01T01:00:00.000Z')
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha, titulo: '', tipo: 'mensual',
    })
    expect((await obtenerReunion(reunionId))!.titulo).toBe('Estatus mensual · 31 de julio de 2026')
  })

  it('un título en blanco (solo espacios) también cae en el título por defecto', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date('2026-08-01T01:00:00.000Z'), titulo: '   ', tipo: 'mensual',
    })
    expect((await obtenerReunion(reunionId))!.titulo).toBe('Estatus mensual · 31 de julio de 2026')
  })

  it('una sala en pausa no admite crear la reunión (el freeze de crearReunion se respeta)', async () => {
    salaEstaActivaMock.mockResolvedValue(false)
    await expect(
      crearReunionConDocumento({ salaSlug: 'neracode', fecha: new Date(), titulo: 'x', tipo: 'mensual' }),
    ).rejects.toThrow(/pausada/i)
  })

  /**
   * HALLAZGO DE LA AUDITORÍA UX/UI (ronda 11): "el título de una reunión no
   * dice de qué es". Caso real — Research Land tiene dos quincenales
   * distintas en la MISMA sala, Comercial y Digital; con el título por
   * defecto viejo ("Estatus {tipo} · {Mes}") las dos nacían IDÉNTICAS
   * ("Estatus quincenal · Agosto de 2026") en cualquier lista. Estos dos
   * tests son el contrato de la corrección: uno prueba que un título escrito
   * a mano SOBREVIVE sin que el derivado lo pise; el otro, que el derivado ya
   * no colisiona para el caso real que motivó el arreglo.
   */
  it('un título escrito a mano sobrevive: el derivado no lo pisa', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'research-land',
      fecha: new Date('2026-08-03T16:00:00Z'),
      titulo: 'Estatus Comercial Quincenal',
      tipo: 'quincenal',
    })
    expect((await obtenerReunion(reunionId))!.titulo).toBe('Estatus Comercial Quincenal')
  })

  it('dos reuniones de la misma sala y tipo en el mismo mes ya no comparten título por defecto — el día las distingue (caso real: Comercial vs. Digital de Research Land)', async () => {
    const { reunionId: comercial } = await crearReunionConDocumento({
      salaSlug: 'research-land', fecha: new Date('2026-08-03T16:00:00Z'), titulo: '', tipo: 'quincenal',
    })
    const { reunionId: digital } = await crearReunionConDocumento({
      salaSlug: 'research-land', fecha: new Date('2026-08-17T16:00:00Z'), titulo: '', tipo: 'quincenal',
    })

    const tituloComercial = (await obtenerReunion(comercial))!.titulo
    const tituloDigital = (await obtenerReunion(digital))!.titulo

    expect(tituloComercial).not.toBe(tituloDigital)
    expect(tituloComercial).toBe('Estatus quincenal · 3 de agosto de 2026')
    expect(tituloDigital).toBe('Estatus quincenal · 17 de agosto de 2026')
  })
})

describe('qué se puede borrar de un documento', () => {
  it('en un estatus de UDN, sus ocho bloques no se borran', async () => {
    const { reunionId, documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual', plantilla: 'estatus-udn',
    })
    const documento = (await documentoDeReunion(reunionId))!
    const revops = documento.items.find((i) => i.tipo === 'revops')!
    expect(revops.esBase).toBe(true)
    await expect(eliminarSeccion(documentoId, revops.id)).rejects.toThrow(/sección base/i)
    expect((await documentoDeReunion(reunionId))!.items).toHaveLength(8)
  })

  it('en un documento libre, cualquier sección se puede quitar', async () => {
    const { reunionId, documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Comité', tipo: 'mensual', plantilla: 'comite',
    })
    const documento = (await documentoDeReunion(reunionId))!
    const opciones = documento.items.find((i) => i.tipo === 'opciones')!
    expect(opciones.esBase).toBe(false)

    await eliminarSeccion(documentoId, opciones.id)
    const despues = (await documentoDeReunion(reunionId))!
    expect(despues.items.map((i) => i.tipo)).not.toContain('opciones')
  })
})

describe('eliminarDocumentoDeReunion — la herencia de la T4 (eliminarReunion con documento)', () => {
  it('eliminarReunion, con el callback, borra el documento y sus items — y los acuerdos sobreviven con su clave en null', async () => {
    const { id: reunionId } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    const { id: documentoId } = await crearDocumento(reunionId)
    await anadirSeccion(documentoId, 'texto-multicolumna', 'Una sección')
    const acuerdo = await crearAcuerdo('neracode', {
      que: 'Cruce de paid media', responsable: 'Fernando', fechaCompromiso: null, reunionOrigenId: reunionId,
    })

    await eliminarReunion(reunionId, eliminarDocumentoDeReunion)

    expect(await documentoDeReunion(reunionId)).toBeNull()
    const vivo = obtenerAcuerdoMemoria(acuerdo.id)
    expect(vivo).not.toBeNull()
    expect(vivo!.reunionOrigenId).toBeNull() // la clave ajena se anula, no cascada
  })

  it('sin documento, eliminarReunion sin callback se comporta exactamente igual que antes', async () => {
    const { id: reunionId } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await eliminarReunion(reunionId)
    expect(await obtenerReunion(reunionId)).toBeNull()
  })

  it('con documento y SIN el callback, eliminarReunion avisa con un mensaje de dominio en vez de dejar un huérfano en silencio', async () => {
    const { id: reunionId } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await crearDocumento(reunionId)
    await expect(eliminarReunion(reunionId)).rejects.toThrow(/documento/i)
    // Ni la reunión ni el documento se tocaron: falló ANTES de borrar nada.
    expect(await obtenerReunion(reunionId)).not.toBeNull()
    expect(await documentoDeReunion(reunionId)).not.toBeNull()
  })

  it('una reunión sin documento: eliminarDocumentoDeReunion es un no-op honesto', async () => {
    const { id: reunionId } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual' })
    await expect(eliminarDocumentoDeReunion(reunionId)).resolves.toBeUndefined()
  })
})

async function documentoEstatus() {
  const { reunionId, documentoId } = await crearReunionConDocumento({
    salaSlug: 'neracode', fecha: new Date(), titulo: 'Mensual', tipo: 'mensual',
  })
  return { reunionId, documentoId }
}

describe('subsecciones', () => {
  it('entran dentro de su bloque, justo antes del siguiente', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    const performance = antes.items.find((i) => i.tipo === 'performance-conversion')!

    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', performance.tipo)

    const documento = (await documentoDeReunion(reunionId))!
    const posiciones = documento.items.map((i) => i.titulo)
    expect(posiciones.indexOf('Sitio web')).toBe(posiciones.indexOf('Performance & Conversión') + 1)
    expect(documento.items.find((i) => i.titulo === 'Sitio web')!.padre).toBe('performance-conversion')
  })

  it('borrar un bloque añadido se lleva sus subsecciones, sin dejar huérfanas', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirSeccion(documentoId, 'divisor-seccion', 'Temporal')
    const conBloque = (await documentoDeReunion(reunionId))!
    const bloque = conBloque.items.find((i) => i.titulo === 'Temporal')!
    await anadirSeccion(documentoId, 'kpis-fila-dos-columnas', 'Dentro', bloque.tipo)
    expect((await documentoDeReunion(reunionId))!.items).toHaveLength(10)

    await eliminarSeccion(documentoId, bloque.id)

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items).toHaveLength(8)
    expect(documento.items.some((i) => i.titulo === 'Dentro')).toBe(false)
  })
})

describe('mover y reordenar secciones', () => {
  it('una subsección se mueve DENTRO de su bloque, no se escapa al siguiente', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const padre = 'performance-conversion'
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', padre)
    await anadirSeccion(documentoId, 'kpis-fila-dos-columnas', 'Paid media', padre)

    const antes = (await documentoDeReunion(reunionId))!
    const paid = antes.items.find((i) => i.titulo === 'Paid media')!
    await moverItem(documentoId, paid.id, 'arriba')

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.filter((i) => i.padre === padre).map((i) => i.titulo)).toEqual(['Paid media', 'Sitio web'])
    expect(documento.items.find((i) => i.titulo === 'Paid media')!.padre).toBe(padre)
  })

  it('reordenar los bloques recoloca también sus subsecciones', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirSeccion(documentoId, 'grafico-y-tabla', 'Sitio web', 'performance-conversion')
    const antes = (await documentoDeReunion(reunionId))!
    const bases = antes.items.filter((i) => !i.padre)

    const nuevoOrden = [bases[bases.length - 1].id, ...bases.slice(0, -1).map((b) => b.id)]
    await reordenarItems(documentoId, nuevoOrden)

    const titulos = (await documentoDeReunion(reunionId))!.items.map((i) => i.titulo)
    expect(titulos[0]).toBe('Outbound & Pipeline')
    expect(titulos.indexOf('Sitio web')).toBe(titulos.indexOf('Performance & Conversión') + 1)
  })

  it('una lista que no son los bloques exactos se ignora: llega del navegador', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    await reordenarItems(documentoId, ['inventado-1', 'inventado-2'])
    const despues = (await documentoDeReunion(reunionId))!
    expect(despues.items.map((i) => i.id)).toEqual(antes.items.map((i) => i.id))
  })
})

describe('el título del bloque manda sobre el nombre de plantilla', () => {
  it('en la lista se lee lo que escribió el equipo', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    const revops = antes.items.find((i) => i.tipo === 'revops')!
    await guardarSeccion(documentoId, revops.id, { layout: 'divisor-seccion', titulo: 'RevOps · higiene de datos' })

    const documento = (await documentoDeReunion(reunionId))!
    expect(documento.items.find((i) => i.tipo === 'revops')!.titulo).toBe('RevOps · higiene de datos')
  })

  it('guardarSeccion contra un item que no existe avisa en vez de fallar en silencio', async () => {
    const { documentoId } = await documentoEstatus()
    await expect(
      guardarSeccion(documentoId, 'no-existe', { layout: 'divisor-seccion', titulo: 'x' }),
    ).rejects.toThrow(/no encontrada/i)
  })
})

describe('esLlenado', () => {
  it('vacío sin nada escrito', () => {
    expect(esLlenado({})).toBe(false)
    expect(esLlenado(undefined)).toBe(false)
  })

  it('una tabla o una imagen SOLA ya es contenido real, sin una línea de texto al lado', () => {
    expect(esLlenado({ tablas: [[['a', 'b']]] })).toBe(true)
    expect(esLlenado({ imagenes: ['/x.png'] })).toBe(true)
  })

  it('cifras y texto también cuentan', () => {
    expect(esLlenado({ texto: 'algo' })).toBe(true)
    expect(esLlenado({ cifras: [{ valor: '1', rotulo: 'x' }] })).toBe(true)
  })
})

describe('guardarDecisiones', () => {
  it('guarda una decisión por item llenado, en el mismo orden que entradasCrudasDeDocumento, y marca el documento listo', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    const portada = antes.items.find((i) => i.tipo === 'portada')!
    await guardarSeccion(documentoId, portada.id, { layout: 'portada', titulo: 'Estatus NeraCode' })

    const conContenido = (await documentoDeReunion(reunionId))!
    expect(conContenido.estado).toBe('borrador')
    const entradas = entradasCrudasDeDocumento(conContenido)
    expect(entradas).toHaveLength(1)

    const resultado = {
      decision: { layout: 'portada' as const, titulo: 'Estatus NeraCode', razon: 'x' },
      degradado: false,
    }
    await guardarDecisiones(documentoId, [resultado])

    const despues = (await documentoDeReunion(reunionId))!
    expect(despues.estado).toBe('listo')

    /**
     * LO QUE SE LEE NO ES LA FOTO GUARDADA, ES EL CONTENIDO DE AHORA.
     *
     * Esta sección está COMPUESTA A MANO, y su maquetado es una función pura
     * de su borrador (`maquetarBorrador`, determinista y sin red). Así que al
     * leer se recalcula en vez de servir `decision_maquetacion`: por eso la
     * `razon` que vuelve es la de una sección compuesta a mano y no la "x"
     * que se guardó.
     *
     * No es un detalle: antes el documento servía la última foto y las
     * ediciones posteriores no aparecían hasta volver a pulsar "Generar la
     * presentación", sin que nada lo dijera. Franco: "cuando aprieto «ver
     * documento» me debería mostrar el preview".
     */
    const leida = despues.items.find((i) => i.tipo === 'portada')!.resultado!
    expect(leida.degradado).toBe(false)
    expect(leida.decision.titulo).toBe('Estatus NeraCode')
    expect(leida.decision.layout).toBe('portada')
    expect(leida.decision.razon).toBe(RAZON_MANUAL)
  })

  /**
   * La contracara: en una sección del camino ASISTIDO (sin `seccion` en su
   * contenido crudo) recalcular exigiría volver a llamar al modelo, así que
   * ahí la foto guardada sigue mandando.
   */
  it('en una sección del camino asistido SÍ manda la decisión guardada', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    const portada = antes.items.find((i) => i.tipo === 'portada')!
    // Texto crudo y NADA de `seccion`: es el camino asistido.
    await guardarItemContenido(documentoId, portada.id, { texto: 'material pegado' })

    const resultado = {
      decision: { layout: 'portada' as const, titulo: 'Lo que propuso la IA', razon: 'porque sí' },
      degradado: false,
    }
    await guardarDecisiones(documentoId, [resultado])

    const despues = (await documentoDeReunion(reunionId))!
    const leida = despues.items.find((i) => i.tipo === 'portada')!.resultado!
    expect(leida.decision.titulo).toBe('Lo que propuso la IA')
    expect(leida.decision.razon).toBe('porque sí')
  })

  it('un número de resultados que no coincide con los items llenados revienta con un mensaje claro', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    const portada = antes.items.find((i) => i.tipo === 'portada')!
    // Un item llenado (la portada) y CERO resultados: el desajuste que debe rechazarse.
    await guardarSeccion(documentoId, portada.id, { layout: 'portada', titulo: 'x' })
    await expect(guardarDecisiones(documentoId, [])).rejects.toThrow(/no coincide/)
  })

  it('un documento inexistente revienta con un mensaje claro', async () => {
    await expect(guardarDecisiones('no-existe', [])).rejects.toThrow(/no encontrado/i)
  })
})

describe('itemDeAcuerdosPendientes', () => {
  it('encuentra la sección fija de un estatus de UDN por su tipo', async () => {
    const { reunionId } = await documentoEstatus()
    const documento = (await documentoDeReunion(reunionId))!
    const item = itemDeAcuerdosPendientes(documento)
    expect(item?.tipo).toBe('acuerdos-pendientes')
    expect(item?.titulo).toBe('Acuerdos y Pendientes')
  })

  it('sin esa sección fija ni ninguna pendientes-semaforo, no hay dónde aterrizar', async () => {
    const { reunionId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Libre', tipo: 'mensual', plantilla: 'en-blanco',
    })
    const documento = (await documentoDeReunion(reunionId))!
    expect(itemDeAcuerdosPendientes(documento)).toBeUndefined()
  })
})

describe('anadirAcuerdoRetomado', () => {
  it('referencia el id en la sección de Acuerdos y Pendientes: guarda el id, no el texto', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const documento = (await documentoDeReunion(reunionId))!
    const item = itemDeAcuerdosPendientes(documento)!
    expect(item.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1'])
  })

  it('es idempotente: retomar el mismo acuerdo dos veces no lo duplica en la lista', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')
    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const documento = (await documentoDeReunion(reunionId))!
    expect(itemDeAcuerdosPendientes(documento)!.contenido.acuerdoIdsRetomados).toEqual(['acuerdo-1'])
  })

  it('sin una sección de Acuerdos y Pendientes en el documento, avisa en vez de fallar en silencio', async () => {
    const { documentoId } = await crearReunionConDocumento({
      salaSlug: 'neracode', fecha: new Date(), titulo: 'Libre', tipo: 'mensual', plantilla: 'en-blanco',
    })
    await expect(anadirAcuerdoRetomado(documentoId, 'acuerdo-1')).rejects.toThrow(/Acuerdos y Pendientes/)
  })

  it('un documento inexistente revienta con un mensaje claro', async () => {
    await expect(anadirAcuerdoRetomado('no-existe', 'acuerdo-1')).rejects.toThrow('Documento no encontrado')
  })

  it('un acuerdo retomado, y nada más, ya cuenta como la sección llenada — por eso entra a "Maquetar"', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = itemDeAcuerdosPendientes((await documentoDeReunion(reunionId))!)!
    expect(antes.llenado).toBe(false)

    await anadirAcuerdoRetomado(documentoId, 'acuerdo-1')

    const documento = (await documentoDeReunion(reunionId))!
    const despues = itemDeAcuerdosPendientes(documento)!
    expect(despues.llenado).toBe(true)
    expect(entradasCrudasDeDocumento(documento).some((e) => e.titulo === 'Acuerdos y Pendientes')).toBe(true)
  })
})

describe('guardarItemContenido', () => {
  it('persiste el contenido crudo tal cual, sin tocar decisionMaquetacion', async () => {
    const { reunionId, documentoId } = await documentoEstatus()
    const antes = (await documentoDeReunion(reunionId))!
    const portada = antes.items.find((i) => i.tipo === 'portada')!

    await guardarItemContenido(documentoId, portada.id, { texto: 'Contenido libre' })

    const documento = (await documentoDeReunion(reunionId))!
    const item = documento.items.find((i) => i.tipo === 'portada')!
    expect(item.contenido.texto).toBe('Contenido libre')
    expect(item.resultado).toBeNull()
  })
})

describe('parsearCifrasTexto / formatearCifrasTexto', () => {
  it('lee valor, rótulo y delta, y descarta la línea sin rótulo', () => {
    const cifras = parsearCifrasTexto('29k | Impresiones | -16%\nsin rótulo\n1,200 | Leads')
    expect(cifras).toEqual([
      { valor: '29k', rotulo: 'Impresiones', delta: '-16%' },
      { valor: '1,200', rotulo: 'Leads', delta: undefined },
    ])
  })

  it('ida y vuelta: lo que se formatea se vuelve a parsear igual', () => {
    const original = [{ valor: '29k', rotulo: 'Impresiones', delta: '-16%' }]
    expect(parsearCifrasTexto(formatearCifrasTexto(original))).toEqual(original)
  })

  it('sin cifras, el campo se muestra vacío', () => {
    expect(formatearCifrasTexto(undefined)).toBe('')
    expect(formatearCifrasTexto([])).toBe('')
  })
})

describe('parsearTablaTexto / formatearTablaTexto', () => {
  it('lee una tabla pegada desde Sheets (celdas separadas por tabulador)', () => {
    expect(parsearTablaTexto('\tMayo\tJunio\nImpresiones\t100\t200')).toEqual([
      ['', 'Mayo', 'Junio'],
      ['Impresiones', '100', '200'],
    ])
  })

  it('cuadra las filas al ancho del encabezado', () => {
    expect(parsearTablaTexto('a|b|c\nx|y')).toEqual([
      ['a', 'b', 'c'],
      ['x', 'y', ''],
    ])
  })

  it('sin tabla, el campo se muestra vacío', () => {
    expect(formatearTablaTexto(undefined)).toBe('')
    expect(formatearTablaTexto([])).toBe('')
  })
})

/**
 * `imagen` VIVÍA COMO UNA URL SUELTA antes de la ronda 9, tarea 7 — no como
 * el objeto `{ url, anchoPorcentaje?, alineacion? }` de hoy.
 * `contenidoCrudo`/`decisionMaquetacion` son `jsonb` sin validar al leer, así
 * que una fila guardada con la forma vieja sigue en la base con esa forma:
 * en producción, la sesión de NeraCode "cd2e793b-…" — item "La pieza que
 * mejor funcionó" — es exactamente este caso. Migrado tal cual desde
 * `sesiones.test.ts` (ver el brief de la T5: este describe se muda aquí).
 */
describe('imagen con la forma vieja (string) sigue en la base — se normaliza al leer', () => {
  async function documentoConImagenVieja() {
    const { id: reunionId } = await crearReunion({ salaSlug: 'neracode', fecha: new Date(), titulo: 'x', tipo: 'mensual' })
    const { id: documentoId } = await crearDocumento(reunionId)
    const { itemId } = await anadirSeccion(documentoId, 'imagen-a-sangre', 'La pieza que mejor funcionó')
    actualizarContenidoItemMemoria(itemId, {
      seccion: { layout: 'imagen-a-sangre', titulo: 'La pieza que mejor funcionó', imagen: '/logos/neracode-color.png' },
    })
    // `decisionMaquetacion` guarda un `ResultadoMaquetacion` —
    // `{ decision: {...}, degradado, motivo? }`—, no la `DecisionSlide`
    // suelta: así la escribe `guardarDecisiones` y así está la fila real en
    // producción, confirmado leyendo `decision_maquetacion->'decision'->>'imagen'`.
    actualizarDecisionItemMemoria(itemId, {
      degradado: false,
      decision: {
        layout: 'imagen-a-sangre',
        titulo: 'La pieza que mejor funcionó',
        razon: 'Sección compuesta por el equipo de Marketing Corporativo.',
        imagen: '/logos/neracode-color.png',
      },
    })
    return reunionId
  }

  it('el borrador del editor (contenido.seccion.imagen) llega como objeto, no como string', async () => {
    const reunionId = await documentoConImagenVieja()
    const documento = await documentoDeReunion(reunionId)
    const item = documento!.items.find((i) => i.titulo === 'La pieza que mejor funcionó')!
    expect(item.contenido.seccion?.imagen).toEqual({ url: '/logos/neracode-color.png' })
  })

  it('la decisión ya maquetada (resultado.decision.imagen) llega como objeto, no como string', async () => {
    const reunionId = await documentoConImagenVieja()
    const documento = await documentoDeReunion(reunionId)
    const item = documento!.items.find((i) => i.titulo === 'La pieza que mejor funcionó')!
    expect(item.resultado?.decision.imagen).toEqual({ url: '/logos/neracode-color.png' })
  })

  it('el objeto normalizado tiene `url` de verdad: el tirador ya no lo puede descomponer en caracteres', async () => {
    const reunionId = await documentoConImagenVieja()
    const documento = await documentoDeReunion(reunionId)
    const item = documento!.items.find((i) => i.titulo === 'La pieza que mejor funcionó')!
    const conAncho = { ...item.contenido.seccion!.imagen, anchoPorcentaje: 60 }
    expect(conAncho).toEqual({ url: '/logos/neracode-color.png', anchoPorcentaje: 60 })
  })
})
