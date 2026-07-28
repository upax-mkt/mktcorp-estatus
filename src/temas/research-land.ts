import type { Tema } from './tipos'

/**
 * PRIMARIO Y SECUNDARIO CORREGIDOS (28-jul).
 *
 * El morado es el color del logotipo —medido sobre el PNG oficial, 19% de la tinta cromática—; el azul no aparece en él.
 *
 * Importaba porque la sala se viste con `primario`: el filo de la tarjeta, el
 * degradado del encabezado y la escala de datos de los gráficos salían de un
 * color que no es el de la marca, y al cargar el logotipo encima cada tarjeta
 * chocaba consigo misma.
 */

export const researchLand: Tema = {
  slug: 'research-land',
  nombre: 'Research Land',
  primario: '#770EB3',
  secundario: '#1E0FF2',
  acento: '#F7BB11',
  superficieClara: '#FFFFFF',
  // Fondo oscuro derivado por Mkt Corp (no declarado en brandbook). Se sustituye si la marca define el suyo.
  superficieOscura: '#1A0B33',
  textoSobreClara: '#4D4D4D',
  textoSobreOscura: '#FFFFFF',
  gradiente: ['#770EB3', '#1E0FF2'],
  familiaDisplay: 'anton',
  familiaTexto: 'montserrat',
}
