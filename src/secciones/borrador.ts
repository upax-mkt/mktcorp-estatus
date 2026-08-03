import { EsquemaDecision, type DecisionSlide } from '@/decision/esquema'
import { tipoDeSeccion, type CampoSeccion } from './catalogo'
import { motivoEnClaro } from './motivos'

/**
 * UNA SECCIÓN TAL COMO LA ARMA EL EQUIPO, a mano, en el editor.
 *
 * Es la misma forma que produce el motor de IA, menos dos cosas:
 *
 * - Sin `razon`: ese campo es la explicación que la IA da de su decisión, para
 *   que el equipo la audite. Cuando la sección la compone una persona, no hay
 *   nada que auditar — la decisión es suya.
 * - Todo opcional: un borrador a medio llenar tiene que poder guardarse. Nadie
 *   escribe una sección de una sentada, y perder lo escrito porque falta el
 *   título es la forma más rápida de que dejen de usar la herramienta.
 *
 * La validación de verdad ocurre al maquetar (`aDecision`), no al guardar.
 */
export interface BorradorSeccion extends Partial<Omit<DecisionSlide, 'razon' | 'layout'>> {
  layout: DecisionSlide['layout']
}

/** Razón fija de una sección compuesta a mano: no hay decisión de IA que explicar. */
export const RAZON_MANUAL = 'Sección compuesta por el equipo de Marketing Corporativo.'

export type ResultadoBorrador =
  | { ok: true; decision: DecisionSlide }
  | { ok: false; motivo: string }

/** ¿Este campo del borrador trae algo? Un arreglo vacío o un texto en blanco, no. */
function tieneContenido(valor: unknown): boolean {
  if (valor == null) return false
  if (typeof valor === 'string') return valor.trim().length > 0
  if (Array.isArray(valor)) return valor.length > 0
  return true
}

/**
 * Deja en el borrador SOLO los campos que su tipo de sección admite.
 *
 * Existe porque el editor es un formulario vivo: alguien llena una tabla,
 * cambia el tipo a "Portada" y la tabla se queda escondida en el estado. Sin
 * esta limpieza, esa tabla viajaría hasta el documento y aparecería en una
 * portada. Se descarta al maquetar, no al escribir, para que cambiar de tipo
 * de ida y vuelta no borre el trabajo.
 */
export function soloCamposDelTipo(borrador: BorradorSeccion): BorradorSeccion {
  const tipo = tipoDeSeccion(borrador.layout)
  if (!tipo) return { layout: borrador.layout, titulo: borrador.titulo }

  const permitidos = new Set<string>([...tipo.campos, 'titulo'])
  const limpio: BorradorSeccion = { layout: borrador.layout }
  for (const [clave, valor] of Object.entries(borrador)) {
    if (permitidos.has(clave) && tieneContenido(valor)) {
      Object.assign(limpio, { [clave]: valor })
    }
  }
  return limpio
}

/**
 * Qué le falta a la sección para poder presentarse. Vacío = está lista.
 *
 * `tituloDeRespaldo` es el nombre de la sección en la estructura ("RevOps",
 * "Outbound & Pipeline"). Cuando existe, el título deja de faltar: obligar a
 * reescribir a mano el nombre que la propia app ya puso es trabajo inventado.
 */
export function loQueFalta(borrador: BorradorSeccion, tituloDeRespaldo?: string): string[] {
  const faltas: string[] = []
  if (!tieneContenido(borrador.titulo) && !tieneContenido(tituloDeRespaldo)) faltas.push('el título')

  const tipo = tipoDeSeccion(borrador.layout)
  if (!tipo) {
    faltas.push(`un tipo de sección válido (recibido "${borrador.layout}")`)
    return faltas
  }
  if (tipo.exige && !tieneContenido(borrador[tipo.exige as keyof BorradorSeccion])) {
    faltas.push(NOMBRE_DE_CAMPO[tipo.exige])
  }
  return faltas
}

/**
 * QUÉ CAMPO es el que falta, no solo cómo se llama.
 *
 * `loQueFalta` devuelve texto para leer; esto devuelve la clave, que es lo que
 * permite marcar el campo culpable en el formulario. Sin ella, el aviso vivía
 * al final de la tarjeta y el campo al que se refería estaba arriba, sin nada
 * que los uniera.
 */
