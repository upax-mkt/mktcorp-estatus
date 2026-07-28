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

/**
 * El motivo del rechazo, en una línea que el modelo pueda usar.
 *
 * El error de Zod viene con el JSON entero de los `issues`; pasárselo tal cual
 * gasta contexto en corchetes. Lo que necesita saber es QUÉ campo y POR QUÉ.
 */
function resumirRechazo(mensaje: string): string {
  const campos = [...mensaje.matchAll(/"path":\s*\[\s*"([^"]+)"(?:,\s*(\d+))?/g)]
    .map((m) => (m[2] ? `${m[1]}[${m[2]}]` : m[1]))
  const largo = /too_big/.test(mensaje)
  const donde = campos.length > 0 ? campos.join(', ') : 'algún campo'
  return largo
    ? `te pasaste del largo permitido en ${donde}. Recorta ahí.`
    : `${donde} no cumple el contrato.`
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
 * La ruta congelada por sesión (spec §10, `/cliente/{slug}/{fecha}?t={token}`)
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
  if (salaSlug) return `/cliente/${salaSlug}`
  return sesionId ? `/reunion/${sesionId}` : '/'
}

/**
 * La tabla del correo: TRES columnas, no cinco.
 *
 * Squad y prioridad siguen viajando en los datos —los necesita el acuerdo que
 * nace en el espacio del cliente, con su dueño y su seguimiento— pero en el
 * correo eran dos columnas donde casi todas las filas decían "—" y "media".
 * Una columna que casi siempre dice lo mismo no informa: ocupa.
 */
function tablaAcuerdos(acuerdos: AcuerdoPropuesto[]): string {
  if (acuerdos.length === 0) {
    return '(sin acuerdos accionables identificados en la transcripción)'
  }
  const encabezado = 'Acción | Owner | Fecha'
  const filas = acuerdos.map((a) =>
    [a.que, a.responsable, formatearFechaTabla(a.fechaCompromiso)].join(' | '),
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
  /** De qué reunión y de cuándo, para la entradilla. */
  contexto?: { reunion: string; fecha: string },
): string {
  const lineas: string[] = [molde.saludo, '']

  // La entradilla dice DE QUÉ es esta minuta. Sin ella, el correo abre con
  // "Objetivo de la reunión" a secas y quien lo abre tres semanas después no
  // sabe de qué reunión le hablan.
  if (molde.entradilla?.trim()) {
    lineas.push(
      molde.entradilla
        .replace('{reunion}', contexto?.reunion ?? 'la reunión')
        .replace('{fecha}', contexto?.fecha ?? ''),
      '',
    )
  }

  // El modelo devuelve un texto por bloque REDACTABLE; el de la tabla no se le
  // pide (ver `construirPromptMinuta`). Por eso el índice avanza solo con
  // esos: si se recorriera `molde.bloques` a secas, el bloque de la tabla se
  // comería el texto del siguiente y todo saldría corrido una posición.
  let siguiente = 0
  molde.bloques.forEach((b) => {
    lineas.push(b.titulo)
    if (b.conTabla) {
      lineas.push(tablaAcuerdos(acuerdos))
    } else {
      const texto = (bloques[siguiente++] ?? '').trim()
      if (texto) lineas.push(texto)
    }
    lineas.push('')
  })

  if (molde.cierre?.trim()) lineas.push(molde.cierre, '')
  if (molde.conEnlace) lineas.push(urlSesion(salaSlug, sesionId))
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

  /**
   * UN REINTENTO, con el motivo del rechazo delante.
   *
   * El esquema tiene topes de largo, y son los que impiden que la minuta se
   * convierta en la transcripción con encabezados. Pero un tope que no se
   * cumple no puede acabar en un error de Zod en pantalla: quien pegó una
   * transcripción de nueve mil palabras esperó cuarenta segundos para leer
   * "Too big: expected string to have <=700 characters", que no es ni su
   * problema ni su idioma.
   *
   * OJO CON LA FORMA DE FALLAR: `messages.parse()` LANZA cuando la salida no
   * valida — no devuelve un resultado vacío. Un reintento escrito sobre
   * `if (!resp.parsed_output)` no se ejecutaría nunca.
   *
   * Es el mismo patrón que el motor de maquetación (`intentarDecision`): se le
   * dice al modelo exactamente qué se pasó y se le pide otra vez. Recortarlo
   * nosotros sería peor — cortar por el carácter 700 parte una frase a la
   * mitad, y el modelo sí sabe qué le sobra.
   */
  async function intentar(motivoRechazo?: string) {
    return clienteFinal.messages.parse({
      // Mismo modelo que el motor (ver src/motor/decidir.ts).
      model: 'claude-opus-5',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(EsquemaMinuta) },
      system,
      messages: [
        { role: 'user', content: user },
        ...(motivoRechazo
          ? [{
              role: 'user' as const,
              content:
                `Tu respuesta anterior NO pasó la validación: ${motivoRechazo}\n\n` +
                'Vuelve a redactarla RECORTANDO lo que sobra: un tema por línea, sin el ' +
                'detalle, porque quien la lee estuvo en la reunión. No inventes nada nuevo ' +
                'ni añadas temas: quita.',
            }]
          : []),
      ],
    })
  }

  let resp
  try {
    resp = await intentar()
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error)
    // Solo se reintenta lo que el modelo puede corregir. Un fallo de red o de
    // credenciales no mejora por pedirlo otra vez.
    if (!/valid|too_big|too_small|schema|parse/i.test(motivo)) throw error
    resp = await intentar(resumirRechazo(motivo))
  }
  if (!resp.parsed_output) {
    throw new Error(`El modelo no devolvió una minuta (stop_reason: ${resp.stop_reason ?? 'desconocido'})`)
  }

  const minuta = parsearMinuta(resp.parsed_output) // candado: revalida contra el esquema estricto
  return {
    textoCorreo: ensamblarCorreo(
      sesion.salaSlug, minuta.bloques, minuta.acuerdosPropuestos, molde, sesion.id,
      {
        reunion: `la reunión ${sesion.tipo} de ${sesion.salaNombre}`,
        fecha: new Date(sesion.fecha).toLocaleDateString('es-MX', {
          day: 'numeric', month: 'long', year: 'numeric',
        }),
      },
    ),
    acuerdosPropuestos: minuta.acuerdosPropuestos,
  }
}
