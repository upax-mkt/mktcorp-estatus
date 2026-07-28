import type { Tema } from './tipos'

/**
 * PRIMARIO Y SECUNDARIO CORREGIDOS (28-jul).
 *
 * Brandbook 2026 p.24: Pantone 275c #614ACA es el Color Principal; #FF004F (Pantone 192c) y #00CFAB (3262c) son los dos acentos. Estaban al revés.
 *
 * Importaba porque la sala se viste con `primario`: el filo de la tarjeta, el
 * degradado del encabezado y la escala de datos de los gráficos salían de un
 * color que no es el de la marca, y al cargar el logotipo encima cada tarjeta
 * chocaba consigo misma.
 */

export const zeus: Tema = {
  slug: 'zeus',
  nombre: 'Zeus',
  primario: '#614ACA',
  secundario: '#FF004F',
  acento: '#00CFAB',
  superficieClara: '#E8EBF4',
  superficieOscura: '#202020',
  textoSobreClara: '#202020',
  textoSobreOscura: '#FFFFFF',
  gradiente: ['#614ACA', '#FF004F'],
  familiaDisplay: 'figtree',
  familiaTexto: 'figtree',
}
