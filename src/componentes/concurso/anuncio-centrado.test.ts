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

/**
 * ⚠️ EL ANUNCIO NO SE QUEDA DETRÁS DEL HOME (28-ago-2026).
 *
 * Franco: *"el popup queda detrás de las cards del home"*.
 *
 * En producción no se reproduce —el `<dialog>` abierto con `showModal()` vive
 * en el top layer del navegador, donde nada puede taparlo— pero esa garantía
 * depende por completo de que `showModal()` haya funcionado. Si el diálogo
 * acaba abierto por su atributo `open` (una excepción al llamarlo, un
 * navegador que no lo implementa, una extensión que toque el DOM), sale del
 * top layer y pasa a ser un elemento normal del flujo, detrás de unas tarjetas
 * que sí traen su propio apilamiento.
 *
 * `position: fixed` + `z-index` no hacen nada en el caso bueno y lo salvan en
 * el malo. No se comprueba con un render porque jsdom no implementa el top
 * layer ni calcula apilamiento: lo que se puede fijar es que la red esté
 * puesta.
 */
describe('el anuncio por encima de todo', () => {
  it('declara position fixed y un z-index alto, por si el top layer falla', () => {
    const b = bloque('.popup')
    expect(b).toMatch(/position:\s*fixed/)
    const z = /z-index:\s*(\d+)/.exec(b)
    expect(z, 'sin z-index, un diálogo fuera del top layer queda bajo el Home').not.toBeNull()
    expect(Number(z![1])).toBeGreaterThanOrEqual(1000)
  })
})
