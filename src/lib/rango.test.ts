import { describe, it, expect } from 'vitest'
import { interpretarRango, recortarStream, agotarStream } from './rango'

/** Un ReadableStream fabricado a partir de trozos ya partidos — para controlar exactamente dónde caen los bordes. */
function streamDeTrozos(trozos: number[][]): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= trozos.length) {
        controller.close()
        return
      }
      controller.enqueue(new Uint8Array(trozos[i]))
      i++
    },
  })
}

function texto(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

/** "ABCDEFGHIJ" (10 bytes), partido en trozos de 3+3+3+1 — para cruzar bordes a propósito. */
function streamAlfabeto() {
  const codigos = (s: string) => Array.from(s).map((c) => c.charCodeAt(0))
  return streamDeTrozos([codigos('ABC'), codigos('DEF'), codigos('GHI'), codigos('J')])
}

describe('interpretarRango', () => {
  it('sin cabecera, se sirve todo: 200', () => {
    expect(interpretarRango(null, 1000)).toEqual({ ok: false, motivo: 'sin-cabecera' })
    expect(interpretarRango(undefined, 1000)).toEqual({ ok: false, motivo: 'sin-cabecera' })
    // Una cabecera vacía es, en la práctica, lo mismo que ninguna: nadie manda
    // "Range: " de verdad, y tratarla como ausente es más correcto que como error.
    expect(interpretarRango('', 1000)).toEqual({ ok: false, motivo: 'sin-cabecera' })
  })

  it('bytes=A-B: el tramo exacto', () => {
    expect(interpretarRango('bytes=0-99', 1000)).toEqual({ ok: true, inicio: 0, fin: 99 })
    expect(interpretarRango('bytes=500-599', 1000)).toEqual({ ok: true, inicio: 500, fin: 599 })
  })

  it('bytes=A-: desde A hasta el final', () => {
    expect(interpretarRango('bytes=900-', 1000)).toEqual({ ok: true, inicio: 900, fin: 999 })
  })

  it('bytes=-N: los últimos N bytes', () => {
    expect(interpretarRango('bytes=-100', 1000)).toEqual({ ok: true, inicio: 900, fin: 999 })
  })

  it('bytes=-N mayor que el archivo entero: se sirve desde el byte 0', () => {
    expect(interpretarRango('bytes=-5000', 1000)).toEqual({ ok: true, inicio: 0, fin: 999 })
  })

  it('un `fin` que se pasa del archivo se recorta al último byte real, no se rechaza', () => {
    expect(interpretarRango('bytes=900-999999', 1000)).toEqual({ ok: true, inicio: 900, fin: 999 })
  })

  it('un rango que empieza donde ya no hay archivo: no satisfacible (416)', () => {
    expect(interpretarRango('bytes=1000-1999', 1000)).toEqual({ ok: false, motivo: 'no-satisfacible' })
    expect(interpretarRango('bytes=5000-', 1000)).toEqual({ ok: false, motivo: 'no-satisfacible' })
  })

  it('inicio mayor que fin: no satisfacible', () => {
    expect(interpretarRango('bytes=500-100', 1000)).toEqual({ ok: false, motivo: 'no-satisfacible' })
  })

  it('cabeceras que no se entienden se tratan como si no existieran, no como error', () => {
    for (const invalida of ['bytes=', 'bytes=-', 'bytes=abc-def', 'items=0-10', 'bytes=0-10,20-30']) {
      const r = interpretarRango(invalida, 1000)
      expect(r.ok, invalida).toBe(false)
      if (!r.ok) expect(r.motivo).toBe('invalida')
    }
  })
})

describe('recortarStream', () => {
  it('un rango dentro de un solo trozo', async () => {
    // Trozo 1 = "ABC" (posiciones 0-2). Pedir 1-2 = "BC".
    const recortado = recortarStream(streamAlfabeto(), 1, 2)
    expect(texto(await agotarStream(recortado))).toBe('BC')
  })

  it('un rango que cruza el borde entre dos trozos', async () => {
    // "ABC"|"DEF" — pedir 2-4 = "C" + "DE" = "CDE".
    const recortado = recortarStream(streamAlfabeto(), 2, 4)
    expect(texto(await agotarStream(recortado))).toBe('CDE')
  })

  it('el rango completo, de punta a punta', async () => {
    const recortado = recortarStream(streamAlfabeto(), 0, 9)
    expect(texto(await agotarStream(recortado))).toBe('ABCDEFGHIJ')
  })

  it('solo el primer byte', async () => {
    const recortado = recortarStream(streamAlfabeto(), 0, 0)
    expect(texto(await agotarStream(recortado))).toBe('A')
  })

  it('solo el último byte', async () => {
    const recortado = recortarStream(streamAlfabeto(), 9, 9)
    expect(texto(await agotarStream(recortado))).toBe('J')
  })

  it('un rango que empieza a media serie y llega hasta el final', async () => {
    const recortado = recortarStream(streamAlfabeto(), 7, 9)
    expect(texto(await agotarStream(recortado))).toBe('HIJ')
  })

  it('un rango en medio deja fuera lo de antes Y lo de después', async () => {
    const recortado = recortarStream(streamAlfabeto(), 3, 5)
    const resultado = texto(await agotarStream(recortado))
    expect(resultado).toBe('DEF')
    expect(resultado).not.toContain('A')
    expect(resultado).not.toContain('J')
  })
})
