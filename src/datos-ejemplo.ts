/**
 * Datos de ejemplo para el shell navegable, mientras no hay base de datos.
 * Representan el estado de la relación de Mkt Corp con cada sala: cuándo fue la
 * última sesión, cuántos acuerdos vivos, qué está en preparación. Cuando llegue
 * la persistencia (fase posterior), esto se reemplaza por consultas reales.
 */
import { slugsDeSalas, obtenerTema } from '@/temas'

export type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido'

export interface Acuerdo {
  id: string
  que: string
  responsable: string
  squad?: string
  fechaCompromiso: string | null // ISO, o null = "por definir"
  estatus: EstatusAcuerdo
}

export interface Presentacion {
  fecha: string // ISO
  titulo: string
  tipo: 'semanal' | 'mensual'
  /** La sesión real de la que salió. Sin ella no hay documento que abrir. */
  sesionId?: string
}

export interface Minuta {
  fecha: string // ISO
  titulo: string
  enviadaA: number // # de participantes
  /** Sesión de la que salió: es lo que permite abrirla desde la sala. Los datos de ejemplo no tienen sesión real, por eso es opcional. */
  sesionId?: string
}

export interface EstadoSala {
  slug: string
  nombre: string
  color: string
  /** Días desde la última sesión. Alto = desatendida. `null` = nunca. */
  diasDesdeUltima: number | null
  ultimaSesion: string | null // ISO
  proximaSesion: string | null // ISO
  enPreparacion: boolean
  avancePreparacion?: number // 0..100
  acuerdos: Acuerdo[]
  presentaciones: Presentacion[]
  minutas: Minuta[]
  /** Cadencia acordada; usada para juzgar si está desatendida. */
  cadencia: 'semanal' | 'mensual'
}

const HOY = new Date('2026-07-24')

