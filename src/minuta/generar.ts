/**
 * Etapa 9 del spec (§9, "De la transcripción a la minuta"): a partir de la
 * transcripción cruda de una sesión, produce el texto de correo (molde real
 * de Mkt Corp) y los acuerdos propuestos, como borrador para que el equipo
 * los confirme antes de publicar. Reutiliza el patrón de llamada a Claude de
 * `src/motor/decidir.ts` (mismo `ClienteDecision`, mismo
 * `crearClientePorDefecto`, mismo `messages.parse` + `zodOutputFormat`) — no
 * se inventa otra forma de hablar con la API.
 */
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { crearClientePorDefecto, type ClienteDecision } from '@/motor/decidir'
import { EsquemaMinuta, parsearMinuta, type AcuerdoPropuesto } from './esquema'
import { construirPromptMinuta, type SesionParaMinuta } from './prompt'
import { MOLDE_POR_DEFECTO, type MoldeMinuta } from './molde'

export type { SesionParaMinuta, AcuerdoPropuesto }

export interface ResultadoMinuta {
  textoCorreo: string
  acuerdosPropuestos: AcuerdoPropuesto[]
}

/** "por definir" es el rótulo que el spec exige mostrar antes de enviar el correo (§9). */
function formatearFechaTabla(fechaIso: string | null): string {
  if (!fechaIso) return 'por definir'
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * La ruta congelada por sesión (spec §10, `/sala/{slug}/{fecha}?t={token}`)
 * es trabajo de la tarea pendiente de tokens/SSO: mientras no exista, se
 * enlaza al link permanente de la sala, que ya existe y funciona hoy.
 */
/**
 * A dónde apunta la minuta.
 *
 * A la sala, si la reunión es de una. Una que no pertenece a ninguna —un
 * comité, un arranque— apunta al documento de la propia sesión: es lo único
 * que hay que enseñar.
 */
function urlSesion(salaSlug: string | null, sesionId?: string): string {
  if (salaSlug) return `/sala/${salaSlug}`
  return sesionId ? `/sesion/${sesionId}` : '/'
}

function tablaAcuerdos(acuerdos: AcuerdoPropuesto[]): string {
  if (acuerdos.length === 0) {
    return '(sin acuerdos accionables identificados en la transcripción)'
  }
  const encabezado = 'Acción | Squad | Owner | Prioridad | Fecha compromiso'
  const filas = acuerdos.map((a) =>
    [a.que, a.squad ?? '—', a.responsable, a.prioridad, formatearFechaTabla(a.fechaCompromiso)].join(' | '),
  )
  return [encabezado, ...filas].join('\n')
}

/**
 * Arma el correo SEGÚN EL MOLDE, no según una forma incrustada aquí.
 *
 * El modelo devuelve un texto por bloque, en el mismo orden que el molde. El
 * bloque marcado con `conTabla` recibe además la tabla de acuerdos, que NO la
 * redacta el modelo: se arma con los compromisos que se van a publicar en la
 * sala, con su dueño y su fecha. Dejarla al modelo sería dejarle inventar
 * compromisos.
 */
export function ensamblarCorreo(
  salaSlug: string | null,
  bloques: string[],
  acuerdos: AcuerdoPropuesto[],
  molde: MoldeMinuta = MOLDE_POR_DEFECTO,
  sesionId?: string,
): string {
  const lineas: string[] = [molde.saludo, '']

  molde.bloques.forEach((b, i) => {
    lineas.push(b.titulo)
    const texto = (bloques[i] ?? '').trim()
    if (texto) lineas.push(texto)
    if (b.conTabla) lineas.push(tablaAcuerdos(acuerdos))
    lineas.push('')
  })

  if (molde.conEnlace) lineas.push(`Sesión: ${urlSesion(salaSlug, sesionId)}`)
  return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}

/**
 * `sesion` acepta cualquier objeto con al menos estos campos (p. ej. la
 * `SesionCompleta` de src/db/sesiones.ts, que los incluye todos) — solo se
 * necesita `salaSlug` para construir la URL y el resto para dar contexto al
 * modelo.
 */
export async function generarMinuta(
  sesion: SesionParaMinuta & { salaSlug: string | null; id?: string },
  transcripcion: string,
  cliente?: ClienteDecision,
  molde: MoldeMinuta = MOLDE_POR_DEFECTO,
): Promise<ResultadoMinuta> {
  const texto = transcripcion.trim()
  if (texto.length === 0) {
    throw new Error('Falta la transcripción para generar la minuta')
  }

  const clienteFinal = cliente ?? crearClientePorDefecto()
  const { system, user } = construirPromptMinuta(sesion, texto, molde)

  const resp = await clienteFinal.messages.parse({
    // Mismo modelo que el motor (ver src/motor/decidir.ts). La minuta ya salía
    // bien con 4.8; se mueve por consistencia y porque Opus 5 cuesta lo mismo.
    model: 'claude-opus-5',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: zodOutputFormat(EsquemaMinuta) },
    system,
    messages: [{ role: 'user', content: user }],
  })
  if (!resp.parsed_output) {
    throw new Error(`El modelo no devolvió una minuta (stop_reason: ${resp.stop_reason ?? 'desconocido'})`)
  }

  const minuta = parsearMinuta(resp.parsed_output) // candado: revalida contra el esquema estricto
  return {
    textoCorreo: ensamblarCorreo(
      sesion.salaSlug, minuta.bloques, minuta.acuerdosPropuestos, molde, sesion.id,
    ),
    acuerdosPropuestos: minuta.acuerdosPropuestos,
  }
}
