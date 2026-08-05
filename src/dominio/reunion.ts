/**
 * LA REUNIÓN COMO ENTIDAD (ronda 10, tarea 6, spec §1): la junta en sí,
 * aparte de lo que se prepara para ella (el documento — Tarea 5,
 * `src/db/documentos.ts`) y aparte de la sala que la aloja
 * (`dominio/salas.ts`). Es el corazón conceptual de la ronda: hasta ahora una
 * reunión solo se daba por dada si su documento estaba maquetado, así que
 * subir el PDF de una junta que ya ocurrió no bastaba para que contara. La
 * regla nueva vive en `fueDada`, más abajo: una junta se da por dada si ALGO
 * la respalda — su documento TERMINADO, un archivo, o su minuta.
 *
 * PURO, como `dominio/salas.ts` — mismo criterio, misma única excepción: se
 * importa `diaCivil` de `src/lib/fecha.ts` (no se repite el cálculo a mano;
 * ver la cabecera de `salas.ts` para el porqué completo).
 *
 * Import cruzado a propósito: `EstatusAcuerdo` sale de `@/db/acuerdos` y
 * `TipoReunion`/`EstadoReunion` de `@/db/reuniones` — los tres ya existen ahí
 * y redefinirlos aquí sería la misma duplicación que esta ronda viene
 * corrigiendo. Los tres se importan como TIPO (`import type`): se borran al
 * compilar, así que este módulo sigue sin ninguna dependencia en tiempo de
 * ejecución de la capa de datos — la misma garantía que promete la cabecera
 * de `salas.ts`, con `Minuta` (de ahí) en la misma categoría.
 *
 * ESTADO DE LA MIGRACIÓN (léase junto con `dominio/salas.ts`): el brief de
 * esta tarea pide sacar de `salas.ts` su propio `Reunion`/`reunionesDeSala`
 * (el par viejo, cosido a mano desde `presentaciones`+`minutas`). Ese par
 * TODAVÍA sigue ahí: `src/app/cliente/[slug]/page.tsx` y
 * `EstadoSala.presentaciones`/`.minutas` (poblados en `src/db/consultas.ts`)
 * dependen de él en producción hoy mismo, y migrarlos a este módulo nuevo es
 * exactamente el alcance de la Tarea 7 ("`EstadoSala.reuniones` sustituye a
 * `presentaciones` + `minutas`", su brief). Quitar el par viejo antes de que
 * la T7 corra rompería esa página — ver el reporte de esta tarea para el
 * detalle y la evidencia.
 */
import { diaCivil } from '@/lib/fecha'
import type { Minuta } from './salas'
import type { EstatusAcuerdo } from '@/db/acuerdos'
import type { TipoReunion, EstadoReunion } from '@/db/reuniones'

/**
 * Con qué frecuencia se reúne una sala. Sustituye al literal suelto
 * `'semanal' | 'quincenal' | 'mensual'` que vivía incrustado en
 * `EstadoSala.cadencia` (`dominio/salas.ts`) — mismos tres valores que
 * `TipoReunion` (`db/reuniones.ts`) por coincidencia, no por ser el mismo
 * eje: `Cadencia` es cada cuánto se junta la sala (una propiedad de la
 * SALA); `TipoReunion` es qué clase de junta es ESTA reunión en particular.
 */
export type Cadencia = 'semanal' | 'quincenal' | 'mensual'

/** Un archivo colgado de una reunión (PDF de una junta que ya pasó, deck viejo, etc.). */
export interface CaraArchivo {
  id: string
  titulo: string
  nombreOriginal: string
  url: string
}

/** Un acuerdo visto desde la reunión donde nació: lo justo para pintarlo. */
export interface AcuerdoDeReunion {
  id: string
  que: string
  responsable: string
  estatus: EstatusAcuerdo
  fechaCompromiso: string | null // ISO o null
}

