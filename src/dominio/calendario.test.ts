import { describe, it, expect } from 'vitest'
import { semanasDelMes, agruparPorDia, mesVecino, DIAS_POR_SEMANA } from './calendario'

/**
 * La aritmética del calendario. Se prueba aquí, sin navegador, porque es
 * justo donde se falla en silencio: el mes que empieza en domingo, febrero,
 * el que cruza el cambio de horario, y la sesión de las siete de la tarde que
 * en UTC ya es del día siguiente.
 */

const HOY = new Date('2026-07-27T15:00:00Z')

describe('semanasDelMes', () => {
  it('todas las filas tienen siete días', () => {
    for (let mes = 0; mes < 12; mes++) {
      for (const semana of semanasDelMes(2026, mes, HOY)) {
        expect(semana).toHaveLength(DIAS_POR_SEMANA)
      }
    }
  })

  it('la semana empieza en lunes', () => {
    // El 1 de julio de 2026 es miércoles: la primera fila arranca el lunes 29
    // de junio.
    const [primera] = semanasDelMes(2026, 6, HOY)
    expect(primera[0].dia).toBe('2026-06-29')
    expect(primera[0].delMes).toBe(false)
    expect(primera[2].dia).toBe('2026-07-01')
    expect(primera[2].delMes).toBe(true)
  })

  it('un mes que empieza en lunes no lleva relleno delante', () => {
    // 1 de junio de 2026 es lunes.
    const [primera] = semanasDelMes(2026, 5, HOY)
    expect(primera[0].dia).toBe('2026-06-01')
    expect(primera[0].delMes).toBe(true)
  })

  it('están todos los días del mes, una sola vez', () => {
    const delMes = semanasDelMes(2026, 1, HOY) // febrero de 2026: 28 días
      .flat()
      .filter((d) => d.delMes)
    expect(delMes).toHaveLength(28)
    expect(new Set(delMes.map((d) => d.dia)).size).toBe(28)
    expect(delMes[27].dia).toBe('2026-02-28')
  })

  it('un año bisiesto trae su 29 de febrero', () => {
    const delMes = semanasDelMes(2028, 1, HOY).flat().filter((d) => d.delMes)
    expect(delMes).toHaveLength(29)
    expect(delMes[28].dia).toBe('2028-02-29')
  })

  it('el relleno de enero viene de diciembre del año anterior', () => {
    const [primera] = semanasDelMes(2027, 0, HOY)
    // 1 de enero de 2027 es viernes → la fila arranca el lunes 28 de diciembre.
    expect(primera[0].dia).toBe('2026-12-28')
  })

  it('el relleno del final de diciembre va a enero del siguiente', () => {
    const semanas = semanasDelMes(2026, 11, HOY)
    const ultima = semanas[semanas.length - 1]
    expect(ultima[ultima.length - 1].dia.startsWith('2027-01')).toBe(true)
  })

  it('marca hoy, y solo hoy', () => {
    const hoyMarcados = semanasDelMes(2026, 6, HOY).flat().filter((d) => d.esHoy)
    expect(hoyMarcados).toHaveLength(1)
    expect(hoyMarcados[0].dia).toBe('2026-07-27')
  })

  it('no marca ningún día en un mes que no es el de hoy', () => {
    expect(semanasDelMes(2026, 2, HOY).flat().some((d) => d.esHoy)).toBe(false)
  })
})

describe('agruparPorDia', () => {
  it('agrupa por el día CIVIL en México, no por el UTC', () => {
    // Las 19:00 del 30 de junio en CDMX son la 01:00 UTC del 1 de julio: sin
    // convertir, esta sesión aparecería en el mes siguiente.
    const mapa = agruparPorDia([
      { fecha: '2026-07-01T01:00:00.000Z', id: 'tarde-del-30' },
      { fecha: '2026-06-30T16:00:00.000Z', id: 'manana-del-30' },
    ])
    expect(mapa.get('2026-06-30')?.map((s) => s.id)).toEqual(['tarde-del-30', 'manana-del-30'])
    expect(mapa.has('2026-07-01')).toBe(false)
  })

  it('una fecha sin hora se queda en su día', () => {
    const mapa = agruparPorDia([{ fecha: '2026-08-19' }])
    expect(mapa.get('2026-08-19')).toHaveLength(1)
  })

  it('sin nada devuelve un mapa vacío, no revienta', () => {
    expect(agruparPorDia([]).size).toBe(0)
  })
})

describe('mesVecino', () => {
  it('avanza y retrocede dentro del año', () => {
    expect(mesVecino(2026, 6, 1)).toEqual({ anio: 2026, mes: 7 })
    expect(mesVecino(2026, 6, -1)).toEqual({ anio: 2026, mes: 5 })
  })

  it('diciembre no se sale del año', () => {
    expect(mesVecino(2026, 11, 1)).toEqual({ anio: 2027, mes: 0 })
    expect(mesVecino(2026, 0, -1)).toEqual({ anio: 2025, mes: 11 })
  })
})
