import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom (a esta versión) implementa el elemento <dialog> y su atributo/IDL
// `open`, pero NO los métodos `showModal()`/`close()` — quedan `undefined` en
// el prototipo (https://github.com/jsdom/jsdom/issues/3294). Varios
// componentes de la app abren su <dialog> con `showModal()` (LevantarMinuta,
// ModoPresentar, EditorMolde, ReunionesSala, ModuloMinutas...), así que
// cualquier test que los monte y llegue a abrir uno los necesita. Polyfill
// MÍNIMO: solo lo que esos componentes usan de verdad —reflejar `open` y
// disparar el evento `close` al cerrar, que es lo que dispara el Esc nativo
// del navegador y lo que esos componentes escuchan con `onClose`—, no el
// foco ni el "top layer" real que un navegador de verdad gestiona.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      if (!this.open) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}

// `next/font/google` solo funciona dentro del compilador de Next.js (webpack/turbopack
// reemplazan el módulo en tiempo de build). Fuera de ese pipeline —como aquí, bajo
// Vitest/Vite— el paquete real no exporta nada invocable. Se simula con una función
// que devuelve la variable CSS solicitada, para poder probar componentes que usan
// `next/font/google` sin tocar el pipeline de build real.
vi.mock('next/font/google', () => {
  const fuente = (opciones: { variable?: string } = {}) => ({
    variable: opciones.variable ? opciones.variable.replace('--', 'mock-') : 'mock-font',
    className: 'mock-font-class',
    style: { fontFamily: 'mock' },
  })
  return {
    Outfit: fuente,
    Montserrat: fuente,
    Raleway: fuente,
    Mukta_Mahee: fuente,
    Figtree: fuente,
    Anton: fuente,
    Bungee: fuente,
    Hanken_Grotesk: fuente,
    Archivo: fuente,
    // Las once nuevas del catálogo de tipografías (tarea 7, ronda 8).
    Inter: fuente,
    Manrope: fuente,
    DM_Sans: fuente,
    Space_Grotesk: fuente,
    Sora: fuente,
    Plus_Jakarta_Sans: fuente,
    Playfair_Display: fuente,
    Fraunces: fuente,
    Bebas_Neue: fuente,
    Oswald: fuente,
    Barlow_Condensed: fuente,
  }
})
