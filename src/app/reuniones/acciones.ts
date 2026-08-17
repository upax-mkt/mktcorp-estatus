'use server'

/**
 * Server Actions de `/reuniones`: agendar, editar, y (tarea 18) el ciclo de
 * confirmación — marcar una reunión dada, marcarla no dada, deshacer esa
 * marca.
 *
 * agendar/editar MUDADAS TAL CUAL desde `src/app/agenda/page.tsx` (Tarea 13,
 * ronda 10) a su propio archivo `'use server'` — no reescritas. Las tres de
 * la tarea 18 son la MISMA implementación que ya usa `src/app/page.tsx`
 * (Home) para su propio módulo "Por confirmar" — copiada, no importada:
 * cada `page.tsx` sigue declarando las suyas, mismo criterio de este archivo
 * frente a las acciones (distintas) de `/agenda`.
 *
 * Todas viven aparte porque `PanelAgenda`/`ReunionesPorConfirmar` son Client
 * Components que las reciben como prop: declaradas dentro del cuerpo de una
 * página, React intenta serializar la función al cliente y revienta con
 * "Functions cannot be passed directly to Client Components" — el build no
 * lo detecta, solo se ve al usar la página. Un archivo `'use server'` aparte
 * es la forma que da la propia documentación de Next para este caso exacto
 * (ver
 * node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md,
 * sección "Using Server Functions in a Client Component").
 */
import { revalidatePath } from 'next/cache'
import { tituloPorDefecto } from '@/db/documentos'
import { crearReunion, editarReunion, marcarDada, marcarNoDada, desmarcarNoDada } from '@/db/reuniones'
import { slugsDeSalas } from '@/db/temas'
import { exigirEditor } from '@/auth/roles'
import { instanteEnCDMX } from '@/lib/fecha'
import { registrarEdicion } from '@/db/participacion'
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
  /**
   * `salaSlug` LLEGA CRUDO DEL FORMULARIO (hallazgo 4b, revisión final de la
   * ronda 10): `crearReunion` (`src/db/reuniones.ts`) solo lo comprueba SI
   * ES TRUTHY (`datos.salaSlug &&`) — una cadena vacía se cuela hasta ahí,
   * revienta contra la clave ajena de Postgres, y el `catch` de aquí abajo
   * devolvía ese mensaje crudo a la pantalla. `src/app/deck/nueva/page.tsx`
   * ya valida así (`!salaSlug || !slugsDeSalas().includes(salaSlug)`) —
   * misma línea, copiada aquí.
   */
  if (!datos.salaSlug || !(await slugsDeSalas()).includes(datos.salaSlug)) {
    return { error: `Elige una sala válida (recibido: "${datos.salaSlug}")` }
  }
  try {
    // AGENDAR NO ES EMPEZAR EL DECK. Esto llamaba a
    // `crearReunionConDocumento`, igual que el botón de la sala antes de que
    // Franco pidiera separarlos (*"debería ser crear reunión; una vez que la
    // creo debo decidir si la creo con el editor o cargar un archivo ya
    // creado"*). Se cambia aquí también para que agendar signifique lo mismo
    // en las dos pantallas: si no, una junta agendada desde el calendario
    // saldría en su sala como "a medio armar" y una agendada desde la sala
    // como "sin presentación todavía", por el mismo gesto.
    //
    // PLANTILLA (tarea 3, ronda 14): este formulario ya pregunta qué junta
    // es (`FormularioSesion`, el desplegable "¿Qué junta es?") — antes no lo
    // hacía, y era la causa medible de que 6 de 14 reuniones nacieran sin
    // clase. `''` ("Sin clasificar" en la pantalla) se manda como `null`,
    // igual que `lugar` dos líneas abajo: el `<select>` no tiene `null`, la
    // base sí.
    await crearReunion({
      salaSlug: datos.salaSlug,
      tipo: datos.tipo,
      alcance: datos.alcance.trim() || 'todos',
      fecha: instanteDe(datos.dia, datos.hora),
      titulo: datos.titulo.trim() || tituloPorDefecto(datos.tipo, instanteDe(datos.dia, datos.hora)),
      participantes: datos.participantes.split(',').map((p) => p.trim()).filter(Boolean),
      lugar: datos.lugar.trim() || null,
      plantilla: datos.plantilla || null,
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
      /**
       * PLANTILLA (tarea 4, ronda 14): `editarReunion` ya admite `plantilla`
       * (`Omit<Partial<DatosDeReunion>, 'salaSlug'>`, `src/db/reuniones.ts`)
       * — solo faltaba pasarla. `datos.plantilla` es lo que trae el
       * `<select>` de `FormularioSesion` en ESTE envío concreto, tal cual —
       * si la junta no tenía clase y nadie tocó el desplegable, sigue
       * llegando `''` aquí (no la clase por defecto: ver `plantillaInicial`
       * en `FormularioSesion.tsx`), y `'' || null` es `null`: la junta sigue
       * sin clase después de guardar. Esta línea NUNCA inventa una clase que
       * el formulario no mandó — es la garantía de que editar el lugar de
       * una junta sin clasificar no la clasifica de rebote.
       */
      plantilla: datos.plantilla || null,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la reunión.' }
  }
  revalidatePath('/reuniones')
  revalidatePath('/')
  return {}
}

/**
 * EL MÓDULO "POR CONFIRMAR" (tarea 18), copiado del Home (`src/app/page.tsx`)
 * sin cambios de comportamiento: el botón de marcar presentada estaba
 * enterrado —solo se llegaba entrando al editor y abriendo el documento—, así
 * que de siete reuniones dadas solo una se marcó a mano. Vive donde SE VE la
 * reunión: el Home, la vista de sala, y ahora también aquí, la pestaña del
 * ciclo de vida entero.
 *
 * Junto al "sí" vive el "no" (`marcarNoDadaAction`) — la reunión se canceló o
 * se pospuso — porque son la misma pregunta en las dos direcciones.
 *
 * Las tres exigen editor primero y quedan enganchadas a `registrarEdicion`
 * (`src/db/participacion.ts`), que NUNCA propaga un fallo suyo — mismo patrón
 * que el Home y que `marcarPresentadaAction` en
 * `src/app/deck/[id]/documento/page.tsx`.
 */
export async function marcarPresentadaAction(reunionId: string): Promise<void> {
  const quien = await exigirEditor()
  await marcarDada(reunionId)
  if (quien.sub) await registrarEdicion(reunionId, quien.sub)
  revalidatePath('/reuniones')
  revalidatePath('/')
}

export async function marcarNoDadaAction(reunionId: string): Promise<void> {
  const quien = await exigirEditor()
  await marcarNoDada(reunionId)
  if (quien.sub) await registrarEdicion(reunionId, quien.sub)
  revalidatePath('/reuniones')
  revalidatePath('/')
}

export async function desmarcarNoDadaAction(reunionId: string): Promise<void> {
  const quien = await exigirEditor()
  await desmarcarNoDada(reunionId)
  if (quien.sub) await registrarEdicion(reunionId, quien.sub)
  revalidatePath('/reuniones')
  revalidatePath('/')
}
