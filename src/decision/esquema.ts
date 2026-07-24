import { z } from 'zod'

export const LAYOUTS = [
  'portada',
  'agenda',
  'divisor-seccion',
  'pendientes-semaforo',
  'tarjetas-numeradas',
  'kpis-fila-dos-columnas',
  'comparativa-periodos',
  'grafico-y-tabla',
  'meta-real-porcentaje',
  'texto-multicolumna',
  'matriz-estados',
  'imagen-a-sangre',
  'cierre',
] as const

export const TIPOS_DE_GRAFICO = [
  'barras',
  'barras-horizontales',
  'barras-comparadas',
  'linea',
  'area',
  'dona',
] as const

const Kpi = z.object({
  valor: z.string().min(1),
  delta: z.string().optional(),
  rotulo: z.string().min(1),
}).strict()

const Columna = z.object({
  titulo: z.string().min(1),
  puntos: z.array(z.string().min(1)).min(1),
}).strict()

const Grafico = z.object({
  tipo: z.enum(TIPOS_DE_GRAFICO),
  serie: z.string().min(1),
}).strict()

export const EsquemaDecision = z.object({
  layout: z.enum(LAYOUTS),
  titulo: z.string().min(1),
  subtitulo: z.string().optional(),
  kpis: z.array(Kpi).max(4).optional(),
  columnas: z.array(Columna).max(4).optional(),
  grafico: Grafico.optional(),
  cuerpo: z.array(z.string()).optional(),
  imagen: z.string().optional(),
  /** Por qué el motor eligió esta composición. Obligatoria: es lo que se le muestra al equipo. */
  razon: z.string().min(1),
}).strict()   // strict rechaza cualquier clave extra — incluidos color, css o html

export type DecisionSlide = z.infer<typeof EsquemaDecision>

export function parsearDecision(bruto: unknown): DecisionSlide {
  return EsquemaDecision.parse(bruto)
}

export function esDecisionValida(bruto: unknown): boolean {
  return EsquemaDecision.safeParse(bruto).success
}
