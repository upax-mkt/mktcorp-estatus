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
