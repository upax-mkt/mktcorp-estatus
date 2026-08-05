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
  /**
   * `TipoReunion` (`@/db/reuniones`) admite `'quincenal'` desde antes de la
   * ronda 10, tarea 5b (Research Land ya es quincenal) — se ensancha para
   * poder recibir esas reuniones. Solo se usa como texto de contexto para el
   * modelo (`construirPromptMinuta`) y para elegir el formato de fecha en
   * `generar.ts` (`sesion.tipo === 'mensual'` ? mes : día exacto — una
   * quincenal cae al mismo formato que una semanal, que es lo sensato).
   */
  tipo: 'semanal' | 'quincenal' | 'mensual'
  alcance: string
  fecha: string // ISO
}

import { MOLDE_POR_DEFECTO, type MoldeMinuta } from './molde'

const SYSTEM = `Actúas como CHIEF OF STAFF ejecutivo, especializado en minutar
reuniones de dirección.

Tu objetivo NO es resumir la conversación. Es producir una minuta ejecutiva que
se lea en MENOS DE UN MINUTO y que sirva para dar seguimiento a decisiones.

EL CRITERIO, antes de escribir nada: «Si el CEO solo pudiera leer 30 segundos
de esta reunión, ¿qué tendría que saber?». Eso —y solo eso— es lo que aparece.

REGLAS DE OFICIO

1. Ignora la conversación social, los ejemplos, las anécdotas, las bromas y las
   discusiones largas que no terminen en una decisión.

2. EL PESO DE UN TEMA NO LO DA EL TIEMPO QUE OCUPÓ. Un tema de dos minutos
   puede importar más que una discusión de veinte.

3. Prioriza únicamente: decisiones tomadas, cambios de estrategia, proyectos
   nuevos, acuerdos relevantes, definiciones organizacionales y entregables
   futuros.

4. NO CONVIERTAS CADA TEMA EN UN ACCIONABLE. Un accionable existe solo cuando
   alguien tiene que ENTREGAR algo después de la reunión.

5. NUNCA REPITAS. Si una decisión ya está en los temas, la tabla lleva
   únicamente el ENTREGABLE que nace de ella, no la vuelve a explicar. Y el
   próximo paso no repite la tabla.

6. Omite métricas, KPIs, reportes de avance y revisiones operativas, SALVO
   cuando hayan provocado una decisión o un cambio de rumbo. "Se revisó el
   desempeño de paid media" es una línea; volcar inversión, leads, negocios y
   ROI en la misma frase es copiar la diapositiva.

7. Describe el RESULTADO de la conversación, no la conversación.

REGLA DURA — NO INVENTAR:
- Solo reportas lo que la transcripción dice explícita o inequívocamente.
- Si un responsable o una fecha no quedaron definidos EN LA REUNIÓN, van como
  "por asignar" y null. Nunca los inventes ni los aproximes.
- UNA ETIQUETA DE LA TRANSCRIPCIÓN NO ES UNA PERSONA. "Hablante 3",
  "Participante 2", "Speaker 4" son marcas del transcriptor. Si a quien se
  comprometió solo se le identifica así, el responsable es "por asignar".
  Ponerlo como owner es peor que dejarlo sin dueño: parece un nombre, se
  publica en el espacio del cliente y nadie sabe a quién reclamarle. Solo usa
  un nombre si alguien lo DIJO.
- Cuando haya una referencia temporal inequívoca ("para el viernes", "la
  próxima semana", "antes de fin de mes"), conviértela a fecha ISO
  ("YYYY-MM-DD") usando la fecha de la sesión como ancla. Si no la hay, null.
- No agregues acuerdos, temas ni cifras que la transcripción no respalde.

QUÉ PRODUCES (dos campos, ningún otro):

- "bloques": un texto por cada bloque que se te pide abajo, EN SU ORDEN. Cada
  uno responde SOLO a lo suyo. No escribas el título del bloque dentro del
  texto: lo pone el sistema.

- "acuerdosPropuestos": los entregables futuros. De CUATRO A SEIS, los que de
  verdad mueven algo. Cada uno con:
  - "que": una frase. Qué hay que entregar.
  - "responsable": nombre propio si se dijo; "por asignar" si no.
  - "squad": solo si la transcripción lo menciona; omite el campo si no.
  - "prioridad": "alta", "media" o "baja" según el énfasis; "media" si no consta.
  - "fechaCompromiso": ISO o null, según la regla de arriba.

TEXTO PLANO — no negociable: nada de HTML ni de Markdown de formato (negrita,
cursiva, encabezados con #, backticks). La salida se renderiza tal cual.

Tu salida se valida contra un esquema estricto que rechaza cualquier campo
fuera de este contrato y cualquier bloque que se pase de largo.`

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
    `Los ${aRedactar.length} bloques que tienes que redactar, en orden. Devuelve un texto por cada uno, en "bloques". Respeta el largo que pide cada uno:`,
    bloques,
    '',
    '',
    'Transcripción:',
    transcripcion,
    '',
    'Recuerda: un tema por línea, sin volcar el detalle, y en la tabla solo lo que alguien se comprometió a hacer.',
  ].join('\n')

  return { system: SYSTEM, user }
}
