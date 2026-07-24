/**
 * Etapa 2 del motor: construcción del prompt que se envía al modelo para producir
 * una `DecisionSlide` (ver src/decision/esquema.ts). Puro y sin red — no llama a
 * ningún cliente, solo arma las dos cadenas (`system`, `user`) que `decidir()` usa.
 */
import type { Inventario, PiezaInventario } from './inventario'
import type { Tema } from '@/temas/tipos'
import type { DecisionSlide } from '@/decision/esquema'
import { layoutsImplementados } from './catalogo'

/**
 * Qué campos de `DecisionSlide` admite cada layout, en prosa para el prompt.
 * Deliberadamente NO es exhaustiva para todo `LAYOUTS`: solo describe los
 * layouts que hoy tienen componente (ver catalogo.ts). Si un layout implementado
 * no tiene entrada aquí, cae en la descripción genérica de abajo — así un
 * layout nuevo no rompe el prompt aunque nadie haya actualizado esta tabla,
 * y el catálogo ofrecido sigue derivándose únicamente de `layoutsImplementados()`.
 */
const CAMPOS_POR_LAYOUT: Partial<Record<DecisionSlide['layout'], string>> = {
  portada: 'admite "titulo" (obligatorio) y "subtitulo" (opcional, una línea de contexto).',
  'kpis-fila-dos-columnas':
    'admite "kpis" (arreglo de hasta 4, cada uno con "valor", "rotulo" y "delta" opcional) ' +
    'y/o "columnas" (arreglo de hasta 4, cada una con "titulo" y "puntos" — una lista de líneas cortas). ' +
    'REGLA DE COBERTURA: hay 4 espacios de KPI. Cuando el inventario trae 4 cifras o menos, TODAS ' +
    'van como KPIs — cada cifra del inventario ocupa un espacio, con su valor, rótulo y delta. Ninguna ' +
    'cifra se omite ni se degrada a texto de las columnas. Las columnas son para el análisis ' +
    '(hallazgos, acciones), no para esconder una cifra que no cupo.',
}

const DESCRIPCION_GENERICA =
  'admite al menos "titulo" (obligatorio); no listes campos que no correspondan a este layout.'

function describirLayout(layout: DecisionSlide['layout']): string {
  return CAMPOS_POR_LAYOUT[layout] ?? DESCRIPCION_GENERICA
}

function listaDeLayouts(): string {
  return layoutsImplementados()
    .map((layout) => `- "${layout}": ${describirLayout(layout)}`)
    .join('\n')
}

function serializarPieza(pieza: PiezaInventario, indice: number): string {
  switch (pieza.tipo) {
    case 'cifra':
      return `  ${indice + 1}. [cifra] valor="${pieza.valor}" rotulo="${pieza.rotulo}"${pieza.delta ? ` delta="${pieza.delta}"` : ''}`
    case 'serie':
      return `  ${indice + 1}. [serie] etiqueta="${pieza.etiqueta}" periodos=[${pieza.periodos.join(', ')}] valores=[${pieza.valores.join(', ')}]`
    case 'comparativo':
      return (
        `  ${indice + 1}. [comparativo] etiqueta="${pieza.etiqueta}" periodos=[${pieza.periodos.join(', ')}]\n` +
        pieza.series
          .map((s) => `       - ${s.etiqueta}: [${s.valores.join(', ')}]`)
          .join('\n')
      )
    case 'lista':
      return `  ${indice + 1}. [lista]\n` + pieza.items.map((item) => `       - ${item}`).join('\n')
    case 'parrafo':
      return `  ${indice + 1}. [parrafo] "${pieza.texto}"`
    case 'imagen':
      return `  ${indice + 1}. [imagen] ruta="${pieza.ruta}"`
  }
}

function serializarInventario(inv: Inventario): string {
  const piezas = inv.piezas.map((p, i) => serializarPieza(p, i)).join('\n')
  return `Título del contenido: "${inv.titulo}"\n\nPiezas del inventario:\n${piezas}`
}

