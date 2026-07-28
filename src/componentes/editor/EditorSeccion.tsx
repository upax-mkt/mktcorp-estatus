'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { tipoDeSeccion, type CampoSeccion } from '@/secciones/catalogo'
import { loQueFalta, campoQueFalta, borradorTieneContenido, type BorradorSeccion } from '@/secciones/borrador'
import { parsearLineas } from '@/secciones/parseo'
import {
  CampoKpis, CampoColumnas, CampoTablas, CampoGraficos,
  CampoMetaReal, CampoCifrasDesglosadas, CampoBloques, CampoMatriz,
} from './CamposEstructurados'
import { AreaTexto } from './AreaTexto'
import { AsistenteIA } from './AsistenteIA'
import { VistaPrevia } from './VistaPrevia'
import { SelectorTipo } from './SelectorTipo'
import { soloCamposDelTipo, NOMBRE_DE_CAMPO } from '@/secciones/borrador'
import type { Tema } from '@/temas/tipos'
import estilos from './editor.module.css'

/**
 * El editor de una sección.
 *
 * ESTA ES LA VÍA PRINCIPAL de la app, y por eso funciona entera sin IA: el
 * equipo elige qué tipo de sección es, llena los campos de ese tipo y el
 * sistema la maqueta. Ni una llamada a un modelo, ni una espera, ni la
 * posibilidad de que algo reinterprete lo que alguien ya decidió.
 *
 * El asistente de IA vive dentro, plegado: se pega texto crudo y propone un
 * relleno para estos mismos campos, que después se corrige a mano. Es un
 * atajo, y se nota que lo es.
 *
 * CADA TIPO ENSEÑA SOLO SUS CAMPOS. Un formulario con las trece cosas siempre
 * a la vista convierte llenar una portada en descartar once campos.
 */

interface Props {
  borrador: BorradorSeccion
  /** Nombre de la sección en la estructura. Sirve de título si no se escribe otro. */
  tituloDeRespaldo?: string
  guardarAction: (seccion: BorradorSeccion) => Promise<void>
  /** Texto crudo ya guardado para el asistente, si lo hay. */
  textoCrudo?: string
  proponerAction?: (texto: string) => Promise<BorradorSeccion | { error: string }>
  /** El tema de la sala: la vista previa se pinta con SUS colores. */
  tema: Tema
}

/**
 * Qué se dejaría de presentar al cambiar de tipo.
 *
 * Lo escrito NO se borra —sigue guardado y vuelve si se deshace el cambio—,
 * pero el tipo nuevo no lo enseña, y esa diferencia era invisible: se cambiaba
 * "Cifras y análisis" por "Portada" y tres KPIs desaparecían de la pantalla
 * sin una palabra.
 */
function loQueDejaDeVerse(borrador: BorradorSeccion, nuevoLayout: DecisionSlide['layout']): string[] {
  const antes = soloCamposDelTipo(borrador)
  const despues = soloCamposDelTipo({ ...borrador, layout: nuevoLayout })
  return (Object.keys(antes) as (keyof BorradorSeccion)[])
    .filter((campo) => campo !== 'layout' && campo !== 'titulo')
    .filter((campo) => antes[campo] !== undefined && despues[campo] === undefined)
    .map((campo) => NOMBRE_DE_CAMPO[campo as keyof typeof NOMBRE_DE_CAMPO] ?? String(campo))
}

/** Cómo se llama, en singular, lo que vive dentro de cada lista. */
const UNO_DE: Record<string, string> = {
  tablas: 'una tabla',
  graficos: 'un gráfico',
  kpis: 'una cifra',
  columnas: 'una columna',
  filas: 'una fila',
  celdas: 'una celda',
  puntos: 'una línea',
  hijos: 'una línea',
  series: 'una serie',
  valores: 'un valor',
  bloques: 'un bloque',
  cifrasDesglosadas: 'una cifra',
  cuerpo: 'una línea',
  periodos: 'un periodo',
}

/**
 * Dónde se acortó una lista, mirando TAN ADENTRO como haga falta.
 *
 * Tiene que ser recursivo porque quitar una fila no acorta ninguna lista de
 * primer nivel: `tablas` sigue teniendo una tabla, y lo que menguó es
 * `tablas[0].filas`. Una comparación superficial no veía nada y el deshacer no
 * aparecía justo en el caso más frecuente.
 */
