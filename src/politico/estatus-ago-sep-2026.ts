/**
 * EL ESTATUS DE LA VERTICAL POLÍTICO-ELECTORAL, agosto–septiembre 2026.
 *
 * Es la junta de 30 minutos con Ceci del 30-sep-2026. La preparó Ángel Toledano
 * (Head de BD Político) en un deck —«MKT político Ago-Sep», 5 láminas— y Franco
 * pidió verla aquí, como pestaña, en vez de proyectar el PowerPoint.
 *
 * DE DÓNDE SALE CADA CIFRA. Todo viene del deck de Ángel, cruzado contra
 * HubSpot y GA4 el 29-sep-2026. Franco decidió ese mismo día usar las cifras de
 * Ángel CORREGIDAS y con los nombres tal cual los puso él. Lo que se corrigió:
 *
 *   · La fila de totales decía Promo Espacio $900,000; sus renglones suman
 *     $1,700,000. El total general ($5,701,774) sí estaba bien.
 *   · El embudo del deck (27 → 22 → 19 → 16 → 1) traía porcentajes que no
 *     salen de esos números. Aquí va uno que se puede rastrear: las reuniones
 *     realizadas que Ángel registró en HubSpot, las oportunidades de su tabla,
 *     las que están en evaluación y la ganada.
 *   · «9 de los 17 estados con elección»: Ciudad de México, Estado de México e
 *     Hidalgo no están entre los 17 que eligen gubernatura en 2027. Se dice lo
 *     que es cierto sin esa cuenta: nueve institutos electorales estatales.
 *
 * Lo que HubSpot todavía no refleja, y por eso aquí manda el deck: el
 * Instituto Electoral de la Ciudad de México ($500,000) no está capturado, y el
 * primer ganado vive en el pipeline de Research Land con monto $0 y su $200,000
 * en un cross-sell de Marketing United que sigue en «Reunión calificada».
 *
 * FUENTE ÚNICA: ningún total se escribe a mano. Los calcula este archivo a
 * partir de las filas, y `estatus-ago-sep-2026.test.ts` lo vigila.
 */

export const CORTE = '29 de septiembre de 2026'

export type UdnVertical =
  | 'Research Land'
  | 'Promo Espacio'
  | 'Marketing United'
  | 'Mexa Creativa'
  | 'House of Films'
  | 'NeraCode'

export type EtapaOportunidad = 'ganado' | 'evaluando' | 'cotizacion' | 'reunion'

export const ETIQUETA_ETAPA: Record<EtapaOportunidad, string> = {
  ganado: 'Ganado por facturar',
  evaluando: 'Evaluando propuesta',
  cotizacion: 'Solicitud de cotización',
  reunion: 'Reunión calificada',
}

export interface Oportunidad {
  cliente: string
  /** Quién o qué dentro del cliente, cuando el deck lo dice. */
  detalle?: string
  etapa: EtapaOportunidad
  /** Monto por UDN, en pesos. Una UDN sin monto todavía no cotizó. */
  montos: Partial<Record<UdnVertical, number>>
  /** UDN que participan y aún no tienen monto. */
  sinMonto?: UdnVertical[]
}

/** La tabla de oportunidades del deck, en su orden. */
export const OPORTUNIDADES: Oportunidad[] = [
  {
    cliente: 'H. Cámara de Diputados',
    detalle: 'Dip. Mónica Sandoval, aspirante a la alcaldía Cuauhtémoc',
    etapa: 'ganado',
    montos: { 'Marketing United': 200_000 },
  },
  {
    cliente: 'Instituto Electoral y de Participación Ciudadana de Guerrero',
    etapa: 'evaluando',
    montos: { 'Mexa Creativa': 190_000, 'Research Land': 1_229_660, 'Marketing United': 388_320 },
  },
  {
    cliente: 'H. Cámara de Diputados',
    etapa: 'evaluando',
    montos: { 'Promo Espacio': 300_000, 'Research Land': 191_666, 'Marketing United': 470_000 },
  },
  {
    cliente: 'Instituto Electoral del Estado de México',
    etapa: 'evaluando',
    montos: { 'Promo Espacio': 500_000 },
  },
  {
    cliente: 'Instituto Tlaxcalteca de Elecciones',
    etapa: 'evaluando',
    montos: { 'Promo Espacio': 100_000 },
  },
  {
    cliente: 'Lotería Nacional',
    etapa: 'evaluando',
    montos: { 'Research Land': 1_532_128 },
  },
  {
    cliente: 'Instituto Electoral de la Ciudad de México',
    etapa: 'evaluando',
    montos: { 'Promo Espacio': 500_000 },
  },
  {
    cliente: 'Instituto Electoral de Michoacán',
    etapa: 'cotizacion',
    montos: {},
  },
  {
    cliente: 'Instituto Electoral de Quintana Roo',
    etapa: 'reunion',
    montos: { 'Promo Espacio': 300_000 },
    sinMonto: ['House of Films'],
  },
]

export function totalDe(o: Oportunidad): number {
  return Object.values(o.montos).reduce((suma, monto) => suma + (monto ?? 0), 0)
}

/** Lo que sigue abierto: todo menos lo ganado. */
export function oportunidadesAbiertas(lista: Oportunidad[] = OPORTUNIDADES): Oportunidad[] {
  return lista.filter((o) => o.etapa !== 'ganado')
}

export function pipelineAbierto(lista: Oportunidad[] = OPORTUNIDADES): number {
  return oportunidadesAbiertas(lista).reduce((suma, o) => suma + totalDe(o), 0)
}

export function ganado(lista: Oportunidad[] = OPORTUNIDADES): number {
  return lista.filter((o) => o.etapa === 'ganado').reduce((suma, o) => suma + totalDe(o), 0)
}

