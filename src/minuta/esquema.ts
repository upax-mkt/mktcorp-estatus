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
    /** Una frase. Un accionable que necesita tres líneas no es un accionable. */
    que: TextoPlano.max(160),
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
    /**
     * EL TOPE DE LARGO NO ES DECORACIÓN: es lo único que de verdad frena.
     *
     * Con la instrucción sola —"viñetas cortas"— el modelo devolvió trece
     * viñetas de párrafo entero: 1.180 palabras donde caben 60. Una minuta es
     * un resumen para quien ESTUVO en la reunión, no un sustituto de la
     * transcripción.
     *
     * 900 y no 700: el bloque de temas pide de tres a CINCO viñetas de una
     * línea, y cinco rondan los 750 caracteres. Con 700 el modelo fallaba dos
     * veces seguidas cumpliendo lo que se le pedía — un tope que castiga la
     * forma correcta está mal calibrado. 900 siguen siendo unas siete líneas,
     * lejísimos de las 1.180 palabras que salían antes.
     */
    bloques: z.array(TextoPlano.max(900)).min(1).max(8).describe(
      'Un texto por bloque, en el orden en que se piden. BREVE: máximo 900 caracteres por bloque. Cada uno responde solo a lo que pide SU bloque, sin repetir lo dicho en otro.',
    ),
    /** Borrador de acuerdos accionables extraídos de la transcripción — nada se publica sin revisión humana (spec §9). */
    /**
     * OCHO, no veinte.
     *
     * Con veinte salieron veinte, y catorce iban sin dueño: eso no es una
     * lista de compromisos, es la reunión transcrita en filas. Un accionable
     * es algo que ALGUIEN se comprometió a hacer; lo que se mencionó y nadie
     * tomó es un tema, y su sitio es el bloque de temas.
     */
    acuerdosPropuestos: z.array(EsquemaAcuerdoPropuesto).max(8).describe(
      'Los compromisos REALES: aquello que alguien se comprometió a hacer, con su nombre. Máximo 8, los que de verdad mueven algo. Lo que se mencionó y nadie tomó NO es un accionable: va en los temas. Solo lo que se dijo — si nadie puso fecha, va sin fecha.',
    ),
  })
  .strict() // strict rechaza cualquier clave extra, mismo candado que decision/esquema.ts

export type AcuerdoPropuesto = z.infer<typeof EsquemaAcuerdoPropuesto>
export type DecisionMinuta = z.infer<typeof EsquemaMinuta>

export function parsearMinuta(bruto: unknown): DecisionMinuta {
  return EsquemaMinuta.parse(bruto)
}
