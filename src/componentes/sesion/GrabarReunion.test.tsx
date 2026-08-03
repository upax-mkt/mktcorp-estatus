import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GrabarReunion } from './GrabarReunion'

// Doble mínimo de la Web Speech API: guarda los manejadores para dispararlos a mano.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- doble de una API del navegador sin tipos ambiente en el proyecto (ver la interfaz `Reconocimiento` de GrabarReunion.tsx, que es interna al componente).
let reconocedor: any
beforeEach(() => {
  reconocedor = { start: vi.fn(), stop: vi.fn(), abort: vi.fn(), onresult: null, onerror: null, onend: null }
  // `vi.fn(function () {...})` y no `vi.fn(() => ...)`: esto se invoca con `new` (GrabarReunion
  // hace `new Constructor()`), y Vitest 4 solo puede construir un mock cuya implementación sea una
  // function/class real — con una arrow function lanza "TypeError: ... is not a constructor" (ver
  // @vitest/spy/dist/index.js) antes incluso de llegar al código bajo prueba.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `webkitSpeechRecognition` no existe en el `globalThis` tipado de este proyecto.
  ;(globalThis as any).webkitSpeechRecognition = vi.fn(function () { return reconocedor })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mismo motivo: se pisa `navigator.mediaDevices` entero para el doble.
  ;(globalThis as any).navigator.mediaDevices = { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) }
})

function hablar(texto: string) {
  act(() => {
    reconocedor.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: texto }], { isFinal: true, length: 1 })] })
  })
}

describe('GrabarReunion — lo grabado no se pierde', () => {
  it('desmontarse con la grabación viva ENTREGA lo acumulado', async () => {
    const alTerminar = vi.fn()
    const { unmount } = render(<GrabarReunion alTerminar={alTerminar} />)
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('el tráfico cae por el mix de consultas')
    unmount()
    expect(alTerminar).toHaveBeenCalledWith(expect.stringContaining('el tráfico cae'))
  })

  it('un error a media reunión NO borra lo acumulado', async () => {
    const alTerminar = vi.fn()
    render(<GrabarReunion alTerminar={alTerminar} />)
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('primera parte')
    act(() => { reconocedor.onerror({ error: 'network' }) })
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('segunda parte')
    await userEvent.click(screen.getByRole('button', { name: /parar y minutar/i }))
    const entregado = alTerminar.mock.calls.at(-1)![0]
    expect(entregado).toContain('primera parte')
    expect(entregado).toContain('segunda parte')
  })

  it('desmontarse SIN haber grabado nada no llama a nada', () => {
    const alTerminar = vi.fn()
    const { unmount } = render(<GrabarReunion alTerminar={alTerminar} />)
    unmount()
    expect(alTerminar).not.toHaveBeenCalled()
  })
})

/**
 * REVISIÓN FINAL DE LA RAMA, PUNTO 3b.
 *
 * `onerror` ponía el estado en «listo» pero no anulaba `reconocimiento.current`,
 * así que el `onend` que el navegador dispara justo después de un error fatal
 * reenganchaba el MISMO reconocedor: el botón decía «Grabar» y el micrófono
 * seguía escuchando. Con un error permanente, cada reinicio volvía a fallar al
 * instante y el ciclo onerror→onend→start()→onerror… giraba sin freno.
 */
describe('GrabarReunion — un error corta de verdad, sin bucle', () => {
  it('tras un error fatal, "onend" ya NO reengancha el mismo reconocedor', async () => {
    const alTerminar = vi.fn()
    render(<GrabarReunion alTerminar={alTerminar} />)
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    expect(reconocedor.start).toHaveBeenCalledTimes(1)

    act(() => { reconocedor.onerror({ error: 'audio-capture' }) })
    // El navegador dispara `onend` justo después de un error fatal: si el fix
    // no cortara la referencia, esto reiniciaría el mismo reconocedor y el
    // botón seguiría diciendo «Grabar» con el micrófono todavía escuchando.
    act(() => { reconocedor.onend() })

    expect(reconocedor.start).toHaveBeenCalledTimes(1) // ningún reenganche automático
    expect(screen.getByRole('button', { name: /^grabar$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /parar y minutar/i })).not.toBeInTheDocument()
  })

  it('un fallo permanente (onend en bucle, sin ningún resultado real entre medias) para tras el tope de reintentos', async () => {
    const alTerminar = vi.fn()
    const { unmount } = render(<GrabarReunion alTerminar={alTerminar} />)
    await userEvent.click(screen.getByRole('button', { name: /grabar/i }))
    hablar('lo único que se alcanzó a decir antes de que empezara a fallar')
    expect(reconocedor.start).toHaveBeenCalledTimes(1)

    // Chrome reengancha solo en un `onend` normal (sin error) — pero si CADA
    // reinicio vuelve a terminar al instante, sin producir jamás un
    // resultado nuevo, es un fallo permanente y no un corte periódico sano.
    act(() => {
      for (let i = 0; i < 6; i++) reconocedor.onend()
    })

    // Se reengancha hasta el tope y ahí se rinde: no sigue creciendo para
    // siempre por mucho que `onend` se repita.
    const arranquesTrasElTope = reconocedor.start.mock.calls.length
    expect(arranquesTrasElTope).toBeLessThan(6)
    act(() => { reconocedor.onend() })
    expect(reconocedor.start.mock.calls.length).toBe(arranquesTrasElTope)

    // Y lo dice en pantalla: el botón vuelve a ofrecer «Grabar», no se queda
    // fingiendo que sigue grabando.
    expect(screen.getByRole('button', { name: /^grabar$/i })).toBeInTheDocument()

    // Lo dicho ANTES de que empezara a fallar no se pierde: sigue disponible
    // para la segunda red del efecto de desmontaje, porque el freno del
    // bucle no toca `reconocimiento.current` (a propósito: solo `parar()` lo
    // anula).
    unmount()
    expect(alTerminar).toHaveBeenCalledWith(expect.stringContaining('lo único que se alcanzó a decir'))
  })
})
