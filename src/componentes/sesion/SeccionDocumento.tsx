import type { CSSProperties } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { ListaVinetas } from '@/componentes/comunes/ListaVinetas'
import { Grafico } from '@/componentes/graficos/Grafico'
import { TablaSeccion } from './TablaSeccion'
import { MatrizSeccion } from './MatrizSeccion'
import { BloquesSeccion } from './BloquesSeccion'
import { MetaRealSeccion, CifrasDesglosadasSeccion } from './CumplimientoSeccion'
import { papelDe } from '@/secciones/catalogo'
import { IconoLayout } from './IconoLayout'
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

/**
 * Si una variación sube o baja, para poder pintarla distinto.
 *
 * Solo mira el signo escrito: no interpreta si subir es bueno. Una posición
 * media que baja de 9.8 a 9.6 es una mejora, y este documento no puede
 * saberlo — por eso el color dice "bajó", no "va mal". Lo que sí resuelve es
 * el problema de antes: cuatro variaciones, tres de ellas caídas, pintadas
 * todas del color de marca, o sea del color de "esto está bien".
 */
function signoDelta(delta: string): 'sube' | 'baja' | undefined {
  const t = delta.trimStart()
  if (t.startsWith('-') || t.startsWith('−') || t.startsWith('▼')) return 'baja'
  if (t.startsWith('+') || t.startsWith('▲')) return 'sube'
  return undefined
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
  /**
   * La agenda con su imagen DE FONDO, no debajo.
   *
   * El campo existía y se pintaba como una foto suelta al final de la
   * sección, después del índice: en un documento que se proyecta, eso es una
   * imagen que nadie mira porque la agenda ya se leyó. Como fondo del bloque
   * de agenda, la imagen hace lo que se le pide — dar carácter a la apertura
   * de la reunión — sin robarle sitio al índice.
   *
   * Lleva velo, y no es negociable: el índice es texto sobre una foto que
   * nadie eligió pensando en el contraste.
   */
  const agendaConFondo = decision.layout === 'agenda' && Boolean(decision.imagen)

  return (
    <section
      id={ancla}
      className={estilos.seccion}
      data-layout={decision.layout}
      // Los hitos —portada, divisores, cierre— respiran más: son los puntos
      // donde el documento cambia de bloque.
      data-destacada={papel === 'hito' ? 'true' : undefined}
      aria-label={decision.titulo}
      data-con-fondo={agendaConFondo ? 'true' : undefined}
      style={agendaConFondo ? ({ '--fondo-agenda': `url(${JSON.stringify(decision.imagen?.url)})` } as CSSProperties) : undefined}
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
        // El icono va en el CARRIL, no junto al título: ahí no le quita sitio
        // al texto y dice de qué clase es la sección antes de leerla.
        <>
          <IconoLayout layout={decision.layout} className={estilos.iconoCarril} />
          <h2 className={estilos.titulo}>{decision.titulo}</h2>
        </>
      )}

      {!esPortada && decision.subtitulo && (
        <p className={estilos.subtitulo}>{decision.subtitulo}</p>
      )}

      {/* ÍNDICE. En papel era una lista muerta; aquí lleva a cada sección.
          LO ESCRITO MANDA SOBRE LO GENERADO, y ese orden importa:

          antes el índice se generaba SIEMPRE con las secciones reales e
          ignoraba por completo lo que se hubiera escrito en la agenda. El
          editor ofrecía su campo "Puntos", se escribía, se guardaba… y el
          documento seguía enseñando otra cosa. Franco: *"en el editor
          modifiqué la agenda y eso no se ve reflejado en el preview"*. Un
          campo que se puede llenar y no hace nada es peor que no tenerlo.

          Ahora: si hay agenda escrita, esa es la agenda —y cada línea sigue
          siendo un enlace cuando coincide con una sección, así que no se
          pierde la navegación—; si no hay nada escrito, se genera sola con
          las secciones reales, que es lo que hace que nadie tenga que
          teclearla. */}
      {papel === 'indice' && (() => {
        const escrita = (decision.cuerpo ?? []).filter((l) => l.trim().length > 0)
        const generado = indice_general ?? []
        if (escrita.length === 0 && generado.length === 0) return null

        const anclaDe = (linea: string) =>
          generado.find((e) => e.titulo.trim().toLowerCase() === linea.trim().toLowerCase())?.ancla

        const entradas = escrita.length > 0
          ? escrita.map((linea, i) => ({ titulo: linea, ancla: anclaDe(linea), clave: `escrita-${i}` }))
          : generado.map((e) => ({ titulo: e.titulo, ancla: e.ancla, clave: e.ancla }))

        return (
          <ol className={estilos.indice}>
            {entradas.map((e) => (
              <li key={e.clave} className={estilos.indiceFila}>
                {e.ancla ? (
                  <a href={`#${e.ancla}`} className={estilos.indiceEnlace}>{e.titulo}</a>
                ) : (
                  <span>{e.titulo}</span>
                )}
              </li>
            ))}
          </ol>
        )
      })()}

      {/* `cuerpo` en una sección que NO es el índice: líneas sueltas, sin
          enlazar. Hoy solo el layout de agenda declara este campo
          (`catalogo.ts`), pero el contrato lo admite en cualquiera y una
          propuesta de la IA puede traerlo: sin esto se perdería en silencio. */}
      {papel !== 'indice' && decision.cuerpo && decision.cuerpo.length > 0 && (
        <ol className={estilos.cuerpo}>
          {decision.cuerpo.map((linea, i) => (
            <li key={`linea-${i}`}>{linea}</li>
          ))}
        </ol>
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
                {kpi.delta && (
                  <span className={estilos.cifraDelta} data-signo={signoDelta(kpi.delta)}>
                    {kpi.delta}
                  </span>
                )}
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
          que no pasa por next/image (exigiría declarar cada dominio). El
          ancho y la alineación son del editor manual (`CampoImagen`): sin
          ellos, 100% / centro — no se recorta ni se edita la imagen, eso es
          otro producto. */}
      {decision.imagen && !agendaConFondo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={decision.imagen.url}
          alt={decision.titulo}
          className={estilos.imagen}
          data-alineacion={decision.imagen.alineacion ?? 'centro'}
          style={{ '--imagen-ancho': `${decision.imagen.anchoPorcentaje ?? 100}%` } as CSSProperties}
        />
      )}

      {/* El vídeo se sube entero desde el editor (`CampoVideo`) — nunca lo
          propone la IA. `controls` es lo único que hace falta para que
          reproduzca aquí y en pantalla completa: `ModoPresentar` no dibuja
          este documento de nuevo, solo proyecta el MISMO DOM a pantalla
          completa, así que el vídeo sigue siendo el mismo elemento. */}
      {decision.video && (
        <figure className={estilos.video}>
          <video
            src={decision.video.url}
            controls
            preload="metadata"
            aria-label={decision.video.titulo}
            className={estilos.videoReproductor}
          />
          <figcaption className={estilos.videoTitulo}>{decision.video.titulo}</figcaption>
        </figure>
      )}

      {/* La salvedad de medición va al final y en cuerpo menor: es contexto
          para quien pregunte, no contenido que compita con las cifras. */}
      {decision.notaPie && <p className={estilos.notaPie}>{decision.notaPie}</p>}
    </section>
  )
}
