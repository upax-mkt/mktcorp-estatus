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
import { ensamblarCorreo } from './ensamblar'
import type { InsumosCorreo } from './ensamblar'

export type { SesionParaMinuta, AcuerdoPropuesto }
// Re-exportada: `ensamblarCorreo` vive ahora en su propio módulo (ronda 11,
// tarea 1, ver el comentario de cabecera de ensamblar.ts) para que un Client
// Component pueda importarla sin arrastrar el SDK de Anthropic al bundle del
// navegador. Se re-exporta aquí para que quien ya la importaba desde
// `./generar` (`correo-html.test.ts`, `molde.test.ts`) siga funcionando.
export { ensamblarCorreo }
export type { InsumosCorreo }

export interface ResultadoMinuta {
  textoCorreo: string
  /**
   * El texto por bloque, EN CRUDO, tal como lo devolvió el modelo — sin la
   * tabla de acuerdos (que no es un bloque redactado, ver `ensamblarCorreo`).
   * Junto con `insumosCorreo`, es lo que el cliente necesita para volver a
   * llamar a `ensamblarCorreo` cada vez que cambian los acuerdos o se edita
   * un bloque a mano, sin llamar de nuevo al modelo (ronda 11, tarea 1).
   */
  bloques: string[]
  acuerdosPropuestos: AcuerdoPropuesto[]
  /** Todo lo demás que usó `ensamblarCorreo` para producir `textoCorreo`. */
  insumosCorreo: InsumosCorreo
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
  /**
   * Lo que el equipo escribió en el cuadro "¿qué entendió mal?" antes de
   * pedir Regenerar (ronda 11, tarea 1). Viaja tal cual hasta
   * `construirPromptMinuta`, que la añade a `user` marcada y aparte — ver ahí
   * el porqué (el SYSTEM es el prompt de Franco, literal, y esto no lo toca).
   */
  correccion?: string,
): Promise<ResultadoMinuta> {
  const texto = transcripcion.trim()
  if (texto.length === 0) {
    throw new Error('Falta la transcripción para generar la minuta')
  }

  const clienteFinal = cliente ?? crearClientePorDefecto()
  const { system, user } = construirPromptMinuta(sesion, texto, molde, correccion)

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
    try {
      // EL SEGUNDO INTENTO TAMBIÉN SE CAPTURA. Envolver solo el primero no
      // sirve de nada: si el modelo vuelve a pasarse, la excepción sale igual
      // y quien la lee ve el JSON de Zod, que es justo lo que el reintento
      // venía a evitar.
      resp = await intentar(resumirRechazo(motivo))
    } catch {
      throw new Error(
        'La minuta salió demasiado larga dos veces seguidas. Suele pasar con transcripciones ' +
        'muy largas o con varias reuniones pegadas en el mismo archivo. Prueba a recortarla, ' +
        'o afloja el largo de los bloques en el molde de la minuta.',
      )
    }
  }
  if (!resp.parsed_output) {
    throw new Error(`El modelo no devolvió una minuta (stop_reason: ${resp.stop_reason ?? 'desconocido'})`)
  }

  const minuta = parsearMinuta(resp.parsed_output) // candado: revalida contra el esquema estricto

  // Calculado UNA vez y compartido entre `textoCorreo` (abajo) y
  // `insumosCorreo` (lo que el cliente recibe para poder rearmar el mismo
  // correo después) — las dos tienen que nacer del mismo contexto, o el
  // primer rearmado en el navegador se leería distinto del que se generó aquí.
  const contexto = {
    // "Marketing United y Mkt Corp": las dos partes. La reunión no es de
    // la unidad sola — es la que Marketing Corporativo le da.
    reunion: `la reunión ${sesion.tipo} de ${sesion.salaNombre} y Mkt Corp`,
    // UNA REUNIÓN MENSUAL SE NOMBRA POR SU MES, no por el día en que se
    // dio: "correspondiente a junio de 2026", no "del 23 de julio". El día
    // exacto solo importa en una semanal.
    fecha: new Date(sesion.fecha).toLocaleDateString('es-MX',
      sesion.tipo === 'mensual'
        ? { month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' },
    ),
  }

  return {
    textoCorreo: ensamblarCorreo(sesion.salaSlug, minuta.bloques, minuta.acuerdosPropuestos, molde, sesion.id, contexto),
    bloques: minuta.bloques,
    acuerdosPropuestos: minuta.acuerdosPropuestos,
    // `molde` tal cual (no una copia): con el molde de siempre es igual A
    // `MOLDE_POR_DEFECTO`; con uno propio, el cliente necesita ESE mismo
    // objeto para que `ensamblarCorreo` reproduzca el mismo correo.
    insumosCorreo: { salaSlug: sesion.salaSlug, molde, reunionId: sesion.id, contexto },
  }
}
