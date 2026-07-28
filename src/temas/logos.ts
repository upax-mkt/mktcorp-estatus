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
 * Medido sobre la MANCHA REAL de cada PNG (su bounding box de tinta), no sobre
 * el lienzo: los archivos traen aire alrededor y en distinta cantidad.
 *
 * Si se cambia un logotipo hay que volver a medirlo. La razón de aspecto es
 * del archivo, no una preferencia.
 */
export const ALTO_LOGO: Record<string, number> = {
  'research-land': 24.5,
  'promo-espacio': 26.9,
  'marketing-united': 31.7,
  'mexa-creativa': 31.1,
  'house-of-films': 35.0,
  'uix': 31.8,
  'neracode': 27.3,
  'zeus': 27.9,
  'grupo-upax': 27.7,
  'marketing-corp': 27.4,
}

/**
 * De qué sala saca su logotipo cada sala.
 *
 * Ceci NO tiene identidad propia: hereda la de Grupo UPAX. Antes su tarjeta
 * llevaba su nombre escrito para no repetir el mismo logo dos veces, y Franco
 * decidió lo contrario — "el de UPAX y Ceci dejémoslo como solo uno". Se
 * respeta: las dos tarjetas llevan el logotipo de Grupo UPAX, y lo que las
 * distingue es el nombre de la sala en su barra y sus propios datos.
 */
export const LOGO_DE: Record<string, string> = {
  ceci: 'grupo-upax',
}

export function archivoDeLogo(slug: string, variante: 'color' | 'blanco' = 'color'): string {
  return `/logos/${LOGO_DE[slug] ?? slug}-${variante}.png`
}

/**
 * ¿Esta sala usa el logotipo de OTRA?
 *
 * Importa para la tarjeta: con el logotipo compartido, Ceci y Grupo UPAX
 * quedaban como dos tarjetas idénticas sin nada que las distinguiera. En las
 * ocho UDNs el logotipo ES el nombre y escribirlo al lado sería repetirse; en
 * estas dos, el nombre es lo ÚNICO que las separa.
 */
export function logoPrestado(slug: string): boolean {
  return slug in LOGO_DE
}

export function altoDeLogo(slug: string): number {
  return ALTO_LOGO[LOGO_DE[slug] ?? slug] ?? 28
}
