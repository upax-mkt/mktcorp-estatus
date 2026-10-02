import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModoPresentar } from './ModoPresentar'

/**
 * REVISIÓN FINAL DE LA RAMA, PUNTO 3a.
 *
 * Un Esc en el diálogo de revisión de la transcripción grabada la borraba
 * entera: `onClose` (el evento nativo con el que el navegador cierra un
 * `<dialog>` abierto con `showModal()`, incluido el que dispara el Esc)
 * ponía `transcripcion` a `null`. Para entonces `parar()` ya había vaciado
 * el acumulado de `GrabarReunion` y no hay ninguna otra copia en toda la
 * app — ni `localStorage` ni `beforeunload`. Y ese mismo Esc, si se seguía
 * presentando, también salía de la presentación (el listener de `window` no
 * sabía que había un diálogo modal abierto encima).
 *
 * Estos tests prueban el fix por comportamiento observable, no por estado
 * interno: cerrar (✕ o el evento nativo `close`) conserva el texto y se
 * puede reabrir; solo «Descartar» lo borra de verdad; y el Esc con el
 * diálogo abierto ya no saca de la presentación.
 */

/**
 * Doble de GrabarReunion: un botón que dispara `alTerminar` con un texto
 * fijo. La Web Speech API real ya se prueba en GrabarReunion.test.tsx — aquí
 * importa qué hace ModoPresentar con lo que GrabarReunion le entrega, no
 * cómo se transcribe.
 */
vi.mock('./GrabarReunion', () => ({
  GrabarReunion: ({ alTerminar }: { alTerminar: (texto: string) => void }) => (
    <button type="button" onClick={() => alTerminar('lo que se grabó')}>
      Simular fin de grabación
    </button>
  ),
}))

/**
 * Doble de MinutaCliente: solo enseña la transcripción recibida, para poder
 * comprobar que el diálogo la sigue mostrando tras cerrarse y reabrirse. El
 * flujo real de generar/publicar el acta tiene sus propios tests.
 */
vi.mock('@/app/deck/[id]/minuta/MinutaCliente', () => ({
  MinutaCliente: ({ transcripcionInicial }: { transcripcionInicial: string }) => (
    <div data-testid="minuta-cliente">{transcripcionInicial}</div>
  ),
}))

function montar() {
  return render(
    <ModoPresentar reunionId="reunion-1" equipo personas={[]}>
      <div data-layout="portada">hola</div>
    </ModoPresentar>,
  )
}

async function grabarYTerminar() {
  await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
  await userEvent.click(screen.getByRole('button', { name: /simular fin de grabación/i }))
}

