'use server'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirAdmin, exigirEditor } from '@/auth/roles'
import { existeElGrupo, crearElementoEnDelivery, crearSubelemento } from '@/monday/cliente'
import { pausarSala, reactivarSala, salaEstaActiva } from '@/db/salas'
import { editarAcuerdo, eliminarAcuerdo, moverEstatus, salaDeAcuerdo, type EstatusAcuerdo } from '@/db/acuerdos'
import { instanteEnCDMX } from '@/lib/fecha'

/**
 * Las acciones de la bandeja. Todas empiezan comprobando la sesión: esto
 * escribe en el tablero de 950 elementos que usa el equipo entero, y ocultar un
 * botón no protege una acción.
 */
export async function subirAcuerdoAction(
  id: string,
  destino: { tipo: 'elemento' } | { tipo: 'subelemento'; padreId: string },
): Promise<void> {
  await exigirEditor()
  if (!hayDB()) throw new Error('Sin base de datos no hay nada que subir.')

  // El grupo se comprueba ANTES de escribir. Es la lección del dashboard viejo:
  // lleva meses mandando elementos a un grupo que alguien borró, y nada avisa.
  // `existeElGrupo` devuelve además el título (revisión final de la ronda 7):
  // existir no es ser el correcto — quien confirma en la bandeja es quien lo
  // reconoce, esto solo asegura que HAY algo que reconocer.
  const { existe: grupoExiste } = await existeElGrupo()
  if (!grupoExiste) {
    throw new Error(
      `El grupo ${process.env.MONDAY_GRUPO ?? '(sin configurar)'} no existe en el tablero. No se sube nada hasta arreglarlo.`,
    )
  }

  /**
   * RECLAMA LA FILA ANTES DE LLAMAR A MONDAY, no después (revisión de Franco
   * a esta tarea).
   *
   * Antes, esto leía el acuerdo (SELECT), llamaba a Monday, y SOLO ENTONCES
   * marcaba `bandeja = 'subido'`. Con dos pestañas abiertas sobre el mismo
   * acuerdo, las dos leen `pendiente` antes de que ninguna escriba nada, y
   * las dos llaman a Monday: dos elementos para el mismo acuerdo en un
   * tablero que mira todo el equipo — justo lo que esta bandeja existe para
   * evitar.
   *
   * Este UPDATE con `WHERE bandeja = 'pendiente'` es la reclamación. Postgres
   * lo resuelve de forma atómica: de dos peticiones que lleguen a la vez,
   * solo una afecta una fila (y se lleva los datos frescos por RETURNING);
   * la otra afecta cero y se retira aquí mismo, SIN haber llamado a Monday.
   */
  const reclamada = (
    await db()
      .update(esquema.acuerdos)
      .set({ bandeja: 'subido', updatedAt: new Date() })
      .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'pendiente')))
      .returning({
        salaSlug: esquema.acuerdos.salaSlug,
        que: esquema.acuerdos.que,
        estatus: esquema.acuerdos.estatus,
        fechaCompromiso: esquema.acuerdos.fechaCompromiso,
        responsableMondayId: esquema.acuerdos.responsableMondayId,
      })
  )[0]

  if (!reclamada) {
    // No se reclamó: o el id no existe, o ya no estaba 'pendiente' (subido,
    // descartado, o ganado por otra pestaña justo ahora). Se distingue el
    // primer caso —merece un error explícito— del resto, que se retira en
    // silencio: es lo mismo que ya hacía este camino antes de esta revisión
    // ("ya subido o descartado: no se repite"), solo que ahora también cubre
    // "otra pestaña lo reclamó primero".
    const existe = (
      await db().select({ id: esquema.acuerdos.id }).from(esquema.acuerdos).where(eq(esquema.acuerdos.id, id))
    )[0]
    if (!existe) throw new Error(`Acuerdo no encontrado: "${id}"`)
    return
  }

  /**
   * EL FREEZE, FRESCO, JUSTO ANTES DE ESCRIBIR (corrección de la revisión
   * final de la ronda 7).
   *
   * `entraALaBandeja` (src/monday/bandeja.ts) ya excluye una sala en pausa de
   * la LECTURA (`acuerdosPendientesDeSubir` en src/db/acuerdos.ts), pero eso
   * solo protege el listado que se pintó al abrir la pantalla — una pestaña
   * abierta antes de pausar la sala seguía pudiendo pulsar "Subir" y llegar
   * hasta aquí. El diseño lo pide explícito (§7): "sala pausada con acuerdos
   * en la bandeja: se congelan también, no se pueden subir hasta reactivar".
   *
   * Se comprueba DESPUÉS de reclamar la fila —`reclamada.salaSlug` sale
   * gratis del RETURNING de arriba, sin una consulta aparte— y ANTES de
   * llamar a Monday, que es la escritura que hay que frenar. `salaEstaActiva`
   * (src/db/salas.ts) está escrita justo para esto: preguntar fresco, no
   * fiarse de un estado ya resuelto en el render. Si la sala se pausó justo
   * entre el reclamo y esta línea, se revierte la reclamación exactamente
   * igual que cuando Monday falla más abajo — nadie más pudo reclamarla
   * mientras tanto (bandeja ya no era 'pendiente'), así que devolverla no
   * arriesga un duplicado.
   */
  if (!(await salaEstaActiva(reclamada.salaSlug))) {
    await db()
      .update(esquema.acuerdos)
      .set({ bandeja: 'pendiente', updatedAt: new Date() })
      .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'subido')))
    throw new Error('Esta sala está en pausa: sus acuerdos están congelados y no se pueden subir hasta reactivarla.')
  }

  const datos = {
    salaSlug: reclamada.salaSlug,
    que: reclamada.que,
    estatus: reclamada.estatus,
    fechaCompromiso: reclamada.fechaCompromiso
      ? reclamada.fechaCompromiso.toISOString().slice(0, 10)
      : null,
    responsableMondayId: reclamada.responsableMondayId,
  }

  let creado: { id: string; url: string }
  try {
    creado =
      destino.tipo === 'subelemento'
        ? await crearSubelemento(destino.padreId, datos)
        : await crearElementoEnDelivery(datos)
  } catch (error) {
    // Monday NO confirmó nada: es seguro devolver la fila a 'pendiente' para
    // que se pueda reintentar sin miedo a duplicar.
    await db()
      .update(esquema.acuerdos)
      .set({ bandeja: 'pendiente', updatedAt: new Date() })
      .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'subido')))
    throw error
  }

  /**
   * A PARTIR DE AQUÍ MONDAY YA CONFIRMÓ que el elemento existe. Si el UPDATE
   * de abajo fallara (la base cae, el proceso muere a mitad), a propósito NO
   * se revierte `bandeja` a 'pendiente': hacerlo dejaría reintentar y crear
   * un SEGUNDO elemento en Monday para el mismo acuerdo — el mismo duplicado
   * que toda esta reclamación existe para evitar, solo que disparado por un
   * fallo de escritura en vez de un doble clic.
   *
   * La fila se queda `bandeja = 'subido'` con `monday_id` nulo. Es un estado
   * raro pero DETECTABLE (`bandeja = 'subido' AND monday_id IS NULL`) y
   * arreglable desde la app; un elemento duplicado en un tablero de 950
   * filas que mira todo el equipo lo tiene que limpiar a mano alguien que ni
   * sabe que esta app existe. Entre un estado raro visible y un duplicado
   * invisible, se elige el primero — decisión del coordinador de esta ronda
   * al revisar esta tarea, PENDIENTE de que Franco la confirme cuando se le
   * presente la rama (corrección de atribución: esto NO lo decidió Franco).
   * No lo "simplifiques" quitando el guardado en dos pasos.
   */
  await db()
    .update(esquema.acuerdos)
    .set({
      mondayId: creado.id,
      mondayTipo: destino.tipo,
      mondayUrl: creado.url,
      mondaySincronizadoEn: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(esquema.acuerdos.id, id))

  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/acuerdos')
  revalidatePath(`/cliente/${reclamada.salaSlug}`)
}

