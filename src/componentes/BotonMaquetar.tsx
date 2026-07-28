'use client'

import { useFormStatus } from 'react-dom'

/**
 * Botón de "Maquetar" con estado de envío.
 *
 * DICE LO QUE VA A TARDAR DE VERDAD. Antes anunciaba "~25 s" siempre, y en una
 * sesión armada a mano —que es el camino principal— el trabajo son
 * microsegundos: ni una llamada a un modelo, el mismo resultado que la última
 * vez. Anunciar medio minuto de espera para algo instantáneo enseña a
 * desconfiar del resto de los avisos de la app.
 *
 * Los ~25 s son reales solo cuando alguna sección se dejó al asistente: son
 * dos llamadas a Claude en serie. Sin el estado de envío el botón se quedaba
 * idéntico todo ese rato y la reacción natural era volver a pulsarlo — otra
 * tanda de llamadas.
 *
 * `useFormStatus` obliga a que sea un componente de cliente y a que viva DENTRO
 * del <form>, no en el mismo componente que lo declara — de ahí que esté aquí
 * y no en la página.
 */
interface Props {
  className?: string
  /** true si alguna sección se resuelve con IA; entonces sí hay espera real. */
  conIA?: boolean
}

export function BotonMaquetar({ className, conIA }: Props) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (conIA ? 'Maquetando… (~25 s)' : 'Maquetando…') : 'Maquetar →'}
    </button>
  )
}
