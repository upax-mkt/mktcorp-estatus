'use client'

import { useId, useState } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { CATALOGO, tipoDeSeccion } from '@/secciones/catalogo'
import { MiniaturaTipo } from './MiniaturaTipo'
import estilos from './editor.module.css'

/**
 * Elegir el tipo de sección VIENDO cada uno.
 *
 * Antes era un `<select>` con trece nombres. "Meta contra real", "Comparativa
 * entre periodos" y "Bloques numerados" no dicen qué forma tiene la página, y
 * la única manera de averiguarlo era elegir uno y mirar — trece veces.
 *
 * Se abre y se cierra en su sitio, sin ventana modal: cambiar de tipo es una
 * decisión reversible que se toma mirando el formulario que hay debajo, y una
 * modal lo taparía justo cuando hace falta.
 */

interface Props {
  valor: DecisionSlide['layout']
  alCambiar: (layout: DecisionSlide['layout']) => void
}

export function SelectorTipo({ valor, alCambiar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const idPanel = useId()
  const actual = tipoDeSeccion(valor)

  return (
    <div className={estilos.selectorTipo}>
      <button
        type="button"
        className={estilos.selectorBoton}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={idPanel}
      >
        <MiniaturaTipo layout={valor} />
        <span className={estilos.selectorTexto}>
          <span className={estilos.selectorNombre}>{actual?.nombre ?? valor}</span>
          <span className={estilos.selectorParaQue}>{actual?.paraQue}</span>
        </span>
        <span className={estilos.selectorFlecha} aria-hidden>
          {abierto ? '▴' : '▾'}
        </span>
      </button>

      {abierto && (
        <div className={estilos.selectorPanel} id={idPanel} role="listbox" aria-label="Tipo de sección">
          {CATALOGO.map((t) => (
            <button
              key={t.layout}
              type="button"
              role="option"
              aria-selected={t.layout === valor}
              className={estilos.selectorOpcion}
              data-elegido={t.layout === valor ? 'true' : undefined}
              onClick={() => {
                alCambiar(t.layout)
                setAbierto(false)
              }}
            >
              <MiniaturaTipo layout={t.layout} />
              <span className={estilos.selectorOpcionNombre}>{t.nombre}</span>
              <span className={estilos.selectorOpcionParaQue}>{t.paraQue}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
