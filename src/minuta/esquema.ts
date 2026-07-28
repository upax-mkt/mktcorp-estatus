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
    /**
     * Un texto por bloque del molde, EN SU MISMO ORDEN.
     *
     * Antes eran tres campos con nombre fijo —objetivo, temasYAcuerdos,
     * proximosPasos— porque el molde estaba incrustado en el código. Con el
     * molde editable, el esquema no puede saber cómo se llaman los bloques:
     * los nombra el equipo. Lo que sí sabe es cuántos hay y qué se pide en
     * cada uno, y eso viaja en el prompt.
     */
    bloques: z.array(TextoPlano).min(1).max(8).describe(
      'Un texto por bloque de la minuta, en el mismo orden en que se piden. Cada uno responde solo a lo que pide SU bloque.',
    ),
    /** Borrador de acuerdos accionables extraídos de la transcripción — nada se publica sin revisión humana (spec §9). */
    acuerdosPropuestos: z.array(EsquemaAcuerdoPropuesto).max(20).describe(
      'Los compromisos que se oyen en la transcripción, con quién responde y para cuándo. Solo lo que se dijo: si nadie puso fecha, va sin fecha.',
    ),
  })
  .strict() // strict rechaza cualquier clave extra, mismo candado que decision/esquema.ts

export type AcuerdoPropuesto = z.infer<typeof EsquemaAcuerdoPropuesto>
export type DecisionMinuta = z.infer<typeof EsquemaMinuta>

export function parsearMinuta(bruto: unknown): DecisionMinuta {
  return EsquemaMinuta.parse(bruto)
}