function dondeSeAcorto(antes: unknown, despues: unknown): string | null {
  if (Array.isArray(antes) && Array.isArray(despues)) {
    for (let i = 0; i < Math.min(antes.length, despues.length); i++) {
      const dentro = dondeSeAcorto(antes[i], despues[i])
      if (dentro) return dentro
    }
    return null
  }
  if (antes && despues && typeof antes === 'object' && typeof despues === 'object') {
    const a = antes as Record<string, unknown>
    const d = despues as Record<string, unknown>
    for (const clave of Object.keys(a)) {
      if (Array.isArray(a[clave]) && Array.isArray(d[clave])) {
        if ((d[clave] as unknown[]).length < (a[clave] as unknown[]).length) return clave
      }
      const dentro = dondeSeAcorto(a[clave], d[clave])
      if (dentro) return dentro
    }
  }
  return null
}

/**
 * Si un cambio QUITÓ algo, y qué.
 *
 * Se detecta comparando en vez de pedirle a cada widget que avise: quitar una
 * fila de la tabla, un gráfico, una columna o un bloque son cuatro botones en
 * cuatro componentes distintos, y hacer que los cuatro se acuerden de marcar
 * su acción como destructiva es garantizar que el quinto no lo haga.
 *
 * Devuelve null cuando el cambio solo añade o edita — que es la inmensa
 * mayoría, y no debe ofrecer un deshacer que nadie pidió.
 */
function loQueSeQuito(antes: BorradorSeccion, despues: BorradorSeccion): string | null {
  for (const clave of Object.keys(despues) as (keyof BorradorSeccion)[]) {
    if (clave === 'layout' || clave === 'titulo') continue
    const a = antes[clave]
    const d = despues[clave]
    const nombre = NOMBRE_DE_CAMPO[clave as keyof typeof NOMBRE_DE_CAMPO] ?? String(clave)

    if (a !== undefined && d === undefined) return nombre

    if (Array.isArray(a) && Array.isArray(d) && d.length < a.length) {
      return UNO_DE[clave] ?? `un elemento de ${nombre}`
    }
    const dentro = dondeSeAcorto(a, d)
    if (dentro) return `${UNO_DE[dentro] ?? 'un elemento'} de ${nombre}`
  }
  return null
}

/** Marca interna: el deshacer viene de un cambio de tipo, no de un borrado. */
const TIPO_CAMBIADO = '\u0000tipo'

/** Cuánto se espera desde la última tecla antes de guardar solo. */
const ESPERA_AUTOGUARDADO = 1200

