import { describe, it, expect, vi, afterEach } from 'vitest'
import { personasDeMonday, hayQueRefrescar, personaMasParecida } from './personas'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const RESPUESTA = {
  data: {
    users: [
      { id: '65476480', name: 'Franco Cruzat', email: 'franco.cruzat@upax.com.mx', enabled: true, is_guest: false },
      { id: '67757625', name: 'César Mejía Medina', email: 'julio.mejiam@upax.com.mx', enabled: true, is_guest: false },
      { id: '999', name: 'Alguien de fuera', email: 'x@proveedor.com', enabled: true, is_guest: true },
      { id: '888', name: 'Quien se fue', email: 'ex@upax.com.mx', enabled: false, is_guest: false },
    ],
  },
}

describe('personasDeMonday', () => {
  it('deja fuera a los invitados y a los desactivados', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(RESPUESTA)))))

    const gente = await personasDeMonday()

    expect(gente.map((p) => p.id)).toEqual(['67757625', '65476480'])
    expect(gente[0].nombre).toBe('César Mejía Medina')
  })

  it('viene ordenada por nombre, que es como se busca en una lista', async () => {
    vi.stubEnv('MONDAY_TOKEN', 'ficticio')
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(RESPUESTA)))))

    const gente = await personasDeMonday()

    expect(gente.map((p) => p.nombre)).toEqual(['César Mejía Medina', 'Franco Cruzat'])
  })
})

describe('hayQueRefrescar', () => {
  const ahora = new Date('2026-07-29T10:00:00Z')

  it('sin copia previa, sí', () => {
    expect(hayQueRefrescar(null, ahora)).toBe(true)
  })

  it('con una copia de hace media hora, no', () => {
    expect(hayQueRefrescar(new Date('2026-07-29T09:30:00Z'), ahora)).toBe(false)
  })

  it('con una copia de hace más de un día, sí', () => {
    expect(hayQueRefrescar(new Date('2026-07-28T09:00:00Z'), ahora)).toBe(true)
  })
})

describe('personaMasParecida', () => {
  const PERSONAS = [
    { id: '65476486', nombre: 'Iris Múgica', correo: 'iris.mugica@jansan.mx' },
    { id: '67757625', nombre: 'César Mejía Medina', correo: 'julio.mejiam@upax.com.mx' },
    { id: '11', nombre: 'Ana García López', correo: 'ana.gl@upax.com.mx' },
    { id: '12', nombre: 'Ana García Ruiz', correo: 'ana.gr@upax.com.mx' },
  ]

  it('nombre completo igual, sin acentos ni mayúsculas, es la persona', () => {
    expect(personaMasParecida('cesar mejia medina', PERSONAS)?.id).toBe('67757625')
  })

  it('sin segundo nombre o apellido materno, cae a primer nombre + apellido', () => {
    // La transcripción trae "César Medina" — sin el "Mejía" de en medio.
    expect(personaMasParecida('César Medina', PERSONAS)?.id).toBe('67757625')
  })

  it('sin ninguna coincidencia razonable, no sugiere a nadie', () => {
    expect(personaMasParecida('Fernando Ruiz', PERSONAS)).toBeNull()
  })

  it('nombre vacío, no sugiere a nadie', () => {
    expect(personaMasParecida('', PERSONAS)).toBeNull()
    expect(personaMasParecida('   ', PERSONAS)).toBeNull()
  })

  it('coincidencia ambigua (dos personas con el mismo primer nombre + apellido), no sugiere a nadie', () => {
    // "Ana García" solo, sin segundo apellido, calza con las dos por igual —
    // no es evidente cuál, así que no se sugiere ninguna.
    expect(personaMasParecida('Ana García', PERSONAS)).toBeNull()
  })

  it('con el segundo apellido si lo trae la transcripción, deja de ser ambiguo', () => {
    expect(personaMasParecida('Ana García Ruiz', PERSONAS)?.id).toBe('12')
  })
})
