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

export type { SesionParaMinuta, AcuerdoPropuesto }

export interface ResultadoMinuta {
  textoCorreo: string
  acuerdosPropuestos: AcuerdoPropuesto[]
}

const SALUDO = 'Hola equipo,'

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
function urlSesion(salaSlug: string): string {
  return `/sala/${salaSlug}`
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

function ensamblarCorreo(
  salaSlug: string,
  minuta: { objetivo: string; temasYAcuerdos: string[]; proximosPasos: string },
  acuerdos: AcuerdoPropuesto[],
): string {
  return [
    SALUDO,
    '',
    'Objetivo de la reunión',
    minuta.objetivo,
    '',
    'Temas generales y acuerdos',
    ...minuta.temasYAcuerdos.map((tema) => `- ${tema}`),
    '',
    'Acuerdos y accionables',
    tablaAcuerdos(acuerdos),
    '',
    'Próximos pasos',
    minuta.proximosPasos,
    '',
    `Sesión: ${urlSesion(salaSlug)}`,
  ].join('\n')
}

/**
 * `sesion` acepta cualquier objeto con al menos estos campos (p. ej. la
 * `SesionCompleta` de src/db/sesiones.ts, que los incluye todos) — solo se
 * necesita `salaSlug` para construir la URL y el resto para dar contexto al
 * modelo.
 */
export async function generarMinuta(
  sesion: SesionParaMinuta & { salaSlug: string },
  transcripcion: string,
  cliente?: ClienteDecision,
): Promise<ResultadoMinuta> {
  const texto = transcripcion.trim()
  if (texto.length === 0) {
    throw new Error('Falta la transcripción para generar la minuta')
  }

  const clienteFinal = cliente ?? crearClientePorDefecto()
  const { system, user } = construirPromptMinuta(sesion, texto)

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
    textoCorreo: ensamblarCorreo(sesion.salaSlug, minuta, minuta.acuerdosPropuestos),
    acuerdosPropuestos: minuta.acuerdosPropuestos,
  }
}