export interface Reunion {
  id: string
  fecha: string // ISO
  titulo: string
  tipo: TipoReunion
  estado: EstadoReunion
  noDadaEn: string | null // ISO, o null = nadie ha dicho que esta reunión no se dio
  documentoId?: string
  /**
   * CORREGIDO EL 4-AGO. Hace falta aparte de `documentoId` porque en los
   * datos reales CASI TODA reunión tiene documento: `/agenda`
   * (`src/app/agenda/page.tsx`) agenda llamando a `crearReunionConDocumento`
   * (`src/db/documentos.ts`), así que la plantilla nace CON la junta.
   * `Boolean(documentoId)` no distingue nada; el equivalente del viejo
   * estado `lista` es este: el documento está TERMINADO (`estado === 'listo'`
   * en `EstadoDocumento`, `db/documentos.ts`).
   */
  documentoListo: boolean
  archivos: CaraArchivo[]
  minuta?: Minuta // el tipo que ya existe en dominio/salas.ts
  acuerdos: AcuerdoDeReunion[]
}

/**
 * Lo que la sala le pasa a `reunionesDeSala`: cuatro listas planas —tal como
 * salen de sus tablas respectivas— que aquí se cosen por reunión. Función
 * pura: no consulta nada, recibe lo que la Tarea 7 le arme desde Postgres.
 */
export interface DatosDeSalaParaReuniones {
  reuniones: Array<Omit<Reunion, 'archivos' | 'minuta' | 'acuerdos'>>
  archivos: Array<CaraArchivo & { reunionId: string }>
  minutas: Array<Minuta & { reunionId: string }>
  acuerdos: Array<AcuerdoDeReunion & { reunionOrigenId: string }>
}

/**
 * Las reuniones de una sala, de la más reciente a la más antigua, con sus
 * archivos, su minuta y sus acuerdos ya cosidos.
 *
 * Un archivo y una minuta que cuelgan de la MISMA reunión son UNA reunión,
 * no dos —la reunión es la unidad, nunca lo que se cosió sobre ella—, así
 * que aquí no hay que emparejar por fecha ni por ninguna otra heurística: el
 * `id` de la reunión ya es la clave que trae cada lista.
 */
