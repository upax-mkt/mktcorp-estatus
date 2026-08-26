import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * TODO LO QUE VIVE EN LA BARRA DE UN MÓDULO PLEGADO HEREDA SU COLOR, y este
 * test existe porque no fue así y el defecto sobrevivió a 7.128 mediciones.
 *
 * QUÉ PASÓ (26-ago-2026). El velo que hace legible el texto sobre el degradado
 * se verificó midiendo el color real bajo cada glifo, en nueve salas y seis
 * anchos. Salió impecable. Pero TODA esa medición se hizo sobre la vista de un
 * director —la pública—, y la barra de una sala tiene piezas que **solo
 * aparecen con sesión de equipo**: el botón «Organizar» de Materiales y de
 * Archivos, que es `.boton[data-tono="fantasma"]` y traía su propio gris.
 * Sobre el degradado de Promo Espacio daba **3,02:1**. Lo delató la primera
 * captura hecha con la sesión de Franco, no la medición.
 *
 * LA LECCIÓN: una medición exhaustiva sigue siendo exhaustiva SOLO dentro del
 * alcance que recorre. Cubrió todas las salas y todos los anchos, y se dejó
 * fuera el eje que no se le ocurrió mirar — el rol de quien mira.
 *
 * Se comprueba leyendo el CSS y no renderizando porque `:has()` con jsdom no
 * resuelve la cascada de un módulo contra otro: el gris del botón vive en la
 * hoja global de botones, y quién gana lo decide el orden en que Next sirva
 * las hojas. Lo que sí se puede fijar —y es justo lo que faltaba— es que la
 * regla que fuerza la herencia esté escrita y alcance a botones y a spans.
 */
const CSS = readFileSync(join(__dirname, 'Seccion.module.css'), 'utf8')

/** El bloque de reglas que visten una sección PLEGADA con su marca. */
const REGLAS_DE_PLEGADA = CSS.split('\n').filter((l) => l.includes(':has(> .plegable:not([open]))'))

describe('la barra de un módulo plegado', () => {
  it('fuerza la herencia del color en cualquier pieza del summary', () => {
    const herencia = REGLAS_DE_PLEGADA.filter((l) => l.includes('summary'))
    expect(herencia.some((l) => /\bbutton\b/.test(l)), 'ningún selector alcanza a un <button>').toBe(
      true,
    )
    expect(herencia.some((l) => /\bspan\b/.test(l)), 'ningún selector alcanza a un <span>').toBe(
      true,
    )
  })

  /**
   * El conteo se pinta ENTERO sobre el degradado. Rebajarlo se comía el
   * contraste que el velo acababa de garantizar, y entonces lo medido dejaría
   * de ser lo pintado — que es exactamente cómo se esconden estos defectos.
   */
  it('no rebaja la opacidad del conteo, que cae en el extremo peor iluminado', () => {
    const delConteo = REGLAS_DE_PLEGADA.find((l) => l.includes('.conteo'))
    expect(delConteo).toBeDefined()
    expect(delConteo).not.toMatch(/opacity:\s*0?\.\d/)
  })

  /**
   * El velo se compone SOBRE el degradado, y sin velo declarado tiene que
   * componer `transparent` — o las salas que ya se leían cambiarían de aspecto
   * sin que nadie lo pidiera.
   */
  it('compone el velo encima del degradado, con transparente por defecto', () => {
    expect(CSS).toMatch(/var\(--velo-gradiente,\s*transparent\)/)
    expect(CSS).toMatch(/var\(--gradiente,\s*var\(--papel\)\)/)
  })
})
