/**
 * EL ESTADO DE LA RELACIÓN CON CADA SALA: tipos y lógica derivada.
 *
 * Aquí NO hay datos. Ni uno. Todo lo que la app enseña —acuerdos, sesiones,
 * minutas— sale de lo que el equipo creó en la propia app y vive en su base de
 * datos; si algo se borra ahí, desaparece de la app. Este módulo solo define
 * QUÉ es el estado de una sala y cómo se calculan sus derivados (temperatura,
 * urgencia, pulso del mes).
 *
 * Las diez salas sí son configuración: las 8 UDNs de Grupo UPAX + Ceci + el
 * corporativo. Son la estructura de la organización, no contenido, y viven en
 * `src/temas/`. Una sala sin actividad devuelve un estado VACÍO, que es la
 * verdad —nadie ha preparado nada todavía— y no un ejemplo inventado.
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
  /** Sesión de la que salió: es lo que permite abrirla desde la sala. */
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

/**
 * El estado de las diez salas, VACÍO.
 *
 * Es el camino de respaldo para cuando no hay base de datos configurada (dev
 * sin `DATABASE_URL`). Devuelve las salas que existen —eso es configuración—
 * pero sin una sola sesión, acuerdo ni minuta: sin base no hay nada guardado
 * que enseñar, y decir lo contrario sería inventarlo.
 *
 * Con base de datos, `src/db/consultas.ts` no llama a esto: consulta Postgres.
 */
export function estadoDeSalas(): EstadoSala[] {
  return slugsDeSalas().map((slug) => {
    const tema = obtenerTema(slug)
    return {
      slug,
      nombre: tema.nombre,
      color: tema.primario,
      diasDesdeUltima: null,
      ultimaSesion: null,
      proximaSesion: null,
      enPreparacion: false,
      acuerdos: [],
      presentaciones: [],
      minutas: [],
      cadencia: 'mensual',
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
