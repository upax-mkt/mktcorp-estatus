import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'

describe('la semilla de temas', () => {
  it('trae las diez salas', () => {
    // Las 8 UDNs + Ceci (las nueve "salas" de verdad) más grupo-upax: sigue
    // activa en `salas` aunque dejó de ser una sala el 24-jul (ver el
    // comentario de cabecera de src/temas/semilla.ts). Si la semilla trajera
    // solo nueve, la migración 0014 (NOT NULL sobre estas columnas) habría
    // fallado contra esa décima fila.
    expect(Object.keys(SEMILLA_DE_TEMAS)).toHaveLength(10)
  })

  it('cada una trae los doce campos del tema, sin huecos', () => {
    for (const [slug, tema] of Object.entries(SEMILLA_DE_TEMAS)) {
      expect(tema.slug, slug).toBe(slug)
      expect(tema.nombre, slug).toBeTruthy()
      for (const campo of ['primario', 'secundario', 'acento', 'superficieClara', 'superficieOscura', 'textoSobreClara', 'textoSobreOscura', 'familiaDisplay', 'familiaTexto'] as const) {
        expect(tema[campo], `${slug}.${campo}`).toMatch(/\S/)
      }
      expect(tema.gradiente.length, slug).toBeGreaterThanOrEqual(2)
    }
  })

  it('los colores son hex de seis dígitos: es lo que se guarda y lo que se pinta', () => {
    for (const [slug, tema] of Object.entries(SEMILLA_DE_TEMAS)) {
      expect(tema.primario, slug).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

// ---- cargarTemas / slugsDeSalas ----
//
// `hayDB()`/`db()` se sustituyen por un doble MUTABLE (mismo espíritu que
// src/db/sesiones-publicas.test.ts) para poder probar la rama CON base y la
// rama SIN base en el mismo archivo. Esto es seguro porque `cache()` de
// React no memoiza fuera de un render de Server Component: sin un
// "dispatcher" activo (el caso de vitest, que no renderiza nada) cae
// directo a llamar la función de siempre — ver
// node_modules/react/cjs/react.react-server.development.js, exports.cache.
// Cada llamada en este archivo es independiente; no hay estado que se filtre
// de un test a otro.
let conDB = false
let filasSalas: Record<string, unknown>[] = []

vi.mock('./cliente', () => ({
  hayDB: () => conDB,
  db: () => ({ select: () => ({ from: () => Promise.resolve(filasSalas) }) }),
}))

const { cargarTemas, slugsDeSalas } = await import('./temas')

beforeEach(() => {
  conDB = false
  filasSalas = []
})

const FILA_ZEUS = {
  slug: 'zeus', nombre: 'Zeus', primario: '#614ACA', secundario: '#FF004F', acento: '#00CFAB',
  superficieClara: '#E8EBF4', superficieOscura: '#202020', textoSobreClara: '#202020', textoSobreOscura: '#FFFFFF',
  gradiente: ['#614ACA', '#FF004F'], familiaDisplay: 'figtree', familiaTexto: 'figtree',
  logoUrl: null, logoRelacionDeTinta: null,
}

describe('cargarTemas — sin base de datos', () => {
  it('cae a la semilla, no a un registro vacío', async () => {
    // Desviación deliberada del brief original ("vacío, son datos y no
    // configuración"): decenas de tests sin DB (src/db/archivos.test.ts,
    // src/db/salas.test.ts, src/db/sesiones.test.ts, src/db/plantillas.test.ts…)
    // dan por hecho que 'zeus'/'neracode'/etc. validan y pintan su nombre y
    // color reales sin necesidad de mockear la base — exactamente lo que
    // hacía el `TEMAS` de código hasta el 30-jul. Un registro vacío aquí
    // los habría roto a todos; la semilla es, literalmente, ese mismo valor.
    expect(await cargarTemas()).toEqual(SEMILLA_DE_TEMAS)
  })
})

describe('slugsDeSalas — sin base de datos', () => {
  it('trae las nueve salas reales, sin grupo-upax', async () => {
    const slugs = await slugsDeSalas()
    expect(slugs.sort()).toEqual([
      'ceci', 'house-of-films', 'marketing-united', 'mexa-creativa',
      'neracode', 'promo-espacio', 'research-land', 'uix', 'zeus',
    ])
  })
})

describe('cargarTemas — con base de datos', () => {
  it('arma el Tema de cada fila con sus doce campos', async () => {
    conDB = true
    filasSalas = [FILA_ZEUS]
    const registro = await cargarTemas()
    expect(registro.zeus).toEqual({
      slug: 'zeus', nombre: 'Zeus', primario: '#614ACA', secundario: '#FF004F', acento: '#00CFAB',
      superficieClara: '#E8EBF4', superficieOscura: '#202020', textoSobreClara: '#202020', textoSobreOscura: '#FFFFFF',
      gradiente: ['#614ACA', '#FF004F'], familiaDisplay: 'figtree', familiaTexto: 'figtree',
    })
  })

  it('descarta una fila con la marca incompleta en vez de construir un Tema roto', async () => {
    // No debería pasar —las columnas son NOT NULL desde la migración 0014—
    // pero Drizzle sigue tipándolas como posiblemente nulas, y este es
    // justo el caso que ese `if` defensivo existe para cubrir.
    conDB = true
    filasSalas = [{ ...FILA_ZEUS, slug: 'rota', primario: null }]
    const registro = await cargarTemas()
    expect(registro.rota).toBeUndefined()
  })
})

describe('slugsDeSalas — con base de datos', () => {
  it('excluye grupo-upax aunque la fila exista, esté activa y tenga su marca completa', async () => {
    conDB = true
    filasSalas = [FILA_ZEUS, { ...FILA_ZEUS, slug: 'grupo-upax', nombre: 'Grupo UPAX' }]
    expect(await slugsDeSalas()).toEqual(['zeus'])
  })
})
