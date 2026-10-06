/**
 * LAS CIFRAS DE LA REVISIÓN COMERCIAL DE RESEARCH LAND, corte al 6-oct-2026.
 *
 * Fotografía de ese día para la junta de Franco con Pablo Levy y Giovanni
 * Sanabria: no se actualiza sola. Todo número de la presentación sale de aquí.
 *
 * Fuentes (consultadas en vivo el 6-oct-2026):
 * - HubSpot, pipeline Research Land `53652407`. Propuestas = negocios con
 *   entrada a la etapa Propuesta (`hs_v2_date_entered_108387762`) en el
 *   periodo; su etapa actual da ganadas, perdidas y abiertas. Las 95 de
 *   enero a julio son las mismas que trae el deck de RL.
 * - HubSpot, perdidos de 2026: etapa Perdido + `closedate` del año; el
 *   motivo es la propiedad `perdido`.
 * - Forecast 2026, tab «Budget GDD 2026 (Escalonado)», bloque Research Land:
 *   reuniones agendadas del año y venta externa facturada en 2025.
 * - El plan 2027 y la cuota del ejecutivo son los del propio deck de RL.
 *
 * Solo nivel Research Land, sin cifras por persona (Franco, 6-oct-2026).
 */

export const CORTE = '6 de octubre de 2026'

/** Propuestas que entraron a la etapa Propuesta entre enero y julio de 2026. */
export const PROPUESTAS_ENE_JUL = { total: 95, ganadas: 2, perdidas: 89, abiertas: 4 } as const

/** Negocios perdidos con fecha de cierre en 2026, por motivo. */
export const PERDIDOS_2026 = {
  total: 120,
  motivos: [
    { motivo: 'Sin respuesta', negocios: 38 },
    { motivo: 'Precio o presupuesto', negocios: 27 },
    { motivo: 'Proyecto postergado', negocios: 22 },
    { motivo: 'Contra un competidor', negocios: 4 },
  ],
  /** Otro, desconocido, cancelado, entregable, decisor y procesos internos. */
  otros: 29,
} as const

/** Reuniones agendadas en 2026 (Forecast) y propuestas del año (HubSpot). */
export const REUNIONES_2026 = 138
export const PROPUESTAS_2026 = 111

/** Venta externa facturada en 2025 (Forecast) contra lo que pide el plan 2027. */
export const FACTURADO_EXTERNO_2025 = 10_176_586
export const META_PLAN_2027 = 34_800_000

/** Cuota anual que el plan le asigna al Ejecutivo Comercial. */
export const CUOTA_EJECUTIVO = 19_800_000

/** Porcentaje entero de un motivo sobre el total de perdidos. */
export function porcentaje(parte: number, total: number = PERDIDOS_2026.total): number {
  return Math.round((parte / total) * 100)
}