export async function descartarAcuerdoAction(id: string): Promise<void> {
  await exigirEditor()
  if (!hayDB()) return
  // Descartar es definitivo: no borra el acuerdo, lo saca de la bandeja para
  // siempre. Si volviera a ofrecerse al editarlo, la bandeja sería una lista
  // que reaparece, y nadie confía en una lista que reaparece.
  //
  // El WHERE exige `bandeja = 'pendiente'`, igual que la reclamación de
  // arriba (revisión de Franco): sin esto, una pestaña vieja podía descartar
  // un acuerdo que OTRA pestaña ya había subido de verdad, dejando una fila
  // con `mondayId`/`mondayUrl` reales pero `bandeja = 'descartado'` —
  // mintiendo sobre qué pasó, porque `bandeja` es la única fuente de verdad
  // de ese estado (ver src/monday/bandeja.ts) y no puede decir dos cosas a
  // la vez.
  await db()
    .update(esquema.acuerdos)
    .set({ bandeja: 'descartado', updatedAt: new Date() })
    .where(and(eq(esquema.acuerdos.id, id), eq(esquema.acuerdos.bandeja, 'pendiente')))
  revalidatePath('/acuerdos/bandeja')
}

// ---- Editar ahí mismo, en la bandeja (revisión final de la ronda 7, punto 8) ----

