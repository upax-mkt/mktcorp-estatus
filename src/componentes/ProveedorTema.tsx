import type { CSSProperties, ReactNode } from 'react'
import type { Tema } from '@/temas/tipos'
import { derivarEscalaDatos } from '@/lib/escala-datos'
import { familiaCss } from '@/temas/fuentes'

interface Props {
  tema: Tema
  superficie: 'clara' | 'oscura'
  children: ReactNode
}

export function ProveedorTema({ tema, superficie, children }: Props) {
  const fondo = superficie === 'clara' ? tema.superficieClara : tema.superficieOscura
  const texto = superficie === 'clara' ? tema.textoSobreClara : tema.textoSobreOscura
  const datos = derivarEscalaDatos(tema.primario, fondo)

  const variables: Record<string, string> = {
    '--primario': tema.primario,
    '--secundario': tema.secundario,
    '--acento': tema.acento,
    '--superficie': fondo,
    '--texto': texto,
    '--gradiente': `linear-gradient(135deg, ${tema.gradiente.join(', ')})`,
    '--fuente-display': familiaCss(tema.familiaDisplay),
    '--fuente-texto': familiaCss(tema.familiaTexto),
    '--texto-sobre-gradiente': tema.textoSobreOscura,
  }
  datos.forEach((color, i) => { variables[`--dato-${i + 1}`] = color })

  return (
    <div data-testid="tema" data-sala={tema.slug} style={variables as CSSProperties}>
      {children}
    </div>
  )
}
