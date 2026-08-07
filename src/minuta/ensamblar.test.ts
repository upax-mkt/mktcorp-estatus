import { describe, it, expect } from 'vitest'
import { ensamblarCorreo } from './ensamblar'

/**
 * `ensamblarCorreo` vive en su propio módulo, SIN NADA del SDK de Anthropic
 * (ronda 11, tarea 1) — a propósito, para que `MinutaCliente.tsx` (Client
 * Component) pueda importarlo y rearmar el correo en el navegador cada vez
 * que cambian los acuerdos o se edita un bloque, sin arrastrar el cliente de
 * Anthropic (`@anthropic-ai/sdk`, que usa APIs de Node) al bundle del
 * navegador. `src/minuta/generar.ts` re-exporta esta misma función para que
 * `correo-html.test.ts`/`molde.test.ts` (que ya la importan desde `./generar`)
 * sigan funcionando sin cambios.
 *
 * La cobertura completa de `ensamblarCorreo` (molde propio, sin sala, bloque
 * de la tabla, etc.) ya vive en `molde.test.ts` — aquí solo se prueba EL BUG
 * que motivó separar el módulo: que la tabla del correo refleje EXACTAMENTE
 * los acuerdos que se le pasan, ni uno más.
 */

const DOS_ACUERDOS = [
  { que: 'Cerrar el brief con Iris', responsable: 'Iris Gómez', prioridad: 'alta', fechaCompromiso: '2026-08-10' },
  { que: 'Mandar la propuesta a Zeus', responsable: 'por asignar', prioridad: 'media', fechaCompromiso: null },
]

describe('ensamblarCorreo — la tabla es SIEMPRE un espejo de lo que se le pasa', () => {
  it('con los dos acuerdos, la tabla los nombra a los dos', () => {
    const correo = ensamblarCorreo('neracode', ['bloque uno', 'bloque dos', 'bloque tres'], DOS_ACUERDOS)
    expect(correo).toContain('Cerrar el brief con Iris')
    expect(correo).toContain('Mandar la propuesta a Zeus')
  })

  it('quitando uno de los dos acuerdos de la lista, el texto YA NO LO MENCIONA', () => {
    // Este es el bug de MinutaCliente.tsx aislado en su forma más simple:
    // ensamblarCorreo es puro, así que "desmarcar un acuerdo" es sencillamente
    // "llamarlo de nuevo con un acuerdo menos".
    const soloUno = DOS_ACUERDOS.filter((a) => a.que !== 'Mandar la propuesta a Zeus')
    const correo = ensamblarCorreo('neracode', ['bloque uno', 'bloque dos', 'bloque tres'], soloUno)
    expect(correo).toContain('Cerrar el brief con Iris')
    expect(correo).not.toContain('Mandar la propuesta a Zeus')
  })

  it('sin ningún acuerdo, la tabla lo dice explícitamente en vez de quedar vacía', () => {
    const correo = ensamblarCorreo('neracode', ['bloque uno', 'bloque dos', 'bloque tres'], [])
    expect(correo).toContain('sin acuerdos accionables')
  })

  it('el orden de la tabla es el orden del arreglo que se le pasa', () => {
    const enUnOrden = ensamblarCorreo('neracode', ['a', 'b', 'c'], DOS_ACUERDOS)
    const invertido = ensamblarCorreo('neracode', ['a', 'b', 'c'], [...DOS_ACUERDOS].reverse())
    expect(enUnOrden.indexOf('Cerrar el brief')).toBeLessThan(enUnOrden.indexOf('Mandar la propuesta'))
    expect(invertido.indexOf('Mandar la propuesta')).toBeLessThan(invertido.indexOf('Cerrar el brief'))
  })
})
