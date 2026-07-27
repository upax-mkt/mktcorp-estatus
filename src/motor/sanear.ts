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
import { cifraCubierta } from './validar'

/**
 * Captura: [1] lo que va antes del campo fugado, [2] el valor del delta.
 * Exige el separador de campo (dos puntos o igual) para no confundirse con un
 * rótulo que hable de deltas en prosa.
 */
const DELTA_FUGADO = /^(.*?)["'`]?\s*,?\s*["'`]?delta["'`]?\s*[:=]\s*["'`]?([^"'`]*)["'`]?\s*$/i

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

/** Devuelve la decisión con los KPIs saneados. No muta la original. */
export function sanearDecision(decision: DecisionSlide): DecisionSlide {
  if (!decision.kpis || decision.kpis.length === 0) return decision
  return { ...decision, kpis: decision.kpis.map(sanearKpi) }
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

  const kpis = decision.kpis ?? []
  if (kpis.length >= MAX_KPIS) return decision

  const faltantes = inv.piezas
    .filter((p) => p.tipo === 'cifra')
    .filter((c) => !cifraCubierta(c, decision))
    .slice(0, MAX_KPIS - kpis.length)

  if (faltantes.length === 0) return decision

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
