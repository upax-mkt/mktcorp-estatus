/**
 * LAS PRESENTACIONES WEB HECHAS A MANO, en un solo lugar (reorganización del hub, 6-oct-2026).
 *
 * Hasta esa fecha cada una se sumaba como pestaña de la barra (Político, Estatus Q3) o se quedaba sin ninguna (la de
 * Research Land), y todas vivían sueltas en la raíz. Franco: cada presentación vive con su cliente. Los estatus de
 * grupo van a la pestaña Estatus (`/estatus`); la de una UDN, dentro de su sala.
 *
 * Solo datos, sin componentes: lo leen la página Estatus, la sala, `/deck`, las redirecciones y los tests. Una
 * presentación nueva se da de alta aquí y en su página; no lleva pestaña propia.
 * Diseño: `docs/superpowers/specs/2026-10-06-reorganizacion-del-hub-design.md`.
 */

export type LugarDePresentacion = { tipo: 'estatus' } | { tipo: 'sala'; sala: string }

export interface PresentacionWeb {
  /** Segmento de la URL. No se cambia una vez publicado: hay ligas compartidas. */
  id: string
  titulo: string
  /** Una línea: de qué es. Sale de la propia portada. */
  bajada: string
  /** Día civil (AAAA-MM-DD) que lleva la portada. */
  fecha: string
  lugar: LugarDePresentacion
  /**
   * Si quien llega desde la sala tiene que escribir una clave: el NOMBRE de la variable de entorno que la guarda
   * (vive en Vercel, nunca en el repo). El equipo nunca la escribe. Sin la variable, nadie entra por clave.
   */
  claveEnv?: string
  /** Ruta de antes de la reorganización: redirige aquí, para que las ligas viejas sigan sirviendo. */
  rutaVieja?: string
}

export const PRESENTACIONES: readonly PresentacionWeb[] = [
  {
    id: 'q3-2026',
    titulo: 'Estatus Q3 2026',
    bajada: 'Marketing Corporativo · balance Q3 y agenda Q4',
    fecha: '2026-10-02',
    lugar: { tipo: 'estatus' },
  },
  {
    id: 'politico-electoral',
    titulo: 'Oportunidades político-electorales',
    bajada: 'Vertical político-electoral · estatus de agosto y septiembre, corte al 30 de septiembre',
    fecha: '2026-09-30',
    lugar: { tipo: 'estatus' },
    rutaVieja: '/politico',
  },
  {
    id: 'nueva-estructura-comercial-2027',
    titulo: 'Nueva estructura comercial 2027',
    bajada: 'Cuatro puestos, un journey con dueño en cada paso y las personas para ocuparlos',
    fecha: '2026-10-06',
    lugar: { tipo: 'sala', sala: 'research-land' },
    claveEnv: 'CLAVE_PRESENTACION_RL',
    rutaVieja: '/rl-comercial',
  },
]

export function rutaDePresentacion(p: PresentacionWeb): string {
  return p.lugar.tipo === 'estatus' ? `/estatus/${p.id}` : `/cliente/${p.lugar.sala}/presentaciones/${p.id}`
}

const masReciente = (a: PresentacionWeb, b: PresentacionWeb) => b.fecha.localeCompare(a.fecha)

/** Los estatus de grupo, el más reciente primero. */
export function estatusDeGrupo(): PresentacionWeb[] {
  return PRESENTACIONES.filter((p) => p.lugar.tipo === 'estatus').sort(masReciente)
}

/** Las presentaciones que viven en una sala, la más reciente primero. */
export function presentacionesDeSala(sala: string): PresentacionWeb[] {
  return PRESENTACIONES.filter((p) => p.lugar.tipo === 'sala' && p.lugar.sala === sala).sort(masReciente)
}

export function presentacionDeSala(sala: string, id: string): PresentacionWeb | undefined {
  return presentacionesDeSala(sala).find((p) => p.id === id)
}

export function estatusPorId(id: string): PresentacionWeb | undefined {
  return estatusDeGrupo().find((p) => p.id === id)
}

/** La presentación que antes vivía en `ruta` (antes de la reorganización), para redirigir la liga vieja. */
export function presentacionPorRutaVieja(ruta: string): PresentacionWeb | undefined {
  return PRESENTACIONES.find((p) => p.rutaVieja === ruta)
}