export function EditorSeccion({
  borrador: inicial, tituloDeRespaldo, guardarAction, textoCrudo, proponerAction, tema,
}: Props) {
  const idBase = useId()
  const [borrador, setBorrador] = useState<BorradorSeccion>(inicial)
  const [guardado, setGuardado] = useState(true)
  const [pendiente, empezar] = useTransition()
  // Lo último que se mandó al servidor: evita reguardar lo mismo cuando el
  // autoguardado y un blur coinciden.
  const ultimoGuardado = useRef(JSON.stringify(inicial))
  // Si alguien ya escribió algo aquí, lo que falta pasa a ser un aviso; hasta
  // entonces es solo lo que queda por hacer.
  const [tocada, setTocada] = useState(borradorTieneContenido(inicial))

  const tipo = tipoDeSeccion(borrador.layout)
  const faltas = loQueFalta(borrador, tituloDeRespaldo)
  // Qué campo es el culpable, para marcarlo. El aviso vive al final de la
  // tarjeta y el campo al que se refiere está arriba: sin nada que los una,
  // "Falta la tabla" obliga a buscar cuál de los campos es "la tabla".
  const campoFaltante = tocada ? campoQueFalta(borrador, tituloDeRespaldo) : null
  const idCampoFaltante = `falta-${idBase}`
  /**
   * LO ÚLTIMO QUE SE PUEDE DESHACER.
   *
   * Un solo nivel, a propósito: lo que hace falta es rescatar el clic que
   * acaba de borrar una fila, no navegar un historial. Una pila entera en un
   * formulario con guardado automático plantea la pregunta de qué pasa cuando
   * se deshacen cinco pasos ya guardados, y esa pregunta no hace falta
   * contestarla para resolver el problema.
   */
  const [deshacer, setDeshacer] = useState<{ estado: BorradorSeccion; que: string } | null>(null)

  function cambiar(parcial: Partial<BorradorSeccion>) {
    // El deshacer se arma AQUÍ, comparando: así vale para quitar una fila,
    // un gráfico, una columna o un bloque sin que ninguno de esos botones
    // tenga que acordarse de nada.
    const quitado = loQueSeQuito(borrador, { ...borrador, ...parcial })
    setDeshacer(quitado ? { estado: borrador, que: quitado } : null)
    setBorrador((previo) => ({ ...previo, ...parcial }))
    setGuardado(false)
    setTocada(true)
  }

  function guardar() {
    const serializado = JSON.stringify(borrador)
    if (serializado === ultimoGuardado.current) {
      setGuardado(true)
      return
    }
    empezar(async () => {
      await guardarAction(borrador)
      ultimoGuardado.current = serializado
      setGuardado(true)
    })
  }

  /**
   * GUARDADO AUTOMÁTICO. Nadie debería tener que acordarse de pulsar Guardar
   * en una herramienta donde se escribe: perder una sección por cerrar la
   * pestaña es el tipo de fallo que hace que la gente vuelva a PowerPoint.
   *
   * Espera a que pare de escribir: guardar en cada tecla dispararía una
   * escritura al servidor por letra.
   */
  useEffect(() => {
    if (guardado) return
    const temporizador = setTimeout(guardar, ESPERA_AUTOGUARDADO)
    return () => clearTimeout(temporizador)
    // `guardar` lee el borrador actual en cada render; el efecto se reprograma
    // con cada cambio, que es exactamente lo que se quiere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrador, guardado])

  return (
    <div className={estilos.conPrevia}>
      <div className={estilos.editor}>
      {/* Cambiar de tipo NO borra lo escrito: lo que el tipo nuevo no admite
          se guarda igual y vuelve a aparecer si se deshace el cambio. Solo se
          descarta al maquetar. */}
      <div className={estilos.campoAncho}>
        <span className={estilos.etiquetaCampo}>Tipo de sección</span>
        <SelectorTipo
          valor={borrador.layout}
          alCambiar={(nuevo) => {
            // El tipo no borra nada del borrador, así que `loQueSeQuito` no lo
            // detecta: lo que cambia es qué se PRESENTA. Se arma el deshacer a
            // mano cuando el tipo nuevo deja algo fuera de la vista.
            const oculta = loQueDejaDeVerse(borrador, nuevo)
            const anterior = borrador
            cambiar({ layout: nuevo })
            if (oculta.length > 0) setDeshacer({ estado: anterior, que: TIPO_CAMBIADO })
          }}
        />
      </div>

      {deshacer && (
        <p className={estilos.avisoCambioTipo} role="status">
          {deshacer.que === TIPO_CAMBIADO
            ? 'Este tipo ya no muestra parte de lo escrito. Sigue guardado y vuelve si deshaces el cambio.'
            : `Se quitó ${deshacer.que}.`}{' '}
          <button
            type="button"
            className={estilos.deshacerCambio}
            onClick={() => {
              setBorrador(deshacer.estado)
              setGuardado(false)
              setDeshacer(null)
            }}
          >
            Deshacer
          </button>
        </p>
      )}

      {/* El título se escribe con la pinta que va a tener: grande y con la
          tipografía de display. Escribirlo en una caja gris de 14px y
          descubrir después cómo queda es el viaje que hace lento cualquier
          editor. */}
      <label className={estilos.campoTitular}>
        <span>Título</span>
        <input
          value={borrador.titulo ?? ''}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          onBlur={guardar}
          placeholder={tituloDeRespaldo ?? 'Lo que el director tiene que saber de esta sección'}
          aria-label="Título de la sección"
          aria-invalid={campoFaltante === 'titulo' || undefined}
          id={campoFaltante === 'titulo' ? idCampoFaltante : undefined}
        />
        {tituloDeRespaldo && !borrador.titulo && (
          <em className={estilos.pista}>
            Si lo dejas vacío se presenta como «{tituloDeRespaldo}».
          </em>
        )}
      </label>

      {tipo?.campos.map((campo) => (
        <div
          key={campo}
          data-falta={campo === campoFaltante ? 'true' : undefined}
          id={campo === campoFaltante ? idCampoFaltante : undefined}
          className={campo === campoFaltante ? estilos.campoQueFalta : undefined}
        >
          <Campo campo={campo} borrador={borrador} cambiar={cambiar} />
        </div>
      ))}

      {proponerAction && (
        <AsistenteIA
          textoInicial={textoCrudo}
          proponerAction={proponerAction}
          onPropuesta={(propuesta) => {
            setBorrador(propuesta)
            setGuardado(false)
          }}
        />
      )}

      <div className={estilos.barraGuardar}>
        {/* Una sección que nadie ha tocado NO es un error: está por empezar.
            Marcarla en rojo antes del primer carácter castiga a alguien por no
            haber escrito todavía. */}
        {faltas.length === 0 ? (
          <span className={estilos.listo}>Lista para presentar.</span>
        ) : tocada ? (
          <span className={estilos.aviso}>
            Falta{' '}
            {campoFaltante ? (
              // Enlaza al campo culpable en vez de nombrarlo y ya: "Falta la
              // tabla" obliga a buscar cuál de los campos es "la tabla".
              <a href={`#${idCampoFaltante}`} className={estilos.enlaceAlCampo}>
                {faltas.join(' y ')}
              </a>
            ) : (
              faltas.join(' y ')
            )}{' '}
            para poder presentarla.
          </span>
        ) : (
          <span className={estilos.porEmpezar}>Falta {faltas.join(' y ')}.</span>
        )}
        {/* ESTADO, NO BOTÓN. El "Guardar ahora" que había aquí era una
            invitación a desconfiar del guardado automático: ocho botones
            apagados repartidos por la pantalla, uno por sección, que no hacían
            nada distinto de lo que ya pasaba solo. */}
        <span className={estilos.estadoGuardado} aria-live="polite">
          {pendiente ? 'Guardando…' : guardado ? 'Guardado' : 'Sin guardar'}
        </span>
      </div>
      </div>

      <VistaPrevia borrador={borrador} tituloDeRespaldo={tituloDeRespaldo} tema={tema} />
    </div>
  )
}

/** Despacha cada campo a su widget. La tabla de `catalogo.ts` decide cuáles se ven. */
function Campo({
  campo,
  borrador,
  cambiar,
}: {
  campo: CampoSeccion
  borrador: BorradorSeccion
  cambiar: (parcial: Partial<BorradorSeccion>) => void
}) {
  switch (campo) {
    case 'subtitulo':
      return (
        <label className={estilos.campo}>
          <span>Subtítulo (opcional)</span>
          <input
            className={estilos.entradaSubtitulo}
            value={borrador.subtitulo ?? ''}
            onChange={(e) => cambiar({ subtitulo: e.target.value })}
            placeholder="Una línea de contexto"
            aria-label="Subtítulo"
          />
        </label>
      )

    case 'cuerpo':
      return (
        <AreaTexto
          inicial={(borrador.cuerpo ?? []).join('\n')}
          alEscribir={(texto) => cambiar({ cuerpo: parsearLineas(texto) })}
          etiqueta="Puntos — uno por línea"
          placeholder={'Pendientes del mes pasado\nPortafolio & ecosistema'}
          pista="El documento los numera solo: no escribas «1.» ni «2)»."
        />
      )

    case 'notaPie':
      return (
        <label className={estilos.campo}>
          <span>Nota al pie (opcional)</span>
          <input
            value={borrador.notaPie ?? ''}
            onChange={(e) => cambiar({ notaPie: e.target.value })}
            placeholder="De dónde salen los datos, qué queda fuera del corte"
            aria-label="Nota al pie"
          />
        </label>
      )

    case 'imagen':
      return (
        <label className={estilos.campo}>
          <span>Imagen</span>
          <input
            value={borrador.imagen ?? ''}
            onChange={(e) => cambiar({ imagen: e.target.value })}
            placeholder="/assets/testigo.jpg o https://…"
            aria-label="Imagen"
          />
          <em className={estilos.pista}>Ruta del proyecto o URL https.</em>
        </label>
      )

    case 'kpis':
      return (
        <Bloque titulo="Cifras">
          <CampoKpis valor={borrador.kpis ?? []} onChange={(kpis) => cambiar({ kpis })} />
        </Bloque>
      )

    case 'columnas':
      return (
        <Bloque titulo="Columnas de texto">
          <CampoColumnas valor={borrador.columnas ?? []} onChange={(columnas) => cambiar({ columnas })} />
        </Bloque>
      )

    case 'tablas':
      return (
        <Bloque titulo="Tablas">
          <CampoTablas
            valor={borrador.tablas ?? []}
            onChange={(tablas) => cambiar({ tablas })}
            conSemaforo={borrador.layout === 'pendientes-semaforo'}
          />
        </Bloque>
      )

    case 'graficos':
      return (
        <Bloque titulo="Gráficos">
          <CampoGraficos valor={borrador.graficos ?? []} onChange={(graficos) => cambiar({ graficos })} />
        </Bloque>
      )

    case 'metaReal':
      return (
        <Bloque titulo="Meta contra real">
          <CampoMetaReal valor={borrador.metaReal} onChange={(metaReal) => cambiar({ metaReal })} />
        </Bloque>
      )

    case 'cifrasDesglosadas':
      return (
        <Bloque titulo="Cifras con desglose">
          <CampoCifrasDesglosadas
            valor={borrador.cifrasDesglosadas ?? []}
            onChange={(cifrasDesglosadas) => cambiar({ cifrasDesglosadas })}
          />
        </Bloque>
      )

    case 'bloques':
      return (
        <Bloque titulo="Bloques numerados">
          <CampoBloques valor={borrador.bloques ?? []} onChange={(bloques) => cambiar({ bloques })} />
        </Bloque>
      )

    case 'matriz':
      return (
        <Bloque titulo="Matriz de estados">
          <CampoMatriz valor={borrador.matriz} onChange={(matriz) => cambiar({ matriz })} />
        </Bloque>
      )
  }
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.grupoTitulo}>{titulo}</legend>
      {children}
    </fieldset>
  )
}