/**
 * Edita el acuerdo, su responsable o su fecha SIN salir de la bandeja.
 *
 * El diseño lo pide (§3, la bandeja): "El acuerdo, su responsable y su
 * fecha, editables ahí mismo." Es el ÚLTIMO punto donde alguien puede
 * corregir un nombre que la transcripción se comió o una fecha mal
 * detectada ANTES de que aparezca en el tablero de 950 elementos que mira
 * todo el equipo — después de subir, ya no (subir/descartar exigen
 * `bandeja = 'pendiente'`, así que un acuerdo ya subido no se puede tocar
 * desde aquí; sí desde su sala, con `AcuerdoControles`).
 *
 * Reusa `editarAcuerdo` (src/db/acuerdos.ts) tal cual — no reimplementa
 * nada: ya sabe recalcular la bandeja si el responsable cambia
 * (`bandejaTrasEditar` — si la corrección revela que en realidad es alguien
 * de la UDN, el acuerdo SALE de la bandeja solo, que es lo correcto) y ya
 * deja rastro en la historia. Lo único nuevo aquí es la guarda de sesión: es
 * la primera acción de escritura de la bandeja que no es ni "subir" ni
 * "descartar", así que empieza igual que las otras dos — `exigirEditor()`
 * antes de tocar nada.
 */
export async function editarEnBandejaAction(
  id: string,
  salaSlug: string,
  cambios: { que: string; responsable: string; responsableMondayId: string | null; fechaCompromiso: string | null },
): Promise<void> {
  await exigirEditor()

  /**
   * LA CONDICIÓN QUE LE FALTABA (corrección de revisión): esta edición solo
   * vale mientras el acuerdo sigue `bandeja = 'pendiente'` — igual que
   * `subirAcuerdoAction`/`descartarAcuerdoAction`, que sí llevan esa
   * condición en su `WHERE`. Sin esto, el párrafo de arriba ("un acuerdo ya
   * subido no se puede tocar desde aquí") era falso: se podía seguir
   * editando un acuerdo YA SUBIDO, y su fecha llegaría a Monday por
   * `sincronizarDespuesDeEditar` (dentro de `editarAcuerdo`) aunque ya no
   * fuera asunto de la bandeja.
   *
   * No hace falta reclamar la fila como `subirAcuerdoAction` (no hay un
   * segundo efecto —crear en Monday— que duplicar aquí, así que no hace
   * falta la atomicidad de un UPDATE...WHERE): basta con leer el estado
   * actual ANTES de delegar en `editarAcuerdo`, que sigue intacto —
   * `editarEnBandejaAction` no reimplementa su lógica, solo decide si lo
   * llama. Si el id no existe, se deja pasar igual: `editarAcuerdo` ya
   * lanza su propio "Acuerdo no encontrado".
   */
  if (hayDB()) {
    const fila = (
      await db()
        .select({ bandeja: esquema.acuerdos.bandeja })
        .from(esquema.acuerdos)
        .where(eq(esquema.acuerdos.id, id))
    )[0]
    if (fila && fila.bandeja !== 'pendiente') return
  }

  await editarAcuerdo(id, {
    que: cambios.que,
    responsable: cambios.responsable,
    responsableMondayId: cambios.responsableMondayId,
    fechaCompromiso: cambios.fechaCompromiso ? new Date(cambios.fechaCompromiso) : null,
  })
  // Las tres pantallas donde este acuerdo puede aparecer: la bandeja misma,
  // el espacio de acuerdos (mismo `que`/fecha si ya se ve ahí) y su sala.
  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/acuerdos')
  revalidatePath(`/cliente/${salaSlug}`)
}

// ---- La estrella (tarea 11, ronda 7) ----

