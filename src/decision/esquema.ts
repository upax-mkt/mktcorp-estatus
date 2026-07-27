import { z } from 'zod'

// LÍMITE DE SEGURIDAD: TODAS las cadenas de este esquema —sin excepción, incluidas
// las de las estructuras anidadas (celdas de tabla, viñetas, celdas de matriz,
// bloques)— se renderizan SIEMPRE como texto plano por React (JSX escapa el
// contenido por defecto). La única cadena que NO es texto es `Vineta.enlace`, que
// va a un href y por eso se valida como URL. Ningún consumidor
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

/**
 * Única puerta para cualquier cadena que acabe en un atributo que el navegador
 * resuelve (`src`, `href`): solo rutas relativas del propio sistema o https.
 *
 * Ojo con la alternativa obvia: `z.string().url()` NO sirve aquí. Valida con
 * `new URL()`, y `javascript:alert(1)` es una URL perfectamente válida — pasaría
 * el esquema y llegaría intacta a un `href`.
 */
function esUrlSegura(valor: string): boolean {
  if (ESQUEMA_PELIGROSO.test(valor)) return false
  if (/^https:\/\//i.test(valor)) return true
  // Ruta relativa del propio sistema: sin esquema (":") ni protocol-relative ("//").
  if (valor.includes(':')) return false
  if (valor.startsWith('//')) return false
  return true
}

const MENSAJE_URL_SEGURA =
  'Debe ser una ruta relativa del sistema o una URL https. No se permiten esquemas javascript:, data: ni file:.'

/** Restringe `imagen` a rutas relativas del propio sistema o URLs https. */
const Imagen = z.string().min(1).refine(esUrlSegura, { message: MENSAJE_URL_SEGURA })

/** Lo mismo para el `href` de una viñeta con enlace. */
const Enlace = z.string().min(1).refine(esUrlSegura, { message: MENSAJE_URL_SEGURA })

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
  // Los tres que usa un estatus real (ver docs/.../brecha-vs-deck-real.md):
  // barras de volumen con líneas de tendencia y meta sobre un segundo eje;
  // dos periodos comparados por canal en horizontal; y varias métricas de
  // escalas muy distintas (coste vs. clics) que necesitan doble eje.
  'combo-barras-lineas',
  'barras-horizontales-agrupadas',
  'lineas-multiples',
] as const

/** En qué eje se lee una serie cuando el gráfico tiene dos escalas. */
export const EJES = ['izquierdo', 'derecho'] as const

/** Estado de una fila con semáforo (pendientes) o de una celda de la matriz. */
export const ESTADOS_SEMAFORO = ['listo', 'en-proceso', 'no-realizado'] as const

// IMPORTANTE: cada campo lleva .describe(). Es lo único de este archivo que el
// modelo llega a leer — los comentarios de TypeScript no viajan, y el esquema
// se le entrega como JSON Schema. Sin descripciones, un campo se le presenta
// como `{"type": "string"}` a secas y lo rellena con basura: en producción
// devolvió `delta: "x"` y `razon: "placeholder"`, que es exactamente lo que
// escribe un modelo al que se le pide una cadena sin decirle de qué.


// ---- Estructuras que un estatus real necesita ----------------------------
// Todas salieron de inventariar un deck de verdad (Mexa Creativa, junio 2026):
// ver docs/superpowers/specs/2026-07-27-brecha-vs-deck-real.md. Antes de esto,
// el contrato solo sabía de cifras sueltas y viñetas planas, así que más de la
// mitad de ese deck no se podía ni representar.

/** Una viñeta que puede colgar de sí misma. En el deck real llega a 3 niveles. */
export interface Vineta {
  texto: string
  /** Enlace, si esa línea apunta a algo (una cuenta de HubSpot, un artículo). */
  enlace?: string
  hijos?: Vineta[]
}

const Vineta: z.ZodType<Vineta> = z.lazy(() =>
  z.object({
    texto: TextoPlano.describe('La línea. Una idea, cerrada en sí misma.'),
    enlace: Enlace.optional().describe('URL https, solo si esa línea apunta a algo concreto.'),
    hijos: z.array(Vineta).optional().describe(
      'Sub-viñetas que dependen de esta. Úsalas cuando el contenido tiene jerarquía real (un servicio y sus industrias), no para partir una frase larga.',
    ),
  }).strict(),
)

