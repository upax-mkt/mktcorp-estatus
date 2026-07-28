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

import { MOLDE_POR_DEFECTO, type MoldeMinuta } from './molde'

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

QUÉ PRODUCES (dos campos, ningún otro):
- "bloques": un texto por cada bloque de la minuta, EN EL MISMO ORDEN en que
  te los pido abajo. Cada bloque responde SOLO a lo que pide el suyo: no
  repitas en el segundo lo que ya dijiste en el primero. No escribas el
  título del bloque dentro del texto — el sistema lo pone.
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
  molde: MoldeMinuta = MOLDE_POR_DEFECTO,
): { system: string; user: string } {
  const fechaSesionIso = sesion.fecha.slice(0, 10)
  const fechaSesionLegible = new Date(sesion.fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // LOS BLOQUES VIAJAN EN EL PROMPT, no en el esquema: sus nombres los pone el
  // equipo al editar el molde, así que el contrato solo puede fijar cuántos
  // son y que vengan en orden. Numerarlos aquí es lo que hace que "bloques[2]"
  // signifique algo.
  // EL BLOQUE DE LA TABLA NO SE LE PIDE.
  //
  // Antes se le pedía con la nota "la tabla la pone el sistema: no la
  // escribas", y el modelo obedecía a medias: no escribía la tabla, pero sí un
  // párrafo resumiendo los mismos compromisos que la tabla lista debajo. Salió
  // probando el motor en producción — el correo decía dos veces lo mismo, una
  // en prosa y otra en filas.
  //
  // No es un problema de redacción de la instrucción: pedirle texto para un
  // bloque cuyo contenido ya existe es pedirle que rellene. Se le pide solo lo
  // que tiene que escribir.
  const aRedactar = molde.bloques.filter((b) => !b.conTabla)
  const bloques = aRedactar
    .map((b, i) => `${i + 1}. «${b.titulo}» — ${b.guia || 'lo que corresponda a este bloque.'}`)
    .join('\n')

  const user = [
    `Sala: ${sesion.salaNombre}`,
    `Tipo de sesión: ${sesion.tipo}`,
    `Alcance: ${sesion.alcance}`,
    `Fecha de la sesión (ancla para fechas relativas): ${fechaSesionIso} (${fechaSesionLegible})`,
    '',
    `Los ${aRedactar.length} bloques que tienes que redactar, en orden. Devuelve un texto por cada uno, en "bloques":`,
    bloques,
    '',
    'Transcripción:',
    transcripcion,
  ].join('\n')

  return { system: SYSTEM, user }
}
