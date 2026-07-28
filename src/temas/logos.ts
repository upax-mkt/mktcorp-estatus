/**
 * A QUÉ ALTURA SE DIBUJA EL LOGOTIPO DE CADA SALA.
 *
 * Los diez lockups van de 1,64:1 (House of Films, casi cuadrado) a 6,80:1
 * (Research Land, muy apaisado) — 4,2 veces de diferencia. A la MISMA altura,
 * el apaisado ocupa 4,2 veces más superficie y se lee como si gritara al lado
 * de los otros. El ojo no compara alturas: compara MANCHA.
 *
 *     alto = 28 × (4 / razón_de_aspecto) ^ 0.25
 *
 * DOS NÚMEROS Y POR QUÉ SON ESOS:
 *
 * - **28 px de referencia**, no 40. Con 40 los logos dominaban la tarjeta
 *   por encima de los datos, que es lo que se viene a leer. Franco: "los logos
 *   en el home de las salas son enormes".
 * - **Exponente 0.25**, no 0,5. La igualación pura de área (0,5) pasa de frenada:
 *   deja House of Films casi al doble de alto que Research Land, y esa
 *   diferencia de altura se lee como otro tipo de desproporción. Con 0.25 las
 *   alturas quedan dentro de un margen estrecho y la mancha, pareja.
 *
 * Medido sobre la MANCHA REAL de cada PNG —su caja de tinta y la densidad
 * dentro— no sobre el lienzo: los archivos traen aire alrededor y en distinta
 * cantidad.
 *
 * Si se cambia un logotipo hay que volver a medirlo. La razón de aspecto es
 * del archivo, no una preferencia.
 */
export const ALTO_LOGO: Record<string, number> = {
  'research-land': 24.3,
  'promo-espacio': 25.7,
  'marketing-united': 28.9,
  'mexa-creativa': 26.8,
  'house-of-films': 38.4,
  'uix': 26.7,
  'neracode': 28.0,
  'zeus': 23.5,
  'ceci': 41.4,
  'marketing-corp': 26.6,
  'grupo-upax': 28.5,
}

/**
 * De qué sala saca su logotipo cada sala.
 *
 * Vacío hoy: CECI YA TIENE EL SUYO. Durante un tiempo tomó prestado el de
 * Grupo UPAX porque no había archivo, y de ahí salieron dos tarjetas con el
 * mismo logotipo. Franco pasó su firma —"Ceci Fallabrino", manuscrita— y
 * desde entonces cada sala lleva la suya.
 *
 * El mecanismo se queda: es la respuesta correcta para una sala nueva que
 * todavía no tiene identidad propia, y no volver a inventarlo el día que
 * aparezca vale más que las tres líneas que ocupa.
 */
export const LOGO_DE: Record<string, string> = {}

export function archivoDeLogo(slug: string, variante: 'color' | 'blanco' = 'color'): string {
  return `/logos/${LOGO_DE[slug] ?? slug}-${variante}.png`
}

export function altoDeLogo(slug: string): number {
  return ALTO_LOGO[LOGO_DE[slug] ?? slug] ?? 28
}
