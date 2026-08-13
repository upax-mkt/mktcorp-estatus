/**
 * LOS EQUIPOS QUE PUEDEN CARGAR CON UN ACUERDO.
 *
 * Franco (13-ago): *"hay acuerdos que no tienen responsable, y no los puedo
 * editar ni la persona ni el equipo (UDN o Squads de mkt)"*. Hasta hoy un
 * responsable era siempre una PERSONA: alguien de Mkt Corp elegido de la lista
 * de Monday, o un nombre escrito a mano para la gente de la UDN. Pero hay
 * compromisos que no son de nadie en particular y sí de un equipo entero —"lo
 * ve RevOps", "queda con Inbound"— y escribirlos a mano cada vez produce tres
 * grafías del mismo squad y un filtro de responsables inservible.
 *
 * NO HAY TABLA NI COLUMNA NUEVA, y es a propósito: lo que se guarda sigue
 * siendo el NOMBRE en `acuerdos.responsable`, con `responsableMondayId` en
 * nulo (un squad no es un usuario de Monday, así que no hay a quién asignar
 * allá). Para saber al reabrir el editor si ese nombre era un equipo o una
 * persona escrita a mano basta compararlo con esta lista — determinista, sin
 * un campo que pueda contradecir al otro.
 *
 * ⚠️ LOS SQUADS SE ESCRIBEN AQUÍ; LAS UDN NO. Las UDN son las salas de la
 * app, que se crean y se pausan desde la propia interfaz: leerlas de la base
 * es la única forma de que la lista no envejezca. Los squads de Mkt Corp no
 * viven en esta app —su fuente es el organigrama— así que se declaran, con su
 * fecha, y hay que tocarlas cuando el equipo se reorganice.
 */

/**
 * Los seis squads vigentes desde el 15-jul-2026 (Fase 2 del organigrama de
 * Marketing Corporativo: se eliminó PMO y Paid Media se concentró en Inbound
 * Studio). Fuente: Org Truth Sheet · CMO Copilot, sección EQUIPO DETALLE.
 *
 * Si el equipo se reorganiza, esta lista es lo único que hay que cambiar: los
 * acuerdos ya guardados conservan el nombre con el que se escribieron —lo que
 * pasó, pasó— y simplemente dejan de reconocerse como equipo en el editor,
 * que es exactamente lo que le ocurre a un squad que ya no existe.
 */
export const SQUADS_MKT_CORP = [
  'Inbound Studio',
  'Performance y Conversión',
  'RevOps & Analytics',
  'Portafolio y Ecosistema',
  'Outbound y Pipeline',
  'BD Político',
] as const

export interface Equipos {
  /** Los squads de Marketing Corp. */
  squads: string[]
  /** Las UDN, que son las salas activas de la app. */
  udns: string[]
}

/**
 * Los equipos que se ofrecen, a partir de las salas que la app conoce.
 *
 * Una sala EN PAUSA no se ofrece: el freeze significa que no se le encarga
 * trabajo nuevo, y ofrecerla como responsable sería justo eso. Sus acuerdos
 * viejos siguen enseñando su nombre —ese dato no se toca— pero el desplegable
 * no invita a crear más.
 */
export function equiposPara(salas: { nombre: string; activa: boolean }[]): Equipos {
  return {
    squads: [...SQUADS_MKT_CORP],
    udns: salas.filter((s) => s.activa).map((s) => s.nombre).sort((a, b) => a.localeCompare(b, 'es')),
  }
}

/** Si un nombre guardado corresponde a un equipo conocido. */
export function esEquipo(nombre: string, equipos: Equipos): boolean {
  if (nombre === '') return false
  return equipos.squads.includes(nombre) || equipos.udns.includes(nombre)
}
