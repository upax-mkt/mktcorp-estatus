import { ENCABEZADO_TABLA, TABLA_VACIA, formatearFechaTabla } from './ensamblar'

export interface AcuerdoParaLaTabla {
  que: string
  responsable: string
  /** ISO (yyyy-mm-dd) o null. Se formatea igual que las filas que ya están. */
  fechaCompromiso: string | null
}

/** Una línea es una fila de la tabla si lleva el separador de celdas. */
function esFila(linea: string): boolean {
  return linea.includes(' | ')
}

/**
 * METE UN ACUERDO EN LA TABLA DE UNA MINUTA YA ESCRITA.
 *
 * Franco (20-ago-2026): *"una vez creada la reunión y marcada completada se me
 * olvida meter un acuerdo, debo poder hacerlo y que también se refleje en la
 * minuta ya publicada"* — integrado en la tabla, sin distinguirlo de los
 * demás.
 *
 * La minuta guardada es texto plano y su tabla son líneas
 * `Acción | Owner | Fecha` (ver `ensamblarCorreo`), así que esto es una
 * operación de TEXTO sobre lo que ya está escrito, no una regeneración: quien
 * corrigió la redacción a mano no pierde su corrección. Por eso tampoco se
 * reensambla el correo entero, que es lo que la haría desaparecer.
 *
 * Dos formas de encontrar el sitio, en este orden:
 *
 * 1. La tabla existe: se busca su encabezado y la fila nueva va DESPUÉS DE LA
 *    ÚLTIMA fila consecutiva, no al final del texto — al final del texto está
 *    la despedida, y un acuerdo detrás de "Saludos," no es una tabla, es una
 *    posdata.
 * 2. La minuta se publicó SIN acuerdos: entonces lleva la línea de vacío, que
 *    se sustituye por el encabezado y la fila. Dejar ese texto ahí mientras
 *    debajo hay un acuerdo sería una minuta contradiciéndose.
 *
 * ⚠️ Y SI NO HAY NI UNA COSA NI LA OTRA, DEVUELVE `null` EN VEZ DE ADIVINAR.
 * Pasa con una minuta cargada a mano (`cargarMinutaExterna`) o corregida hasta
 * perder el formato. Escribir la fila "donde sea" deja un correo peor que el
 * que había y nadie se entera de que un programa lo tocó; el acuerdo se guarda
 * igual —vive en la sala y en su reunión— y quien lo añadió recibe el aviso de
 * que esa minuta hay que corregirla a mano.
 */
export function insertarAcuerdoEnMinuta(texto: string, acuerdo: AcuerdoParaLaTabla): string | null {
  const fila = [acuerdo.que, acuerdo.responsable, formatearFechaTabla(acuerdo.fechaCompromiso)].join(' | ')
  const lineas = texto.split('\n')

  const encabezado = lineas.findIndex((l) => l.trim() === ENCABEZADO_TABLA)
  if (encabezado !== -1) {
    let ultima = encabezado
    while (ultima + 1 < lineas.length && esFila(lineas[ultima + 1])) ultima++
    lineas.splice(ultima + 1, 0, fila)
    return lineas.join('\n')
  }

  const vacia = lineas.findIndex((l) => l.trim() === TABLA_VACIA)
  if (vacia !== -1) {
    lineas.splice(vacia, 1, ENCABEZADO_TABLA, fila)
    return lineas.join('\n')
  }

  return null
}
