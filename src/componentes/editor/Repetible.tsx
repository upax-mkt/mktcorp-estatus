'use client'

import { useState, type ReactNode } from 'react'
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

  /**
   * IDENTIDAD ESTABLE POR ELEMENTO, y no la posición.
   *
   * Esto keyaba por índice (`key={'item-' + i}`) y eso rompía de verdad, no
   * en teoría. Varios hijos de esta lista —`AreaTexto` sobre todo— siembran
   * su estado UNA SOLA VEZ a propósito, para no reformatear el texto en cada
   * tecla ni hacer saltar el cursor. Con key por posición, al quitar el
   * elemento 1 el 2 pasa a ocupar su hueco, React ve la misma key, reutiliza
   * el subárbol… y el textarea sigue enseñando el texto del elemento
   * BORRADO. El formulario y el borrador pasan a decir cosas distintas —lo
   * que Franco describió como "el preview no me muestra lo que veo en el
   * editor"— y la siguiente tecla escribe el texto arrastrado encima del
   * elemento que sobrevivió. En el estatus de NeraCode se llevó por delante
   * una tabla de siete filas y el título de la otra.
   *
   * Los elementos son datos planos, sin id propio, así que la identidad se
   * lleva aparte y se PERMUTA EN EL MISMO SITIO donde se permutan los datos:
   * quitar, mover y añadir tocan las dos listas a la vez. Es lo que hace que
   * el id siga al elemento y no a su posición.
   */
  const [ids, setIds] = useState<number[]>([])
  const [siguiente, setSiguiente] = useState(0)

  // Ajuste de estado derivado DURANTE el render: el patrón que React
  // sanciona para "cuando una prop cambia, corrige el estado". Solo entra
  // cuando el tamaño cambió DESDE FUERA (la carga inicial, una propuesta de
  // la IA); los cambios que salen de esta lista ya dejaron los ids con el
  // tamaño bueno antes de avisar al padre, así que aquí no hacen nada.
  let idsVigentes = ids
  if (ids.length !== items.length) {
    let n = siguiente
    idsVigentes = items.map((_, i) => ids[i] ?? n++)
    setIds(idsVigentes)
    setSiguiente(n)
  }

  function quitar(i: number) {
    setIds(idsVigentes.filter((_, j) => j !== i))
    onChange(items.filter((_, j) => j !== i))
  }
  function mover(a: number, b: number) {
    setIds(intercambiar(idsVigentes, a, b))
    onChange(intercambiar(items, a, b))
  }
  function anadir() {
    setIds([...idsVigentes, siguiente])
    setSiguiente(siguiente + 1)
    onChange([...items, nuevo()])
  }

  return (
    <div className={estilos.repetible}>
      {items.map((item, i) => (
        <div key={idsVigentes[i]} className={estilos.repetibleItem}>
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
                onClick={() => mover(i, i - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className={estilos.botonIcono}
                title="Bajar"
                aria-label={`Bajar ${nombre} ${i + 1}`}
                disabled={i === items.length - 1}
                onClick={() => mover(i, i + 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className={estilos.botonIcono}
                title="Quitar"
                aria-label={`Quitar ${nombre} ${i + 1}`}
                onClick={() => quitar(i)}
              >
                ✕
              </button>
            </div>
          </div>
          {children(item, i, (nuevoItem) => onChange(items.map((x, j) => (j === i ? nuevoItem : x))))}
        </div>
      ))}

      {puedeAnadir ? (
        <button type="button" className={estilos.botonAnadir} onClick={anadir}>
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