const SYSTEM_BASE = `Preparas el material de estatus que Marketing Corporativo de Grupo UPAX
presenta a los directores y gerentes senior de cada unidad de negocio. Tu
audiencia son ejecutivos que revisan decenas de reportes: captan la señal de
un slide en segundos o pasan de largo. Tu trabajo es REPARTIR el contenido que
ya te entregaron en el layout que mejor comunica esa señal a ese público. No
inventas datos ni conclusiones (no eres analista) y no decides estilo (no eres
diseñador): tomas material existente y lo compones con criterio ejecutivo.

CRITERIO DE MATERIAL EJECUTIVO — así repartes:
- El TÍTULO responde la pregunta que haría el director: "¿qué pasó aquí?",
  "¿qué debo saber?". Cuando el contenido sostiene una lectura, el título ES
  esa lectura ("El tráfico cae, pero la calidad del lead mejora"), no una
  etiqueta neutra ("Performance del sitio web"). Si el inventario NO sostiene
  una conclusión, usa un título descriptivo y limpio — jamás inventes una
  lectura que los datos no respalden.
- UNA IDEA POR SLIDE. Jerarquiza: lo que el director necesita saber primero va
  arriba y con peso; el detalle de apoyo va subordinado, no compitiendo.
- LA SEÑAL SE DESTACA, EL RUIDO SE SUBORDINA. Una variación relevante — una
  caída, un salto, un dato fuera de tendencia — es la noticia del slide y va al
  frente. Un dato plano o esperado no le roba atención.
- CONCISIÓN EJECUTIVA. Un director no lee párrafos, lee conclusiones. Convierte
  los hallazgos en frases-cierre, cortas y afiladas — una idea por línea. Un
  bloque de análisis de cinco renglones se reparte como tres viñetas de una
  línea, cada una con su punto. Rótulos breves, sin relleno ni preámbulo.

CATÁLOGO DISPONIBLE (solo estos layouts existen como componente real hoy —
elige exclusivamente de esta lista, aunque conozcas otros nombres de layout
por el dominio; si no está aquí, no existe todavía). Elige el que mejor
comunique la señal de este contenido a un ejecutivo, no el que más quepa:
{{LISTA_LAYOUTS}}

REGLA DURA DE ESTILO — no negociable:
Nunca devuelvas color, CSS, HTML, tamaños, tipografías ni markup — tampoco
sintaxis Markdown: nada de **negrita**, _cursiva_, # de encabezado ni backticks
de código. Solo la decisión de layout, el reparto del contenido y los textos ya
recortados, en texto plano. El énfasis lo da la JERARQUÍA que eliges (qué va de
título, qué se destaca por su posición en el layout), nunca una marca
tipográfica. El tema visual de la sala ya está resuelto por otra capa del
sistema y no es tu responsabilidad ni tu decisión.

REGLA DURA DE DATOS — no negociable:
Cada pieza [cifra] del inventario DEBE aparecer en tu slide. Si eliges el layout
de KPIs, cada cifra ocupa UN espacio de KPI con su valor EXACTO tal como está en
el inventario — "29k" se queda "29k", "0.9%" se queda "0.9%", no lo reescribas ni
lo redondees. Hay 4 espacios de KPI: si el inventario trae 4 cifras, van las 4,
no una ni tres. Los KPIs NO son opcionales cuando el inventario trae cifras: son
obligatorios. El análisis cualitativo (hallazgos, acciones) va en las columnas;
las cifras van en los KPIs. Nunca descartes una cifra por priorizar el análisis:
un slide ejecutivo con 3 de 4 cifras es un slide incompleto y será rechazado.

SIEMPRE incluyes "razon": una frase concreta que explica por qué esta
composición comunica mejor la señal de este contenido a un director (por qué
este layout, este título, este reparto). Es lo único que el equipo humano lee
para auditar tu decisión.

Tu salida se valida contra un esquema estricto que rechaza cualquier campo que
no sea contenido puro (incluidos color, css o html). Si intentas colar estilo,
tu respuesta será descartada.`

export function construirPrompt(
  inv: Inventario,
  tema: Tema,
  motivoRechazo?: string,
): { system: string; user: string } {
  const system = SYSTEM_BASE.replace('{{LISTA_LAYOUTS}}', listaDeLayouts())

  const partesUser = [
    `Sala: ${tema.nombre}`,
    '',
    serializarInventario(inv),
  ]

  if (inv.nota) {
    partesUser.push('', `Nota del autor (instrucción u observación a respetar): "${inv.nota}"`)
  }

  if (motivoRechazo) {
    partesUser.push('', `Tu intento anterior fue rechazado porque: ${motivoRechazo}. Corrígelo.`)
  }

  const user = partesUser.join('\n')

  return { system, user }
}
