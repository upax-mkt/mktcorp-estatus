import { describe, it, expect } from 'vitest'
import {
  parsearVinetas,
  escribirVinetas,
  parsearRejilla,
  estadoDeTexto,
  parsearTonos,
  parsearDatosDeGrafico,
  escribirDatosDeGrafico,
  numeroDeCelda,
  parsearPartes,
  parsearLineas,
} from './parseo'

describe('viñetas con sangría', () => {
  it('la sangría cuelga una línea de la de arriba', () => {
    expect(parsearVinetas('One sheets por servicio\n  Social content\n  Producción')).toEqual([
      {
        texto: 'One sheets por servicio',
        hijos: [{ texto: 'Social content' }, { texto: 'Producción' }],
      },
    ])
  })

  it('aguanta tres niveles, que es lo que llega a tener un estatus real', () => {
    const arbol = parsearVinetas('Estudios\n  Retail\n    Elektra')
    expect(arbol[0].hijos?.[0].hijos?.[0].texto).toBe('Elektra')
  })

  it('el tabulador vale igual que dos espacios: la gente usa los dos', () => {
    expect(parsearVinetas('Padre\n\tHijo')).toEqual([{ texto: 'Padre', hijos: [{ texto: 'Hijo' }] }])
  })

  it('quita el guion que la gente escribe por costumbre', () => {
    expect(parsearVinetas('- Campañas de marca\n• Estrategia')).toEqual([
      { texto: 'Campañas de marca' },
      { texto: 'Estrategia' },
    ])
  })

  it('una sangría que salta dos niveles no pierde la línea', () => {
    // Tabular de más es un error de dedo, no una instrucción de anidar dos veces.
    const arbol = parsearVinetas('Padre\n      Nieto sin hijo')
    expect(arbol[0].hijos?.[0].texto).toBe('Nieto sin hijo')
  })

  it('una URL al final se convierte en enlace, y el texto se queda limpio', () => {
    expect(parsearVinetas('Ver la cuenta | https://app.hubspot.com/x')).toEqual([
      { texto: 'Ver la cuenta', enlace: 'https://app.hubspot.com/x' },
    ])
  })

  it('un "|" que no cierra una URL se queda dentro del texto', () => {
    expect(parsearVinetas('SQL | Opp cayó')).toEqual([{ texto: 'SQL | Opp cayó' }])
  })

  it('las líneas en blanco no crean viñetas vacías', () => {
    expect(parsearVinetas('Uno\n\n\nDos')).toHaveLength(2)
  })

  it('lo que se escribe se puede volver a editar sin perder la jerarquía', () => {
    const original = 'Servicios\n  Retail\n    Elektra\n  Banca\nOtra cosa | https://x.mx/a'
    expect(escribirVinetas(parsearVinetas(original))).toBe(original)
  })
})

describe('rejilla pegada', () => {
  it('lee lo pegado desde Sheets y cuadra las filas al encabezado', () => {
    expect(parsearRejilla('\tMayo\tJunio\nSesiones\t3,591\nMQLs\t6\t4\t99')).toEqual([
      ['', 'Mayo', 'Junio'],
      ['Sesiones', '3,591', ''],
      ['MQLs', '6', '4'],
    ])
  })

  it('sin nada que leer, devuelve vacío en vez de reventar', () => {
    expect(parsearRejilla('  \n ')).toEqual([])
  })
})

describe('semáforo', () => {
  it('reconoce lo que la gente escribe de verdad', () => {
    expect(estadoDeTexto('Listo')).toBe('listo')
    expect(estadoDeTexto('en proceso')).toBe('en-proceso')
    expect(estadoDeTexto('No realizado')).toBe('no-realizado')
    expect(estadoDeTexto('pendiente')).toBe('no-realizado')
  })

  it('una celda vacía NO es un estado: en el deck real hay estatus sin llenar', () => {
    expect(estadoDeTexto('')).toBeUndefined()
    expect(estadoDeTexto('   ')).toBeUndefined()
  })

  it('lo que no reconoce lo deja sin estado en vez de adivinar', () => {
    expect(estadoDeTexto('a medias, según a quién preguntes')).toBeUndefined()
  })
})

describe('tonos de la matriz', () => {
  it('el equipo declara qué intensidad tiene cada palabra', () => {
    const tonos = parsearTonos('Vende | alto\nPrepara | medio\nEspera | neutro')
    expect(tonos.get('vende')).toBe('alto')
    expect(tonos.get('espera')).toBe('neutro')
  })

  it('ignora un tono que no existe en vez de inventarlo', () => {
    expect(parsearTonos('Vende | altísimo').size).toBe(0)
  })
})

describe('datos de un gráfico', () => {
  const PEGADO = '\tEnero\tFebrero\tMarzo\nTotal 2026\t4,393\t7,244\t4,997\nOrgánico\t1067\t1292\t1297'

  it('la primera fila son los periodos y cada fila siguiente una serie', () => {
    expect(parsearDatosDeGrafico(PEGADO)).toEqual({
      periodos: ['Enero', 'Febrero', 'Marzo'],
      series: [
        { etiqueta: 'Total 2026', valores: [4393, 7244, 4997] },
        { etiqueta: 'Orgánico', valores: [1067, 1292, 1297] },
      ],
    })
  })

  it('lee números pegados con comas de millar y símbolo de moneda', () => {
    expect(numeroDeCelda('$28,235.46')).toBe(28235.46)
    expect(numeroDeCelda('-16%')).toBe(-16)
  })

  it('una celda que no es número vale 0 y no tumba el gráfico entero', () => {
    const datos = parsearDatosDeGrafico('\tEne\tFeb\nVentas\tn/d\t12')
    expect(datos.series[0].valores).toEqual([0, 12])
  })

  it('lo que se pega se puede volver a editar', () => {
    const datos = parsearDatosDeGrafico(PEGADO)
    expect(parsearDatosDeGrafico(escribirDatosDeGrafico(datos.periodos, datos.series))).toEqual(datos)
  })
})

describe('partes y líneas', () => {
  it('lee el desglose de una cifra', () => {
    expect(parsearPartes('Mkt | $36.1 MDP\nComercial | $3.4 MDP')).toEqual([
      { rotulo: 'Mkt', valor: '$36.1 MDP' },
      { rotulo: 'Comercial', valor: '$3.4 MDP' },
    ])
  })

  it('descarta una línea a medias en vez de guardar un valor vacío', () => {
    expect(parsearPartes('Mkt | $36.1 MDP\nComercial')).toHaveLength(1)
  })

  it('las líneas sueltas se quedan limpias de guiones', () => {
    expect(parsearLineas('- Uno\n\n- Dos')).toEqual(['Uno', 'Dos'])
  })
})
