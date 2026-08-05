'use server'

/**
 * Server Actions de `/reuniones`: agendar y editar.
 *
 * MUDADAS TAL CUAL desde `src/app/agenda/page.tsx` (Tarea 13, ronda 10) a su
 * propio archivo `'use server'` — no reescritas. Viven aparte porque
 * `PanelAgenda` (`@/componentes/agenda/PanelAgenda`) es un Client Component
 * que las recibe como prop: declaradas dentro del cuerpo de una página,
 * React intenta serializar la función al cliente y revienta con "Functions
 * cannot be passed directly to Client Components" — el build no lo detecta,
 * solo se ve al usar la página. Un archivo `'use server'` aparte es la forma
 * que da la propia documentación de Next para este caso exacto (ver
 * node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md,
 * sección "Using Server Functions in a Client Component").
 */
import { revalidatePath } from 'next/cache'
import { crearReunionConDocumento } from '@/db/documentos'
import { editarReunion } from '@/db/reuniones'
import { exigirEditor } from '@/auth/roles'
import { instanteEnCDMX } from '@/lib/fecha'
import type { DatosFormulario } from '@/componentes/agenda/FormularioSesion'

/**
 * Día + hora del formulario → instante, anclado a CDMX (`instanteEnCDMX`,
 * src/lib/fecha.ts) y no a la zona del proceso: en Vercel el servidor corre
 * en UTC, así que "10:00" se guardaría como las cuatro de la mañana en
 * México. El default de "10:00" cuando no se especifica hora es una regla de
 * ESTA pantalla (una reunión sin hora se asume de mañana), no del helper
 * genérico, así que se queda aquí y no en fecha.ts.
 *
 * No exportada: un archivo `'use server'` exige que TODO lo exportado sea
 * una función async invocable como Server Function — esta es un helper
 * síncrono de uso interno, no una acción.
 */
function instanteDe(dia: string, hora: string): Date {
  return instanteEnCDMX(dia, hora || '10:00')
}

export async function agendarReunionAction(datos: DatosFormulario): Promise<{ error?: string }> {
  await exigirEditor()
  try {
    await crearReunionConDocumento({
      salaSlug: datos.salaSlug,
      tipo: datos.tipo,
      alcance: datos.alcance.trim() || 'todos',
      fecha: instanteDe(datos.dia, datos.hora),
      titulo: datos.titulo.trim(),
      participantes: datos.participantes.split(',').map((p) => p.trim()).filter(Boolean),
      lugar: datos.lugar.trim() || null,
      // Nace agendada — toda reunión nace así (`DatosDeReunion` no tiene
      // parámetro de estado, a diferencia de la vieja `DatosDeSesion`).
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo agendar la reunión.' }
  }
  revalidatePath('/reuniones')
  revalidatePath('/')
  return {}
}

export async function editarReunionAction(id: string, datos: DatosFormulario): Promise<{ error?: string }> {
  await exigirEditor()
  try {
    await editarReunion(id, {
      fecha: instanteDe(datos.dia, datos.hora),
      titulo: datos.titulo.trim(),
      tipo: datos.tipo,
      alcance: datos.alcance.trim() || 'todos',
      participantes: datos.participantes.split(',').map((p) => p.trim()).filter(Boolean),
      lugar: datos.lugar.trim() || null,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la reunión.' }
  }
  revalidatePath('/reuniones')
  revalidatePath('/')
  return {}
}
