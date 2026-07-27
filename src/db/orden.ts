/**
 * Cálculo puro del reordenamiento de items. Vive aparte de sesiones.ts para
 * que lo compartan el cliente (que reordena de forma optimista mientras se
 * arrastra) y el servidor (que valida antes de escribir), sin duplicar la
 * lógica ni arrastrar la capa de base de datos al navegador.
 */

/** Lista resultante de sacar `id` de su sitio y soltarlo en `destino`. */
export function ordenTrasMover(ids: string[], id: string, destino: number): string[] {
  const origen = ids.indexOf(id)
  if (origen === -1) return ids

  const sinEl = ids.filter((x) => x !== id)
  const posicion = Math.max(0, Math.min(destino, sinEl.length))
  return [...sinEl.slice(0, posicion), id, ...sinEl.slice(posicion)]
}

/**
 * true si `propuestos` son exactamente los mismos ids que `actuales`, solo que
 * en otro orden. El servidor lo exige antes de escribir: una lista que pierde,
 * inventa o duplica un id no es un reordenamiento, y aplicarla dejaría items
 * huérfanos o con el mismo número de orden.
 */
export function esPermutacionValida(actuales: string[], propuestos: string[]): boolean {
  if (actuales.length !== propuestos.length) return false
  if (new Set(propuestos).size !== propuestos.length) return false
  const conjunto = new Set(actuales)
  return propuestos.every((id) => conjunto.has(id))
}
