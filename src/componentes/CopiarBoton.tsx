'use client'

import { useState } from 'react'

interface Props {
  texto: string
  className?: string
}

/**
 * Botón mínimo para copiar texto al portapapeles (spec §9: el correo debe
 * "quedar listo para copiar y pegar"). Es el único componente cliente que
 * necesita este flujo — todo lo demás (generar, editar, publicar) vive en
 * MinutaCliente.tsx, que ya es 'use client'.
 */
export function CopiarBoton({ texto, className }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <button type="button" onClick={copiar} className={className}>
      {copiado ? 'Copiado ✓' : 'Copiar'}
    </button>
  )
}
