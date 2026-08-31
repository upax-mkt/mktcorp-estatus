/**
 * EL RESULTADO DEL CONCURSO: lo decide el equipo, y solo el equipo.
 *
 * Franco, 31-ago-2026: *«hoy definimos que no habrá jurado, solo voto del
 * equipo»*. Hasta entonces el spec repartía 70% voto y 30% jurado, con una
 * rúbrica de creatividad, cultura, viabilidad y atractivo.
 *
 * El cambio simplifica de verdad: sin dos escalas que normalizar, el resultado
 * es lo que se ve —cuántos votos tiene cada propuesta— y cualquiera puede
 * comprobarlo contando. Un 70/30 obliga a explicar por qué la más votada puede
 * no ganar; esto no.
 *
 * `calificacionJurado` y la rúbrica se retiran enteras. No se dejan «por si
 * acaso»: código muerto que calcula un premio es exactamente lo que alguien
 * vuelve a enchufar sin querer.
 */

/**
 * El puntaje de una propuesta: su porcentaje de los votos emitidos.
 *
 * Se devuelve en porcentaje y no en número de votos crudo para que el
 * resultado se lea igual con 8 votantes que con 23, y para que el desempate y
 * la presentación no dependan de cuánta gente votó ese día.
 */
export function puntajeFinal(datos: { votos: number; votosTotales: number }): number {
  if (datos.votosTotales <= 0) return 0
  return (datos.votos / datos.votosTotales) * 100
}
