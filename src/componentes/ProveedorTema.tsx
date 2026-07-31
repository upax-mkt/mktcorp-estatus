import type { CSSProperties, ReactNode } from 'react'
import { archivoDeLogo } from '@/temas/logos'
import type { Tema } from '@/temas/tipos'
import { derivarEscalaDatos } from '@/lib/escala-datos'
import { familiaCss, clasesDeFuentes } from '@/temas/fuentes'
import { ajustarColorParaContraste } from '@/lib/superficie-texto'

interface Props {
  tema: Tema
  superficie: 'clara' | 'oscura'
  children: ReactNode
  /**
   * El logo subido desde `/salas` (revisión final de la rama, punto 3) — NO
   * viene dentro de `tema`: `Tema`/`cargarTemas()` no traen `logoUrl` a
   * propósito (nunca formó parte de ese tipo, ver el comentario de
   * `esquema.salas` en src/db/esquema.ts), así que quien monta este proveedor
   * lo pasa aparte si lo tiene. `undefined`/`null` —el caso de hoy para las
   * nueve salas reales— cae al archivo estático de siempre.
   */
  logoUrl?: string | null
}

export function ProveedorTema({ tema, superficie, children, logoUrl }: Props) {
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
    '--logo-blanco': `url("${archivoDeLogo(tema.slug, 'blanco', logoUrl)}")`,
    '--fuente-display': familiaCss(tema.familiaDisplay),
    '--fuente-texto': familiaCss(tema.familiaTexto),
  }
  datos.forEach((color, i) => { variables[`--dato-${i + 1}`] = color })

  return (
    <div
      data-testid="tema"
      data-sala={tema.slug}
      // CARGA SELECTIVA (tarea 7, ronda 8): las variables CSS de SOLO las dos
      // familias de esta sala (una si título y texto comparten familia), no
      // las veinte del catálogo. `--fuente-display`/`--fuente-texto` de
      // arriba son referencias `var(--f-…)` — sin la clase que de verdad
      // define esa variable en algún ancestro, apuntarían a nada. Antes esa
      // clase la ponían las veinte (o las nueve, Fase 1) colgadas del
      // `<body>` en el layout raíz; ahora la pone la propia sala, aquí, y
      // solo la suya — es el único sitio de la app donde una tipografía de
      // marca se pinta de verdad (ver `documento.module.css`,
      // `piezas.module.css`, `grafico.module.css`).
      className={clasesDeFuentes([tema.familiaDisplay, tema.familiaTexto])}
      style={variables as CSSProperties}
    >
      {children}
    </div>
  )
}
