'use client'

import { useState } from 'react'
import { correoAHtml } from '@/minuta/correo-html'

interface Props {
  texto: string
  className?: string
  /**
   * Copiar CON FORMATO, además del texto plano.
   *
   * El portapapeles admite varias versiones de lo mismo a la vez y quien pega
   * elige: Gmail toma la de HTML —con sus negritas y su tabla de verdad— y un
   * editor de texto plano toma la otra. No es una conversión: es el mismo
   * correo ofrecido en dos formas, así que nunca se pierde el original.
   */
  formatoCorreo?: boolean
}

/**
 * Botón mínimo para copiar texto al portapapeles (spec §9: el correo debe
 * "quedar listo para copiar y pegar"). Es el único componente cliente que
 * necesita este flujo — todo lo demás (generar, editar, publicar) vive en
 * MinutaCliente.tsx, que ya es 'use client'.
 */
export function CopiarBoton({ texto, className, formatoCorreo }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      if (formatoCorreo && typeof ClipboardItem !== 'undefined') {
        // `location.origin` solo aquí: el enlace del pie viaja relativo en el
        // texto guardado y dentro de un correo eso no lleva a ningún sitio.
        const html = correoAHtml(texto, window.location.origin)
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([texto], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(texto)
      }
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      // Si `write` no está o lo rechaza el navegador, el texto plano nunca
      // falla: se prefiere copiar sin formato a no copiar.
      try {
        await navigator.clipboard.writeText(texto)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 1800)
      } catch {
        setCopiado(false)
      }
    }
  }

  return (
    <button type="button" onClick={copiar} className={className}>
      {copiado ? 'Copiado ✓' : formatoCorreo ? 'Copiar para correo' : 'Copiar'}
    </button>
  )
}
