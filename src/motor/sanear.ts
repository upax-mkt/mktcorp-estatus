/**
 * Limpieza determinista de la decisión que devuelve la IA, entre la etapa 2
 * (decidir) y la etapa 3 (validar).
 *
 * Existe por un artefacto observado en producción: el modelo a veces serializa
 * mal el objeto y mete el par `delta` DENTRO de la cadena del rótulo, dejando
 * un KPI con rótulo `Impresiones','delta':'-16%` y sin delta propio. El dato no
 * se perdió — está mal colocado. Rechazar el slide por eso costaría un reintento
 * completo (~12 s) para recuperar una coma; moverlo de campo es determinista,
 * verificable y no inventa nada.
 *
 * Criterio de intervención: solo se toca cuando aparece la SINTAXIS de un campo
 * fugado (`'delta':`, `"delta":`, `delta=`, `, delta:`). Un rótulo que
 * simplemente diga "Delta contra el trimestre" o "Impresiones (vs. mayo)" es
 * redacción legítima y se deja intacto.
 */
import type { DecisionSlide } from '@/decision/esquema'
import type { Inventario } from './inventario'
import { cifraCubierta, normalizarValor } from './validar'

/**
 * Captura: [1] lo que va antes del campo fugado, [2] el valor del delta.
 *
 * Dos formas, ambas vistas en producción:
 *  - separador de campo explícito:  Impresiones','delta':'-16%   ·  delta=-16%
 *  - separado por comas:            Impresiones','delta','-16%
 *
 * La segunda exige que "delta" venga ENTRECOMILLADO, que es la señal de que
 * es una clave serializada y no prosa: así un rótulo legítimo como "Delta
 * contra el trimestre" no se toca.
 */
const DELTA_FUGADO = new RegExp(
  '^(.*?)' +
    '(?:' +
    `["'\`]?\\s*,?\\s*["'\`]?delta["'\`]?\\s*[:=]` + // delta: …  |  delta= …
    '|' +
    `["'\`]\\s*,\\s*["'\`]delta["'\`]\\s*,` + //        ','delta',…
    ')' +
    `\\s*["'\`]?([^"'\`]*)["'\`]?\\s*$`,
  'i',
)

/** Comillas, comas y espacios que quedan colgando tras cortar el campo fugado. */
const BORDES_SUCIOS = /^[\s"'`,]+|[\s"'`,]+$/g

function limpiarBordes(texto: string): string {
  return texto.replace(BORDES_SUCIOS, '')
}

interface Kpi {
  valor: string
  rotulo: string
  delta?: string
}

function sanearKpi(kpi: Kpi): Kpi {
  const coincidencia = kpi.rotulo.match(DELTA_FUGADO)
  if (!coincidencia) {
    // Sin campo fugado, lo único que puede sobrar son comillas o comas sueltas
    // que se colaron al serializar. Ningún rótulo redactado a propósito
    // empieza o termina así.
    const rotulo = limpiarBordes(kpi.rotulo)
    return rotulo === kpi.rotulo || rotulo.length === 0 ? kpi : { ...kpi, rotulo }
  }

  const rotulo = limpiarBordes(coincidencia[1])
  // Si al quitar el campo fugado no queda rótulo, el original era más útil que
  // el resultado: mejor no tocar nada.
  if (rotulo.length === 0) return kpi

  const deltaFugado = limpiarBordes(coincidencia[2])
  // Un delta que ya venía bien puesto manda sobre el que venía fugado.
  const delta = kpi.delta ?? (deltaFugado.length > 0 ? deltaFugado : undefined)

  return delta === undefined ? { valor: kpi.valor, rotulo } : { valor: kpi.valor, rotulo, delta }
}

/** Lo que se pone cuando el modelo no explica de verdad su decisión. */
const SIN_RAZON = 'El modelo no explicó esta decisión.'

/**
 * Rellenos que el modelo escribe cuando no explica su decisión. Es una lista
 * cerrada a propósito: un criterio por longitud marcaría como relleno una razón
 * corta pero real ("portada"), y equivocarse en esa dirección borra información
 * del equipo. Aquí solo caen cadenas que no significan nada en ningún contexto.
 */
const RELLENOS = new Set(['placeholder', 'n/a', 'na', 'tbd', 'todo', 'none', 'null', 'texto', 'string'])

/** true si la razón no explica nada: vacía, un carácter suelto o un relleno conocido. */
function razonVacia(razon: string): boolean {
  const limpia = razon.trim().toLowerCase().replace(/[.]+$/, '')
  return limpia.length <= 2 || RELLENOS.has(limpia)
}

/** Devuelve la decisión con los KPIs y la razón saneados. No muta la original. */
export function sanearDecision(decision: DecisionSlide): DecisionSlide {
  const razon = razonVacia(decision.razon) ? SIN_RAZON : decision.razon
  if (!decision.kpis || decision.kpis.length === 0) {
    return razon === decision.razon ? decision : { ...decision, razon }
  }
  return { ...decision, razon, kpis: decision.kpis.map(sanearKpi) }
}

/** Espacios de KPI que tiene el layout (lo mismo que exige el esquema). */
const MAX_KPIS = 4

/**
 * Repone en los KPIs las cifras del inventario que la IA dejó fuera.
 *
 * El reparto del modelo es probabilístico: con cuatro cifras a veces devuelve
 * cuatro y a veces una. Visto en producción con contenido real de NeraCode —
 * de 29k / 9.2 / 412 / 12% llegó solo la primera, y el slide acabó degradado a
 * layout seguro, es decir, delante del director sin ninguna cifra.
 *
 * Reponerlas no inventa nada: el valor, el rótulo y el delta salen tal cual del
 * inventario que capturó el equipo. Solo se toca el layout de KPIs, solo si
 * queda hueco, y nunca se repone una cifra que la IA ya colocó en el texto del
 * slide (ahí no se perdió, y duplicarla sería ruido).
 *
 * El juicio editorial —cuál va primero, cómo se llama, qué se destaca— sigue
 * siendo del modelo: esto solo evita que una cifra desaparezca.
 */
export function completarKpisFaltantes(decision: DecisionSlide, inv: Inventario): DecisionSlide {
  if (decision.layout !== 'kpis-fila-dos-columnas') return decision

  const cifras = inv.piezas.filter((p) => p.tipo === 'cifra')

  // 1. Los KPIs que sí puso el modelo, pero a los que se les cayó el delta:
  //    si su valor coincide con una cifra del inventario que lo traía, se
  //    repone. El equipo lo capturó; no hay motivo para perderlo.
  const kpis = (decision.kpis ?? []).map((kpi) => {
    if (kpi.delta) return kpi
    const cifra = cifras.find((c) => normalizarValor(c.valor) === normalizarValor(kpi.valor))
    return cifra?.delta ? { ...kpi, delta: cifra.delta } : kpi
  })

  // 2. Las cifras que no aparecen por ningún lado del slide, mientras quepan.
  const faltantes =
    kpis.length >= MAX_KPIS
      ? []
      : cifras
          .filter((c) => !cifraCubierta(c, decision))
          .slice(0, MAX_KPIS - kpis.length)

  if (faltantes.length === 0) {
    return kpis.length === 0 ? decision : { ...decision, kpis }
  }

  return {
    ...decision,
    kpis: [
      ...kpis,
      ...faltantes.map((c) => ({
        valor: c.valor,
        rotulo: c.rotulo,
        ...(c.delta ? { delta: c.delta } : {}),
      })),
    ],
  }
}
