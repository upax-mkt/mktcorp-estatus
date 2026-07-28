/**
 * A QUÉ ALTURA SE DIBUJA EL LOGOTIPO DE CADA SALA.
 *
 * Franco: "los logos están desproporcionados con respecto a la caja".
 *
 * La causa era normalizar por ALTURA. Los diez lockups van de 1,64:1 (House
 * of Films, casi cuadrado) a 6,80:1 (Research Land, muy apaisado) — 4,2 veces
 * de diferencia. A la misma altura, el apaisado ocupa 4,2 veces más superficie
 * y se lee como si gritara al lado de los otros.
 *
 * El ojo no compara alturas: compara MANCHA. Así que la altura sale de igualar
 * el área, con un exponente de 0.35 en vez de 0,5 — la igualación pura de área
 * pasa de frenada y deja los logos compactos enormes. Es el punto donde los
 * diez se leen como si pesaran lo mismo.
 *
 *     alto = 40 × (4 / razón_de_aspecto) ^ 0.35
 *
 * Medido sobre la MANCHA REAL de cada PNG (su bounding box de tinta), no sobre
 * el lienzo: los archivos traen aire alrededor y en distinta cantidad.
 *
 * Si se cambia un logotipo hay que volver a medirlo. La razón de aspecto es
 * del archivo, no una preferencia.
 */
export const ALTO_LOGO: Record<string, number> = {
  'research-land': 33.2,
  'promo-espacio': 37.9,
  'marketing-united': 47.6,
  'mexa-creativa': 46.3,
  'house-of-films': 54.7,
  'uix': 47.9,
  'neracode': 38.6,
  'zeus': 39.9,
  'grupo-upax': 39.3,
  'marketing-corp': 38.9,
}

/** Ceci hereda la identidad de Grupo UPAX: su tarjeta lleva el nombre. */
export const SIN_LOGO = new Set(['ceci'])

export function altoDeLogo(slug: string): number {
  return ALTO_LOGO[slug] ?? 40
}
