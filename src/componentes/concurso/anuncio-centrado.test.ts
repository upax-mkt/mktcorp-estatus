import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * EL ANUNCIO DEL CONCURSO SE CENTRA (28-ago-2026).
 *
 * Franco lo vio en pantalla: *"el pop up ahora aparece cargado en la esquina
 * superior izquierda y debería ser al centro"*.
 *
 * La causa no está en el componente: un `<dialog>` abierto con `showModal()`
 * lo centra el NAVEGADOR, aplicando `margin: auto` desde su hoja de agente de
 * usuario. El reset de `globals.css` —`* { padding: 0; margin: 0 }`— alcanza
 * también al `dialog` y lo pisa, así que el modal cae pegado a la esquina.
 *
 * Se comprueba leyendo la hoja y no renderizando porque jsdom no calcula
 * posición: ningún test de render puede ver esto, igual que pasó con el
 * esqueleto de carga que salía sin ancho. Mismo patrón que
 * `escala-proyectada.test.ts`.
 */
const CSS = readFileSync(join(__dirname, '../../app/concurso/concurso.module.css'), 'utf8')

function bloque(selector: string): string {
  const i = CSS.indexOf(selector + ' {')
  expect(i, `no existe la regla ${selector}`).toBeGreaterThan(-1)
  return CSS.slice(i, CSS.indexOf('}', i))
}

describe('el anuncio del concurso', () => {
  it('declara margin auto, sin el cual el reset lo manda a la esquina', () => {
    expect(bloque('.popup')).toMatch(/margin:\s*auto/)
  })

  it('sigue cabiendo en pantallas bajas y no se desborda', () => {
    const b = bloque('.popup')
    expect(b).toMatch(/max-height:\s*calc\(100dvh/)
    expect(b).toMatch(/overflow:\s*auto/)
  })
})