function haceDias(dias: number): string {
  const d = new Date(HOY)
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}
function enDias(dias: number): string {
  const d = new Date(HOY)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Estado por slug — algunos ricos, otros escuetos, para que el hub tenga contraste real. */
const CRUDO: Record<string, Partial<EstadoSala>> = {
  neracode: {
    diasDesdeUltima: 4, cadencia: 'mensual', enPreparacion: false,
    proximaSesion: enDias(26),
    acuerdos: [
      { id: 'nc1', que: 'Presentar nuevas palabras clave y segmentos para campañas de desarrollos especializados', responsable: 'Fernando Borges', squad: 'Performance', fechaCompromiso: haceDias(0), estatus: 'abierto' },
      { id: 'nc2', que: 'Construir la nueva propuesta de valor alrededor de transformación, IA y resultados de negocio', responsable: 'David Porchini', squad: 'Portafolio', fechaCompromiso: null, estatus: 'abierto' },
      { id: 'nc3', que: 'Diseñar una metodología propia para proyectos con IA que sustituya Scrum', responsable: 'César Mejía', squad: 'RevOps', fechaCompromiso: null, estatus: 'abierto' },
      { id: 'nc4', que: 'Finalizar el diseño de las credenciales en inglés y circularlas', responsable: 'David Porchini', squad: 'Portafolio', fechaCompromiso: haceDias(3), estatus: 'vencido' },
      { id: 'nc5', que: 'Compartir accesos de la Brújula comercial', responsable: 'César Mejía', squad: 'RevOps', fechaCompromiso: haceDias(20), estatus: 'cumplido' },
    ],
    presentaciones: [
      { fecha: haceDias(4), titulo: 'Estatus mensual · Junio 2026', tipo: 'mensual' },
      { fecha: haceDias(35), titulo: 'Estatus mensual · Mayo 2026', tipo: 'mensual' },
      { fecha: haceDias(66), titulo: 'Estatus mensual · Abril 2026', tipo: 'mensual' },
    ],
    minutas: [
      { fecha: haceDias(4), titulo: 'NC · Comité Mensual Junio', enviadaA: 9 },
      { fecha: haceDias(35), titulo: 'NC · Comité Mensual Mayo', enviadaA: 8 },
    ],
  },
  'mexa-creativa': {
    diasDesdeUltima: 2, cadencia: 'semanal', enPreparacion: true, avancePreparacion: 60,
    proximaSesion: enDias(5),
    acuerdos: [
      { id: 'mc1', que: 'Cerrar la parrilla de contenidos de agosto', responsable: 'Diana Cruz', squad: 'Web y Contenidos', fechaCompromiso: enDias(2), estatus: 'abierto' },
      { id: 'mc2', que: 'Validar el nuevo reel de marca con dirección', responsable: 'Sergio Franco', fechaCompromiso: enDias(6), estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(2), titulo: 'Estatus semanal · Squad Inbound', tipo: 'semanal' }],
    minutas: [{ fecha: haceDias(2), titulo: 'MC · Weekly 22-jul', enviadaA: 6 }],
  },
  'research-land': {
    diasDesdeUltima: 31, cadencia: 'mensual', enPreparacion: false, proximaSesion: null,
    acuerdos: [
      { id: 'rl1', que: 'Entregar el informe de campo del estudio de percepción Q2', responsable: 'Pablo Levy', fechaCompromiso: haceDias(12), estatus: 'vencido' },
      { id: 'rl2', que: 'Definir el alcance del panel de intención de compra', responsable: 'Aarón', fechaCompromiso: null, estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(31), titulo: 'Estatus mensual · Junio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(31), titulo: 'RL · Comité Junio', enviadaA: 7 }],
  },
  'promo-espacio': {
    diasDesdeUltima: 9, cadencia: 'mensual', enPreparacion: false, proximaSesion: enDias(21),
    acuerdos: [
      { id: 'pe1', que: 'Cerrar la propuesta de la campaña 360 BAZ para pauta en LinkedIn', responsable: 'Franco', fechaCompromiso: enDias(3), estatus: 'abierto' },
      { id: 'pe2', que: 'Definir el dueño del SLA de activaciones DOOH', responsable: 'por asignar', fechaCompromiso: null, estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(9), titulo: 'Estatus mensual · Julio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(9), titulo: 'PE · Comité Julio', enviadaA: 5 }],
  },
  'marketing-united': {
    diasDesdeUltima: 48, cadencia: 'mensual', enPreparacion: false, proximaSesion: null,
    acuerdos: [
      { id: 'mu1', que: 'Reactivar el plan de experiencias para el segundo semestre', responsable: 'por asignar', fechaCompromiso: haceDias(18), estatus: 'vencido' },
    ],
    presentaciones: [{ fecha: haceDias(48), titulo: 'Estatus mensual · Mayo 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(48), titulo: 'MU · Comité Mayo', enviadaA: 4 }],
  },
  'house-of-films': {
    diasDesdeUltima: 6, cadencia: 'mensual', enPreparacion: false, proximaSesion: enDias(24),
    acuerdos: [
      { id: 'hof1', que: 'Entregar el corte final del video de respuesta institucional', responsable: 'Ceci', fechaCompromiso: enDias(1), estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(6), titulo: 'Estatus mensual · Junio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(6), titulo: 'HoF · Comité Junio', enviadaA: 5 }],
  },
  uix: {
    diasDesdeUltima: 14, cadencia: 'mensual', enPreparacion: true, avancePreparacion: 25,
    proximaSesion: enDias(2),
    acuerdos: [
      { id: 'uix1', que: 'Coordinar con Mike Flores la mejora de presentaciones comerciales', responsable: 'Mike Flores', fechaCompromiso: enDias(7), estatus: 'abierto' },
      { id: 'uix2', que: 'Entregar el rediseño del flujo de onboarding del piloto', responsable: 'por asignar', fechaCompromiso: null, estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(14), titulo: 'Estatus mensual · Junio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(14), titulo: 'UiX · Comité Junio', enviadaA: 6 }],
  },
  zeus: {
    diasDesdeUltima: 20, cadencia: 'mensual', enPreparacion: false, proximaSesion: enDias(10),
    acuerdos: [
      { id: 'z1', que: 'Cerrar el plan de talento y operación para el evento de cierre de año', responsable: 'por asignar', fechaCompromiso: enDias(30), estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(20), titulo: 'Estatus mensual · Junio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(20), titulo: 'Zeus · Comité Junio', enviadaA: 4 }],
  },
  ceci: {
    diasDesdeUltima: 7, cadencia: 'mensual', enPreparacion: false, proximaSesion: enDias(23),
    acuerdos: [
      { id: 'ce1', que: 'Alinear el mensaje del mes de la CEO para las 8 unidades', responsable: 'Franco', fechaCompromiso: enDias(5), estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(7), titulo: 'Estatus a la CEO · Junio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(7), titulo: 'Ceci · Estatus Junio', enviadaA: 3 }],
  },
  'grupo-upax': {
    diasDesdeUltima: 12, cadencia: 'mensual', enPreparacion: false, proximaSesion: enDias(18),
    acuerdos: [
      { id: 'gu1', que: 'Consolidar el pipeline agregado de las 8 UDNs para el corporativo', responsable: 'César Mejía', fechaCompromiso: enDias(4), estatus: 'abierto' },
      { id: 'gu2', que: 'Presentar el avance del refresh de marca a dirección', responsable: 'Iris Múgica', fechaCompromiso: null, estatus: 'abierto' },
    ],
    presentaciones: [{ fecha: haceDias(12), titulo: 'Estatus corporativo · Junio 2026', tipo: 'mensual' }],
    minutas: [{ fecha: haceDias(12), titulo: 'UPAX · Corporativo Junio', enviadaA: 8 }],
  },
}

export function estadoDeSalas(): EstadoSala[] {
  return slugsDeSalas().map((slug) => {
    const tema = obtenerTema(slug)
    const c = CRUDO[slug] ?? {}
    return {
      slug,
      nombre: tema.nombre,
      color: tema.primario,
      diasDesdeUltima: c.diasDesdeUltima ?? null,
      ultimaSesion: c.diasDesdeUltima != null ? haceDias(c.diasDesdeUltima) : null,
      proximaSesion: c.proximaSesion ?? null,
      enPreparacion: c.enPreparacion ?? false,
      avancePreparacion: c.avancePreparacion,
      acuerdos: c.acuerdos ?? [],
      presentaciones: c.presentaciones ?? [],
      minutas: c.minutas ?? [],
      cadencia: c.cadencia ?? 'mensual',
    }
  })
}

export function estadoDeSala(slug: string): EstadoSala | undefined {
  return estadoDeSalas().find((s) => s.slug === slug)
}

// ---- Derivados para el hub ----

export function acuerdosAbiertos(s: EstadoSala): number {
  return s.acuerdos.filter((a) => a.estatus === 'abierto').length
}
export function acuerdosVencidos(s: EstadoSala): number {
  return s.acuerdos.filter((a) => a.estatus === 'vencido').length
}

/** Temperatura de atención: cuánto se ha desatendido la relación. */
export type Temperatura = 'reciente' | 'tibia' | 'fria'
export function temperatura(s: EstadoSala): Temperatura {
  if (s.diasDesdeUltima == null) return 'fria'
  const limite = s.cadencia === 'semanal' ? 10 : 35
  if (s.diasDesdeUltima <= (s.cadencia === 'semanal' ? 8 : 20)) return 'reciente'
  if (s.diasDesdeUltima <= limite) return 'tibia'
  return 'fria'
}

/** Orden del hub: primero lo que necesita atención (vencidos, luego frías, luego tibias). */
export function ordenarPorUrgencia(salas: EstadoSala[]): EstadoSala[] {
  const peso = (s: EstadoSala) => {
    const t = temperatura(s)
    return (
      acuerdosVencidos(s) * 100 +
      (t === 'fria' ? 40 : t === 'tibia' ? 20 : 0) +
      (s.diasDesdeUltima ?? 0)
    )
  }
  return [...salas].sort((a, b) => peso(b) - peso(a))
}

export interface AcuerdoEnRiesgo extends Acuerdo {
  salaSlug: string
  salaNombre: string
  salaColor: string
}

/** Todos los acuerdos vencidos o sin fecha, cruzando las 10 salas. */
export function acuerdosEnRiesgo(): AcuerdoEnRiesgo[] {
  const out: AcuerdoEnRiesgo[] = []
  for (const s of estadoDeSalas()) {
    for (const a of s.acuerdos) {
      if (a.estatus === 'vencido' || (a.estatus === 'abierto' && a.fechaCompromiso == null)) {
        out.push({ ...a, salaSlug: s.slug, salaNombre: s.nombre, salaColor: s.color })
      }
    }
  }
  // vencidos primero
  return out.sort((a, b) => (a.estatus === 'vencido' ? 0 : 1) - (b.estatus === 'vencido' ? 0 : 1))
}

export interface PulsoDelMes {
  salas: number
  sesionesUltimos30: number
  acuerdosAbiertos: number
  acuerdosVencidos: number
  salaMasDesatendida: { nombre: string; dias: number } | null
}

export function pulsoDelMes(): PulsoDelMes {
  const salas = estadoDeSalas()
  const sesionesUltimos30 = salas.filter((s) => s.diasDesdeUltima != null && s.diasDesdeUltima <= 30).length
  const abiertos = salas.reduce((n, s) => n + acuerdosAbiertos(s), 0)
  const vencidos = salas.reduce((n, s) => n + acuerdosVencidos(s), 0)
  const desatendida = salas
    .filter((s) => s.diasDesdeUltima != null)
    .sort((a, b) => (b.diasDesdeUltima ?? 0) - (a.diasDesdeUltima ?? 0))[0]
  return {
    salas: salas.length,
    sesionesUltimos30,
    acuerdosAbiertos: abiertos,
    acuerdosVencidos: vencidos,
    salaMasDesatendida: desatendida?.diasDesdeUltima != null
      ? { nombre: desatendida.nombre, dias: desatendida.diasDesdeUltima }
      : null,
  }
}
