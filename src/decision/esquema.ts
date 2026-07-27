import { z } from 'zod'

// LÍMITE DE SEGURIDAD: todas las cadenas de este esquema (titulo, subtitulo, razon,
// cuerpo, rotulo/valor/delta de Kpi, titulo/puntos de Columna) se renderizan SIEMPRE
// como texto plano por React (JSX escapa el contenido por defecto). Ningún consumidor
// debe pasarlas por dangerouslySetInnerHTML ni por cualquier otro mecanismo que
// interprete markup — el validador TextoPlano de abajo existe precisamente para que
// nunca llegue nada que dependa de eso. Si en el futuro alguien necesita texto con
// formato, eso es una decisión de diseño nueva y explícita, no un bypass de este esquema.

/**
 * Detecta etiquetas HTML: `<algo>`, `</algo>`, `<algo />`, incluyendo con atributos.
 */
const ETIQUETA_HTML = /<\/?[a-zA-Z][^<>]*>/

/**
 * Detecta el atributo `style=` (con o sin espacios) en cualquier posición del texto.
 */
const ATRIBUTO_STYLE = /style\s*=/i

/**
 * Detecta declaraciones CSS del tipo `propiedad: valor;` para propiedades de estilo
 * conocidas (color, background, font-*, y otras propiedades de layout/caja comunes).
 * Requiere el `;` de cierre para no atrapar texto legítimo con dos puntos.
 */
const DECLARACION_CSS =
  /\b(color|background(?:-[\w-]+)?|font(?:-[\w-]+)?|border(?:-[\w-]+)?|margin(?:-[\w-]+)?|padding(?:-[\w-]+)?|width|height|display|position|opacity|text-align|z-index|top|left|right|bottom)\s*:\s*[^;\n]+;/i

/**
 * Detecta negrita/cursiva de Markdown: un par de `**...**` o `__...__` alrededor
 * de contenido no vacío. Requiere el delimitador DOBLE y emparejado — un asterisco
 * o guion bajo suelto (posible en datos o guiones de palabra) nunca dispara esto.
 */
const MARKDOWN_ENFASIS = /\*\*[^*\n]+\*\*|__[^_\n]+__/

/**
 * Detecta encabezados de Markdown: una línea que empieza con 1 a 6 `#` seguidos
 * de un espacio. Ancla al inicio de línea (`^` con flag `m`) para no atrapar un
 * `#` que aparezca en medio de una frase (p. ej. "folio #12").
 */
const MARKDOWN_ENCABEZADO = /^#{1,6}\s/m

/**
 * Detecta código de Markdown: cualquier backtick, ya sea un par `` `code` `` o
 * uno suelto. El contenido real del negocio no usa backticks.
 */
const MARKDOWN_CODIGO = /`/

function contieneMarkdown(texto: string): boolean {
  return MARKDOWN_ENFASIS.test(texto) || MARKDOWN_ENCABEZADO.test(texto) || MARKDOWN_CODIGO.test(texto)
}

function contieneMarkupOEstilo(texto: string): boolean {
  return (
    ETIQUETA_HTML.test(texto) ||
    ATRIBUTO_STYLE.test(texto) ||
    DECLARACION_CSS.test(texto) ||
    contieneMarkdown(texto)
  )
}

/**
 * Validador reutilizable para todo campo de texto libre de cara al equipo.
 * Acota el contrato: la IA reparte contenido, nunca estilo. Rechaza markup HTML,
 * CSS inline y sintaxis Markdown de formato (negrita/cursiva, encabezados,
 * backticks de código); el resto de texto plano (números, símbolos, acentos,
 * guiones, flechas, comas) pasa sin problema.
 */
export const TextoPlano = z.string().min(1).refine((texto) => !contieneMarkupOEstilo(texto), {
  message:
    'El contenido debe ser texto plano: sin etiquetas HTML, sin atributos style, sin declaraciones CSS, y sin sintaxis Markdown (negrita/cursiva, encabezados con #, backticks de código).',
})

/**
 * Igual que TextoPlano pero admite la cadena vacía. Solo para `razon`.
 *
 * Por qué: `razon` es auditoría interna — la lee el equipo de Mkt Corp, nunca
 * el director. Exigirle longitud mínima al modelo hacía que una `razon` vacía
 * tumbara el parseo y con él TODO el slide, cifras incluidas; visto en
 * producción, dos intentos seguidos perdidos por un campo que no se proyecta.
 * Se admite vacía en el contrato y `sanearDecision` la rellena con una marca
 * explícita, para que el equipo vea que el modelo no explicó su decisión en
 * vez de perder el slide entero.
 */
export const TextoPlanoOVacio = z.string().refine((texto) => !contieneMarkupOEstilo(texto), {
  message:
    'El contenido debe ser texto plano: sin etiquetas HTML, sin atributos style, sin declaraciones CSS, y sin sintaxis Markdown (negrita/cursiva, encabezados con #, backticks de código).',
})

const ESQUEMA_PELIGROSO = /^(javascript|data|file):/i

function esImagenValida(valor: string): boolean {
  if (ESQUEMA_PELIGROSO.test(valor)) return false
  if (/^https:\/\//i.test(valor)) return true
  // Ruta relativa del propio sistema: sin esquema (":") ni protocol-relative ("//").
  if (valor.includes(':')) return false
  if (valor.startsWith('//')) return false
  return true
}

/**
 * Restringe `imagen` a rutas relativas del propio sistema o URLs https.
 * Rechaza explícitamente esquemas javascript:, data: y file:.
 */
const Imagen = z.string().min(1).refine(esImagenValida, {
  message: 'La imagen debe ser una ruta relativa del sistema o una URL https. No se permiten esquemas javascript:, data: ni file:.',
})

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
  valor: TextoPlano,
  delta: TextoPlano.optional(),
  rotulo: TextoPlano,
}).strict()

const Columna = z.object({
  titulo: TextoPlano,
  puntos: z.array(TextoPlano).min(1),
}).strict()

const Grafico = z.object({
  tipo: z.enum(TIPOS_DE_GRAFICO),
  // Identificador de datos (no texto de cara al usuario): no pasa por TextoPlano.
  serie: z.string().min(1),
}).strict()

export const EsquemaDecision = z.object({
  layout: z.enum(LAYOUTS),
  titulo: TextoPlano,
  subtitulo: TextoPlano.optional(),
  kpis: z.array(Kpi).max(4).optional(),
  columnas: z.array(Columna).max(4).optional(),
  grafico: Grafico.optional(),
  cuerpo: z.array(TextoPlano).optional(),
  imagen: Imagen.optional(),
  /**
   * Por qué el motor eligió esta composición. Es lo que lee el equipo para
   * auditar la decisión; el director nunca la ve. Se admite vacía a propósito
   * (ver TextoPlanoOVacio): que el modelo no se explique no puede costar el
   * slide. `sanearDecision` la rellena.
   */
  razon: TextoPlanoOVacio,
}).strict()   // strict rechaza cualquier clave extra — incluidos color, css o html

export type DecisionSlide = z.infer<typeof EsquemaDecision>

export function parsearDecision(bruto: unknown): DecisionSlide {
  return EsquemaDecision.parse(bruto)
}

export function esDecisionValida(bruto: unknown): boolean {
  return EsquemaDecision.safeParse(bruto).success
}
