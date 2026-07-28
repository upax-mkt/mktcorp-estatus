/**
 * Etapa 3 del motor: valida la `DecisionSlide` que produjo la IA (etapa 2) contra
 * el `Inventario` del que salió, y permite degradarla a un layout seguro cuando
 * no pasa. Código puro, sin red — solo compara los dos objetos ya en memoria.
 */
import type { DecisionSlide, Vineta } from '@/decision/esquema'
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
function textosDeVinetas(vinetas: Vineta[], acumulador: string[]) {
  for (const v of vinetas) {
    acumulador.push(v.texto)
    if (v.hijos) textosDeVinetas(v.hijos, acumulador)
  }
}

/**
 * Todo el texto que la decisión pone delante del director, venga del campo que
 * venga.
 *
 * Es la lista contra la que se comprueba que no se perdió ninguna cifra. Tiene
 * que cubrir el esquema COMPLETO: desde que existen tablas, matriz, bloques y
 * cifras con desglose, un dato del inventario puede acabar en la celda de una
 * tabla y ahí sigue estando presente. Si esta función se queda corta, el
 * validador rechaza decisiones correctas y el equipo pierde el slide entero.
 */
export function textosDeLaDecision(decision: DecisionSlide): string[] {
  const textos: string[] = [decision.titulo]

  if (decision.subtitulo) textos.push(decision.subtitulo)
  if (decision.notaPie) textos.push(decision.notaPie)
  if (decision.cuerpo) textos.push(...decision.cuerpo)

  for (const kpi of decision.kpis ?? []) {
    textos.push(kpi.valor, kpi.rotulo)
    if (kpi.delta) textos.push(kpi.delta)
  }

  for (const col of decision.columnas ?? []) {
    textos.push(col.titulo)
    if (col.etiqueta) textos.push(col.etiqueta)
    textosDeVinetas(col.puntos, textos)
  }

  for (const tabla of decision.tablas ?? []) {
    if (tabla.titulo) textos.push(tabla.titulo)
    textos.push(...tabla.columnas)
    for (const fila of tabla.filas) textos.push(...fila.celdas)
  }

  if (decision.matriz) {
    textos.push(...decision.matriz.columnas)
    if (decision.matriz.leyenda) textos.push(...decision.matriz.leyenda)
    for (const fila of decision.matriz.filas) {
      textos.push(fila.encabezado)
      if (fila.nota) textos.push(fila.nota)
      textos.push(...fila.celdas.map((c) => c.texto))
    }
  }

  if (decision.metaReal) {
    textos.push(decision.metaReal.titulo)
    for (const fila of decision.metaReal.filas) {
      textos.push(fila.rotulo, fila.meta, fila.real, fila.porcentaje)
    }
  }

  for (const cifra of decision.cifrasDesglosadas ?? []) {
    textos.push(cifra.rotulo, cifra.valor)
    for (const parte of cifra.partes ?? []) textos.push(parte.rotulo, parte.valor)
  }

  for (const bloque of decision.bloques ?? []) {
    textos.push(bloque.titulo)
    if (bloque.etiqueta) textos.push(bloque.etiqueta)
    if (bloque.parrafo) textos.push(bloque.parrafo)
    if (bloque.puntos) textosDeVinetas(bloque.puntos, textos)
    if (bloque.pie) textos.push(bloque.pie.rotulo, bloque.pie.texto)
  }

  for (const grafico of decision.graficos ?? []) {
    if (grafico.titulo) textos.push(grafico.titulo)
    textos.push(...grafico.periodos)
    for (const serie of grafico.series) {
      textos.push(serie.etiqueta)
      // Los valores de una serie son números; se pasan a texto para que una
      // cifra del inventario graficada cuente como cubierta.
      textos.push(...serie.valores.map(String))
    }
  }

  return textos
}

export function cifraCubierta(cifra: { valor: string }, decision: DecisionSlide) {
  const objetivo = normalizarValor(cifra.valor)

  // 1. Como KPI (el caso preferido).
  if ((decision.kpis ?? []).some((k) => normalizarValor(k.valor) === objetivo)) return true

  // 2. O mencionada en cualquier otro sitio del slide. Si la IA reparte el dato
  //    en una viñeta de análisis ("perdieron 29k impresiones"), en la celda de
  //    una tabla comparativa o en el desglose de un pipeline, el dato NO se
  //    perdió — sigue presente frente al director. La regla de negocio es que la
  //    cifra no desaparezca, no que sea un KPI.
  return textosDeLaDecision(decision).some((t) => normalizarValor(t).includes(objetivo))
}

/**
 * Comprueba que ningún arreglo de contenido declarado en la decisión venga
 * vacío (`kpis: []`, `columnas: []`, `cuerpo: []`). El esquema los permite
 * porque son opcionales, pero una sección declarada y vacía no sirve al equipo.
 */
function seccionVacia(decision: DecisionSlide): string | null {
  const declaradas: Array<[unknown[] | undefined, string]> = [
    [decision.kpis, 'KPIs'],
    [decision.columnas, 'columnas'],
    [decision.cuerpo, 'cuerpo'],
    [decision.tablas, 'tablas'],
    [decision.graficos, 'gráficos'],
    [decision.cifrasDesglosadas, 'cifras con desglose'],
    [decision.bloques, 'bloques'],
  ]
  for (const [seccion, nombre] of declaradas) {
    if (seccion && seccion.length === 0) return `la sección de ${nombre} viene vacía`
  }
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
