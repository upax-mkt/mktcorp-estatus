import { describe, it, expect } from 'vitest'
import { codigoDePase, paseDe } from './pase'

/** Dos hashes con la forma real que devuelve `hashVotante` (HMAC-SHA256 hex). */
const HASH_A = 'a3f19c04d7b28e5610fa4c9d3e77b2018c45de99a1b3c5d7e9f0123456789abc'
const HASH_B = 'b7c204e1f8a396d520cb7e4a1d88f3129d56ef00b2c4d6e8fa1b2c3d4e5f6071'

describe('codigoDePase', () => {
  /**
   * LO MÁS IMPORTANTE: el código no se guarda en ninguna tabla, se DERIVA. Si
   * no fuera estable, la persona vería un pase distinto cada vez que entra y el
   * código dejaría de servir para nada.
   */
  it('es el mismo siempre para el mismo votante', () => {
    expect(codigoDePase(HASH_A)).toBe(codigoDePase(HASH_A))
  })

  it('dos personas distintas no comparten pase', () => {
    expect(codigoDePase(HASH_A)).not.toBe(codigoDePase(HASH_B))
  })

  it('tiene la forma que se puede dictar en voz alta: cuatro y cuatro', () => {
    expect(codigoDePase(HASH_A)).toMatch(/^[2346789A-HJKMNP-TUVWXYZ]{4}-[2346789A-HJKMNP-TUVWXYZ]{4}$/)
  })

  /**
   * Sin 0/O, 1/I/L ni 5/S: son los pares que se confunden al leer un código o
   * al teclearlo desde una captura de pantalla.
   */
  it('no usa caracteres que se confunden entre sí', () => {
    const codigos = [HASH_A, HASH_B, 'f'.repeat(64), '0'.repeat(64)].map(codigoDePase)
    for (const c of codigos) {
      expect(c, `"${c}" trae un carácter ambiguo`).not.toMatch(/[01OIL5S]/)
    }
  })

  it('rechaza un hash que no tiene la forma esperada', () => {
    expect(() => codigoDePase('')).toThrow()
    expect(() => codigoDePase('no-es-hex')).toThrow()
    expect(() => codigoDePase('abc')).toThrow()
  })

  /**
   * Un hash uniforme es el caso que delataría un generador que solo mira el
   * primer byte: devolvería ocho caracteres iguales.
   */
  it('no degenera en un código de un solo carácter repetido', () => {
    const uniforme = codigoDePase('ab'.repeat(32))
    // Con un hash uniforme SÍ se repite, y es correcto: lo que se comprueba es
    // que con un hash real hay variedad.
    expect(uniforme).toHaveLength(9)
    expect(new Set(codigoDePase(HASH_A).replace('-', '')).size).toBeGreaterThan(3)
  })
})

describe('paseDe', () => {
  it('es dorado cuando la persona subió propuesta', () => {
    const p = paseDe(HASH_A, 'Sudadera del caos', null)
    expect(p.estado).toBe('dorado')
    expect(p.propuesta).toBe('Sudadera del caos')
  })

  it('es normal cuando solo viene a votar, y sigue siendo un pase válido', () => {
    const p = paseDe(HASH_A, null, null)
    expect(p.estado).toBe('normal')
    expect(p.codigo).toBe(codigoDePase(HASH_A))
  })

  /**
   * El pase enseña a su dueño en qué votó. Es información suya: nadie más la
   * ve, y el voto sigue siendo anónimo en la tabla, que guarda el HMAC y nunca
   * el correo (ver el ADR del concurso).
   */
  it('recuerda a qué propuesta fue el voto', () => {
    expect(paseDe(HASH_A, null, 'Manifiesto en algodón').votadoA).toBe('Manifiesto en algodón')
  })

  it('sin votar todavía, no inventa un destino', () => {
    expect(paseDe(HASH_A, null, null).votadoA).toBeNull()
  })

  /** Competir y votar son cosas distintas: se puede ser dorado y no haber votado. */
  it('dorado y sin votar es un estado legítimo', () => {
    const p = paseDe(HASH_B, 'Mi propuesta', null)
    expect(p.estado).toBe('dorado')
    expect(p.votadoA).toBeNull()
  })
})