describe('ModoPresentar — el diálogo de revisión no destruye la transcripción', () => {
  it('el evento nativo "close" (el Esc del navegador) NO borra el texto: se puede reabrir', async () => {
    montar()
    await grabarYTerminar()
    const dialogo = screen.getByRole('dialog', { name: /minuta de la reunión grabada/i })
    expect(screen.getByTestId('minuta-cliente')).toHaveTextContent('lo que se grabó')

    // El Esc nativo de un <dialog> abierto con showModal() dispara su propio
    // evento "close" — no pasa por ningún manejador de teclado de React, así
    // que se simula disparando el evento tal cual lo haría el navegador.
    // Cerrar un <dialog> no desmonta su contenido (solo dejar de mostrarlo,
    // como cualquier <dialog> real): la prueba de que sigue vivo es el
    // atributo `open`, no la ausencia del nodo en el árbol.
    fireEvent(dialogo, new Event('close'))
    expect(dialogo).not.toHaveAttribute('open')

    const reabrir = screen.getByRole('button', { name: /transcripción pendiente/i })
    await userEvent.click(reabrir)
    expect(dialogo).toHaveAttribute('open')
    expect(screen.getByTestId('minuta-cliente')).toHaveTextContent('lo que se grabó')
  })

  it('la ✕ cierra sin destruir, igual que el Esc', async () => {
    montar()
    await grabarYTerminar()
    const dialogo = screen.getByRole('dialog', { name: /minuta de la reunión grabada/i })

    await userEvent.click(screen.getByRole('button', { name: /^cerrar/i }))

    expect(dialogo).not.toHaveAttribute('open')
    const reabrir = screen.getByRole('button', { name: /transcripción pendiente/i })
    expect(reabrir).toBeInTheDocument()
    await userEvent.click(reabrir)
    expect(dialogo).toHaveAttribute('open')
    expect(screen.getByTestId('minuta-cliente')).toHaveTextContent('lo que se grabó')
  })

  it('«Descartar» SÍ borra el texto, y es un botón distinto de cerrar', async () => {
    montar()
    await grabarYTerminar()

    await userEvent.click(screen.getByRole('button', { name: /^descartar$/i }))

    expect(screen.queryByTestId('minuta-cliente')).not.toBeInTheDocument()
    // No queda nada que reabrir: se borró de verdad, no solo se ocultó.
    expect(screen.queryByRole('button', { name: /transcripción pendiente/i })).not.toBeInTheDocument()
  })

  it('el Esc con el diálogo abierto no dispara además la salida de la presentación', async () => {
    montar()
    await grabarYTerminar()
    // Seguimos presentando: el botón «Presentar» no ha vuelto a aparecer.
    expect(screen.queryByRole('button', { name: /^presentar$/i })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    // El Esc, con el diálogo de revisión abierto, no debe sacar de la
    // presentación — antes de este fix, el listener de `window` lo capturaba
    // igual y llamaba a `salir()` al mismo tiempo que el navegador cerraba
    // el diálogo.
    expect(screen.queryByRole('button', { name: /^presentar$/i })).not.toBeInTheDocument()
  })
})

/**
 * NAVEGAR AL PROYECTAR (2-oct-2026).
 *
 * Dos defectos reportados el mismo día y una función que faltaba:
 *  - Franco: «navego a una slide anterior y se devuelve al principio». La
 *    flecha restaba a un contador que solo movían las flechas; quien llegaba a
 *    una lámina con el trackpad o con un enlace seguía contando desde la portada.
 *  - César: «debe recordar el slide donde se quedó; al darle clic a presentar
 *    de nuevo debe seguir en la misma». Entrar siempre iba a la primera.
 *  - No había forma de ir a una lámina concreta: al proyectar no hay índice.
 *
 * jsdom no maqueta: `offsetParent`, `getBoundingClientRect` y `scrollIntoView`
 * se simulan con una «pantalla» de 800 px en la que cabe una sección.
 */
describe('ModoPresentar — navegar al proyectar', () => {
  const ALTO = 800
  let enPantalla = 0
  let saltos: { seccion: string | undefined; modo: ScrollBehavior | undefined }[] = []
  const originales = {
    offsetParent: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent'),
    rect: HTMLElement.prototype.getBoundingClientRect,
    scroll: HTMLElement.prototype.scrollIntoView,
  }

  function secciones() {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-layout]'))
  }

  beforeEach(() => {
    enPantalla = 0
    saltos = []
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get: () => document.body })
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const i = secciones().indexOf(this)
      const top = i < 0 ? 0 : (i - enPantalla) * ALTO
      return { top, bottom: top + ALTO, left: 0, right: 1000, width: 1000, height: ALTO, x: 0, y: top, toJSON: () => ({}) } as DOMRect
    }
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement, opciones?: boolean | ScrollIntoViewOptions) {
      // Como en el navegador: lo pedido queda en pantalla.
      enPantalla = secciones().indexOf(this)
      saltos.push({ seccion: this.dataset.layout, modo: typeof opciones === 'object' ? opciones.behavior : undefined })
    }
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: ALTO })
  })

  afterEach(() => {
    if (originales.offsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', originales.offsetParent)
    HTMLElement.prototype.getBoundingClientRect = originales.rect
    HTMLElement.prototype.scrollIntoView = originales.scroll
  })

  function montarCuatro() {
    return render(
      <ModoPresentar personas={[]}>
        <section data-layout="portada"><h1>Portada</h1></section>
        <section data-layout="eventos"><h2>Tres experiencias</h2></section>
        <section data-layout="venta"><h2>La venta del trimestre</h2></section>
        <section data-layout="cierre"><h2>Cierre</h2></section>
      </ModoPresentar>,
    )
  }

  /** Quien presenta se mueve sin las flechas: trackpad, rueda o un enlace de la propia lámina. */
  function desplazarA(indice: number) {
    enPantalla = indice
  }

  it('«anterior» retrocede desde la lámina que se ve, no vuelve a la portada', async () => {
    montarCuatro()
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    desplazarA(3)
    saltos = []
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(saltos.at(-1)).toEqual({ seccion: 'venta', modo: 'smooth' })
  })

  it('las flechas de la barra también parten de lo que se ve', async () => {
    montarCuatro()
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    desplazarA(2)
    saltos = []
    await userEvent.click(screen.getByRole('button', { name: 'Sección anterior' }))
    expect(saltos.at(-1)?.seccion).toBe('eventos')
  })

  it('dos pulsaciones seguidas avanzan dos láminas, sin esperar a que termine el scroll', async () => {
    montarCuatro()
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    saltos = []
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    // El scroll suave aún no llega: la pantalla sigue en la portada.
    desplazarA(0)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(saltos.map((s) => s.seccion)).toEqual(['eventos', 'venta'])
  })

  it('volver a presentar sigue en la lámina donde se quedó', async () => {
    montarCuatro()
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(enPantalla).toBe(2)
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    // Al salir, la lectura se queda en la misma sección…
    expect(saltos.at(-1)).toEqual({ seccion: 'venta', modo: 'instant' })
    saltos = []
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    // …y al volver a entrar, la presentación arranca ahí y no en la portada.
    expect(saltos.map((s) => s.seccion)).toEqual(['venta'])
    expect(screen.getByRole('button', { name: /Lámina 3 de 4/ })).toBeInTheDocument()
  })

  it('presentar desde una sección a la que se llegó leyendo empieza en esa sección', async () => {
    montarCuatro()
    desplazarA(1)
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    expect(saltos.at(-1)).toEqual({ seccion: 'eventos', modo: 'instant' })
  })

  it('el contador abre el navegador con todas las láminas y salta a la elegida', async () => {
    montarCuatro()
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    await userEvent.click(screen.getByRole('button', { name: /Ir a otra lámina/ }))
    const lista = screen.getByRole('group', { name: 'Todas las láminas' })
    expect(Array.from(lista.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      '01Portada', '02Tres experiencias', '03La venta del trimestre', '04Cierre',
    ])
    saltos = []
    await userEvent.click(screen.getByRole('button', { name: /La venta del trimestre/ }))
    expect(saltos).toEqual([{ seccion: 'venta', modo: 'instant' }])
    expect(screen.queryByRole('group', { name: 'Todas las láminas' })).not.toBeInTheDocument()
  })

  it('con el navegador abierto, Esc lo cierra y no saca de la presentación', async () => {
    montarCuatro()
    await userEvent.click(screen.getByRole('button', { name: /^presentar$/i }))
    await userEvent.click(screen.getByRole('button', { name: /Ir a otra lámina/ }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Todas las láminas' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument()
  })
})