const FilaTabla = z.object({
  // Admite la celda vacía a propósito: en la tabla de pendientes del deck real
  // hay tareas cuyo estatus nadie llenó. Exigir texto obligaría a rellenar ese
  // hueco con algo — y ese algo sería inventado.
  celdas: z.array(TextoPlanoOVacio).min(1).describe(
    'Los valores de la fila, en el mismo orden que las columnas. Copiados exactos: "3,591" se queda "3,591". Deja la celda como cadena vacía si en la fuente no hay dato: no la rellenes.',
  ),
  destacada: z.boolean().optional().describe('true solo para una fila de total o resumen.'),
  estado: z.enum(ESTADOS_SEMAFORO).optional().describe(
    'Semáforo de la fila, cuando la tabla lleva uno (pendientes de la sesión pasada).',
  ),
}).strict()

const Tabla = z.object({
  titulo: TextoPlano.optional().describe('Encabezado de la tabla, si la página muestra más de una ("Estado de MQLs").'),
  // El primer encabezado de una comparativa va vacío ("", "Mayo", "Junio"):
  // la columna de etiquetas no se titula. El propio ejemplo del describe lo
  // pedía mientras el validador lo rechazaba.
  columnas: z.array(TextoPlanoOVacio).min(2).max(6).describe(
    'Los encabezados, de izquierda a derecha. Por ejemplo ["", "Mayo", "Junio"] para una comparativa, o ["Responsable", "Tarea", "Estatus"] para pendientes.',
  ),
  filas: z.array(FilaTabla).min(1).describe('Las filas, en el orden en que deben leerse.'),
  /**
   * Agrupar por la primera columna: en la tabla de pendientes, un responsable
   * con tres tareas aparece UNA vez y sus filas se agrupan bajo su nombre.
   */
  agruparPrimeraColumna: z.boolean().optional().describe(
    'true cuando la primera columna se repite y debe mostrarse una sola vez por grupo (un responsable con varias tareas).',
  ),
}).strict()

const SerieDatos = z.object({
  etiqueta: TextoPlano.describe('Cómo se llama esta serie en la leyenda ("Total 2026", "Orgánico 2025", "Coste").'),
  valores: z.array(z.number()).min(1).describe('Un número por periodo, en el mismo orden que los periodos del gráfico.'),
  forma: z.enum(['barra', 'linea', 'linea-punteada']).optional().describe(
    'Cómo se dibuja. "linea-punteada" es la convención para una meta o un objetivo, que no es un dato medido.',
  ),
  eje: z.enum(EJES).optional().describe(
    'En qué eje se lee. Solo hace falta cuando las series tienen escalas muy distintas (coste en miles junto a conversiones en decenas).',
  ),
  prefijo: TextoPlano.optional().describe('Lo que va DELANTE del número al escribirlo ("$"). Omítelo si no lleva.'),
  sufijo: TextoPlano.optional().describe('Lo que va DETRÁS del número al escribirlo ("%", " MDP"). Omítelo si no lleva.'),
}).strict()

const CeldaMatriz = z.object({
  texto: TextoPlano.describe('Lo que dice la celda ("Vende", "Prepara", "Explora", "Espera").'),
  tono: z.enum(['alto', 'medio', 'bajo', 'neutro']).optional().describe(
    'Intensidad de la celda: "alto" para el pico de actividad, "bajo" para lo que solo se monitorea.',
  ),
}).strict()

const FilaMatriz = z.object({
  encabezado: TextoPlano.describe('Lo que nombra la fila (una industria, un canal).'),
  celdas: z.array(CeldaMatriz).min(1).describe('Una celda por columna, en orden.'),
  nota: TextoPlano.optional().describe('Aclaración bajo la fila (el ciclo estimado, la fuente).'),
}).strict()

const Matriz = z.object({
  columnas: z.array(TextoPlano).min(2).max(12).describe('Los encabezados de columna (los meses del trimestre).'),
  filas: z.array(FilaMatriz).min(1).describe('Una fila por concepto del eje vertical (una industria, un canal), en orden.'),
  leyenda: z.array(TextoPlano).optional().describe('Qué significa cada estado, una línea por estado.'),
}).strict()

