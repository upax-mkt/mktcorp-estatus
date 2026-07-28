import { z } from 'zod'

/**
 * EL MOLDE DE UNA MINUTA: qué bloques lleva y en qué orden.
 *
 * Franco: "el módulo minutas debería tener un editor del template del tipo de
 * minuta".
 *
 * Hasta ahora el molde estaba INCRUSTADO en `ensamblarCorreo`: saludo,
 * objetivo, temas y acuerdos, tabla, próximos pasos, enlace. Es el molde real
 * de Marketing Corp y funciona para el estatus de una UDN. No funciona igual
 * para un comité —donde lo que importa es qué se aprobó— ni para un arranque
 * de campaña, y cambiarlo obligaba a tocar código.
 *
 * DOS PARTES, y la separación importa:
 *
 * - La **guía** de cada bloque es lo que se le dice al modelo que ponga ahí.
 *   Editarla cambia lo que la IA escribe.
 * - La **tabla de acuerdos** no es un bloque de texto: se arma con los
 *   acuerdos que se van a publicar en la sala, con su dueño y su fecha. Por
 *   eso se coloca (`conTabla`) y no se redacta. Dejar que el modelo la
 *   escribiera libre sería dejar que inventara compromisos.
 */

export const EsquemaBloqueMolde = z.object({
  titulo: z.string().min(1).max(80).describe('El encabezado del bloque en el correo ("Objetivo de la reunión").'),
  guia: z.string().max(400).describe(
    'Qué debe contener ese bloque. Se le entrega al modelo tal cual: cuanto más concreta, menos relleno.',
  ),
  /**
   * Marca el bloque donde va la tabla de acuerdos. Uno como mucho: dos tablas
   * de los mismos acuerdos en un correo es pedirle a alguien que compare.
   *
   * Un bloque marcado NO SE REDACTA: su contenido es la tabla. Pedirle además
   * un texto al modelo hacía que resumiera en prosa los mismos compromisos que
   * la tabla lista debajo — el correo decía dos veces lo mismo. Si hace falta
   * una entradilla, se añade un bloque aparte antes.
   */
  conTabla: z.boolean().optional().describe('true en el bloque donde se inserta la tabla de acuerdos.'),
})

export const EsquemaMoldeMinuta = z.object({
  saludo: z.string().max(120).describe('Cómo abre el correo.'),
  /**
   * La línea que dice DE QUÉ es esta minuta, antes del primer bloque.
   *
   * Sin ella el correo empieza con "Objetivo de la reunión" a secas y quien lo
   * abre tres semanas después no sabe de qué reunión le hablan. `{reunion}` y
   * `{fecha}` se sustituyen al armarlo.
   */
  entradilla: z.string().max(240).describe(
    'Línea de apertura. Admite {reunion} y {fecha}, que se sustituyen.',
  ),
  bloques: z.array(EsquemaBloqueMolde).min(1).max(8).describe('Los bloques, en el orden en que se leen.'),
  /** Cómo se despide. Vacío = sin despedida. */
  cierre: z.string().max(240).describe('Las líneas de despedida, al final del correo.'),
  /** Si el correo cierra con el enlace a la sala o al documento. */
  conEnlace: z.boolean().describe('true para cerrar con el enlace al espacio del cliente.'),
})

export type BloqueMolde = z.infer<typeof EsquemaBloqueMolde>
export type MoldeMinuta = z.infer<typeof EsquemaMoldeMinuta>

/**
 * El molde de siempre, ahora explícito.
 *
 * Es exactamente lo que `ensamblarCorreo` tenía escrito a mano, palabra por
 * palabra: quien no toque nada sigue recibiendo la minuta que ya conocía.
 */
export const MOLDE_POR_DEFECTO: MoldeMinuta = {
  saludo: 'Hola, equipo:',
  entradilla: 'Les comparto la minuta de {reunion}, del {fecha}.',
  bloques: [
    {
      titulo: 'Objetivo de la reunión',
      guia: 'UNA sola frase: a qué se convocó. Nada de enumerar lo que se trató — eso va en el bloque siguiente.',
    },
    {
      titulo: 'Temas generales y acuerdos',
      guia: 'DE 3 A 5 viñetas, de UNA línea cada una, empezando con «* ». Cada una es un tema y lo que se concluyó, no su detalle. Sin cifras salvo que la cifra SEA la noticia.',
    },
    {
      // Sin guía: este bloque no se redacta, se rellena con la tabla de
      // acuerdos. Ver `construirPromptMinuta`.
      titulo: 'Acuerdos y accionables',
      guia: '',
      conTabla: true,
    },
    {
      titulo: 'Próximos pasos',
      guia: 'UNA frase con hacia dónde va el trabajo. No repitas los accionables: ya están en la tabla.',
    },
  ],
  cierre: 'Si tienen alguna duda o desean profundizar en algún tema, con gusto lo revisamos.\n\n¡Saludos!',
  conEnlace: true,
}

/** Un molde guardado, o el de siempre si no hay ninguno. */
export function moldeODefecto(guardado: unknown): MoldeMinuta {
  const r = EsquemaMoldeMinuta.safeParse(guardado)
  return r.success ? r.data : MOLDE_POR_DEFECTO
}

/**
 * Qué le falta al molde para poder usarse. Vacío = está listo.
 *
 * Se comprueba al guardar y no al generar: descubrir que el molde no sirve
 * cuando ya se pegó la transcripción de una reunión de una hora es descubrirlo
 * tarde.
 */
export function loQueFaltaAlMolde(molde: MoldeMinuta): string[] {
  const faltas: string[] = []
  if (molde.bloques.length === 0) faltas.push('al menos un bloque')
  if (molde.bloques.some((b) => !b.titulo.trim())) faltas.push('el título de un bloque')
  const conTabla = molde.bloques.filter((b) => b.conTabla).length
  if (conTabla === 0) faltas.push('marcar en qué bloque va la tabla de acuerdos')
  if (conTabla > 1) faltas.push('dejar la tabla de acuerdos en un solo bloque')
  return faltas
}
