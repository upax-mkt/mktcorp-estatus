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
  /**
   * El texto de la minuta, para leerla SIN salir de la sala.
   *
   * Antes la sala solo llevaba a `/preparar/{id}/minuta`, que es la pantalla
   * de edición del equipo: un director al que se le comparte su sala no puede
   * entrar ahí, así que su lista de minutas no llevaba a ninguna parte.
   */
  texto?: string
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
  /** La sesión que se está preparando, para poder ir directo a ella. */
  sesionEnPreparacionId?: string
  /**
   * Cuántas secciones lleva escritas y cuántas tiene.
   *
   * Es lo que hace VISIBLE el borrador colaborativo: varias personas llenan
   * secciones distintas de la misma sesión y el hub lo enseña en crudo — "5
   * de 14" dice más que una barra al 36%.
   */
  seccionesEscritas?: number
  seccionesTotales?: number
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

/**
 * El estatus REAL de un acuerdo hoy.
 *
 * `vencido` no es un evento que alguien registra: es lo que le pasa a un
 * acuerdo abierto cuando su fecha queda atrás. Guardado en la base nunca se
 * actualizaba —nadie recorre la tabla cada noche— así que un compromiso de
 * hace dos semanas seguía diciendo "abierto" y el hub anunciaba cero
 * vencidos con tres encima de la mesa. Justo lo que esta pantalla existe
 * para evitar.
 *
 * Se deriva al LEER, que es donde el paso del tiempo se nota.
 */
export function estatusVigente(
  a: Pick<Acuerdo, 'estatus' | 'fechaCompromiso'>,
  hoy: string,
): EstatusAcuerdo {
  if (a.estatus !== 'abierto') return a.estatus
  if (!a.fechaCompromiso) return 'abierto'
  return a.fechaCompromiso < hoy ? 'vencido' : 'abierto'
}

/** Una sesión ya presentada de la que todavía se puede levantar minuta. */
export interface SesionMinutable {
  id: string
  titulo: string
  fecha: string // ISO
}

/**
 * De qué sesiones falta minuta: las que ya sucedieron y no tienen una.
 *
 * Se deriva de lo que la sala ya sabe en vez de preguntarlo a la base: una
 * sesión con minuta aparece en las dos listas, así que lo que falta es la
 * diferencia. Las presentaciones sin `sesionId` quedan fuera — no hay
 * sesión detrás a la que colgar nada.
 */
export function sesionesSinMinuta(s: EstadoSala): SesionMinutable[] {
  const conMinuta = new Set(s.minutas.map((m) => m.sesionId).filter(Boolean))
  return s.presentaciones
    .filter((p) => p.sesionId != null && !conMinuta.has(p.sesionId))
    .map((p) => ({ id: p.sesionId!, titulo: p.titulo, fecha: p.fecha }))
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
  /** `dias: null` = nunca ha tenido sesión, que es lo más desatendido que hay. */
  salaMasDesatendida: { nombre: string; dias: number | null } | null
}

/**
 * La sala que más necesita atención, o ninguna si todas están al día.
 *
 * Dos cosas que hacía mal antes:
 *
 * 1. Descartaba las salas que NUNCA han tenido sesión (`diasDesdeUltima ==
 *    null`), que son precisamente las más desatendidas.
 * 2. Anunciaba una aunque estuviera al día: con una sola sala con historial,
 *    el hub decía "más desatendida: Mexa Creativa · 0 d" — la que tuvo sesión
 *    HOY.
 *
 * El criterio es la temperatura, que ya sabe la cadencia acordada de cada
 * sala: mensual y semanal no se desatienden al mismo ritmo.
 */
export function salaMasDesatendida(salas: EstadoSala[]): { nombre: string; dias: number | null } | null {
  const candidatas = salas.filter((s) => temperatura(s) !== 'reciente')
  if (candidatas.length === 0) return null
  const peor = [...candidatas].sort(
    (a, b) => (b.diasDesdeUltima ?? Infinity) - (a.diasDesdeUltima ?? Infinity),
  )[0]
  return { nombre: peor.nombre, dias: peor.diasDesdeUltima }
}

export function pulsoDelMes(): PulsoDelMes {
  const salas = estadoDeSalas()
  const sesionesUltimos30 = salas.filter((s) => s.diasDesdeUltima != null && s.diasDesdeUltima <= 30).length
  const abiertos = salas.reduce((n, s) => n + acuerdosAbiertos(s), 0)
  const vencidos = salas.reduce((n, s) => n + acuerdosVencidos(s), 0)
  return {
    salas: salas.length,
    sesionesUltimos30,
    acuerdosAbiertos: abiertos,
    acuerdosVencidos: vencidos,
    salaMasDesatendida: salaMasDesatendida(salas),
  }
}

/**
 * UNA REUNIÓN: lo que se presentó y lo que se acordó, juntos.
 *
 * Franco: "el módulo Presentaciones y minutas creo que debe ser uno, así la
 * presentación está asociada a una minuta, es decir a una reunión".
 *
 * Tiene razón y el modelo ya lo decía: presentación y minuta cuelgan de la
 * MISMA `sesionId`. Lo que estaba partido era la pantalla — dos listas
 * paralelas, cada una ordenada por su cuenta, y para saber qué se acordó en la
 * presentación de mayo había que buscar mayo dos veces.
 *
 * Aquí se unen por la sesión de la que salieron. El caso raro también existe y
 * no se esconde: una minuta cargada a mano sin presentación (una reunión que
 * se dio antes de esta herramienta) es una reunión igual, sin documento.
 */
export interface Reunion {
  /** La sesión. Es la identidad de la reunión. */
  sesionId?: string
  fecha: string // ISO
  titulo: string
  /** El documento que se presentó, si se armó en la app. */
  presentacion?: Presentacion
  /** Lo que se acordó, si ya se levantó. */
  minuta?: Minuta
}

/**
 * Las reuniones de una sala, de la más reciente a la más antigua.
 *
 * Una presentación y una minuta de la misma sesión son UNA reunión. Lo que no
 * tiene `sesionId` —los datos que llegaron sin ella— no se puede emparejar con
 * nada, así que va suelto en vez de emparejarse por fecha: coincidir en el día
 * no significa ser la misma reunión, y una sala puede tener dos el mismo día.
 */
export function reunionesDeSala(
  presentaciones: Presentacion[],
  minutas: Minuta[],
): Reunion[] {
  const porSesion = new Map<string, Reunion>()
  const sueltas: Reunion[] = []

  for (const p of presentaciones) {
    const r: Reunion = { sesionId: p.sesionId, fecha: p.fecha, titulo: p.titulo, presentacion: p }
    if (p.sesionId) porSesion.set(p.sesionId, r)
    else sueltas.push(r)
  }

  for (const m of minutas) {
    const existente = m.sesionId ? porSesion.get(m.sesionId) : undefined
    if (existente) {
      existente.minuta = m
      continue
    }
    const r: Reunion = { sesionId: m.sesionId, fecha: m.fecha, titulo: m.titulo, minuta: m }
    if (m.sesionId) porSesion.set(m.sesionId, r)
    else sueltas.push(r)
  }

  return [...porSesion.values(), ...sueltas].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Reuniones que se presentaron y siguen sin minuta. */
export function reunionesSinMinuta(reuniones: Reunion[]): Reunion[] {
  return reuniones.filter((r) => r.presentacion && !r.minuta)
}
