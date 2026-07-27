'use client'

import { useFormStatus } from 'react-dom'

/**
 * Botón de "Maquetar" con estado de envío.
 *
 * El motor tarda ~25 s (dos llamadas a Claude en serie). Sin esto el botón se
 * quedaba idéntico todo ese rato y la reacción natural era volver a pulsarlo:
 * cada pulsación es otra tanda de llamadas a la API. Ahora se deshabilita y
 * dice lo que está pasando.
 *
 * `useFormStatus` obliga a que sea un componente de cliente y a que viva DENTRO
 * del <form>, no en el mismo componente que lo declara — de ahí que esté aquí
 * y no en la página.
 */
export function BotonMaquetar({ className }: { className?: string }) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? 'Maquetando… (~25 s)' : 'Maquetar →'}
    </button>
  )
}
