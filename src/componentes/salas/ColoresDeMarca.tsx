'use client'

import { contraste } from '@/lib/color'
import estilos from '@/app/salas/salas.module.css'

/**
 * LOS COLORES DE UNA MARCA, EN UNA SOLA REJILLA.
 *
 * ⚠️ SUS CLASES LLEVAN EL PREFIJO `marcaColor`, y no es cosmética: la primera
 * versión las llamó `.filaColor` / `.muestraColor`, y `.filaColor` YA EXISTÍA
 * en esta misma hoja —es el puntito de color de una sala en el listado, de
 * `width: 1.1rem`—. Las dos reglas se fundieron sin pisarse (cada una
 * declaraba propiedades distintas), así que no hubo error de compilación ni
 * de consola: simplemente cada fila de color medía 17 px y todas se
 * amontonaban unas sobre otras. En un CSS Module de 900 líneas, un nombre
 * genérico ya está cogido.
 *
 * Franco: *"el selector de color en los ajustes de sala es demasiado enredado,
 * además no puedo poner el color de la letra o de los iconos; simplifica por
 * favor y dale un poquito de aire y espacio"*.
 *
 * Y tenía razón por partida triple:
 *
 * 1. **Seis cuadritos idénticos y sin nombre.** Los colores se habían ido
 *    añadiendo por tandas —primero el primario, luego "Secundario y acento",
 *    luego "Cabecera de la sala"— y cada tanda era un rótulo en plural encima
 *    de VARIOS campos iguales. Con dos cuadros negros bajo "SECUNDARIO Y
 *    ACENTO" no hay forma de saber cuál es cuál sin contarlos.
 * 2. **Un párrafo de cuatro líneas entre grupo y grupo**, explicando la
 *    derivación. Lo que hace falta al lado de un campo es su nombre.
 * 3. **Faltaban justo los que él quería tocar**: los dos colores de TEXTO. Se
 *    derivaban del contraste y no había ningún sitio donde cambiarlos.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * UNA FILA POR COLOR, con su nombre y su hex al lado, y tres grupos que dicen
 * PARA QUÉ sirve cada uno: la marca, la cabecera, y el texto. Nada de "y" en
 * los rótulos — un rótulo en plural sobre varios campos es lo que hizo falta
 * arreglar.
 *
 * EL CONTRASTE SE MIDE Y SE DICE, NO SE IMPONE. Un color de texto escrito a
 * mano puede quedar ilegible sobre su fondo, y hasta ahora la app lo impedía
 * derivándolo ella sola — al precio de que la marca no se pudiera respetar.
 * Ahora manda quien escribe, y a su lado aparece la cifra real (WCAG AA pide
 * 4,5:1). Es su marca; lo que le falta para decidir es el dato, no un candado.
 */

export interface CampoDeColor {
  clave: string
  nombre: string
  valor: string
  alCambiar: (hex: string) => void
  /**
   * Lo que valdría si se deja en blanco. Se pinta en el cuadro para que este
   * no salga NEGRO —`<input type="color">` no admite "sin valor"— y en el
   * marcador de posición del hex.
   */
  derivado?: string
  /** Contra qué fondo se lee este color, si es un color de texto. */
  sobre?: string
}

const HEX = /^#[0-9a-fA-F]{6}$/

export function GrupoDeColores({
  titulo,
  pista,
  campos,
}: {
  titulo: string
  pista?: string
  campos: CampoDeColor[]
}) {
  return (
    <div className={estilos.grupoColor}>
      <span className={estilos.grupoColorTitulo}>{titulo}</span>
      <div className={estilos.coloresRejilla}>
        {campos.map((c) => (
          <FilaDeColor key={c.clave} campo={c} />
        ))}
      </div>
      {pista && <p className={estilos.pista}>{pista}</p>}
    </div>
  )
}

function FilaDeColor({ campo }: { campo: CampoDeColor }) {
  const valido = HEX.test(campo.valor)
  const efectivo = valido ? campo.valor : (campo.derivado ?? '#000000')

  /**
   * El contraste REAL de lo que se va a ver: el color efectivo contra su
   * fondo. Solo se calcula si los dos son hex válidos — a medio teclear
   * ("#3B7") no hay nada que medir y una cifra parpadeando distrae.
   */
  const ratio =
    campo.sobre && HEX.test(campo.sobre) && HEX.test(efectivo)
      ? contraste(efectivo, campo.sobre)
      : null

  return (
    <label className={estilos.marcaColorFila}>
      <input
        type="color"
        className={estilos.marcaColorMuestra}
        value={efectivo}
        onChange={(e) => campo.alCambiar(e.target.value)}
        aria-label={campo.nombre}
      />
      <span className={estilos.marcaColorFilaNombre}>
        {campo.nombre}
        {ratio != null && (
          // `data-bajo` y no un color a secas: quien no distingue rojo de
          // verde necesita leer "AA" o no leerlo.
          <span className={estilos.contraste} data-bajo={ratio < 4.5 ? 'true' : undefined}>
            {ratio.toFixed(1)}:1 {ratio >= 4.5 ? 'AA' : 'bajo'}
          </span>
        )}
      </span>
      <input
        type="text"
        className={estilos.marcaColorFilaHex}
        value={campo.valor}
        onChange={(e) => campo.alCambiar(e.target.value.trim())}
        placeholder={campo.derivado ?? '#000000'}
        aria-label={`${campo.nombre}, código hexadecimal`}
        spellCheck={false}
      />
    </label>
  )
}
