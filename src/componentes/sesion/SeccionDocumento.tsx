import type { CSSProperties } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import estilos from './documento.module.css'

/**
 * Una decisión del motor, renderizada como SECCIÓN DE DOCUMENTO en vez de como
 * diapositiva.
 *
 * El motor no cambió: sigue devolviendo título, cifras, columnas y cuerpo. Lo
 * que cambió es qué se hace con eso. Antes cada decisión se metía en un marco
 * de 16:9 —un PowerPoint dibujado con HTML, que no se podía navegar ni
 * enlazar—; ahora es una sección de una página que se lee con scroll, se
 * enlaza y se proyecta a pantalla completa cuando hace falta.
 *
 * Por eso el `layout` que eligió el motor sigue mandando: no dicta un marco
 * fijo, dicta QUÉ ES esta sección dentro del documento (encabezado, índice,
 * bloque de cifras, separador, cierre).
 */

/** El esquema permite hasta 4 columnas: la grilla se adapta a la cantidad real. */
function estiloColumnas(cantidad: number): CSSProperties {
  return { '--columnas-cantidad': Math.max(1, cantidad) } as CSSProperties
}

/** Ancla estable para que el índice pueda enlazar a esta sección. */
export function anclaDeSeccion(indice: number): string {
  return `seccion-${indice + 1}`
}

interface Props {
  decision: DecisionSlide
  indice: number
  /** Títulos de todas las secciones — solo lo usa el layout de índice. */
  indice_general?: Array<{ titulo: string; ancla: string }>
  degradado?: boolean
  motivo?: string
}

export function SeccionDocumento({ decision, indice, indice_general, degradado, motivo }: Props) {
  const ancla = anclaDeSeccion(indice)
  const esPortada = decision.layout === 'portada'
  const esDivisor = decision.layout === 'divisor-seccion'
  const esCierre = decision.layout === 'cierre'

  return (
    <section
      id={ancla}
      className={estilos.seccion}
      data-layout={decision.layout}
      data-destacada={esPortada || esDivisor || esCierre ? 'true' : undefined}
      aria-label={decision.titulo}
    >
      {degradado && (
        <p className={estilos.avisoRevision}>
          ⚠ Requiere revisión — {motivo ?? 'el motor degradó esta sección'}
        </p>
      )}

      {esPortada ? (
        <header className={estilos.portada}>
          <h1 className={estilos.portadaTitulo}>{decision.titulo}</h1>
          {decision.subtitulo && <p className={estilos.portadaSubtitulo}>{decision.subtitulo}</p>}
        </header>
      ) : (
        <h2 className={estilos.titulo}>{decision.titulo}</h2>
      )}

      {!esPortada && decision.subtitulo && (
        <p className={estilos.subtitulo}>{decision.subtitulo}</p>
      )}

      {/* Índice: en papel era una lista muerta; aquí lleva a cada sección. */}
      {decision.layout === 'agenda' && indice_general && indice_general.length > 0 ? (
        <ol className={estilos.indice}>
          {indice_general.map((entrada) => (
            <li key={entrada.ancla}>
              <a href={`#${entrada.ancla}`} className={estilos.indiceEnlace}>
                {entrada.titulo}
              </a>
            </li>
          ))}
        </ol>
      ) : (
        decision.cuerpo && (
          <ol className={estilos.cuerpo}>
            {decision.cuerpo.map((linea, i) => (
              <li key={`linea-${i}`}>{linea}</li>
            ))}
          </ol>
        )
      )}

      {decision.kpis && decision.kpis.length > 0 && (
        <div className={estilos.cifras}>
          {decision.kpis.map((kpi, i) => (
            <div key={`kpi-${i}`} className={estilos.cifra}>
              <div className={estilos.cifraValor}>
                {kpi.valor}
                {kpi.delta && <span className={estilos.cifraDelta}>{kpi.delta}</span>}
              </div>
              <div className={estilos.cifraRotulo}>{kpi.rotulo}</div>
            </div>
          ))}
        </div>
      )}

      {decision.columnas && decision.columnas.length > 0 && (
        <div className={estilos.columnas} style={estiloColumnas(decision.columnas.length)}>
          {decision.columnas.map((col, i) => (
            <div key={`col-${i}`}>
              <h3 className={estilos.columnaTitulo}>{col.titulo}</h3>
              <ul className={estilos.columnaPuntos}>
                {col.puntos.map((p, j) => (
                  <li key={`p-${i}-${j}`}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* La ruta la aporta el equipo y puede apuntar fuera del proyecto, así
          que no pasa por next/image (exigiría declarar cada dominio). */}
      {decision.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={decision.imagen} alt={decision.titulo} className={estilos.imagen} />
      )}
    </section>
  )
}
