import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { esFaseConcurso, faseVigente, type FaseConcurso } from './fase'

/** Ya cerrada la recepción por calendario: el 9 a las 14:00. */
const TRAS_EL_CIERRE = new Date('2026-09-09T14:00:00-06:00')
/** Con la recepción abierta por calendario: el 8 a mediodía. */
const EN_RECEPCION = new Date('2026-09-08T12:00:00-06:00')

describe('faseVigente', () => {
  it('sin interruptor manda el calendario', () => {
    expect(faseVigente(null, EN_RECEPCION)).toBe('recepcion')
    expect(faseVigente(null, TRAS_EL_CIERRE)).toBe('votacion')
  })

  /**
   * EL CASO QUE MOTIVÓ TODO: la recepción cerró sola con un defecto dentro y
   * hubo que redesplegar para reabrirla. Con el interruptor, se reabre aunque
   * la fecha diga lo contrario.
   */
  it('el interruptor reabre la recepción contra el calendario', () => {
    expect(faseVigente('recepcion', TRAS_EL_CIERRE)).toBe('recepcion')
  })

  it('y también cierra la votación antes de tiempo', () => {
    expect(faseVigente('cerrado', TRAS_EL_CIERRE)).toBe('cerrado')
    expect(faseVigente('resultados', EN_RECEPCION)).toBe('resultados')
  })

  /** Volver a `null` no congela la fase: devuelve el mando a las fechas. */
  it('soltarlo devuelve el concurso al calendario, no lo deja donde estaba', () => {
    expect(faseVigente(null, TRAS_EL_CIERRE)).toBe('votacion')
  })
})

describe('esFaseConcurso', () => {
  it('acepta las cuatro fases y nada más', () => {
    for (const fase of ['recepcion', 'votacion', 'cerrado', 'resultados'] satisfies FaseConcurso[]) {
      expect(esFaseConcurso(fase)).toBe(true)
    }
    for (const basura of ['', 'RECEPCION', 'abierta', null, undefined, 7, {}]) {
      expect(esFaseConcurso(basura)).toBe(false)
    }
  })
})

/**
 * ⚠️ EL TEST QUE HACE ÚTIL AL INTERRUPTOR.
 *
 * Un interruptor que solo apaga tres de las cuatro puertas no sirve: cerrar la
 * votación desde la pantalla y que la ruta de subida siga aceptando archivos
 * —porque mira las fechas por su cuenta— es peor que no tenerlo, porque
 * aparenta un control que no existe. Se comprueba sobre la fuente, como el
 * resto de invariantes de este módulo, porque `src/db/concurso.ts` importa
 * `server-only` y no se puede montar en un test.
 */
describe('nadie se salta el interruptor', () => {
  const fuente = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf8')
  /** El código sin comentarios: ahí SÍ se nombra la función de fechas, al explicarla. */
  const codigo = (ruta: string) => fuente(ruta).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('la capa de datos del concurso nunca mide las fechas por su cuenta', () => {
    expect(codigo('../db/concurso.ts')).not.toContain('faseDelConcurso(')
  })

  it('y las cuatro puertas preguntan por la fase vigente', () => {
    for (const ruta of [
      '../db/concurso.ts',
      '../app/concurso/page.tsx',
      '../app/api/concurso/subir/route.ts',
      '../app/page.tsx',
    ]) {
      expect(codigo(ruta), ruta).toContain('faseActualConcurso')
      expect(codigo(ruta), ruta).not.toContain('faseDelConcurso(')
    }
  })
})
