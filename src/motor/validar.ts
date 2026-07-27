/**
 * Etapa 3 del motor: valida la `DecisionSlide` que produjo la IA (etapa 2) contra
 * el `Inventario` del que salió, y permite degradarla a un layout seguro cuando
 * no pasa. Código puro, sin red — solo compara los dos objetos ya en memoria.
 */
import type { DecisionSlide } from '@/decision/esquema'
import type { Inventario } from './inventario'
import { esLayoutImplementado } from './catalogo'

export type Veredicto = { ok: true } | { ok: false; motivo: string }

/**
 * Devuelve las piezas de tipo `cifra` del inventario — las que una decisión de
 * KPIs debe cubrir una a una para no perder información frente al equipo.
 */
function cifrasDelInventario(inv: Inventario) {
  return inv.piezas.filter((p) => p.tipo === 'cifra')
}

/**
 * Normaliza un valor numérico para comparar: sin espacios, sin mayúsculas.
 * "29k" y "29K", "$4.2 MDP" y "$4.2 mdp" son el mismo dato.
 */
export function normalizarValor(v: string): string {
  return v.replace(/\s+/g, '').toLowerCase()
}

/**
 * Una cifra del inventario está cubierta si algún KPI de la decisión trae el
 * mismo VALOR — el número es el dato que no se puede perder ni alterar. El
 * rótulo NO se compara: el prompt instruye a la IA a recortar y afilar los
 * rótulos con criterio ejecutivo ("Impresiones" puede volverse otro texto),
 * así que exigir rótulo idéntico haría que un simple recorte se leyera como
 * cifra perdida. Lo sagrado es el valor, no su nombre.
 */
export function cifraCubierta(cifra: { valor: string }, decision: DecisionSlide) {
  const objetivo = normalizarValor(cifra.valor)

  // 1. Como KPI (el caso preferido).
  if ((decision.kpis ?? []).some((k) => normalizarValor(k.valor) === objetivo)) return true

  // 2. O mencionada dentro del contenido textual del slide. Si la IA reparte el
  //    dato en una viñeta de análisis ("perdieron 29k impresiones") en vez de
  //    como KPI, el dato NO se perdió — sigue presente frente al director. La
  //    regla de negocio es que la cifra no desaparezca, no que sea un KPI.
  const textos: string[] = []
  if (decision.subtitulo) textos.push(decision.subtitulo)
  if (decision.cuerpo) textos.push(...decision.cuerpo)
  if (decision.columnas) {
    for (const col of decision.columnas) {
      textos.push(col.titulo)
      textos.push(...col.puntos)
    }
  }
  return textos.some((t) => normalizarValor(t).includes(objetivo))
}

/**
 * Comprueba que ningún arreglo de contenido declarado en la decisión venga
 * vacío (`kpis: []`, `columnas: []`, `cuerpo: []`). El esquema los permite
 * porque son opcionales, pero una sección declarada y vacía no sirve al equipo.
 */
function seccionVacia(decision: DecisionSlide): string | null {
  if (decision.kpis && decision.kpis.length === 0) return 'la sección de KPIs viene vacía'
  if (decision.columnas && decision.columnas.length === 0) return 'la sección de columnas viene vacía'
  if (decision.cuerpo && decision.cuerpo.length === 0) return 'la sección de cuerpo viene vacía'
  return null
}

/**
 * Valida la decisión del motor contra el inventario del que salió.
 *
 * Comprueba, en orden:
 * 1. Que el layout elegido tenga componente implementado (candado de la etapa 2:
 *    un layout válido en el enum pero sin componente no debe llegar al render).
 * 2. Que un layout de KPIs no haya perdido ninguna cifra del inventario.
 * 3. Que un layout de KPIs traiga al menos un KPI.
 * 4. Que ninguna sección de contenido declarada venga vacía.
 */
export function validarDecision(decision: DecisionSlide, inv: Inventario): Veredicto {
  if (!esLayoutImplementado(decision.layout)) {
    return { ok: false, motivo: `El layout "${decision.layout}" aún no tiene componente implementado` }
  }

  if (decision.layout === 'kpis-fila-dos-columnas') {
    const cifras = cifrasDelInventario(inv)
    const faltantes = cifras.filter((c) => !cifraCubierta(c, decision))
    if (faltantes.length > 0) {
      const detalle = faltantes.map((c) => `${c.rotulo}: ${c.valor}`).join(', ')
      return { ok: false, motivo: `La decisión de KPIs perdió cifras del inventario: ${detalle}` }
    }
    if (!decision.kpis || decision.kpis.length === 0) {
      return { ok: false, motivo: 'El layout de KPIs no trae ningún KPI' }
    }
  }

  const motivoVacio = seccionVacia(decision)
  if (motivoVacio) {
    return { ok: false, motivo: motivoVacio }
  }

  return { ok: true }
}

/**
 * Degrada una decisión a layout seguro cuando `validarDecision` la rechaza.
 *
 * DECISIÓN DE DISEÑO: conserva `decision.layout` sin tocarlo (no existe un valor
 * 'layout-seguro' en el enum `LAYOUTS` de `esquema.ts`, e inventar uno rompería
 * el tipo `DecisionSlide` y el esquema `.strict()`). `Slide.tsx` ya despacha a
 * `LayoutSeguro` automáticamente cuando `decision.layout` no está en
 * `REGISTRO_LAYOUTS` — que es exactamente el caso del primer candado de
 * `validarDecision` (layout no implementado): ahí "conservar el layout" ya basta
 * para que el despachador caiga solo al layout seguro, sin ningún truco.
 *
 * Para los demás motivos de rechazo (cifras perdidas, secciones vacías) el
 * layout original SÍ está implementado, así que `Slide.tsx` no cae solo — el
 * orquestador (tarea siguiente) es quien decide renderizar `<LayoutSeguro
 * decision={...} motivo={veredicto.motivo} />` directamente en vez de despachar
 * por `<Slide>`, usando el `motivo` de `Veredicto` (no uno reconstruido aquí).
 * `aLayoutSeguro` documenta esa degradación dentro del propio contenido —
 * antepone el motivo al campo `razon` existente, sin añadir claves nuevas — para
 * que quede trazada incluso si el objeto se inspecciona o se loguea sin el
 * `Veredicto` a la mano.
 */
export function aLayoutSeguro(decision: DecisionSlide, motivo: string): DecisionSlide {
  return {
    ...decision,
    razon: `[Degradado a layout seguro: ${motivo}] ${decision.razon}`,
  }
}
