'use client'

import { useMemo } from 'react'
import { correoAHtml } from '@/minuta/correo-html'
import estilos from '@/app/deck/deck.module.css'

/**
 * LA MINUTA COMO SE VA A VER EN EL CORREO, no como está guardada.
 *
 * Estaba en un `<pre>` monoespaciado: la forma de enseñar un archivo de
 * registro, no un correo. Y engañaba en el único sitio donde importa — la
 * tabla de acuerdos se veía alineada por la tipografía de ancho fijo y al
 * pegarla en Gmail, que compone en Arial, se deshacía.
 *
 * Ahora se pinta con el MISMO HTML que se copia al portapapeles. Lo que se
 * revisa antes de mandar es lo que va a llegar.
 *
 * `dangerouslySetInnerHTML` con el HTML de `correoAHtml`, que escapa todo el
 * texto que no es suyo: las etiquetas son literales del módulo y cada trozo
 * que viene del modelo pasa por `escapar()`. No hay camino por el que la
 * transcripción de una reunión acabe siendo marcado.
 */
export function CorreoMinuta({ texto, className }: { texto: string; className?: string }) {
  const html = useMemo(
    // Sin `base`: el enlace se pinta como texto. El absoluto solo hace falta
    // al copiar, y `window` no existe cuando esto se renderiza en el servidor.
    () => correoAHtml(texto),
    [texto],
  )
  return (
    <div
      className={`${estilos.minutaCorreoVista} ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
