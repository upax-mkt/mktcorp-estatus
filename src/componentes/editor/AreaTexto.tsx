'use client'

import { useState } from 'react'
import estilos from './editor.module.css'

/**
 * Un área de texto que se parsea al escribir, sin pelearse con el cursor.
 *
 * EL BUG QUE CIERRA. Estos campos —las viñetas, el cuerpo, las partes de una
 * cifra, la leyenda— guardan un ARRAY, pero se escriben como texto. Antes eran
 * `defaultValue` + `onBlur`: lo escrito no llegaba al estado hasta perder el
 * foco. Como el guardado automático solo puede guardar lo que está en el
 * estado, escribir la agenda entera y cerrar la pestaña **perdía todo** — y
 * mientras tanto el indicador decía "Guardado", porque para él no había
 * cambiado nada. La herramienta afirmaba haber guardado texto que no existía.
 *
 * POR QUÉ NO BASTA CON HACERLO CONTROLADO. Si el valor del textarea saliera de
 * volver a escribir el array parseado, el texto se reformatearía en cada tecla:
 * escribes dos espacios de sangría y te los reordena, el cursor salta. El
 * borrador de texto vive AQUÍ, tal cual se teclea; hacia arriba solo viaja lo
 * ya parseado. Ninguno de los dos molesta al otro.
 *
 * Si el contenido llega de fuera (una propuesta de la IA), el consumidor pasa
 * una `clave` distinta para que este campo se rehaga con el texto nuevo.
 */
interface Props {
  /** El texto tal como se guardó la última vez. */
  inicial: string
  /** Recibe el texto crudo en cada tecla; el consumidor lo parsea. */
  alEscribir: (texto: string) => void
  filas?: number
  placeholder?: string
  etiqueta: string
  pista?: React.ReactNode
}

export function AreaTexto({ inicial, alEscribir, filas = 5, placeholder, etiqueta, pista }: Props) {
  const [texto, setTexto] = useState(inicial)

  return (
    <label className={estilos.campo}>
      <span>{etiqueta}</span>
      <textarea
        rows={filas}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          alEscribir(e.target.value)
        }}
        placeholder={placeholder}
        aria-label={etiqueta}
      />
      {pista && <em className={estilos.pista}>{pista}</em>}
    </label>
  )
}