const CifraConDesglose = z.object({
  rotulo: TextoPlano.describe('Qué mide ("Pipeline generado YTD", "Negocios perdidos YTD").'),
  valor: TextoPlano.describe('El total, con su unidad tal como viene ("$39.4 MDP", "$191 K").'),
  destacada: z.boolean().optional().describe('true para la cifra que es la noticia del bloque.'),
  partes: z.array(z.object({
    rotulo: TextoPlano.describe('Nombre de la parte ("Mkt", "Comercial").'),
    valor: TextoPlano.describe('Su valor, con unidad.'),
  }).strict()).optional().describe('En qué se descompone el total. Las partes deben sumar el total.'),
}).strict()

const MetaReal = z.object({
  titulo: TextoPlano.describe('Qué se está midiendo contra su meta ("SQLs").'),
  filas: z.array(z.object({
    rotulo: TextoPlano.describe('El renglón del desglose ("Total", "Mkt", "Ventas").'),
    meta: TextoPlano.describe('El objetivo.'),
    real: TextoPlano.describe('Lo alcanzado.'),
    porcentaje: TextoPlano.describe('El cumplimiento, como viene ("14%", "25%", "0%").'),
  }).strict()).min(1).describe(
    'Un renglón por corte. El primero suele ser el total y los siguientes lo abren por equipo.',
  ),
}).strict()

/**
 * Un bloque numerado: título, párrafo, viñetas y una línea de cierre rotulada.
 * Es la unidad de los "Focos" del trimestre — cinco de estos, uno por foco.
 */
const Bloque = z.object({
  titulo: TextoPlano.describe('De qué va el bloque ("Reactivación de cuentas dormidas").'),
  etiqueta: TextoPlano.optional().describe('Distintivo corto junto al título ("Prioridad alta", "Q3"). Omítelo si no lo hay.'),
  parrafo: TextoPlano.optional().describe('El planteamiento del bloque, en dos o tres líneas de corrido.'),
  puntos: z.array(Vineta).optional().describe('El detalle en viñetas, si el bloque lo trae.'),
  pie: z.object({
    rotulo: TextoPlano.describe('Cómo se llama esa última línea ("Oferta gancho").'),
    texto: TextoPlano.describe('Su contenido.'),
  }).strict().optional().describe('Línea de cierre rotulada al final del bloque. Omítela si el bloque no la trae.'),
}).strict()

const Kpi = z.object({
  valor: TextoPlano.describe(
    'La cifra, copiada EXACTA del inventario: "29k" se queda "29k", "0.9%" se queda "0.9%". No la reescribas ni la redondees.',
  ),
  delta: TextoPlano.optional().describe(
    'La variación de esa cifra, copiada del inventario: "-16%", "+0.3". Si la cifra del inventario trae variación, va aquí y solo aquí — el rótulo lleva únicamente el nombre. Si no trae, omite el campo.',
  ),
  rotulo: TextoPlano.describe(
    'Cómo se llama la cifra, en dos o tres palabras ("Impresiones", "Leads calificados"). Solo el nombre: sin la variación, sin comillas y sin puntos suspensivos.',
  ),
}).strict()

const Columna = z.object({
  titulo: TextoPlano.describe('Encabezado del bloque, en dos o tres palabras ("Hallazgos", "Acciones").'),
  etiqueta: TextoPlano.optional().describe('Dato corto que acompaña al encabezado, normalmente una fecha ("Actualizado 12-jun").'),
  puntos: z.array(Vineta).min(1).describe(
    'Las líneas del bloque, una idea por línea y cada una cerrada en sí misma. Son conclusiones, no párrafos. Una línea suelta es {"texto": "…"}; solo cuelga "hijos" cuando hay jerarquía de verdad.',
  ),
}).strict()

const Grafico = z.object({
  tipo: z.enum(TIPOS_DE_GRAFICO).describe('Qué forma de gráfico comunica mejor estos datos.'),
  titulo: TextoPlano.optional().describe('Título del gráfico, si aporta ("Tráfico website").'),
  periodos: z.array(TextoPlano).min(1).describe(
    'El eje horizontal: los meses o categorías, en orden ("enero", "febrero"… o "Organic Search", "Paid Search"…).',
  ),
  series: z.array(SerieDatos).min(1).max(6).describe(
    'Los datos. Cada serie trae un valor por periodo, en el mismo orden.',
  ),
  mostrarValores: z.boolean().optional().describe(
    'true para escribir el número sobre cada punto o barra. Úsalo cuando la cifra exacta importa tanto como la tendencia.',
  ),
  // Se conserva el nombre de la pieza del inventario de la que salieron los
  // datos: es lo que permite auditar de dónde vino cada número.
  serie: z.string().min(1).optional().describe(
    'La etiqueta de la pieza [serie] o [comparativo] del inventario de la que salieron estos datos.',
  ),
}).strict()

