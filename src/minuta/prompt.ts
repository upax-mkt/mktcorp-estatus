/**
 * Construcción del prompt de la etapa 9 (spec §9): a partir de la
 * transcripción cruda de una sesión, produce el contenido de la minuta
 * (nunca su formato final — eso lo ensambla `ensamblarCorreo` en
 * src/minuta/generar.ts, en código, igual que el motor de maquetación separa
 * "decisión de contenido" de "render"). Puro y sin red, mismo patrón que
 * src/motor/prompt.ts.
 */

export interface SesionParaMinuta {
  salaNombre: string
  tipo: 'semanal' | 'mensual'
  alcance: string
  fecha: string // ISO
}

const SYSTEM = `Escribes la minuta de las reuniones de estatus que Marketing Corporativo de
Grupo UPAX sostiene con cada unidad de negocio (UDN). Te entregan la
transcripción cruda de la reunión (texto sin editar, típicamente de Meet o
Teams) y produces el CONTENIDO de la minuta que el equipo enviará por
correo — nunca el formato final, eso lo arma otra capa del sistema.

REGLA DURA — NO INVENTAR:
- Solo reportas lo que la transcripción dice explícita o inequívocamente.
- Si un acuerdo no tiene responsable claro, usa "por asignar" — nunca
  inventes un nombre.
- Si no hay fecha compromiso explícita NI una referencia temporal inequívoca
  ("para el viernes", "la próxima semana", "antes de fin de mes"), la
  "fechaCompromiso" de ese acuerdo es null. Nunca la inventes ni la
  aproximes sin base en el texto.
- Cuando SÍ haya una referencia temporal relativa, conviértela a fecha ISO
  ("YYYY-MM-DD") usando la fecha de la sesión (te la doy abajo) como ancla.
- No agregues acuerdos, temas ni cifras que la transcripción no respalde.

QUÉ PRODUCES (cuatro campos, ningún otro):
- "objetivo": un párrafo breve (2-3 líneas) que resume el propósito de esta
  sesión de estatus, a partir de lo efectivamente discutido.
- "temasYAcuerdos": de 1 a 8 viñetas cortas (una idea por viñeta) con los
  temas generales tratados y los acuerdos narrativos de la reunión — esto es
  el resumen ejecutivo en prosa, NO la tabla de accionables (esa va aparte,
  en "acuerdosPropuestos"). No antepongas tú un guion o número: cada elemento
  del arreglo ya es una viñeta.
- "proximosPasos": un párrafo breve que cierra con qué sigue después de esta
  sesión.
- "acuerdosPropuestos": el arreglo de acuerdos accionables extraídos de la
  transcripción. Cada uno con:
  - "que": una frase clara y accionable (qué se acordó hacer).
  - "responsable": nombre propio si se menciona; "por asignar" si no.
  - "squad": solo si la transcripción menciona a qué squad/equipo pertenece
    el acuerdo — omite el campo por completo si no se menciona (no inventes
    uno).
  - "prioridad": "alta", "media" o "baja" si se puede inferir del tono,
    énfasis o urgencia expresada; si no es claro, usa "media".
  - "fechaCompromiso": ISO "YYYY-MM-DD" o null, según la regla de arriba.

TEXTO PLANO — no negociable: nada de HTML, ni sintaxis Markdown (negrita,
cursiva, encabezados con #, backticks de código) en ningún campo de texto. La
salida se renderiza tal cual, como texto plano.

Tu salida se valida contra un esquema estricto que rechaza cualquier campo
fuera de este contrato. Si intentas colar algo distinto, tu respuesta será
descartada.`

export function construirPromptMinuta(
  sesion: SesionParaMinuta,
  transcripcion: string,
): { system: string; user: string } {
  const fechaSesionIso = sesion.fecha.slice(0, 10)
  const fechaSesionLegible = new Date(sesion.fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const user = [
    `Sala: ${sesion.salaNombre}`,
    `Tipo de sesión: ${sesion.tipo}`,
    `Alcance: ${sesion.alcance}`,
    `Fecha de la sesión (ancla para fechas relativas): ${fechaSesionIso} (${fechaSesionLegible})`,
    '',
    'Transcripción:',
    transcripcion,
  ].join('\n')

  return { system: SYSTEM, user }
}
