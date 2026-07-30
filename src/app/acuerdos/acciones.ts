'use server'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'
import { existeElGrupo, crearElementoEnDelivery, crearSubelemento } from '@/monday/cliente'
import { pausarSala, reactivarSala, salaEstaActiva } from '@/db/salas'
import { editarAcuerdo } from '@/db/acuerdos'

/**
 * Las acciones de la bandeja. Todas empiezan comprobando la sesión: esto
 * escribe en el tablero de 950 elementos que usa el equipo entero, y ocultar un
 * botón no protege una acción.
 */
export async function subirAcuerdoAction(
  id: string,
  destino: { tipo: 'elemento' } | { tipo: 'subelemento'; padreId: string },
): Promise<void> {
  await exigirEquipo()
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
  await exigirEquipo()
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
 * "descartar", así que empieza igual que las otras dos — `exigirEquipo()`
 * antes de tocar nada.
 */
export async function editarEnBandejaAction(
  id: string,
  salaSlug: string,
  cambios: { que: string; responsable: string; responsableMondayId: string | null; fechaCompromiso: string | null },
): Promise<void> {
  await exigirEquipo()
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
 * `exigirEquipo()` y no `exigirEdicionDeAcuerdos(slug)`: destacar decide qué
 * se ve en una vitrina COMPARTIDA por las diez salas, no el estatus de un
 * compromiso dentro de la sala de su propio dueño. Es Mkt Corp quien cura esa
 * vitrina — el director de la UDN sigue pudiendo mover el estatus y la fecha
 * de los suyos, pero no auto-destacarse en el Home de todos.
 */
export async function destacarAction(id: string, destacado: boolean): Promise<void> {
  await exigirEquipo()
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
 * qué y el porqué. Aquí solo va EQUIPO, no `exigirEdicionDeAcuerdos`: decidir
 * si una relación comercial sigue activa es una decisión de Mkt Corp sobre el
 * cliente, distinta de mover el estatus de un compromiso puntual — que sí
 * puede tocar el propio director de la UDN.
 */
export async function pausarSalaAction(slug: string): Promise<void> {
  await exigirEquipo()
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
  await exigirEquipo()
  await reactivarSala(slug)
  revalidatePath(`/cliente/${slug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
}
