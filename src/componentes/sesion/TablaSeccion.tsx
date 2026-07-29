import type { DecisionSlide } from '@/decision/esquema'
import estilos from './piezas.module.css'

type Tabla = NonNullable<DecisionSlide['tablas']>[number]
type Fila = Tabla['filas'][number]

/**
 * Una tabla de datos del estatus.
 *
 * Es la pieza que más se repite en un deck real —tres veces en el de
 * referencia— y la que peor sobrevive a convertirse en viñetas: en una
 * comparativa Mayo|Junio el dato ES la rejilla.
 *
 * Hace tres cosas que una `<table>` pelada no hace:
 * - semáforo por fila, cuando la tabla es de pendientes;
 * - agrupar la primera columna, para que un responsable con tres tareas
 *   aparezca una vez y no tres;
 * - marcar la fila de total, que se lee distinto al resto.
 */

const ETIQUETA_ESTADO: Record<NonNullable<Fila['estado']>, string> = {
  'listo': 'Listo',
  'en-proceso': 'En proceso',
  'no-realizado': 'No realizado',
}

/**
 * Cuántas filas seguidas comparten el valor de la primera columna.
 *
 * Solo agrupa filas CONSECUTIVAS: si el mismo responsable aparece arriba y
 * abajo separado por otro, son dos bloques. Reordenar la tabla para juntarlos
 * sería cambiar el orden que decidió quien la escribió.
 */
/**
 * ¿Esta celda es una cifra?
 *
 * Los números se comparan por su última cifra, así que van alineados a la
 * derecha; una frase alineada a la derecha, en cambio, es ilegible —y en la
 * tabla de pendientes la columna del medio son frases largas. No se puede
 * decidir por posición de columna: en una comparativa la segunda columna es un
 * número y en pendientes es texto. Se decide por el contenido.
 *
 * Cuenta como cifra lo que trae dígitos y solo símbolos de medida alrededor:
 * "3,591", "$28,235.46", "-16%", "79.8k", "$39.4 MDP".
 */
const CIFRA = /^[-+$(]?\s*\d[\d\s.,]*\s*(%|[kKmM]|MDP|mdp)?\s*\)?$/

export function esCifra(celda: string): boolean {
  return CIFRA.test(celda.trim())
}

function tamanoDelGrupo(filas: Fila[], desde: number): number {
  const valor = filas[desde].celdas[0]
  let n = 1
  while (desde + n < filas.length && filas[desde + n].celdas[0] === valor) n++
  return n
}

export function TablaSeccion({ tabla }: { tabla: Tabla }) {
  const agrupa = tabla.agruparPrimeraColumna === true
  const hayEstados = tabla.filas.some((f) => f.estado)

  // Precalculado en una pasada: qué filas abren grupo y de qué tamaño.
  const aperturas = new Map<number, number>()
  if (agrupa) {
    for (let i = 0; i < tabla.filas.length; ) {
      const n = tamanoDelGrupo(tabla.filas, i)
      aperturas.set(i, n)
      i += n
    }
  }

  // Un encabezado ("Mayo") no es una cifra, pero titula una columna que sí lo
  // es y tiene que alinearse con ella. Se mira la columna entera: es de cifras
  // si todas sus celdas con contenido lo son.
  const columnaDeCifras = tabla.columnas.map((_, j) => {
    const conContenido = tabla.filas
      .map((f) => f.celdas[j] ?? '')
      .filter((c) => c.trim().length > 0)
    return conContenido.length > 0 && conContenido.every(esCifra)
  })

  return (
    <div className={estilos.tablaEnvoltorio}>
      {tabla.titulo && <h3 className={estilos.piezaTitulo}>{tabla.titulo}</h3>}
      {/* El scroll horizontal vive aquí y no en la página: una tabla ancha no
          puede arrastrar el documento entero de lado. */}
      <div className={estilos.tablaScroll}>
        <table className={estilos.tabla} data-agrupa={agrupa ? "true" : undefined}>
          <thead>
            <tr>
              {tabla.columnas.map((columna, i) => (
                <th key={`col-${i}`} scope="col" data-cifra={columnaDeCifras[i] ? 'true' : undefined}>
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, i) => (
              <tr key={`fila-${i}`} data-destacada={fila.destacada ? 'true' : undefined}>
                {fila.celdas.map((celda, j) => {
                  if (agrupa && j === 0) {
                    const abre = aperturas.get(i)
                    if (abre === undefined) return null
                    return (
                      <th key={`c-${j}`} scope="row" rowSpan={abre} className={estilos.celdaGrupo}>
                        {celda}
                      </th>
                    )
                  }
                  const ultima = j === fila.celdas.length - 1
                  return (
                    <td key={`c-${j}`} data-cifra={esCifra(celda) ? 'true' : undefined}>
                      {/* El semáforo se pinta sobre la ÚLTIMA celda, que es
                          donde el deck real escribe el estatus: así el color
                          acompaña a la palabra en vez de flotar aparte. */}
                      {hayEstados && ultima && fila.estado && (
                        <span
                          className={estilos.semaforo}
                          data-estado={fila.estado}
                          aria-hidden="true"
                        />
                      )}
                      {celda}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hayEstados && (
        <ul className={estilos.leyenda}>
          {(Object.keys(ETIQUETA_ESTADO) as Array<keyof typeof ETIQUETA_ESTADO>).map((estado) => (
            <li key={estado}>
              <span className={estilos.semaforo} data-estado={estado} aria-hidden="true" />
              {ETIQUETA_ESTADO[estado]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
