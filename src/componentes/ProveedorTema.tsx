import type { CSSProperties, ReactNode } from 'react'
import { archivoDeLogo } from '@/temas/logos'
import type { Tema } from '@/temas/tipos'
import { derivarEscalaDatos } from '@/lib/escala-datos'
import { familiaCss } from '@/temas/fuentes'
import { ajustarColorParaContraste } from '@/lib/superficie-texto'

interface Props {
  tema: Tema
  superficie: 'clara' | 'oscura'
  children: ReactNode
}

export function ProveedorTema({ tema, superficie, children }: Props) {
  const fondo = superficie === 'clara' ? tema.superficieClara : tema.superficieOscura
  const texto = superficie === 'clara' ? tema.textoSobreClara : tema.textoSobreOscura
  const datos = derivarEscalaDatos(tema.primario, fondo)

  // --primario es el color de marca puro (para usos sin texto, p.ej. rellenos
  // decorativos): nunca se toca. Para texto pintado directamente sobre
  // --superficie (p.ej. .columnaTitulo, .subtitulo, .kpiDelta en
  // deck.module.css), el primario no siempre alcanza 4.5:1 contra la
  // superficie clara u oscura de cada marca (Promo Espacio cae a 2.97:1 sobre
  // superficieClara). Publicamos un token aparte, ajustado en luminosidad
  // —conservando matiz y saturación— hasta cumplir el mínimo contra la
  // superficie que esté activa. Si el primario ya cumple, se usa tal cual.
  const primarioSobreSuperficie = ajustarColorParaContraste(tema.primario, fondo, 4.5)

  const variables: Record<string, string> = {
    '--primario': tema.primario,
    '--primario-sobre-superficie': primarioSobreSuperficie,
    '--secundario': tema.secundario,
    '--acento': tema.acento,
    '--superficie': fondo,
    '--texto': texto,
    // Degradado de marca EXACTO, sin ajustar (decisión de marca 24-jul): sólo
    // para superficies decorativas sin texto (.portadaFranja, .kpi::before).
    // Nunca se deriva un token "apto para texto" de esto — ese era el defecto
    // anterior; ahora el texto vive siempre sobre --superficie/--texto.
    '--gradiente': `linear-gradient(135deg, ${tema.gradiente.join(', ')})`,
    /**
     * El logotipo de la sala, en blanco, listo para ponerlo de fondo.
     *
     * Va como variable y no como prop porque quien lo necesita es una regla de
     * CSS —el `::before` de la portada— y hacerlo llegar hasta ahí como prop
     * obligaría a atravesar cuatro componentes que no tienen nada que ver.
     */
    '--logo-blanco': `url("${archivoDeLogo(tema.slug, 'blanco')}")`,
    '--fuente-display': familiaCss(tema.familiaDisplay),
    '--fuente-texto': familiaCss(tema.familiaTexto),
  }
  datos.forEach((color, i) => { variables[`--dato-${i + 1}`] = color })

  return (
    <div data-testid="tema" data-sala={tema.slug} style={variables as CSSProperties}>
      {children}
    </div>
  )
}
