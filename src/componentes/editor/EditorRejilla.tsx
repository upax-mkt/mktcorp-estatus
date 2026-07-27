'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { parsearRejilla } from '@/secciones/parseo'
import estilos from './rejilla.module.css'

/**
 * Editar una rejilla de datos celda por celda, como en una hoja de cálculo.
 *
 * ANTES ERA UNA CAJA DE TEXTO donde había que escribir la tabla entera con
 * barras y saltos de línea. Funcionaba para pegar desde Sheets y era horrible
 * para todo lo demás: para corregir un número había que encontrarlo entre
 * separadores, y para añadir una columna había que reescribir todas las
 * líneas. Nadie edita una tabla así.
 *
 * Ahora se escribe en la celda que toca. Pegar sigue funcionando —y es lo que
 * más se usa— pero ya no es el único camino: se pega en cualquier celda y la
 * rejilla crece sola para acomodar lo pegado.
 *
 * LAS TECLAS HACEN LO QUE SE ESPERA: Tab pasa a la celda siguiente (es el
 * comportamiento nativo del navegador, no hay que programarlo), Enter baja una
 * fila, y las flechas con Ctrl/Cmd se mueven por la rejilla sin salir del
 * campo. Enter en la última fila añade una nueva, que es como se llena una
 * tabla de verdad: escribiendo sin levantar las manos.
 */

interface Props {
  columnas: string[]
  filas: string[][]
  onChange: (columnas: string[], filas: string[][]) => void
  /** Qué se pide en el encabezado, para las etiquetas de accesibilidad. */
  nombreColumna?: string
  nombreFila?: string
  /** Textos de ejemplo en la primera celda de cada eje. */
  ejemploColumna?: string
  ejemploFila?: string
  /** Mínimo de columnas: por debajo de esto la tabla deja de serlo. */
  minimoColumnas?: number
}

const MAX_COLUMNAS = 6

