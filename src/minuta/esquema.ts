/**
 * Contrato de salida de la etapa 9 (spec §9, "De la transcripción a la
 * minuta"): lo que le pedimos a Claude a partir de la transcripción cruda.
 * Reutiliza el candado `TextoPlano` de `src/decision/esquema.ts` — mismo
 * criterio que la etapa 2 del motor: la IA reparte contenido, nunca estilo,
 * y la salida se valida contra un esquema estricto antes de usarse.
 */
import { z } from 'zod'
import { TextoPlano } from '@/decision/esquema'

/**
 * Fecha compromiso: a diferencia de los campos de prosa (TextoPlano), esta es
 * una fecha estructurada, no texto libre de cara al equipo — se valida con su
 * propio formato (ISO `YYYY-MM-DD`), igual que `Grafico.serie` en
 * decision/esquema.ts no pasa por TextoPlano por ser un identificador, no
 * prosa. `null` es una respuesta legítima y esperada: "si la transcripción no
 * da una fecha, fechaCompromiso: null" (spec §9) — nunca se inventa.
 */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
const FechaCompromiso = z
  .string()
  .regex(FECHA_ISO, 'La fecha compromiso debe ir en formato ISO "YYYY-MM-DD"')
  .nullable()

export const EsquemaAcuerdoPropuesto = z
  .object({
    que: TextoPlano,
    responsable: TextoPlano,
    /** Omitido (no `null`) cuando la transcripción no menciona un squad — mismo criterio que `Kpi.delta` en decision/esquema.ts. */
    squad: TextoPlano.optional(),
    prioridad: TextoPlano,
    fechaCompromiso: FechaCompromiso,
  })
  .strict()

export const EsquemaMinuta = z
  .object({
    /** Párrafo breve — "Objetivo de la reunión" del molde real de Mkt Corp (spec §9). */
    objetivo: TextoPlano,
    /** Viñetas narrativas — "Temas generales y acuerdos" del molde. 1 a 8 líneas, una idea por línea. */
    temasYAcuerdos: z.array(TextoPlano).min(1).max(8),
    /** Párrafo breve — "Próximos pasos" del molde. */
    proximosPasos: TextoPlano,
    /** Borrador de acuerdos accionables extraídos de la transcripción — nada se publica sin revisión humana (spec §9). */
    acuerdosPropuestos: z.array(EsquemaAcuerdoPropuesto).max(20),
  })
  .strict() // strict rechaza cualquier clave extra, mismo candado que decision/esquema.ts

export type AcuerdoPropuesto = z.infer<typeof EsquemaAcuerdoPropuesto>
export type DecisionMinuta = z.infer<typeof EsquemaMinuta>

export function parsearMinuta(bruto: unknown): DecisionMinuta {
  return EsquemaMinuta.parse(bruto)
}
