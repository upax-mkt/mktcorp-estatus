import type { Benchmark } from '@/dominio/benchmark'

/**
 * EL BENCHMARK COMPETITIVO DE CADA SALA.
 *
 * Este es el ÚNICO sitio de la app donde hay datos escritos en el código, y
 * es una excepción decidida por Franco: el benchmark no lo produce esta
 * herramienta —sale de una investigación de mercado que se hace fuera— así
 * que no tiene sentido montarle un editor para teclearlo una vez al año.
 *
 * Todo lo demás de la app (sesiones, acuerdos, minutas, archivos) se crea
 * dentro de ella y vive en la base de datos. Esto no.
 *
 * ---------------------------------------------------------------------------
 * ESTÁ VACÍO A PROPÓSITO.
 *
 * Los competidores reales de cada UDN, sus niveles por dimensión y la lectura
 * de Mkt Corp salen de la presentación de benchmark que Franco va a pasar
 * como referencia. Rellenarlo a ojo produciría un análisis de la competencia
 * INVENTADO que la app enseñaría al director de la UDN como si fuera trabajo
 * hecho — y esa es la única forma de que esta pantalla haga daño.
 *
 * Una sala sin entrada aquí muestra su espacio vacío, que es la verdad.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE RELLENA. Una entrada por sala, con la clave = slug de la sala
 * (research-land, promo-espacio, marketing-united, mexa-creativa,
 * house-of-films, uix, neracode, zeus, ceci, grupo-upax):
 *
 *   'neracode': {
 *     salaSlug: 'neracode',
 *     competidores: ['Competidor A', 'Competidor B', 'C', 'D', 'E'],
 *     dimensiones: [
 *       {
 *         dimension: 'Cobertura de servicios',
 *         udn: 'lider',
 *         competidores: ['a_la_par', 'rezagado', 'rezagado', 'a_la_par', 'lider'],
 *       },
 *       // …4 o 5 filas
 *     ],
 *     lectura: 'Dónde gana la UDN y dónde tiene que cerrar brecha.',
 *     actualizado: '2026-07-27',
 *   },
 *
 * `competidores` son SIEMPRE cinco, y el array de cada dimensión lleva sus
 * cinco niveles en el mismo orden. El tipo lo obliga: una fila con cuatro no
 * compila, que es mejor que una matriz desalineada en la que la columna de un
 * competidor muestra el nivel de otro.
 */
export const BENCHMARK_POR_SALA: Record<string, Benchmark> = {}

export function benchmarkIncrustado(salaSlug: string): Benchmark | null {
  return BENCHMARK_POR_SALA[salaSlug] ?? null
}
