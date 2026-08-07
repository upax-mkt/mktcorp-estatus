import { describe, it, expect, vi } from 'vitest'
import { generarMinuta } from './generar'
import { MOLDE_POR_DEFECTO } from './molde'

const sesion = {
  salaSlug: 'neracode',
  salaNombre: 'NeraCode',
  tipo: 'mensual' as const,
  alcance: 'todos',
  fecha: '2026-07-24T12:00:00.000Z',
}

function clienteQueDevuelve(minuta: unknown) {
  return { messages: { parse: vi.fn().mockResolvedValue({ parsed_output: minuta, stop_reason: 'end_turn' }) } }
}

const MINUTA_VALIDA = {
  bloques: ['El objetivo de la reunión.', 'Se revisó el avance de campañas', 'Se discutió la nueva propuesta de valor', 'Lo que sigue.'],
  acuerdosPropuestos: [
    {
      que: 'Presentar nuevas palabras clave y segmentos',
      responsable: 'Fernando Borges',
      squad: 'Performance',
      prioridad: 'alta',
      fechaCompromiso: '2026-08-01',
    },
    {
      que: 'Construir la nueva propuesta de valor',
      responsable: 'por asignar',
      prioridad: 'media',
      fechaCompromiso: null,
    },
  ],
}

describe('generarMinuta', () => {
  it('produce el correo con su entradilla, sus cuatro bloques, la tabla y el cierre', async () => {
    const r = await generarMinuta(sesion, 'transcripción de ejemplo', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.textoCorreo).toContain('Objetivo de la reunión')
    expect(r.textoCorreo).toContain('Temas generales y acuerdos')
    expect(r.textoCorreo).toContain('Acuerdos y accionables')
    expect(r.textoCorreo).toContain('Acción | Owner | Fecha')
    expect(r.textoCorreo).toContain('Próximos pasos')
    // La entradilla dice DE QUÉ es la minuta: sin ella, quien la abre tres
    // semanas después no sabe de qué reunión le hablan.
    expect(r.textoCorreo).toContain('Les comparto la minuta')
    expect(r.textoCorreo).toContain('NeraCode')
    expect(r.textoCorreo).toContain('con gusto lo revisamos')
  })

  it('incluye la URL de la sesión (link de la sala)', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.textoCorreo).toContain('/cliente/neracode')
  })

  it('marca "por definir" en la tabla cuando el acuerdo no trae fecha, sin inventarla', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.textoCorreo).toContain('por definir')
  })

  it('devuelve los acuerdos propuestos estructurados, sin publicarlos', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.acuerdosPropuestos).toHaveLength(2)
    expect(r.acuerdosPropuestos[1].fechaCompromiso).toBeNull()
  })

  it('lanza si la transcripción viene vacía, sin llamar al modelo', async () => {
    const cliente = clienteQueDevuelve(MINUTA_VALIDA)
    await expect(generarMinuta(sesion, '   ', cliente)).rejects.toThrow(/transcripción/i)
    expect(cliente.messages.parse).not.toHaveBeenCalled()
  })

  it('lanza un error claro si el modelo no devuelve una minuta (parsed_output nulo)', async () => {
    const cliente = { messages: { parse: vi.fn().mockResolvedValue({ parsed_output: null, stop_reason: 'refusal' }) } }
    await expect(generarMinuta(sesion, 'x', cliente)).rejects.toThrow(/no devolvió|refus/i)
  })

  it('rechaza una minuta con estilo colado aunque el modelo la haya devuelto (candado TextoPlano)', async () => {
    const conMarkup = { ...MINUTA_VALIDA, bloques: ['**Revisar** el avance del mes', 'x', 'y', 'z'] }
    await expect(generarMinuta(sesion, 'x', clienteQueDevuelve(conMarkup))).rejects.toThrow()
  })

  it('no reescribe "que"/"responsable" de los acuerdos que sí traen fecha', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.acuerdosPropuestos[0].que).toBe('Presentar nuevas palabras clave y segmentos')
    expect(r.acuerdosPropuestos[0].responsable).toBe('Fernando Borges')
  })
})

/**
 * EL HALLAZGO (ronda 11, tarea 1): `ensamblarCorreo` ya arma el correo con dos
 * piezas separadas — la prosa (`bloques`) y la tabla (derivada de los
 * acuerdos). Hoy `MinutaCliente.tsx` solo recibía el texto YA ENSAMBLADO y
 * guardaba los acuerdos aparte: desmarcar uno no volvía a armar el texto.
 *
 * El arreglo: `generarMinuta` (y `generarMinutaAction`, que lo envuelve)
 * también devuelve los `bloques` crudos y los INSUMOS con los que se armó el
 * correo (`salaSlug`, `molde`, `reunionId`, `contexto`) — todo lo que
 * `ensamblarCorreo` necesita para que el CLIENTE pueda volver a llamarlo cada
 * vez que cambian los acuerdos o se edita un bloque, sin volver a llamar al
 * modelo.
 */
describe('generarMinuta — lo que necesita el cliente para rearmar el correo sin llamar al modelo', () => {
  it('devuelve los bloques crudos, en el mismo orden que los escribió el modelo', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.bloques).toEqual(MINUTA_VALIDA.bloques)
  })

  it('devuelve los insumos —salaSlug, molde, contexto— con los que se armó el textoCorreo', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.insumosCorreo.salaSlug).toBe('neracode')
    expect(r.insumosCorreo.molde).toEqual(MOLDE_POR_DEFECTO)
    expect(r.insumosCorreo.reunionId).toBeUndefined() // esta `sesion` de prueba no trae `id`
    expect(r.insumosCorreo.contexto.reunion).toContain('NeraCode')
  })

  it('con un id de reunión, lo devuelve en los insumos (para el enlace de la sala)', async () => {
    const r = await generarMinuta({ ...sesion, id: 'reu-123' }, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.insumosCorreo.reunionId).toBe('reu-123')
  })

  it('con un molde propio, los insumos traen ESE molde, no el de siempre', async () => {
    const moldePropio = {
      saludo: 'Estimados,', entradilla: '', cierre: '', conEnlace: false,
      bloques: [{ titulo: 'Qué se decidió', guia: '' }, { titulo: 'Compromisos', guia: '', conTabla: true }],
    }
    const minutaDeUnBloque = { ...MINUTA_VALIDA, bloques: ['Se aprobó el presupuesto.'] }
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(minutaDeUnBloque), moldePropio)
    expect(r.insumosCorreo.molde).toBe(moldePropio)
  })
})

describe('generarMinuta — corrección del equipo, al regenerar', () => {
  it('cuando se pasa una corrección, viaja al modelo junto con la transcripción', async () => {
    const cliente = clienteQueDevuelve(MINUTA_VALIDA)
    await generarMinuta(sesion, 'transcripción original', cliente, undefined, 'Fernando no Fernanda, fue Iris quien se comprometió')
    const llamada = cliente.messages.parse.mock.calls[0][0] as { messages: Array<{ content: string }> }
    expect(llamada.messages[0].content).toContain('Fernando no Fernanda, fue Iris quien se comprometió')
    expect(llamada.messages[0].content).toContain('transcripción original')
  })

  it('sin corrección, el mensaje al modelo es idéntico al de siempre (no se le añade nada de más)', async () => {
    const cliente = clienteQueDevuelve(MINUTA_VALIDA)
    await generarMinuta(sesion, 'x', cliente)
    const llamada = cliente.messages.parse.mock.calls[0][0] as { messages: Array<{ content: string }> }
    expect(llamada.messages[0].content.toUpperCase()).not.toContain('CORRECCIÓN')
  })
})
