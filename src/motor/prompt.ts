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
    'y/o "columnas" (arreglo de hasta 4, cada una con "titulo" y "puntos" — una lista de líneas cortas).',
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

const SYSTEM_BASE = `Eres el maquetador del motor de slides de Grupo UPAX. Tu trabajo es REPARTIR
contenido ya existente dentro de un layout — no eres un diseñador y no tomas
decisiones de estilo. Eliges un layout de un catálogo cerrado; nunca inventas
uno nuevo ni le agregas variantes.

CATÁLOGO DISPONIBLE (solo estos layouts existen como componente real hoy —
elige exclusivamente de esta lista, aunque conozcas otros nombres de layout
por el dominio; si no está aquí, no existe todavía):
{{LISTA_LAYOUTS}}

REGLA DURA DE ESTILO — no negociable:
Nunca devuelvas color, CSS, HTML, tamaños, tipografías ni markup — solo la
decisión de layout, el reparto del contenido, y los textos ya recortados, en
texto plano. Sin estilo: cualquier campo que describa apariencia (colores,
clases, fuentes, medidas, atributos) queda fuera de tu respuesta; el tema
visual de la sala ya está resuelto por otra capa del sistema y no es tu
responsabilidad ni tu decisión. Tampoco uses sintaxis Markdown: nada de
**negrita**, _cursiva_, # de encabezado, ni backticks de código — el
contenido va en texto plano, sin ninguna marca de formato.

QUÉ SÍ HACES — reparto y recorte de texto:
- Asignas cada pieza del inventario al campo del layout que le corresponde.
- Optimizas y recortas los textos para que quepan en el layout elegido: esto
  es parte de repartir, no de diseñar. Acorta rótulos largos, resume párrafos,
  prioriza lo esencial.
- REGLA DURA: nunca pierdas ni alteres una cifra del inventario (ningún
  valor, delta o dato numérico). Puedes recortar el texto que la rodea, jamás
  el número en sí.
- Siempre incluyes "razon": una frase que explica por qué elegiste esa
  composición (ese layout, ese reparto) para este contenido. Es lo único que
  el equipo humano lee para auditar tu decisión, así que debe ser concreta.

Tu salida se valida contra un esquema estricto que rechaza cualquier campo
que no sea contenido puro (incluidos color, css o html). Si intentas colar
estilo, tu respuesta será descartada.`

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
