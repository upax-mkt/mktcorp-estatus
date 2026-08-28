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

export function CuentaRegresiva({ objetivo, etiqueta }: { objetivo: string; etiqueta: string }) {
  const [restante, setRestante] = useState(() => new Date(objetivo).getTime() - Date.now())

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

