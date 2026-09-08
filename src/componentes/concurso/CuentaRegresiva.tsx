'use client'

import { useEffect, useState } from 'react'
import estilos from '@/app/concurso/concurso.module.css'

function partes(restante: number) {
  const total = Math.max(0, Math.floor(restante / 1000))
  return {
    días: Math.floor(total / 86400),
    horas: Math.floor(total % 86400 / 3600),
    minutos: Math.floor(total % 3600 / 60),
    segundos: total % 60,
  }
}

/**
 * `desde` ES EL INSTANTE DEL SERVIDOR, Y NO UN LUJO.
 *
 * El primer render ocurre DOS veces —una en el servidor, que pinta el HTML, y
 * otra en el navegador, que lo hidrata— y tiene que dar exactamente lo mismo.
 * Con `Date.now()` nunca daba: entre las dos pasa el viaje de red, así que los
 * segundos del HTML jamás eran los que el cliente calculaba y React tiraba el
 * árbol entero (error #418 en la consola de producción, en cada carga).
 *
 * Pasando el reloj del servidor como dato, los dos primeros renders parten del
 * mismo número. El reloj real entra en el efecto, que no corre durante la
 * hidratación: para cuando el contador empieza a moverse, ya no hay nada que
 * comparar.
 */
export function CuentaRegresiva({ objetivo, etiqueta, desde }: { objetivo: string; etiqueta: string; desde: string }) {
  const [restante, setRestante] = useState(() => new Date(objetivo).getTime() - new Date(desde).getTime())

  useEffect(() => {
    const actualizar = () => setRestante(new Date(objetivo).getTime() - Date.now())
    actualizar()
    const intervalo = window.setInterval(actualizar, 1000)
    return () => window.clearInterval(intervalo)
  }, [objetivo])

  const valor = partes(restante)
  if (restante <= 0) return <p className={estilos.contadorFinal}>Es momento.</p>

  return (
    <section className={estilos.contador} aria-label={etiqueta}>
      <p className={estilos.contadorEtiqueta}>{etiqueta}</p>
      <div className={estilos.contadorNumeros} aria-live="off">
        {Object.entries(valor).map(([unidad, numero]) => (
          <span className={estilos.contadorBloque} key={unidad}>
            <strong>{String(numero).padStart(2, '0')}</strong>
            <small>{unidad}</small>
          </span>
        ))}
      </div>
    </section>
  )
}