export const EsquemaDecision = z.object({
  layout: z.enum(LAYOUTS).describe(
    'El layout elegido, de la lista de layouts disponibles que trae el mensaje de sistema. Elige el que mejor comunique la señal de este contenido a un director.',
  ),
  titulo: TextoPlano.describe(
    'El título del slide. Cuando el contenido sostiene una lectura, el título ES esa lectura ("El tráfico cae, pero la calidad del lead mejora"), no una etiqueta neutra ("Performance del sitio web").',
  ),
  subtitulo: TextoPlano.optional().describe('Una línea de contexto bajo el título. Omítelo si no aporta.'),
  kpis: z.array(Kpi).max(4).optional().describe(
    'Las cifras del inventario, hasta 4. Si el inventario trae 4 cifras o menos, van TODAS: ninguna se omite ni se degrada a texto de las columnas.',
  ),
  columnas: z.array(Columna).max(4).optional().describe(
    'El análisis cualitativo — hallazgos, acciones — en bloques paralelos. Las cifras no van aquí: van en "kpis".',
  ),
  graficos: z.array(Grafico).max(2).optional().describe(
    'Los gráficos de la sección, hasta dos. Uno por cada pieza [serie] o [comparativo] del inventario que valga la pena graficar: si el inventario trae dos, van los dos.',
  ),
  tablas: z.array(Tabla).max(3).optional().describe(
    'Las tablas de la sección. Una tabla es la forma correcta para una comparativa entre dos periodos o para un desglose fila a fila; no la conviertas en viñetas.',
  ),
  matriz: Matriz.optional().describe(
    'Una rejilla de estados: conceptos en las filas, periodos en las columnas y en cada cruce qué toca hacer. Solo si el inventario trae una pieza [matriz].',
  ),
  metaReal: MetaReal.optional().describe(
    'El bloque de cumplimiento: meta contra real y su porcentaje, abierto por equipo. Solo si el inventario trae esa comparación.',
  ),
  // Seis y no cuatro: el bloque de pipeline de un estatus real lleva ideal,
  // generado, perdido, ganado-por-facturar, ganado-facturado y vivos. Con
  // cuatro, reproducirlo obligaba a tirar dos.
  cifrasDesglosadas: z.array(CifraConDesglose).max(6).optional().describe(
    'Cifras que además de su total traen en qué se reparten (un pipeline abierto por Mkt y Comercial). Una cifra suelta, sin partes, va en "kpis" y no aquí.',
  ),
  bloques: z.array(Bloque).max(5).optional().describe(
    'Bloques numerados de igual peso, cada uno con su título y su detalle (los focos del trimestre). El layout los numera solo.',
  ),
  cuerpo: z.array(TextoPlano).optional().describe(
    'Líneas sueltas de contenido, una idea por línea (por ejemplo, los puntos de una agenda). El layout las numera solo: no antepongas "1." ni "2)".',
  ),
  notaPie: TextoPlano.optional().describe(
    'Aclaración al pie de la sección: de dónde salen los datos, qué queda fuera del corte, una salvedad de medición.',
  ),
  imagen: Imagen.optional().describe(
    'La ruta de la pieza [imagen] del inventario, copiada tal cual. Solo si el inventario trae una imagen real; nunca inventes una ruta.',
  ),
  // Ojo con la redacción: una versión anterior decía «no un relleno como
  // "placeholder"» y el modelo devolvía exactamente eso — nombrar el ejemplo
  // negativo se lo pone en la boca. Se describe con un ejemplo de lo correcto.
  razon: TextoPlanoOVacio.describe(
    'Una frase concreta explicando por qué esta composición comunica mejor la señal de este contenido a un director: por qué este layout, este título, este reparto. Ejemplo: "Las cuatro cifras van como KPIs y el análisis a dos columnas, porque la caída de impresiones es la noticia y el resto la explica." La lee el equipo de Marketing Corporativo para auditar tu decisión.',
  ),
}).strict()   // strict rechaza cualquier clave extra — incluidos color, css o html

export type DecisionSlide = z.infer<typeof EsquemaDecision>

export function parsearDecision(bruto: unknown): DecisionSlide {
  return EsquemaDecision.parse(bruto)
}

export function esDecisionValida(bruto: unknown): boolean {
  return EsquemaDecision.safeParse(bruto).success
}
