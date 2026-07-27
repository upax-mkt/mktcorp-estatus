import type { DecisionSlide } from '@/decision/esquema'
import estilos from './piezas.module.css'

type Matriz = NonNullable<DecisionSlide['matriz']>

/**
 * La rejilla de estados: conceptos en las filas, periodos en las columnas y en
 * cada cruce qué toca hacer.
 *
 * En el deck de referencia es el calendario de prospección — industrias ×
 * meses, con "Explora / Prepara / Vende / Espera" en cada celda. No es una
 * tabla de datos: no se leen valores, se lee la FORMA del trimestre, dónde se
 * concentra el esfuerzo. Por eso el tono de cada celda es la información
 * principal y el texto la confirma.
 */
export function MatrizSeccion({ matriz }: { matriz: Matriz }) {
  return (
    <div className={estilos.tablaEnvoltorio}>
      <div className={estilos.tablaScroll}>
        <table className={`${estilos.tabla} ${estilos.matriz}`}>
          <thead>
            <tr>
              <th scope="col" />
              {matriz.columnas.map((columna, i) => (
                <th key={`col-${i}`} scope="col">{columna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.filas.map((fila, i) => (
              <tr key={`fila-${i}`}>
                <th scope="row" className={estilos.celdaGrupo}>
                  {fila.encabezado}
                  {fila.nota && <span className={estilos.filaNota}>{fila.nota}</span>}
                </th>
                {fila.celdas.map((celda, j) => (
                  <td key={`c-${j}`} className={estilos.celdaMatriz} data-tono={celda.tono ?? 'neutro'}>
                    {celda.texto}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {matriz.leyenda && matriz.leyenda.length > 0 && (
        <ul className={estilos.leyenda}>
          {matriz.leyenda.map((linea, i) => (
            <li key={`ley-${i}`}>{linea}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
