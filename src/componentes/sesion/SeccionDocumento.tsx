import type { CSSProperties } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { ListaVinetas } from '@/componentes/comunes/ListaVinetas'
import { Grafico } from '@/componentes/graficos/Grafico'
import { TablaSeccion } from './TablaSeccion'
import { MatrizSeccion } from './MatrizSeccion'
import { BloquesSeccion } from './BloquesSeccion'
import { MetaRealSeccion, CifrasDesglosadasSeccion } from './CumplimientoSeccion'
import { papelDe } from '@/secciones/catalogo'
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
  const papel = papelDe(decision.layout)
  const esPortada = decision.layout === 'portada'

  return (
    <section
      id={ancla}
      className={estilos.seccion}
      data-layout={decision.layout}
      // Los hitos —portada, divisores, cierre— respiran más: son los puntos
      // donde el documento cambia de bloque.
      data-destacada={papel === 'hito' ? 'true' : undefined}
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
      {papel === 'indice' && indice_general && indice_general.length > 0 ? (
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

      {/* ORDEN DE LECTURA de una sección, y por qué:
          primero la evidencia (cifras, cumplimiento, tablas, gráficos, matriz)
          y después la lectura que se hace de ella (bloques, columnas). Un
          director que ya vio el dato entiende la conclusión; al revés tiene
          que creerse la conclusión y buscar el dato para verificarla. */}

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

      {/* El cumplimiento antes del desglose: "1 SQL de 7" es la noticia, y el
          pipeline es lo que la explica. Al revés, el director lee seis cifras
          grandes antes de saber si el mes fue bueno o malo. */}
      {decision.metaReal && <MetaRealSeccion metaReal={decision.metaReal} />}

      {decision.cifrasDesglosadas && decision.cifrasDesglosadas.length > 0 && (
        <CifrasDesglosadasSeccion cifras={decision.cifrasDesglosadas} />
      )}

      {decision.tablas?.map((tabla, i) => (
        <TablaSeccion key={`tabla-${i}`} tabla={tabla} />
      ))}

      {decision.graficos?.map((grafico, i) => (
        <Grafico key={`grafico-${i}`} grafico={grafico} />
      ))}

      {decision.matriz && <MatrizSeccion matriz={decision.matriz} />}

      {decision.bloques && decision.bloques.length > 0 && (
        <BloquesSeccion bloques={decision.bloques} />
      )}

      {decision.columnas && decision.columnas.length > 0 && (
        <div className={estilos.columnas} style={estiloColumnas(decision.columnas.length)}>
          {decision.columnas.map((col, i) => (
            <div key={`col-${i}`}>
              <h3 className={estilos.columnaTitulo}>
                {col.titulo}
                {col.etiqueta && <span className={estilos.columnaEtiqueta}>{col.etiqueta}</span>}
              </h3>
              <ListaVinetas
                vinetas={col.puntos}
                className={estilos.columnaPuntos}
                prefijo={`p-${i}`}
              />
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

      {/* La salvedad de medición va al final y en cuerpo menor: es contexto
          para quien pregunte, no contenido que compita con las cifras. */}
      {decision.notaPie && <p className={estilos.notaPie}>{decision.notaPie}</p>}
    </section>
  )
}
