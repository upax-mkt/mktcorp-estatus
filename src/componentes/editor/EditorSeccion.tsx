'use client'

import { useState, useTransition } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { CATALOGO, tipoDeSeccion, type CampoSeccion } from '@/secciones/catalogo'
import { loQueFalta, type BorradorSeccion } from '@/secciones/borrador'
import { parsearLineas } from '@/secciones/parseo'
import {
  CampoKpis, CampoColumnas, CampoTablas, CampoGraficos,
  CampoMetaReal, CampoCifrasDesglosadas, CampoBloques, CampoMatriz,
} from './CamposEstructurados'
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
  guardarAction: (seccion: BorradorSeccion) => Promise<void>
  /** Texto crudo ya guardado para el asistente, si lo hay. */
  textoCrudo?: string
  proponerAction?: (texto: string) => Promise<BorradorSeccion | { error: string }>
}

export function EditorSeccion({ borrador: inicial, guardarAction, textoCrudo, proponerAction }: Props) {
  const [borrador, setBorrador] = useState<BorradorSeccion>(inicial)
  const [guardado, setGuardado] = useState(true)
  const [pendiente, empezar] = useTransition()

  const tipo = tipoDeSeccion(borrador.layout)
  const faltas = loQueFalta(borrador)

  function cambiar(parcial: Partial<BorradorSeccion>) {
    setBorrador((previo) => ({ ...previo, ...parcial }))
    setGuardado(false)
  }

  function guardar() {
    empezar(async () => {
      await guardarAction(borrador)
      setGuardado(true)
    })
  }

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

      <label className={estilos.campo}>
        <span>Título</span>
        <input
          value={borrador.titulo ?? ''}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          placeholder="Lo que el director tiene que saber de esta sección"
          aria-label="Título de la sección"
        />
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
        {faltas.length > 0 ? (
          <span className={estilos.aviso}>Falta {faltas.join(' y ')} para poder presentarla.</span>
        ) : (
          <span className={estilos.listo}>Lista para presentar.</span>
        )}
        <button
          type="button"
          className={estilos.botonGuardar}
          onClick={guardar}
          disabled={pendiente || guardado}
        >
          {pendiente ? 'Guardando…' : guardado ? 'Guardado' : 'Guardar sección'}
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
            value={borrador.subtitulo ?? ''}
            onChange={(e) => cambiar({ subtitulo: e.target.value })}
            placeholder="Una línea de contexto"
            aria-label="Subtítulo"
          />
        </label>
      )

    case 'cuerpo':
      return (
        <label className={estilos.campo}>
          <span>Puntos — uno por línea</span>
          <textarea
            rows={5}
            defaultValue={(borrador.cuerpo ?? []).join('\n')}
            onBlur={(e) => cambiar({ cuerpo: parsearLineas(e.target.value) })}
            placeholder={'Pendientes del mes pasado\nPortafolio & ecosistema'}
            aria-label="Puntos del cuerpo"
          />
          <em className={estilos.pista}>El documento los numera solo: no escribas «1.» ni «2)».</em>
        </label>
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