export function reunionesDeSala(datos: DatosDeSalaParaReuniones): Reunion[] {
  const archivosPorReunion = new Map<string, CaraArchivo[]>()
  for (const { reunionId, ...archivo } of datos.archivos) {
    const lista = archivosPorReunion.get(reunionId)
    if (lista) lista.push(archivo)
    else archivosPorReunion.set(reunionId, [archivo])
  }

  const minutaPorReunion = new Map<string, Minuta>()
  for (const { reunionId, ...minuta } of datos.minutas) {
    minutaPorReunion.set(reunionId, minuta)
  }

  const acuerdosPorReunion = new Map<string, AcuerdoDeReunion[]>()
  for (const { reunionOrigenId, ...acuerdo } of datos.acuerdos) {
    const lista = acuerdosPorReunion.get(reunionOrigenId)
    if (lista) lista.push(acuerdo)
    else acuerdosPorReunion.set(reunionOrigenId, [acuerdo])
  }

  return datos.reuniones
    .map((r) => ({
      ...r,
      archivos: archivosPorReunion.get(r.id) ?? [],
      minuta: minutaPorReunion.get(r.id),
      acuerdos: acuerdosPorReunion.get(r.id) ?? [],
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * Documento TERMINADO, un archivo, o una minuta: cualquiera prueba que la
 * junta ocurrió.
 *
 * `documentoListo`, no `documentoId`: casi toda reunión tiene documento desde
 * que se agenda (la plantilla nace con ella), así que su mera existencia no
 * prueba nada. Es el mismo umbral que usaba el estado `lista` en el viejo
 * `salas.ts:fueDada` — no uno inventado aparte.
 */
function tieneRespaldo(r: Reunion): boolean {
  return r.documentoListo || r.archivos.length > 0 || Boolean(r.minuta)
}

/**
 * SI UNA REUNIÓN YA OCURRIÓ, sin que nadie tenga que decirlo.
 *
 * Hasta esta tarea, una junta solo se daba por dada si su documento estaba
 * maquetado — subir el PDF de una junta que ya pasó no bastaba para que
 * contara, porque ese PDF no era "el documento de la sesión". Ahora basta
 * con que ALGO la respalde: su documento terminado, un archivo, o su minuta.
 *
 * Dos cosas pueden desmentir la deducción, en los dos sentidos:
 *
 * - Lo EXPLÍCITO manda siempre que existe: `estado === 'dada'` es un hecho
 *   que alguien confirmó, así que gana sin mirar respaldo ni fecha.
 * - `noDadaEn` es lo contrario: alguien dijo explícitamente que ESTA reunión
 *   en concreto NO se dio —se canceló, se pospuso— y eso manda sobre la
 *   deducción automática. Nunca sobre lo explícito positivo: si ya está
 *   `dada`, `noDadaEn` ni se consulta.
 *
 * A falta de las dos, se deduce: con respaldo Y su día CIVIL ya pasado,
 * estrictamente antes de hoy. "Estrictamente" es a propósito — hoy nunca es
 * "ya pasado" pase lo que pase con el reloj: se compara por DÍA
 * (`diaCivil`, fuente única en `src/lib/fecha.ts`), nunca por instante.
 */
export function fueDada(r: Reunion, hoyCivil: string): boolean {
  if (r.estado === 'dada') return true // lo explícito manda
  if (r.noDadaEn) return false // negarlo también es explícito
  if (!tieneRespaldo(r)) return false // nada que respalde que ocurrió
  return diaCivil(r.fecha) < hoyCivil // por DÍA, nunca por instante
}

/**
 * ¿Hay algo que enseñarle a la UDN como "la presentación de esa junta"? Un
 * documento a medio maquetar todavía no lo es — por eso `documentoListo` y no
 * `documentoId`, igual que en `fueDada`. De esto depende que la Tarea 9 pinte
 * el botón "Subir presentación" o el enlace a lo que ya hay.
 */
export function tienePresentacion(r: Reunion): boolean {
  return r.documentoListo || r.archivos.length > 0
}

/**
 * QUÉ REUNIONES SE PUEDEN MINUTAR: las que tienen algo que respalde que
 * ocurrieron (mismo criterio que `fueDada`, incluido lo explícito) y todavía
 * no tienen minuta.
 *
 * El día se compara con `<=`, no con `<` como en `fueDada`: minutar no espera
 * al día siguiente. Una reunión de esta mañana ya se puede minutar esta
 * tarde, aunque `fueDada` —para la que "hoy nunca es ya pasado"— todavía la
 * cuente como pendiente. Son dos preguntas distintas: "¿ya se puede dar por
 * ocurrida sin que nadie lo diga?" (fueDada, conservadora) y "¿ya hay algo
 * que transcribir?" (esto, más permisiva).
 *
 * "No se dio" tampoco se minuta: nada que transcribir de una reunión que no
 * ocurrió — mismo criterio que `fueDada`.
 */
export function reunionesMinutables(rs: Reunion[], hoyCivil: string): Reunion[] {
  return rs
    .filter((r) => !r.minuta)
    .filter((r) => !r.noDadaEn)
    .filter((r) => r.estado === 'dada' || tienePresentacion(r))
    .filter((r) => diaCivil(r.fecha) <= hoyCivil)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * QUÉ REUNIONES NECESITAN UNA PALABRA HUMANA: las que la deducción automática
 * de `fueDada` ya cuenta como dadas —tienen respaldo y su día ya pasó—, para
 * poder negarlas si hace falta.
 *
 * Se ofrecen las DOS caras, no solo las que faltan por confirmar: una reunión
 * ya marcada `noDadaEn` SIGUE apareciendo (con esa marca puesta), para que se
 * pueda deshacer — si desapareciera al marcarla, no habría cómo arrepentirse.
 * Por eso este filtro mira el respaldo directamente y no llama a `fueDada` a
 * secas: `fueDada` respeta `noDadaEn` y diría que no, justo lo contrario de
 * lo que hace falta aquí.
 *
 * Una reunión ya `dada` explícitamente no se pregunta: es un hecho confirmado,
 * no una duda que ofrecer.
 */
export function reunionesPorConfirmar(rs: Reunion[], hoyCivil: string): Reunion[] {
  return rs
    .filter((r) => r.estado !== 'dada')
    .filter((r) => tieneRespaldo(r) && diaCivil(r.fecha) < hoyCivil)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}
