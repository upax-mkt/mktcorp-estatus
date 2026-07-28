import { describe, it, expect, vi } from 'vitest'
import { generarMinuta } from './generar'

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
  it('sin molde propio, produce el correo de siempre: los cuatro bloques y la tabla', async () => {
    const r = await generarMinuta(sesion, 'transcripción de ejemplo', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.textoCorreo).toContain('Objetivo de la reunión')
    expect(r.textoCorreo).toContain('Temas generales y acuerdos')
    expect(r.textoCorreo).toContain('Acuerdos y accionables')
    expect(r.textoCorreo).toContain('Acción | Squad | Owner | Prioridad | Fecha compromiso')
    expect(r.textoCorreo).toContain('Próximos pasos')
  })

  it('incluye la URL de la sesión (link de la sala)', async () => {
    const r = await generarMinuta(sesion, 'x', clienteQueDevuelve(MINUTA_VALIDA))
    expect(r.textoCorreo).toContain('/sala/neracode')
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
