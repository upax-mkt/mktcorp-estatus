'use client'

import type { ReactNode } from 'react'
import estilos from './editor.module.css'

/**
 * Una lista de cosas que se añaden y se quitan: cifras, columnas, tablas,
 * gráficos, bloques.
 *
 * Existe para que las seis listas del editor se comporten igual. Lo que se
 * repite en una interfaz tiene que repetirse EXACTO: si añadir una columna y
 * añadir un gráfico se hacen distinto, cada una hay que aprenderla aparte.
 */

interface Props<T> {
  /** Cómo se llama esto en singular, para el botón: "cifra" → "Añadir cifra". */
  nombre: string
  items: T[]
  onChange: (items: T[]) => void
  /** Uno nuevo, vacío. */
  nuevo: () => T
  /** El tope que impone el contrato. Al llegar, el botón desaparece. */
  maximo?: number
  /** El formulario de un elemento. */
  children: (item: T, indice: number, cambiar: (item: T) => void) => ReactNode
}

export function Repetible<T>({ nombre, items, onChange, nuevo, maximo, children }: Props<T>) {
  const puedeAnadir = maximo === undefined || items.length < maximo

  return (
    <div className={estilos.repetible}>
      {items.map((item, i) => (
        <div key={`item-${i}`} className={estilos.repetibleItem}>
          <div className={estilos.repetibleCabecera}>
            <span className={estilos.repetibleIndice}>
              {nombre} {i + 1}
            </span>
            <div className={estilos.repetibleAcciones}>
              {/* Mover importa: el orden de las columnas y de los bloques ES
                  contenido. Con flechas y no arrastrando, que aquí conviven
                  con campos de texto donde arrastrar significa seleccionar. */}
              <button
                type="button"
                className={estilos.botonIcono}
                title="Subir"
                aria-label={`Subir ${nombre} ${i + 1}`}
                disabled={i === 0}
                onClick={() => onChange(intercambiar(items, i, i - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                className={estilos.botonIcono}
                title="Bajar"
                aria-label={`Bajar ${nombre} ${i + 1}`}
                disabled={i === items.length - 1}
                onClick={() => onChange(intercambiar(items, i, i + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className={estilos.botonIcono}
                title="Quitar"
                aria-label={`Quitar ${nombre} ${i + 1}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          </div>
          {children(item, i, (nuevoItem) => onChange(items.map((x, j) => (j === i ? nuevoItem : x))))}
        </div>
      ))}

      {puedeAnadir ? (
        <button type="button" className={estilos.botonAnadir} onClick={() => onChange([...items, nuevo()])}>
          + Añadir {nombre}
        </button>
      ) : (
        <p className={estilos.pista}>
          Máximo {maximo} {nombre}
          {maximo === 1 ? '' : 's'}. Es el tope que aguanta la sección sin dejar de leerse.
        </p>
      )}
    </div>
  )
}

function intercambiar<T>(items: T[], a: number, b: number): T[] {
  const copia = [...items]
  ;[copia[a], copia[b]] = [copia[b], copia[a]]
  return copia
}
