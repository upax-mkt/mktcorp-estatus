import type { Tema } from './tipos'

/**
 * PRIMARIO Y SECUNDARIO CORREGIDOS (28-jul).
 *
 * El lima es el 71% de la tinta del logotipo; el azul puro no aparece. Estaba como `acento`.
 *
 * Importaba porque la sala se viste con `primario`: el filo de la tarjeta, el
 * degradado del encabezado y la escala de datos de los gráficos salían de un
 * color que no es el de la marca, y al cargar el logotipo encima cada tarjeta
 * chocaba consigo misma.
 */

export const marketingUnited: Tema = {
  slug: 'marketing-united',
  nombre: 'Marketing United',
  primario: '#DCFF00',
  secundario: '#0000FF',
  acento: '#DCFF00',
  superficieClara: '#FFFFFF',
  superficieOscura: '#0A3270',
  textoSobreClara: '#3A3A3A',
  textoSobreOscura: '#FFFFFF',
  gradiente: ['#DCFF00', '#0000FF'],
  familiaDisplay: 'bungee',
  familiaTexto: 'muktaMahee',
}
