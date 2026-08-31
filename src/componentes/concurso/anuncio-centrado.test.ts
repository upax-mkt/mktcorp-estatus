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

/**
 * ⚠️ EL ANUNCIO RECUERDA QUE SE CERRÓ AUNQUE EL NAVEGADOR NO GUARDE NADA
 * (31-ago-2026).
 *
 * Franco: *«el lightbox del concurso no se puede cerrar»*. Y cerrarse se
 * cerraba —comprobado en producción, las tres salidas funcionaban—: lo que
 * hacía era VOLVER A SALIR en cada carga, que desde fuera es la misma sensación
 * y peor, porque parece que la app te ignora.
 *
 * La causa: el «ya lo vi» vivía solo en `localStorage`, dentro de un `try/catch`
 * que se tragaba el fallo en silencio. En un navegador embebido —el que abre
 * Slack al pulsar un enlace desde la app, que es por donde va a llegar el
 * equipo entero— ese almacén puede estar restringido: la escritura lanza, el
 * catch la ignora y al recargar el anuncio no sabe que ya se cerró. Reproducido
 * simulando el bloqueo antes de tocar nada.
 *
 * Cuatro recuerdos, de más a menos permanente: `localStorage`,
 * `sessionStorage`, una cookie y una variable de módulo. Ninguno es
 * imprescindible y basta con que uno sobreviva.
 */
describe('el anuncio recuerda que ya se cerró', () => {
  const FUENTE = readFileSync(join(__dirname, 'AnuncioConcurso.tsx'), 'utf8')

  it('no depende de un solo almacén', () => {
    expect(FUENTE).toContain('sessionStorage')
    expect(FUENTE).toContain('document.cookie')
  })

  it('guarda en memoria antes que nada, que es lo único que nunca falla', () => {
    // `cerradoEnMemoria = true` va PRIMERO en `marcarVisto`: si una excepción
    // tumbara los demás, ese ya está puesto.
    const cuerpo = FUENTE.slice(FUENTE.indexOf('function marcarVisto'))
    const enMemoria = cuerpo.indexOf('cerradoEnMemoria = true')
    const primerAlmacen = cuerpo.indexOf('setItem')
    expect(enMemoria).toBeGreaterThan(-1)
    expect(enMemoria).toBeLessThan(primerAlmacen)
  })

  it('cada intento de guardar va protegido: uno que lance no tumba los otros', () => {
    const cuerpo = FUENTE.slice(FUENTE.indexOf('function marcarVisto'), FUENTE.indexOf('function yaSeVio'))
    expect((cuerpo.match(/catch/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})

/**
 * ⚠️⚠️ EL DIÁLOGO CERRADO DESAPARECE DE LA PANTALLA (31-ago-2026).
 *
 * Franco, dos veces: *«no puedo cerrar el pop up»*, *«no se puede, en
 * desktop!»*. Y las dos veces yo comprobé que sí cerraba… midiendo lo que no
 * era.
 *
 * EL DEFECTO: `.popupCartel { display: grid }`. El navegador oculta un diálogo
 * cerrado con `dialog:not([open]) { display: none }` en su hoja de agente de
 * usuario, y esa hoja pierde SIEMPRE frente a una regla de autor —manda el
 * origen, no la especificidad del selector—. Así que ese `display: grid`
 * ganaba también con el diálogo ya cerrado: se pulsaba la equis, el `<dialog>`
 * se cerraba de verdad… y el cartel seguía tapando la pantalla.
 *
 * ⚠️ Y POR QUÉ MIS PRUEBAS DECÍAN QUE FUNCIONABA: comprobaban
 * `document.querySelector('dialog[open]')`, es decir, el ATRIBUTO. El atributo
 * se quitaba correctamente, así que salía ✓ mientras Franco tenía el cartel
 * delante. Medí lo que era cómodo de medir en vez de lo que el usuario ve. La
 * pregunta correcta no era «¿se cerró?» sino «¿desapareció?».
 */
describe('el diálogo cerrado no ocupa pantalla', () => {
  it('declara display:none para el diálogo sin open', () => {
    // Sin esta regla, cualquier `display` de autor sobre el diálogo lo deja
    // visible al cerrarlo.
    expect(CSS).toMatch(/\.popup:not\(\[open\]\)\s*\{[^}]*display:\s*none/)
  })

  it('y esa regla va ANTES de la que pone display en el cartel', () => {
    // Misma especificidad ⇒ gana la última. Si `.popupCartel { display: grid }`
    // se declarara después sin `[open]`, volvería el defecto.
    const iOculta = CSS.indexOf('.popup:not([open])')
    const iCartel = CSS.indexOf('.popupCartel {')
    expect(iOculta).toBeGreaterThan(-1)
    expect(iCartel).toBeGreaterThan(iOculta)
  })
})
