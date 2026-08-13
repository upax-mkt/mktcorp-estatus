import { diaCivil } from '@/lib/fecha'

/**
 * CÓMO SE LEE LA LISTA DE ACUERDOS DE UNA SALA.
 *
 * Franco (13-ago): *"los acuerdos, en la vista de viewers, los que ya están
 * cumplidos deberían pasar abajito y verse más chiquitos y grises, no como que
 * se vean cumplidos; los que están abiertos deben ordenarse por fecha próxima
 * a su vencimiento, y tal vez la fecha podría ir tiñéndose como semáforo"*.
 *
 * La lista llegaba en el orden en que salía de la base —el de creación— así
 * que un compromiso entregado en mayo podía estar encima de uno que vence
 * pasado mañana. Quien abre la sala de su UDN viene a ver QUÉ DEBE; lo ya
 * entregado es historia y su sitio es el final.
 *
 * ⚠️ EL ORDEN ES EL MISMO PARA TODOS, no solo para el director. Franco lo pidió
 * sobre la vista de viewer, pero dos ordenaciones distintas de la misma lista
 * obligan a reaprender la pantalla según quién mire, y el equipo tiene la misma
 * pregunta delante ("qué corre prisa aquí"). Lo que sí cambia por rol son los
 * controles, que ya viven aparte.
 */

/** Lo mínimo que hace falta para ordenar; la fila pinta bastante más. */
interface AcuerdoOrdenable {
  estatus: 'abierto' | 'cumplido' | 'vencido'
  fechaCompromiso: string | null
}

/** Una semana: el horizonte en el que un compromiso ya es cosa de esta semana. */
const DIAS_QUE_URGEN = 7

/**
 * Los que siguen vivos primero —ordenados por lo que vence antes— y lo
 * cumplido al final.
 *
 * Dentro de lo vivo, un vencido sale arriba por su propia fecha: es lo más
 * atrasado, así que ordenar por fecha ascendente ya lo pone donde debe sin
 * necesidad de una regla aparte para él.
 *
 * SIN FECHA VA AL FINAL DE LO VIVO: no se sabe si urge. Arriba diría que corre
 * prisa; abajo del todo lo escondería entre lo entregado.
 *
 * Devuelve un arreglo nuevo: quien lo llama suele estar pintando y no espera
 * que su lista cambie bajo los pies.
 *
 * No recibe "hoy" a propósito: el estatus que llega YA lo tuvo en cuenta
 * (`estatusEfectivo` decide si un abierto está vencido, y respeta el freeze de
 * la sala). Pedirlo aquí sería tener dos sitios calculando lo mismo y poder
 * discrepar.
 */
export function ordenarAcuerdosDeSala<T extends AcuerdoOrdenable>(acuerdos: T[]): T[] {
  const peso = (a: T) => (a.estatus === 'cumplido' ? 1 : 0)
  return [...acuerdos].sort((a, b) => {
    const porEstado = peso(a) - peso(b)
    if (porEstado !== 0) return porEstado
    // Sin fecha, al final de su grupo.
    if (a.fechaCompromiso == null && b.fechaCompromiso == null) return 0
    if (a.fechaCompromiso == null) return 1
    if (b.fechaCompromiso == null) return -1
    return a.fechaCompromiso.localeCompare(b.fechaCompromiso)
  })
}

/** Los tonos con los que se escribe la fecha de un acuerdo. */
export type TonoVencimiento = 'vencida' | 'urgente' | 'holgada' | 'apagada' | 'pordef'

/**
 * EL SEMÁFORO DE LA FECHA: rojo lo vencido, ámbar lo que cae dentro de la
 * semana, verde lo que tiene margen.
 *
 * Lo CUMPLIDO no se tiñe: su fecha dejó de correr el día que se entregó, y
 * pintarla de rojo sería alarmar por algo que ya está hecho — justo lo
 * contrario de lo que se pidió ("que no se vean cumplidos" es que no llamen la
 * atención, no que desaparezcan).
 *
 * Se compara por DÍA CIVIL en la zona de México, no por instante: lo mismo que
 * el resto de la app desde el bug de los acuerdos que vencían seis horas antes
 * cada tarde (ver `src/lib/fecha.ts`).
 */
export function tonoDeVencimiento(
  fechaCompromiso: string | null,
  estatus: AcuerdoOrdenable['estatus'],
  hoyCivil: string,
): TonoVencimiento {
  if (fechaCompromiso == null) return 'pordef'
  if (estatus === 'cumplido') return 'apagada'
  const dia = diaCivil(fechaCompromiso)
  if (dia < hoyCivil) return 'vencida'
  return diasEntre(hoyCivil, dia) <= DIAS_QUE_URGEN ? 'urgente' : 'holgada'
}

/** Días naturales entre dos días civiles (yyyy-mm-dd), ambos en la misma zona. */
function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/**
 * LOS ACUERDOS DE LA SALA, PARTIDOS EN DOS: lo que sigue vivo y lo cumplido.
 *
 * Franco (13-ago, después de ver lo cumplido apagado al final): *"los
 * cumplidos déjalos desplegables y colapsados… dentro del mismo módulo"*.
 *
 * Apagarlos no bastaba: en una sala con historia, la lista sigue siendo una
 * columna larga de cosas hechas debajo de las seis que importan hoy. Plegados
 * ocupan un renglón y se abren cuando alguien pregunta "¿y esto ya se
 * entregó?" — que es justo cuando se consultan.
 *
 * DENTRO DEL MISMO MÓDULO, no en una sección aparte: son acuerdos de esa sala
 * y su sitio es Acuerdos; sacarlos a otra tarjeta los convertiría en otra cosa.
 *
 * Los dos grupos salen ya ordenados por `ordenarAcuerdosDeSala`, así que
 * dentro del desplegable lo cumplido conserva un orden estable en vez del que
 * salga de la base.
 */
export function partirAcuerdosDeSala<T extends AcuerdoOrdenable>(
  acuerdos: T[],
): { vivos: T[]; cumplidos: T[] } {
  const ordenados = ordenarAcuerdosDeSala(acuerdos)
  return {
    vivos: ordenados.filter((a) => a.estatus !== 'cumplido'),
    cumplidos: ordenados.filter((a) => a.estatus === 'cumplido'),
  }
}
