/**
 * QUÉ ACUERDO VIAJA AL TABLERO Y CUÁL NO.
 *
 * Lo decide el responsable, y solo el responsable (Franco, 29-jul): si es
 * alguien de Mkt Corp, el compromiso es nuestro y vive también en Delivery; si
 * es de la UDN, vive solo aquí. No hay un interruptor aparte de "este va a
 * Monday" porque serían dos sitios diciendo lo mismo y podrían contradecirse.
 */
export type EstadoBandeja = 'no_aplica' | 'pendiente' | 'subido' | 'descartado'

export function estadoInicialDeBandeja(responsableMondayId: string | null): EstadoBandeja {
  return responsableMondayId ? 'pendiente' : 'no_aplica'
}

export function entraALaBandeja(acuerdo: {
  responsableMondayId: string | null
  bandeja: EstadoBandeja
  /** Una sala en pausa congela sus acuerdos: tampoco se suben. */
  salaActiva: boolean
}): boolean {
  return (
    acuerdo.bandeja === 'pendiente' && acuerdo.responsableMondayId !== null && acuerdo.salaActiva
  )
}