/**
 * Marca o quita un acuerdo de los destacados: los pocos que se ven en el
 * Home, cruzando las diez salas. Es la ÚNICA acción detrás de la estrella —
 * `Estrella.tsx` no sabe nada de Drizzle, solo recibe esta función por prop—
 * así que el mismo botón sirve en el espacio de acuerdos, el Home y la sala
 * (tarea 12) sin que ninguna pantalla reimplemente la regla por su cuenta.
 *
 * `exigirEditor()` y no `exigirEdicionDeAcuerdos(slug)`: destacar decide qué
 * se ve en una vitrina COMPARTIDA por las diez salas, no el estatus de un
 * compromiso dentro de la sala de su propio dueño. Es Mkt Corp quien cura esa
 * vitrina — el director de la UDN sigue pudiendo mover el estatus y la fecha
 * de los suyos, pero no auto-destacarse en el Home de todos.
 */
export async function destacarAction(id: string, destacado: boolean): Promise<void> {
  await exigirEditor()
  // Sin DB no hay nada que persistir — mismo criterio que todosLosAcuerdos()
  // en src/db/consultas.ts, que en ese caso ya devuelve la lista vacía.
  if (!hayDB()) return

  const fila = (
    await db()
      .update(esquema.acuerdos)
      .set({ destacado, updatedAt: new Date() })
      .where(eq(esquema.acuerdos.id, id))
      .returning({ salaSlug: esquema.acuerdos.salaSlug })
  )[0]
  if (!fila) throw new Error(`Acuerdo no encontrado: "${id}"`)

  // Las tres pantallas donde se puede ver o tocar la estrella hoy y mañana:
  // este espacio, el Home (tarea 12) y la propia sala.
  revalidatePath('/acuerdos')
  revalidatePath('/')
  revalidatePath(`/cliente/${fila.salaSlug}`)
}

// ---- El freeze de salas (tarea 12, ronda 7) ----

/**
 * Pausa una sala — ver la cabecera de `pausarSala` (src/db/salas.ts) para el
 * qué y el porqué. Aquí no va `exigirEdicionDeAcuerdos`: decidir si una
 * relación comercial sigue activa es una decisión de Mkt Corp sobre el
 * cliente, distinta de mover el estatus de un compromiso puntual — que sí
 * puede tocar el propio director de la UDN.
 *
 * `exigirAdmin()` y no `exigirEditor()` (ronda 9, tarea 2 — no está en la
 * tabla del brief tal cual, así que queda dicho aquí): congelar o reactivar
 * una sala cambia su fila en `salas` igual que crearla o editarla, y es una
 * decisión sobre la relación comercial con el cliente, no una tarea de
 * contenido del día a día — el mismo nivel que crear/editar salas y marcas.
 */
