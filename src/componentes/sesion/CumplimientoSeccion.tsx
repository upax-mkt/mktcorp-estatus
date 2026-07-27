import type { DecisionSlide } from '@/decision/esquema'
import estilos from './piezas.module.css'

type MetaReal = NonNullable<DecisionSlide['metaReal']>
type Cifras = NonNullable<DecisionSlide['cifrasDesglosadas']>

/**
 * El bloque de cumplimiento: meta contra real, y el porcentaje que sale de
 * los dos.
 *
 * Se dibuja como una barra por renglón, no como tres números en fila: el
 * cumplimiento es una proporción, y una proporción se lee de un vistazo
 * cuando tiene largo. El número sigue ahí para quien lo necesite exacto.
 */

/** Un "14%" que llega como texto vuelve a ser número para dibujar la barra. */
function fraccionDe(porcentaje: string): number | null {
  const n = Number(porcentaje.replace('%', '').replace(',', '.').trim())
  if (!Number.isFinite(n)) return null
  // Por encima del 100% la barra se llena y el número dice el resto: una barra
  // que se sale de su carril se lee como un error de maquetación.
  return Math.max(0, Math.min(100, n))
}

export function MetaRealSeccion({ metaReal }: { metaReal: MetaReal }) {
  return (
    <div className={estilos.metaReal}>
      <h3 className={estilos.piezaTitulo}>{metaReal.titulo}</h3>
      <div className={estilos.metaRealFilas}>
        {metaReal.filas.map((fila, i) => {
          const fraccion = fraccionDe(fila.porcentaje)
          return (
            <div key={`meta-${i}`} className={estilos.metaRealFila} data-primera={i === 0 ? 'true' : undefined}>
              <span className={estilos.metaRealRotulo}>{fila.rotulo}</span>
              <span className={estilos.metaRealCifras}>
                <strong>{fila.real}</strong>
                <span className={estilos.metaRealMeta}>de {fila.meta}</span>
              </span>
              <span className={estilos.metaRealBarra} aria-hidden="true">
                {fraccion !== null && (
                  <span className={estilos.metaRealRelleno} style={{ width: `${fraccion}%` }} />
                )}
              </span>
              <span className={estilos.metaRealPorcentaje}>{fila.porcentaje}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Cifras que además del total traen en qué se reparten.
 *
 * Es el bloque de pipeline del deck real: un total y, debajo, cuánto puso
 * Marketing y cuánto Comercial. Sin el desglose el total no dice nada sobre
 * de quién es el mérito, que es justo la pregunta del director.
 */
export function CifrasDesglosadasSeccion({ cifras }: { cifras: Cifras }) {
  return (
    <div className={estilos.desgloses}>
      {cifras.map((cifra, i) => (
        <div key={`desglose-${i}`} className={estilos.desglose} data-destacada={cifra.destacada ? 'true' : undefined}>
          <div className={estilos.desgloseRotulo}>{cifra.rotulo}</div>
          <div className={estilos.desgloseValor}>{cifra.valor}</div>
          {cifra.partes && cifra.partes.length > 0 && (
            <ul className={estilos.desglosePartes}>
              {cifra.partes.map((parte, j) => (
                <li key={`parte-${j}`}>
                  <span>{parte.rotulo}</span>
                  <span className={estilos.desgloseParteValor}>{parte.valor}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