export function campoQueFalta(
  borrador: BorradorSeccion,
  tituloDeRespaldo?: string,
): CampoSeccion | 'titulo' | null {
  if (!tieneContenido(borrador.titulo) && !tieneContenido(tituloDeRespaldo)) return 'titulo'
  const tipo = tipoDeSeccion(borrador.layout)
  if (tipo?.exige && !tieneContenido(borrador[tipo.exige as keyof BorradorSeccion])) {
    return tipo.exige
  }
  return null
}

/** Cómo se llama cada campo cuando hay que decirle a alguien que le falta. */
export const NOMBRE_DE_CAMPO: Record<CampoSeccion, string> = {
  subtitulo: 'el subtítulo',
  cuerpo: 'los puntos',
  kpis: 'al menos una cifra',
  columnas: 'al menos una columna',
  tablas: 'la tabla',
  graficos: 'el gráfico',
  matriz: 'la matriz',
  metaReal: 'el bloque de meta contra real',
  cifrasDesglosadas: 'las cifras con desglose',
  bloques: 'al menos un bloque',
  imagen: 'la imagen',
  video: 'el vídeo',
  notaPie: 'la nota al pie',
}

/**
 * Convierte el borrador en la sección que se presenta.
 *
 * Pasa por el MISMO esquema estricto que la salida de la IA. No es paranoia:
 * ese esquema es lo que garantiza que nadie —persona o modelo— cuele HTML, CSS
 * ni un `javascript:` en un enlace, y que las cifras lleguen como texto plano.
 * Un editor manual no es una razón para relajar el contrato; es exactamente la
 * misma superficie de entrada.
 */
export function aDecision(borrador: BorradorSeccion, tituloDeRespaldo?: string): ResultadoBorrador {
  const faltas = loQueFalta(borrador, tituloDeRespaldo)
  if (faltas.length > 0) {
    return { ok: false, motivo: `Falta ${faltas.join(' y ')}.` }
  }

  const limpio = soloCamposDelTipo(borrador)
  const resultado = EsquemaDecision.safeParse({
    ...limpio,
    titulo: tieneContenido(limpio.titulo) ? limpio.titulo : tituloDeRespaldo,
    razon: RAZON_MANUAL,
  })

  if (!resultado.success) {
    // El mensaje de Zod nombra el campo por su clave interna y en inglés. Lo
    // lee quien acaba de escribir la sección, así que se traduce.
    return { ok: false, motivo: motivoEnClaro(resultado.error) }
  }
  return { ok: true, decision: resultado.data }
}

/**
 * EN QUÉ ESTADO ESTÁ LA SECCIÓN, con el mismo criterio con el que se maqueta.
 *
 * Hasta ahora el editor decidía "Lista para presentar" con `loQueFalta`, que
 * mira una sola cosa: que esté el campo que el tipo exige. Es una comprobación
 * superficial, y por eso una sección con una columna sin líneas —o con una
 * celda que trae HTML pegado de un correo— se anunciaba como lista y luego
 * reventaba al maquetar. Ese es el "componentes tiran error en la maquetación"
 * que reportó Franco: el error no nacía al maquetar, nacía al escribir y no se
 * decía hasta el final.
 *
 * Ahora la promesa se gana: "lista" significa que `aDecision` la aceptó, que
 * es literalmente lo que va a correr al maquetar.
 */
export type EstadoSeccion =
  | { estado: 'por-empezar'; falta: string[] }
  | { estado: 'incompleta'; falta: string[]; campo: CampoSeccion | 'titulo' | null }
  | { estado: 'con-problema'; motivo: string }
  | { estado: 'lista' }

export function estadoDeSeccion(
  borrador: BorradorSeccion,
  tituloDeRespaldo?: string,
): EstadoSeccion {
  const falta = loQueFalta(borrador, tituloDeRespaldo)
  if (falta.length > 0) {
    return borradorTieneContenido(borrador)
      ? { estado: 'incompleta', falta, campo: campoQueFalta(borrador, tituloDeRespaldo) }
      : { estado: 'por-empezar', falta }
  }
  const resultado = aDecision(borrador, tituloDeRespaldo)
  return resultado.ok ? { estado: 'lista' } : { estado: 'con-problema', motivo: resultado.motivo }
}

/** ¿Hay algo escrito aquí, más allá del tipo elegido? */
export function borradorTieneContenido(borrador: BorradorSeccion | undefined): boolean {
  if (!borrador) return false
  return Object.entries(borrador).some(([clave, valor]) => clave !== 'layout' && tieneContenido(valor))
}
