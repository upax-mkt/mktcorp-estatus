import type { CSSProperties, ReactNode } from 'react'
import type { Tema } from '@/temas/tipos'
import { derivarEscalaDatos } from '@/lib/escala-datos'
import { familiaCss } from '@/temas/fuentes'
import { mejorTextoSobre, ajustarGradienteParaTexto } from '@/lib/superficie-texto'
import { contraste } from '@/lib/color'

interface Props {
  tema: Tema
  superficie: 'clara' | 'oscura'
  children: ReactNode
}

export function ProveedorTema({ tema, superficie, children }: Props) {
  const fondo = superficie === 'clara' ? tema.superficieClara : tema.superficieOscura
  const texto = superficie === 'clara' ? tema.textoSobreClara : tema.textoSobreOscura
  const datos = derivarEscalaDatos(tema.primario, fondo)

  // El degradado de marca no garantiza contraste con ningún texto: algunas
  // paradas son casi tan claras como el blanco (NeraCode, Marketing United,
  // UiX), lo que dejaba texto prácticamente invisible sobre ellas. Elegimos
  // el color de texto que mejor resiste el peor caso del degradado, y luego
  // ajustamos las paradas (conservando matiz y saturación) para garantizar
  // 4.5:1 contra ese texto en las tres. `--gradiente` queda intacto: es el
  // degradado de marca puro, sólo para superficies decorativas sin texto.
  const textoSobreGradiente = mejorTextoSobre(tema.gradiente, [
    tema.textoSobreOscura,
    tema.textoSobreClara,
  ])
  const gradienteAjustado = ajustarGradienteParaTexto(tema.gradiente, textoSobreGradiente)

  // El subtítulo de portada usa --primario por identidad de marca, pero
  // --primario no siempre contrasta con el degradado ajustado (que se ajustó
  // para textoSobreGradiente, no para primario). Si no alcanza 4.5:1 contra
  // alguna parada, cae a textoSobreGradiente en vez de arriesgar legibilidad.
  const primarioContrastaGradiente = gradienteAjustado.every(
    (parada) => contraste(tema.primario, parada) >= 4.5,
  )
  const subtituloSobreGradiente = primarioContrastaGradiente ? tema.primario : textoSobreGradiente

  const variables: Record<string, string> = {
    '--primario': tema.primario,
    '--secundario': tema.secundario,
    '--acento': tema.acento,
    '--superficie': fondo,
    '--texto': texto,
    '--gradiente': `linear-gradient(135deg, ${tema.gradiente.join(', ')})`,
    '--gradiente-texto': `linear-gradient(135deg, ${gradienteAjustado.join(', ')})`,
    '--fuente-display': familiaCss(tema.familiaDisplay),
    '--fuente-texto': familiaCss(tema.familiaTexto),
    '--texto-sobre-gradiente': textoSobreGradiente,
    '--subtitulo-sobre-gradiente': subtituloSobreGradiente,
  }
  datos.forEach((color, i) => { variables[`--dato-${i + 1}`] = color })

  return (
    <div data-testid="tema" data-sala={tema.slug} style={variables as CSSProperties}>
      {children}
    </div>
  )
}
