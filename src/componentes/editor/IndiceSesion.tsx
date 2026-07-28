'use client'

import estilos from '@/app/deck/deck.module.css'

/**
 * El mapa de la sesión, siempre a la vista.
 *
 * El editor mide unos 5.900px de alto y se navegaba a scroll, sin saber
 * cuántas secciones quedaban ni cuáles estaban vacías. El documento que esta
 * herramienta produce sí tiene índice; la herramienta no lo tenía.
 *
 * Ancla a la tarjeta de cada sección con un enlace normal —`#id`— en vez de
 * observar el scroll: la lista es corta, el navegador ya sabe llevarte, y un
 * observador de intersección sobre catorce tarjetas es código que hay que
 * mantener para resolver algo que el enlace resuelve solo.
 */

export interface EntradaIndice {
  id: string
  titulo: string
  llenado: boolean
  esSub: boolean
}

interface Props {
  entradas: EntradaIndice[]
  llenadas: number
  total: number
}

export function IndiceSesion({ entradas, llenadas, total }: Props) {
  return (
    <nav className={estilos.indice} aria-label="Secciones de la sesión">
      <div className={estilos.indiceCabecera}>
        <span className={estilos.indiceTitulo}>Secciones</span>
        <span className={estilos.indiceConteo}>
          {llenadas}/{total}
        </span>
      </div>
      <ol className={estilos.indiceLista}>
        {entradas.map((e) => (
          <li key={e.id}>
            <a
              href={`#seccion-${e.id}`}
              className={estilos.indiceEnlace}
              data-sub={e.esSub ? 'true' : undefined}
              data-llenado={e.llenado ? 'true' : undefined}
            >
              <span className={estilos.indicePunto} aria-hidden />
              <span className={estilos.indiceNombre}>{e.titulo}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