/** El pipeline abierto partido por UDN, de mayor a menor. */
export function pipelinePorUdn(lista: Oportunidad[] = OPORTUNIDADES): { udn: UdnVertical; monto: number }[] {
  const acumulado = new Map<UdnVertical, number>()
  for (const o of oportunidadesAbiertas(lista)) {
    for (const [udn, monto] of Object.entries(o.montos) as [UdnVertical, number][]) {
      acumulado.set(udn, (acumulado.get(udn) ?? 0) + monto)
    }
  }
  return [...acumulado.entries()]
    .map(([udn, monto]) => ({ udn, monto }))
    .sort((a, b) => b.monto - a.monto)
}

/**
 * LAS REUNIONES, contadas en HubSpot: las que Ángel creó entre el 1 de julio y
 * el 29 de septiembre y quedaron realizadas. Hay además cinco sin resultado
 * capturado y dos reagendadas, que no se cuentan.
 */
export const REUNIONES = { realizadas: 19, credenciales: 14, acercamiento: 5, periodo: 'julio a septiembre' }

/** El embudo que sí se puede rastrear, de arriba abajo. */
export function embudo(lista: Oportunidad[] = OPORTUNIDADES): { etapa: string; valor: number }[] {
  return [
    { etapa: 'Reuniones realizadas', valor: REUNIONES.realizadas },
    { etapa: 'Oportunidades', valor: lista.length },
    { etapa: 'Propuestas en evaluación', valor: lista.filter((o) => o.etapa === 'evaluando').length },
    { etapa: 'Ganado', valor: lista.filter((o) => o.etapa === 'ganado').length },
  ]
}

export type PasoInstituto = 'credenciales' | 'acercamiento'

/** Los institutos electorales estatales con los que ya hubo reunión, según el deck. */
export const INSTITUTOS: { estado: string; paso: PasoInstituto }[] = [
  { estado: 'Guerrero', paso: 'credenciales' },
  { estado: 'Quintana Roo', paso: 'credenciales' },
  { estado: 'Hidalgo', paso: 'credenciales' },
  { estado: 'Ciudad de México', paso: 'credenciales' },
  { estado: 'Estado de México', paso: 'credenciales' },
  { estado: 'Michoacán', paso: 'credenciales' },
  { estado: 'Querétaro', paso: 'acercamiento' },
  { estado: 'Aguascalientes', paso: 'acercamiento' },
  { estado: 'Chihuahua', paso: 'acercamiento' },
]

/**
 * PARTIDOS Y CANDIDATOS. Los destacados y las «oportunidades por definir» del
 * deck, con los nombres tal cual (decisión de Franco, 29-sep-2026).
 */
export const CONVERSACIONES: { quien: string; titulo: string; detalle: string }[] = [
  {
    quien: 'PAN',
    titulo: 'Equipo del senador Ricardo Anaya',
    detalle: 'Presentamos credenciales. El jueves 1 de octubre nos visita Carlos Castaños, director de comunicación del PAN nacional.',
  },
  {
    quien: 'PAN',
    titulo: 'Leslie Staines · Álvaro Obregón',
    detalle: 'Aspirante a la alcaldía. Esta semana le presentamos la propuesta económica.',
  },
  {
    quien: 'PAN',
    titulo: 'Seis plazas por definir',
    detalle: 'Chihuahua, Aguascalientes, Querétaro, CDMX, Morelia y Monterrey, con cinco UDN; en Monterrey también NeraCode.',
  },
  {
    quien: 'PRI',
    titulo: 'Sinaloa',
    detalle: 'Diputado Mario Zamora, aspirante a gobernador: comunicación directa y visita pendiente. Senadora Paloma Sánchez, en calificación.',
  },
  {
    quien: 'SOMOS MX',
    titulo: 'Amado Avendaño',
    detalle: 'Secretario nacional de comunicación. Presentamos credenciales y seguimos en contacto directo.',
  },
  {
    quien: 'Morena y aliados',
    titulo: 'Dos aspirantes se acercaron',
    detalle: 'Santiago Nieto y Beatriz Mujica, por contactos periodísticos.',
  },
]

/**
 * LA LANDING DE LA VERTICAL (politico.upax.com.mx), sesiones en GA4. Julio y
 * agosto coinciden exacto con el deck; septiembre llega hasta el día 28.
 */
export const LANDING: { mes: string; visitas: number; parcial?: boolean }[] = [
  { mes: 'Julio', visitas: 169 },
  { mes: 'Agosto', visitas: 1_065 },
  { mes: 'Septiembre', visitas: 607, parcial: true },
]

/** El blog político, lecturas en GA4 de junio al 28 de septiembre. */
export const BLOG = {
  articulos: 13,
  lecturas: 1_030,
  periodo: 'junio a septiembre',
  masLeido: { titulo: 'Elecciones 2027 en México', lecturas: 327 },
}

export const SIGUIENTES: { cuando: string; que: string }[] = [
  { cuando: 'Esta semana', que: 'Propuesta económica a Leslie Staines, aspirante a la alcaldía Álvaro Obregón.' },
  { cuando: 'Jueves 1 de octubre', que: 'Visita de Carlos Castaños, director de comunicación del PAN nacional.' },
  { cuando: 'Octubre', que: 'Facturar el primer negocio ganado: $200 mil con la diputada Mónica Sandoval.' },
  { cuando: 'Octubre', que: 'Cotización para el Instituto Electoral de Michoacán.' },
  { cuando: 'Por agendar', que: 'Visita al diputado Mario Zamora, aspirante a gobernador de Sinaloa.' },
]
