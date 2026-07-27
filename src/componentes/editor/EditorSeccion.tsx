'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { CATALOGO, tipoDeSeccion, type CampoSeccion } from '@/secciones/catalogo'
import { loQueFalta, borradorTieneContenido, type BorradorSeccion } from '@/secciones/borrador'
import { parsearLineas } from '@/secciones/parseo'
import {
  CampoKpis, CampoColumnas, CampoTablas, CampoGraficos,
  CampoMetaReal, CampoCifrasDesglosadas, CampoBloques, CampoMatriz,
} from './CamposEstructurados'
import { AreaTexto } from './AreaTexto'
import { AsistenteIA } from './AsistenteIA'
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
}

/** Cuánto se espera desde la última tecla antes de guardar solo. */
const ESPERA_AUTOGUARDADO = 1200

export function EditorSeccion({ borrador: inicial, tituloDeRespaldo, guardarAction, textoCrudo, proponerAction }: Props) {
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

  function cambiar(parcial: Partial<BorradorSeccion>) {
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
    <div className={estilos.editor}>
      <div className={estilos.filaCampos}>
        <label className={estilos.campoAncho}>
          <span>Tipo de sección</span>
          <select
            value={borrador.layout}
            onChange={(e) => cambiar({ layout: e.target.value as DecisionSlide['layout'] })}
            aria-label="Tipo de sección"
          >
            {CATALOGO.map((t) => (
              <option key={t.layout} value={t.layout}>{t.nombre}</option>
            ))}
          </select>
        </label>
        {/* Cambiar de tipo NO borra lo escrito: lo que el tipo nuevo no admite
            se guarda igual y vuelve a aparecer si se deshace el cambio. Solo
            se descarta al maquetar. */}
        <p className={estilos.paraQue}>{tipo?.paraQue}</p>
      </div>

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
        />
        {tituloDeRespaldo && !borrador.titulo && (
          <em className={estilos.pista}>
            Si lo dejas vacío se presenta como «{tituloDeRespaldo}».
          </em>
        )}
      </label>

      {tipo?.campos.map((campo) => (
        <Campo key={campo} campo={campo} borrador={borrador} cambiar={cambiar} />
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
          <span className={estilos.aviso}>Falta {faltas.join(' y ')} para poder presentarla.</span>
        ) : (
          <span className={estilos.porEmpezar}>Falta {faltas.join(' y ')}.</span>
        )}
        {/* Estado, no botón: se guarda solo. El botón sigue existiendo para
            quien quiera forzarlo, pero apagado cuando no hay nada que hacer. */}
        <span className={estilos.estadoGuardado} aria-live="polite">
          {pendiente ? 'Guardando…' : guardado ? 'Guardado' : 'Sin guardar'}
        </span>
        <button
          type="button"
          className={estilos.botonGuardar}
          onClick={guardar}
          disabled={pendiente || guardado}
        >
          Guardar ahora
        </button>
      </div>
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
