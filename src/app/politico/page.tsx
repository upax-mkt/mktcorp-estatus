import { redirect } from 'next/navigation'
import { presentacionPorRutaVieja, rutaDePresentacion } from '@/presentaciones/registro'

// Dinámica a propósito: así redirige en el momento, igual que en desarrollo, en vez de quedar como página estática.
export const dynamic = 'force-dynamic'

/** `/politico` se mudó a la pestaña Estatus el 6-oct-2026 (reorganización del hub). La liga vieja sigue sirviendo. */
export default function PaginaPoliticoMudada() {
  const p = presentacionPorRutaVieja('/politico')
  redirect(p ? rutaDePresentacion(p) : '/estatus')
}