export function EditorRejilla({
  columnas,
  filas,
  onChange,
  nombreColumna = 'columna',
  nombreFila = 'fila',
  ejemploColumna = 'Mayo',
  ejemploFila = 'Sesiones',
  minimoColumnas = 2,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null)

  /** Toda fila tiene exactamente tantas celdas como columnas hay. */
  function normalizar(cols: string[], fs: string[][]): [string[], string[][]] {
    return [cols, fs.map((f) => Array.from({ length: cols.length }, (_, i) => f[i] ?? ''))]
  }

  function cambiarColumna(indice: number, valor: string) {
    onChange(columnas.map((c, i) => (i === indice ? valor : c)), filas)
  }

  function cambiarCelda(fila: number, celda: number, valor: string) {
    onChange(columnas, filas.map((f, i) => (i === fila ? f.map((c, j) => (j === celda ? valor : c)) : f)))
  }

  function anadirFila() {
    onChange(columnas, [...filas, Array(columnas.length).fill('')])
  }

  function quitarFila(indice: number) {
    onChange(columnas, filas.filter((_, i) => i !== indice))
  }

  function anadirColumna() {
    if (columnas.length >= MAX_COLUMNAS) return
    const [cols, fs] = normalizar([...columnas, ''], filas)
    onChange(cols, fs)
  }

  function quitarColumna(indice: number) {
    if (columnas.length <= minimoColumnas) return
    onChange(columnas.filter((_, i) => i !== indice), filas.map((f) => f.filter((_, i) => i !== indice)))
  }

  /**
   * Pegar desde Sheets o Excel: lo pegado se vuelca a partir de la celda donde
   * se pegó, y la rejilla crece si hace falta.
   *
   * Una sola celda (sin tabuladores ni saltos) se deja al navegador: pegar un
   * valor suelto tiene que comportarse como pegar en cualquier campo, incluido
   * poder pegar en medio de lo ya escrito.
   */
  function alPegar(evento: ClipboardEvent<HTMLInputElement>, filaBase: number, celdaBase: number) {
    const texto = evento.clipboardData.getData('text/plain')
    if (!texto.includes('\t') && !texto.includes('\n')) return

    evento.preventDefault()
    const pegado = parsearRejilla(texto)
    if (pegado.length === 0) return

    const anchoNecesario = Math.min(MAX_COLUMNAS, Math.max(columnas.length, celdaBase + pegado[0].length))
    const cols = [...columnas]
    while (cols.length < anchoNecesario) cols.push('')

    // filaBase === -1 significa que se pegó en el encabezado: la primera línea
    // de lo pegado son los títulos de columna.
    const empiezaEnEncabezado = filaBase < 0
    const filasPegadas = empiezaEnEncabezado ? pegado.slice(1) : pegado
    if (empiezaEnEncabezado) {
      pegado[0].forEach((valor, i) => {
        const destino = celdaBase + i
        if (destino < cols.length) cols[destino] = valor
      })
    }

    const fs = filas.map((f) => [...f])
    const primeraFila = empiezaEnEncabezado ? 0 : filaBase
    filasPegadas.forEach((filaPegada, i) => {
      const destinoFila = primeraFila + i
      while (fs.length <= destinoFila) fs.push(Array(cols.length).fill(''))
      filaPegada.forEach((valor, j) => {
        const destinoCelda = celdaBase + j
        if (destinoCelda < cols.length) fs[destinoFila][destinoCelda] = valor
      })
    })

    const [colsFinal, fsFinal] = normalizar(cols, fs)
    onChange(colsFinal, fsFinal)
  }

  /** Enter baja una fila; en la última, crea una nueva y salta a ella. */
  function alTeclear(evento: KeyboardEvent<HTMLInputElement>, fila: number) {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    if (fila === filas.length - 1) {
      anadirFila()
      // El campo nuevo aún no existe: se enfoca cuando React lo haya pintado.
      requestAnimationFrame(() => {
        const inputs = contenedor.current?.querySelectorAll<HTMLInputElement>('tbody input')
        inputs?.[inputs.length - columnas.length]?.focus()
      })
      return
    }
    const actual = evento.currentTarget
    const columna = Number(actual.dataset.columna ?? 0)
    const siguiente = contenedor.current?.querySelector<HTMLInputElement>(
      `tbody tr:nth-child(${fila + 2}) input[data-columna="${columna}"]`,
    )
    siguiente?.focus()
  }

  return (
    <div className={estilos.envoltorio} ref={contenedor}>
      <div className={estilos.scroll}>
        <table className={estilos.rejilla}>
          <thead>
            <tr>
              <th className={estilos.esquina} aria-hidden="true" />
              {columnas.map((columna, i) => (
                <th key={`col-${i}`}>
                  <input
                    value={columna}
                    onChange={(e) => cambiarColumna(i, e.target.value)}
                    onPaste={(e) => alPegar(e, -1, i)}
                    placeholder={i === 0 ? '' : ejemploColumna}
                    aria-label={`Nombre de la ${nombreColumna} ${i + 1}`}
                    className={estilos.celdaEncabezado}
                  />
                  {columnas.length > minimoColumnas && (
                    <button
                      type="button"
                      className={estilos.quitar}
                      onClick={() => quitarColumna(i)}
                      title={`Quitar la ${nombreColumna} «${columna || i + 1}»`}
                      aria-label={`Quitar la ${nombreColumna} ${i + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </th>
              ))}
              <th className={estilos.esquina}>
                {columnas.length < MAX_COLUMNAS && (
                  <button
                    type="button"
                    className={estilos.anadirEje}
                    onClick={anadirColumna}
                    title={`Añadir ${nombreColumna}`}
                    aria-label={`Añadir ${nombreColumna}`}
                  >
                    +
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, f) => (
              <tr key={`fila-${f}`}>
                <td className={estilos.numeroFila}>{f + 1}</td>
                {fila.map((celda, c) => (
                  <td key={`c-${f}-${c}`}>
                    <input
                      value={celda}
                      data-columna={c}
                      onChange={(e) => cambiarCelda(f, c, e.target.value)}
                      onPaste={(e) => alPegar(e, f, c)}
                      onKeyDown={(e) => alTeclear(e, f)}
                      placeholder={f === 0 && c === 0 ? ejemploFila : ''}
                      aria-label={`${nombreFila} ${f + 1}, ${nombreColumna} ${c + 1}`}
                    />
                  </td>
                ))}
                <td className={estilos.esquina}>
                  <button
                    type="button"
                    className={estilos.quitar}
                    onClick={() => quitarFila(f)}
                    title={`Quitar la ${nombreFila} ${f + 1}`}
                    aria-label={`Quitar la ${nombreFila} ${f + 1}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={estilos.acciones}>
        <button type="button" className={estilos.anadirFila} onClick={anadirFila}>
          + Añadir {nombreFila}
        </button>
        <span className={estilos.pista}>
          Pega desde Sheets en cualquier celda y la rejilla crece sola. Enter baja una {nombreFila}.
        </span>
      </div>
    </div>
  )
}