export async function pausarSalaAction(slug: string): Promise<void> {
  await exigirAdmin()
  await pausarSala(slug)
  // Las cuatro pantallas que un freeze cambia: la propia sala (el
  // interruptor y el aviso), el Home (el bloque "En pausa" y los acuerdos que
  // dejan de contar), el espacio de acuerdos (el bloque "Congelados") y la
  // bandeja (sus pendientes dejan de ofrecerse — ver `entraALaBandeja`).
  revalidatePath(`/cliente/${slug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
}

/** Reactiva una sala — ver la cabecera de `reactivarSala` (src/db/salas.ts). */
export async function reactivarSalaAction(slug: string): Promise<void> {
  await exigirAdmin()
  await reactivarSala(slug)
  revalidatePath(`/cliente/${slug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
}

// ---- Corregir y eliminar desde la pestaña de acuerdos (ronda 13) ----

/**
 * CORREGIR UN ACUERDO DESDE `/acuerdos`, sin entrar a su sala.
 *
 * Franco (13-ago): *"hay acuerdos que no tienen responsable, y no los puedo
 * editar ni la persona ni el equipo (UDN o Squads de mkt)"*. La pantalla que
 * cruza las nueve salas —la única donde se ven juntos los que están sin
 * dueño— era de solo lectura: para ponerle responsable a uno había que
 * abrir su sala, y para repartir cinco, cinco salas.
 *
 * Es la MISMA edición que hace la sala (`editarAcuerdo` en src/db/acuerdos.ts,
 * que ya recalcula la bandeja si el responsable cambia y sincroniza con
 * Monday cuando toca): aquí no se reimplementa nada, solo cambia desde dónde
 * se llama. Y `exigirEditor()` como allá — corregir el texto de un acuerdo es
 * trabajo de equipo, no una decisión de administración.
 *
 * La sala a revalidar se PREGUNTA a la base (`salaDeAcuerdo`) en vez de
 * viajar desde el cliente: esta pantalla es de todas las salas, y un slug que
 * llega por parámetro es un slug que alguien puede cambiar.
 */
export async function editarAcuerdoEnTablaAction(
  acuerdoId: string,
  cambios: { que: string; responsable: string; responsableMondayId: string | null },
): Promise<{ error?: string }> {
  await exigirEditor()
  try {
    await editarAcuerdo(acuerdoId, cambios)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar' }
  }
  await revalidarAcuerdo(acuerdoId)
  return {}
}

/**
 * ELIMINAR UN ACUERDO DESDE `/acuerdos`. Franco: *"como administrador debo
 * poder eliminar acuerdos desde la pestaña acuerdos"*.
 *
 * `exigirAdmin()` y no `exigirEditor()`, que es lo que pide la MISMA acción
 * dentro de una sala. La diferencia es el alcance de la pantalla: en la sala
 * se borra un acuerdo mirando el contexto de esa UDN; aquí están los de las
 * nueve juntos, filtrables, y el borrado es un DELETE sin papelera. Es
 * también lo que pidió Franco con todas las letras ("como administrador"), y
 * conceder de menos se corrige en una línea — conceder de más lo paga alguien
 * que pierde un compromiso que no era suyo.
 */
export async function eliminarAcuerdoEnTablaAction(acuerdoId: string): Promise<void> {
  await exigirAdmin()
  // El slug se lee ANTES de borrar: después, la fila ya no está y no habría a
  // qué sala revalidar — la vería con el acuerdo aún puesto hasta que algo
  // más la tocara.
  const slug = await salaDeAcuerdo(acuerdoId)
  await eliminarAcuerdo(acuerdoId)
  revalidarPantallasDeAcuerdos(slug)
}

// ---- Estatus y fecha desde la pestaña de acuerdos (ronda 14, tarea 2) ----

/**
 * CAMBIAR EL ESTADO DE UN ACUERDO DESDE `/acuerdos`.
 *
 * `exigirEditor()` y no `exigirAdmin()`: corregir el estado es trabajo de
 * equipo, igual que corregir el texto (`editarAcuerdoEnTablaAction`). Solo
 * ELIMINAR pide admin en esta pantalla, y por un motivo distinto — es un
 * DELETE sin papelera sobre las nueve salas a la vez.
 */
export async function cambiarEstatusEnTablaAction(
  acuerdoId: string,
  estatus: EstatusAcuerdo,
): Promise<void> {
  await exigirEditor()
  await moverEstatus(acuerdoId, estatus)
  await revalidarAcuerdo(acuerdoId)
}

/**
 * LA FECHA COMPROMISO, DESDE `/acuerdos`.
 *
 * `null` no es un fallo de validación: "sin fecha" es un estado legítimo y la
 * app ya lo pinta como tal ("sin fecha"), además de ordenarlo aparte — lo
 * abierto sin fecha va al final de lo vivo (`dominio/orden-acuerdos.ts`).
 * Vaciar el campo tiene que poder significar eso, o no habría forma de
 * deshacer una fecha puesta por error.
 *
 * `instanteEnCDMX` y NO `new Date(fecha)`: `fechaCompromiso` es un `Date` y
 * `new Date('2026-09-01')` es medianoche UTC — las 18:00 del 31 de agosto en
 * México, así que el acuerdo se guardaría con un día de menos. Medido para
 * esta tarea (sin tocar la base): `new Date('2026-09-01')` da
 * `diaCivil` = "2026-08-31"; `instanteEnCDMX('2026-09-01', '12:00')` da
 * "2026-09-01", que es lo correcto. Las 12:00 y no las 00:00: un mediodía
 * civil no cambia de día por ningún desfase de zona ni por el horario de
 * verano.
 */
export async function editarFechaEnTablaAction(
  acuerdoId: string,
  fecha: string | null,
): Promise<void> {
  await exigirEditor()
  await editarAcuerdo(acuerdoId, {
    fechaCompromiso: fecha ? instanteEnCDMX(fecha, '12:00') : null,
  })
  await revalidarAcuerdo(acuerdoId)
}

/** Las cuatro pantallas donde un acuerdo puede estar, más su sala. */
async function revalidarAcuerdo(acuerdoId: string): Promise<void> {
  revalidarPantallasDeAcuerdos(await salaDeAcuerdo(acuerdoId))
}

function revalidarPantallasDeAcuerdos(slug: string | null): void {
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
  revalidatePath('/')
  if (slug) revalidatePath(`/cliente/${slug}`)
}
