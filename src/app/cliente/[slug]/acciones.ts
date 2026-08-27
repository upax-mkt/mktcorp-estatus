'use server'

/**
 * LAS ACCIONES DE LA SALA DE UN CLIENTE.
 *
 * Vivían dentro de `page.tsx`, las veintitrés, declaradas en el cuerpo del
 * componente para poder capturar `slug` del scope. Eso hacía de esa página el
 * archivo más grande del repo con diferencia —1.868 líneas, el doble que el
 * siguiente— y mezclaba en un mismo sitio lo que se PINTA con lo que se
 * EJECUTA. Aquí solo hay lo segundo.
 *
 * Es el patrón que el repo ya usaba en las otras cuatro pantallas que
 * escriben: `salas/acciones.ts`, `reuniones/acciones.ts`, `personas/acciones.ts`
 * y `acuerdos/acciones.ts`. No se inventa nada: se termina de aplicar.
 *
 * `slug` PASA A SER EL PRIMER PARÁMETRO (`salaSlug`), y la página las ata con
 * `.bind(null, slug)` — igual que `personas/page.tsx` con el correo y
 * `salas/page.tsx` con el slug. Para el Client Component que las recibe la
 * firma no cambia: `bind` fija el primer argumento y deja el resto intacto.
 *
 * ⚠️ CADA ACCIÓN CONSERVA SU GUARDA TAL CUAL. Una Server Action es un
 * endpoint: quien tenga su id puede llamarla sin pasar por la pantalla, así
 * que esconder un botón no protege nada. Las guardas no se tocaron al mover:
 * ni una se relajó, ni una se añadió. Si al leer esto alguna parece de más,
 * se comprueba contra el git blame de `page.tsx` antes de tocarla.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  moverEstatus, editarAcuerdo, crearAcuerdo, eliminarAcuerdo, salaDeAcuerdo,
  type EstatusAcuerdo,
} from '@/db/acuerdos'
import { registrarEdicion } from '@/db/participacion'
import { obtenerMinuta, editarTextoMinuta } from '@/db/minutas'
import { insertarAcuerdoEnMinuta } from '@/minuta/insertar-acuerdo'
import {
  registrarArchivo,
  editarArchivo,
  eliminarArchivo,
  reubicarMateriales,
  type CategoriaArchivo,
} from '@/db/archivos'
import { del } from '@vercel/blob'
import { normalizarEnlace } from '@/lib/materiales'
import {
  marcarDada, marcarNoDada, desmarcarNoDada, obtenerReunion, eliminarReunion, crearReunion,
  editarReunion,
} from '@/db/reuniones'
import {
  eliminarDocumentoDeReunion,
  tituloPorDefecto,
} from '@/db/documentos'
import { PLANTILLAS } from '@/secciones/plantillas'
import { instanteEnCDMX } from '@/lib/fecha'
import { cerrarSesion } from '@/auth/sesion'
import { exigirEditor } from '@/auth/roles'

export async function salirDeLaSala() {
  await cerrarSesion()
  redirect('/entrar')
}

export async function cambiarEstatusAction(salaSlug: string, acuerdoId: string, estatus: EstatusAcuerdo) {
  await exigirEditor()
  await moverEstatus(acuerdoId, estatus)
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

export async function editarFechaAction(salaSlug: string, acuerdoId: string, fecha: string | null) {
  await exigirEditor()
  // `instanteEnCDMX` y NO `new Date(fecha)` (arreglo de ronda 14, tarea 2):
  // medido antes de tocar esta línea, `new Date('2026-09-01')` guarda el
  // día civil "2026-08-31" — medianoche UTC son las 18:00 del día anterior
  // en México — así que el acuerdo quedaba venciendo un día antes de lo
  // tecleado.
  //
  // NO SON DOS PANTALLAS, SON SEIS ESCRITORES (corregido en la revisión
  // final de la ronda: este comentario decía "la pestaña /acuerdos escribe
  // esta MISMA columna", y era verdad a medias — la ronda 14 solo unificó
  // tres de los seis). `fechaCompromiso` la escriben: esta acción, el alta
  // de la sala (`crearAcuerdoAction`, abajo), `editarFechaEnTablaAction` y
  // `editarEnBandejaAction` (src/app/acuerdos/acciones.ts), `ponerFechaAction`
  // del Home (src/app/page.tsx) y la publicación de minuta
  // (`guardarMinuta`, src/db/minutas.ts). Los seis usan hoy
  // `instanteEnCDMX(dia, '12:00')`, y eso no es solo estética: mientras
  // convivieron dos instantes para el mismo día civil, el dedupe de
  // `crearAcuerdo` —que compara el instante EXACTO— dejaba de reconocer sus
  // propias filas y republicar una minuta duplicaba acuerdos (hallazgo C1).
  await editarAcuerdo(acuerdoId, { fechaCompromiso: fecha ? instanteEnCDMX(fecha, '12:00') : null })
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

export async function crearAcuerdoAction(salaSlug: string, datos: {
  que: string
  responsable: string
  squad?: string
  fechaCompromiso: string | null
}) {
  await exigirEditor()
  await crearAcuerdo(salaSlug, {
    que: datos.que,
    responsable: datos.responsable,
    squad: datos.squad,
    // Misma columna, mismo arreglo que `editarFechaAction` arriba: un
    // acuerdo NUEVO no puede nacer con el día corrido solo porque se dio de
    // alta desde el formulario de la sala en vez de editado después.
    fechaCompromiso: datos.fechaCompromiso ? instanteEnCDMX(datos.fechaCompromiso, '12:00') : null,
  })
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

/**
 * ---- CORREGIR LA MINUTA SIN SALIR DE LA SALA (20-ago-2026) ----
 *
 * Franco: *"una vez generada la minuta, en el mismo módulo me debería
 * permitir editar la minuta"*.
 *
 * Y el editor YA EXISTÍA —`MinutaPublicada`, en `/deck/[id]/minuta`—: lo que
 * había desde la sala era un enlace que te SACABA de ella. Es la misma
 * lección que dejó "cargar una plantilla desde el editor" (17-ago): el sitio
 * donde se pide una acción es DONDE ESTÁ la persona cuando se da cuenta de
 * que la necesita, y quien lee una minuta en la sala está en la sala.
 *
 * Escribe el mismo campo que aquel editor (`editarTextoMinuta`), así que las
 * dos puertas llevan al mismo sitio y ninguna es una copia de la otra.
 */
export async function editarMinutaAction(salaSlug: string, reunionId: string, texto: string): Promise<{ error?: string }> {
  await exigirEditor()

  // El id viaja desde el navegador — misma comprobación que el alta de un
  // acuerdo tardío: la reunión tiene que ser de ESTA sala.
  const reunion = await obtenerReunion(reunionId)
  if (!reunion || reunion.salaSlug !== salaSlug) {
    return { error: 'Esa reunión no es de este cliente.' }
  }
  await editarTextoMinuta(reunionId, texto)
  revalidatePath(`/cliente/${salaSlug}`)
  return {}
}

/**
 * ---- UN ACUERDO QUE SE ACORDÓ Y NADIE APUNTÓ (20-ago-2026) ----
 *
 * Franco: *"una vez creada la reunión y marcada completada se me olvida
 * meter un acuerdo, debo poder hacerlo y que también se refleje en la
 * minuta ya publicada"*.
 *
 * Dos cosas, y la segunda es la que tiene filo:
 *
 * 1. EL ACUERDO CUELGA DE SU REUNIÓN. `crearAcuerdo` ya aceptaba
 *    `reunionOrigenId` —lo usa `guardarMinuta` al publicar—; lo que no
 *    había era una pantalla que lo mandara. Con él puesto, la tarjeta de esa
 *    reunión lo pinta sola: `AcuerdosDeReunion` lee lo que `reunionesDeSala`
 *    cose por ese campo, en vivo desde la base.
 *
 * 2. LA MINUTA YA PUBLICADA SE RETOCA, no se regenera (decisión de Franco:
 *    integrado en la tabla, sin distinguirlo). Es una inserción de una fila
 *    en el texto guardado — ver `insertarAcuerdoEnMinuta`—, así que una
 *    minuta corregida a mano conserva sus correcciones.
 *
 * ⚠️ SI LA MINUTA NO TIENE TABLA DONDE INSERTAR, el acuerdo SE GUARDA IGUAL
 * y esto devuelve el aviso. Pasa con una cargada a mano o editada hasta
 * perder el formato. Las dos alternativas eran peores: no guardar el acuerdo
 * por un problema del texto, o escribir la fila en cualquier sitio del
 * correo y que nadie se entere.
 */
export async function crearAcuerdoEnReunionAction(
  salaSlug: string,
  reunionId: string,
  datos: { que: string; responsable: string; fechaCompromiso: string | null },
): Promise<{ error?: string; aviso?: string }> {
  await exigirEditor()

  // El id viaja desde el navegador: se comprueba que la reunión sea de ESTA
  // sala antes de colgarle nada, mismo criterio que `salaDeAcuerdo` en las
  // acciones de acuerdos.
  const reunion = await obtenerReunion(reunionId)
  if (!reunion || reunion.salaSlug !== salaSlug) {
    return { error: 'Esa reunión no es de este cliente.' }
  }

  const que = datos.que.trim()
  if (que.length === 0) return { error: 'Escribe qué se acordó.' }

  await crearAcuerdo(salaSlug, {
    que,
    responsable: datos.responsable.trim() || 'por asignar',
    reunionOrigenId: reunionId,
    // Mismo arreglo de la fecha que `crearAcuerdoAction`, arriba: el día
    // civil que se eligió, no el que sale de interpretar la cadena en UTC.
    fechaCompromiso: datos.fechaCompromiso ? instanteEnCDMX(datos.fechaCompromiso, '12:00') : null,
  })

  const minuta = await obtenerMinuta(reunionId)
  let aviso: string | undefined
  if (minuta?.textoFinal) {
    const conLaFila = insertarAcuerdoEnMinuta(minuta.textoFinal, {
      que,
      responsable: datos.responsable.trim() || 'por asignar',
      fechaCompromiso: datos.fechaCompromiso,
    })
    if (conLaFila) await editarTextoMinuta(reunionId, conLaFila)
    else aviso = 'El acuerdo se guardó, pero su minuta no tiene tabla de acuerdos donde añadirlo: revísala a mano.'
  }

  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  return aviso ? { aviso } : {}
}

/**
 * CORREGIR UN ACUERDO YA PUBLICADO: su texto y su responsable.
 *
 * Franco preguntó *"¿cómo hago para editar un acuerdo ya publicado?"* y la
 * respuesta era: no se podía. Editar el texto solo existía en la bandeja
 * (`/acuerdos/bandeja`) y solo mientras el acuerdo seguía `pendiente` —
 * `editarEnBandejaAction` corta con `if (fila.bandeja !== 'pendiente')
 * return`. Una vez en la sala, la única salida ante una errata o un dueño
 * mal asignado era borrarlo y volver a crearlo, perdiendo su origen.
 *
 * ⚠️ `exigirEditor()`, NO `exigirEdicionDeAcuerdos(salaSlug)` — es la única
 * acción de acuerdos de esta pantalla que NO deja pasar al director de la
 * UDN, y es lo que pidió Franco: *"solo el admin y editores pueden hacer
 * cambios en los acuerdos ya publicados"*. El director sigue moviendo el
 * estatus y la fecha de los suyos (eso no cambia); lo que no hace es
 * reescribir el compromiso ni cambiarse el dueño.
 *
 * SIN RASTRO VISIBLE, también por petición suya (*"no queda registro
 * histórico y desaparece de todos lados"*): el texto viejo no se enseña en
 * ninguna parte. La columna `acuerdos.historia` sigue registrando el cambio
 * porque es infraestructura interna que ninguna pantalla pinta —lo
 * comprobado antes de escribir esto— y quitarla sería perder la auditoría
 * de estatus que ya existía por algo que nunca se ve.
 *
 * Y REVALIDA LAS CUATRO PANTALLAS donde este acuerdo puede estar: su sala,
 * el Home, el espacio de acuerdos y la bandeja. "Desaparece de todos lados"
 * es literalmente eso — si faltara una, el texto viejo seguiría ahí hasta
 * que a alguien le caducara la caché.
 */
export async function editarAcuerdoTextoAction(
  salaSlug: string,
  acuerdoId: string,
  cambios: { que: string; responsable: string },
): Promise<{ error?: string }> {
  await exigirEditor()
  const que = cambios.que.trim()
  if (que.length === 0) return { error: 'El acuerdo necesita decir qué hay que hacer.' }
  // Que sea de ESTA sala: el id lo manda el navegador y una Server Action
  // es un endpoint. Sin esto, quien tenga el id de un acuerdo de otro
  // cliente podría reescribirlo desde aquí.
  //
  // ⚠️ SE PREGUNTA A LA BASE, NO A `s.acuerdos` — que es lo que la página ya
  // tenía cargado y sería lo cómodo. Alcanzar ese objeto desde dentro de la
  // acción mete su contenido en el cierre que React serializa hacia el
  // cliente, y salta "Functions cannot be passed directly to Client
  // Components… [function some]": la sala entera con un 500. Es la CUARTA
  // vez hoy que este patrón muerde (ver `bloqueValido` en el benchmark,
  // `guardarEnlaceDeSala` aquí mismo y `revalidarDocumento` en el editor).
  // Y además es más correcto: lo cargado es una foto del render, y entre
  // eso y el clic pueden pasar minutos.
  if ((await salaDeAcuerdo(acuerdoId)) !== salaSlug) {
    return { error: 'Ese acuerdo no es de este cliente.' }
  }
  try {
    await editarAcuerdo(acuerdoId, {
      que,
      responsable: cambios.responsable.trim() || 'por asignar',
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el cambio.' }
  }
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
  revalidatePath('/acuerdos')
  revalidatePath('/acuerdos/bandeja')
  return {}
}

/**
 * TIRAR EL BORRADOR DE UNA PRESENTACIÓN, sin tocar su reunión (ronda 13).
 *
 * Franco: *"aparece un elemento llamado 'documento', no sé qué hace ahí y no
 * lo puedo eliminar"*. La acción existía —`descartarPresentacionAction`—
 * pero solo DENTRO del editor, y para llegar allí hay que abrir
 * `/deck/<id>`, que CREA el documento si no existe: el único camino para
 * deshacerse de uno pasaba por garantizar que hubiera uno.
 *
 * Se comprueba que la reunión sea de ESTA sala en el servidor, como el
 * borrado de acuerdos y el de reuniones: el id llega del navegador.
 */
export async function descartarBorradorAction(salaSlug: string, reunionId: string) {
  await exigirEditor()
  const reunion = await obtenerReunion(reunionId)
  if (!reunion || reunion.salaSlug !== salaSlug) return
  await eliminarDocumentoDeReunion(reunionId)
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
  revalidatePath('/deck')
}

export async function eliminarAcuerdoAction(salaSlug: string, acuerdoId: string) {
  await exigirEditor()
  await eliminarAcuerdo(acuerdoId)
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

/**
 * CREAR LA REUNIÓN. SOLO LA REUNIÓN.
 *
 * Franco: *"aparece un botón que dice crear presentación y debería ser
 * crear reunión; una vez que la creo debo decidir si la creo con el editor
 * de presentaciones o cargar un archivo ya creado"*.
 *
 * Esto llamaba a `crearReunionConDocumento` y terminaba con
 * `redirect(/deck/<id>)`: agendar una junta y empezar a maquetar su deck
 * eran el mismo gesto, sin punto intermedio donde decidir. Quien ya tenía
 * la presentación hecha acababa igual dentro del editor, con ocho secciones
 * vacías que nadie iba a llenar — y esa reunión aparecía después en la sala
 * como "a medio armar" sin que nadie la hubiera empezado.
 *
 * Ahora nace la reunión y ya. La decisión —armarla aquí o subir la que ya
 * existe— se toma en la sala, en "Lo que viene", donde están las dos vías
 * una al lado de la otra. Sin `redirect`: quien crea se queda donde estaba
 * y ve aparecer su reunión.
 *
 * La plantilla elegida NO se pierde: se guarda en la reunión (migración
 * 0035) y el editor la usa el día que se pulse "armarla en el editor".
 *
 * EDITOR, no `exigirEdicionDeAcuerdos`: crear una reunión no es editar un
 * acuerdo. El director de la UDN mueve sus compromisos; no agenda la junta
 * en la que se los van a presentar.
 */
export async function crearSesionAction(
  salaSlug: string,
  datos: { plantilla: string; dia: string; titulo: string },
): Promise<{ error?: string }> {
  await exigirEditor()
  // `datos.plantilla` LLEGA `''` CUANDO NADIE TOCÓ EL DESPLEGABLE (H3,
  // revisión de esta ronda — `NuevaSesionSala.tsx` arranca sin clasificar
  // ahora, mismo criterio que `agendarRapidoAction` ya usaba para el atajo
  // del Home): validar solo cuando SÍ llega algo, con el mismo `if
  // (plantillaCampo && ...)` que ya usa `/deck/nueva` (`page.tsx`) para
  // esta misma pregunta — antes esta acción rechazaba CUALQUIER envío sin
  // clase con "Plantilla desconocida", lo que habría dejado el botón
  // "Crear reunión" roto para quien la dejara sin elegir.
  if (datos.plantilla && !PLANTILLAS.some((p) => p.id === datos.plantilla)) {
    return { error: 'Plantilla desconocida.' }
  }
  try {
    await crearReunion({
      salaSlug: salaSlug,
      // `|| null`, no la cadena tal cual: `crearReunion` guarda
      // `datos.plantilla ?? null` (solo `null`/`undefined` se convierten;
      // `''` se habría guardado literal como una plantilla vacía en la
      // base). Mismo patrón que ya usan `agendarRapidoAction` (`app/page.tsx`)
      // y las acciones de `/reuniones` (`app/reuniones/acciones.ts`) para
      // esta misma traducción.
      plantilla: datos.plantilla || null,
      tipo: 'mensual',
      alcance: 'todos',
      // Las 10:00 de CDMX, no la medianoche UTC: sin huso explícito una
      // reunión "del 19" se guarda como las 18:00 del 18 en México. Ver
      // `instanteEnCDMX`, src/lib/fecha.ts.
      fecha: instanteEnCDMX(datos.dia, '10:00'),
      // Vacío se resuelve en el servidor con un título legible — el mismo
      // `tituloPorDefecto` que usaba `crearReunionConDocumento`.
      titulo: datos.titulo.trim() || tituloPorDefecto('mensual', instanteEnCDMX(datos.dia, '10:00')),
      // Nace agendada: agendar no es haber ocurrido.
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la reunión.' }
  }
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
  return {}
}

export async function marcarPresentadaAction(salaSlug: string, reunionId: string) {
  const quien = await exigirEditor()
  await marcarDada(reunionId)
  if (quien.sub) await registrarEdicion(reunionId, quien.sub)
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

export async function marcarNoDadaAction(salaSlug: string, reunionId: string) {
  const quien = await exigirEditor()
  await marcarNoDada(reunionId)
  if (quien.sub) await registrarEdicion(reunionId, quien.sub)
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

export async function desmarcarNoDadaAction(salaSlug: string, reunionId: string) {
  const quien = await exigirEditor()
  await desmarcarNoDada(reunionId)
  if (quien.sub) await registrarEdicion(reunionId, quien.sub)
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/')
}

/**
 * REGISTRAR UN ARCHIVO en uno de los dos módulos de la sala.
 *
 * CUATRO ACCIONES Y NO UNA CON UN PARÁMETRO, y no es repetición gratuita:
 * cada una es un endpoint distinto y su categoría queda FIJADA EN EL
 * SERVIDOR. Si la categoría viajara desde el navegador, quien conociera la
 * acción podría escribir en cualquiera de ellas — incluida `evidencia`, que
 * tiene reglas propias, o `presentacion`, que ordena la línea de tiempo de
 * la sala.
 *
 * Y NINGUNA ES UNA FLECHA INLINE en el JSX
 * (`(d) => registrarArchivoAction({...d, categoria})`): eso es un closure
 * creado en el componente de servidor, y React lo rechaza al serializarlo
 * hacia un componente cliente —"Functions cannot be passed directly to
 * Client Components"—, con un 500 en la sala entera. No lo cazó ningún
 * test: el test invoca la página directamente y no cruza esa frontera. Lo
 * cazó el print.
 */
export async function registrarMaterialArchivoAction(
  salaSlug: string,
  datos: {
  titulo: string
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
}): Promise<{ error?: string }> {
  return registrarArchivoAction(salaSlug, { ...datos, categoria: 'comercial', fecha: null })
}

export async function registrarInteresArchivoAction(
  salaSlug: string,
  datos: {
  titulo: string
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
}): Promise<{ error?: string }> {
  return registrarArchivoAction(salaSlug, { ...datos, categoria: 'interes', fecha: null })
}

/**
 * Guarda un enlace en uno de los dos módulos de la sala.
 *
 * AUXILIAR, NO ACCIÓN: no se exporta, así que no es un endpoint. Vivía a
 * nivel de módulo en `page.tsx` para no acabar dentro del cierre del
 * componente —React intenta serializar lo que capture una Server Action y
 * revienta con "Functions cannot be passed directly to Client Components"—.
 * Aquí ese riesgo ya no existe, pero se queda igual de fuera y con `salaSlug`
 * por parámetro, que es lo que la hace reutilizable por las dos que la usan.
 *
 * NO revalida: la ruta la conoce quien llama, que es la acción de la página.
 */
async function guardarEnlaceDeSala(
  salaSlug: string,
  categoria: 'comercial' | 'interes',
  datos: { titulo: string; enlace: string },
): Promise<{ error?: string }> {
  await exigirEditor()
  // Se vuelve a normalizar EN EL SERVIDOR aunque el cliente ya lo hizo: lo
  // del navegador es comodidad, esto es la comprobación. Sin ella, un
  // `javascript:` llega a la base y de ahí a un href que ve la UDN.
  const normalizado = normalizarEnlace(datos.enlace)
  if ('error' in normalizado) return { error: normalizado.error }
  try {
    await registrarArchivo({
      salaSlug,
      categoria,
      titulo: datos.titulo,
      fecha: null,
      enlace: normalizado.url,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el enlace.' }
  }
  return {}
}

/**
 * REGISTRAR UN ENLACE (vídeo de YouTube, nota de prensa, caso publicado).
 *
 * Server Action aparte de `registrarArchivoAction` y no un parámetro más:
 * el camino del archivo tiene que limpiar el binario de Blob si la fila
 * falla, y el del enlace no tiene binario que limpiar. Meterlos en la
 * misma función obligaría a ramificar esa limpieza dentro del `catch`,
 * que es justo donde no conviene tener condiciones.
 *
 * La categoría se fija aquí, en el servidor: los enlaces solo existen como
 * material de sala. Una presentación de una reunión o una imagen de un
 * documento siempre son un fichero.
 */
export async function registrarEnlaceAction(salaSlug: string, datos: {
  titulo: string
  enlace: string
}): Promise<{ error?: string }> {
  const r = await guardarEnlaceDeSala(salaSlug, 'comercial', datos)
  if (!r.error) revalidatePath(`/cliente/${salaSlug}`)
  return r
}

export async function registrarEnlaceInteresAction(salaSlug: string, datos: {
  titulo: string
  enlace: string
}): Promise<{ error?: string }> {
  const r = await guardarEnlaceDeSala(salaSlug, 'interes', datos)
  if (!r.error) revalidatePath(`/cliente/${salaSlug}`)
  return r
}

/**
 * DAR DE ALTA UNA NOTA DE PRENSA (ronda 13).
 *
 * No usa `guardarEnlaceDeSala` porque una nota lleva tres cosas que un
 * enlace de material no tiene —medio, fecha de publicación y una portada
 * opcional— y porque su regla de validación es la contraria: el enlace es
 * OBLIGATORIO (es el destino) y la `ruta` es ilustración, no alternativa.
 * Ver la excepción documentada en `registrarArchivo`.
 *
 * El enlace se vuelve a normalizar aquí aunque el navegador ya lo hiciera:
 * lo de allá es comodidad, esto es la comprobación — sin ella un
 * `javascript:` llega a la base y de ahí al href que ve la UDN.
 */
export async function registrarNotaDePrensaAction(salaSlug: string, datos: {
  titulo: string
  enlace: string
  medio: string
  fecha: string | null
  portada: { ruta: string; nombreOriginal: string; tipoContenido: string | null; tamanoBytes: number | null } | null
}): Promise<{ error?: string }> {
  await exigirEditor()
  const normalizado = normalizarEnlace(datos.enlace)
  if ('error' in normalizado) return { error: normalizado.error }
  try {
    await registrarArchivo({
      salaSlug: salaSlug,
      categoria: 'prensa',
      titulo: datos.titulo,
      enlace: normalizado.url,
      medio: datos.medio,
      // La fecha de la NOTA, no la de subida: una nota de mayo cargada hoy
      // se ordena en mayo (ver `porFechaDesc` en src/db/archivos.ts).
      fecha: datos.fecha ? instanteEnCDMX(datos.fecha, '10:00') : null,
      ruta: datos.portada?.ruta ?? null,
      nombreOriginal: datos.portada?.nombreOriginal ?? null,
      tipoContenido: datos.portada?.tipoContenido ?? null,
      tamanoBytes: datos.portada?.tamanoBytes ?? null,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la nota.' }
  }
  revalidatePath(`/cliente/${salaSlug}`)
  return {}
}

/**
 * `cambios.fecha` es OPCIONAL desde la Tarea 3 de la ronda 11 (antes era
 * obligatorio): `ArchivosSala` (archivos de interés) sigue mandándola
 * siempre —incluso `null`, cuando no aplica—, pero `CarasDeReunion`
 * (archivos de reunión, misma ronda) edita SOLO el título y no la trae en
 * absoluto. `editarArchivo` (`src/db/archivos.ts`) distingue `undefined`
 * ("no la toques") de `null` ("bórrala") — con `cambios.fecha` OMITIDO no
 * se le pasa esa clave en absoluto, así que la fecha existente del archivo
 * no se toca. Mandar `fecha: null` aquí para un archivo de reunión la
 * habría borrado sin que nadie lo pidiera: esa fecha es la de SU reunión,
 * no una propia (`CaraArchivo`, `dominio/reunion.ts`, no la trae).
 */
export async function editarArchivoAction(salaSlug: string, id: string, cambios: { titulo: string; fecha?: string | null }) {
  await exigirEditor()
  await editarArchivo(id, {
    titulo: cambios.titulo,
    // `instanteEnCDMX` y NO `new Date(fecha)` a secas (arreglo de ronda 14,
    // tarea 6): mismo bug y mismo número medido que en `registrarArchivoAction`
    // (arriba) — `new Date('2026-09-01')` guarda "2026-08-31". El único
    // llamador real de este campo (`MaterialesSala`, botón "Renombrar")
    // manda `material.fecha`, que ya sale de la base como día civil puro
    // ('YYYY-MM-DD', ver `isoFecha` en `src/db/archivos.ts`) — nunca un
    // instante con hora — pero se guarda el mismo criterio de
    // `datos.fecha.includes('T')` que en `registrarArchivoAction` para no
    // dejar este campo genérico expuesto al mismo riesgo si mañana algún
    // llamador nuevo le manda un instante completo.
    //
    // Por qué se escapó y por qué se arregla igual sin síntoma visible hoy:
    // mismo razonamiento que el comentario de `registrarArchivoAction`
    // (arriba) — `isoFecha` (lectura) trunca a día UTC y `instanteDe`
    // (pintado, privado en `src/lib/fecha.ts`) ancla ese día sin hora al
    // mediodía UTC; las dos compensaciones dejan el render de
    // `MaterialesSala` a salvo hoy, pero el `Date` que quedaba guardado
    // seguía significando el día anterior por sí solo.
    ...(cambios.fecha !== undefined
      ? { fecha: cambios.fecha ? (cambios.fecha.includes('T') ? new Date(cambios.fecha) : instanteEnCDMX(cambios.fecha, '12:00')) : null }
      : {}),
  })
  revalidatePath(`/cliente/${salaSlug}`)
}

/**
 * RENOMBRAR UNA REUNIÓN DESDE SU PROPIA SALA.
 *
 * Franco: *"no puedo cambiar el nombre de una reunión que ya ocurrió desde
 * la sala de un cliente"*. Era cierto y el hueco era llamativo: en esta
 * misma pantalla se podía renombrar un ARCHIVO de la reunión con su lápiz
 * (`editarArchivoAction`, arriba), pero el título de la reunión —el que da
 * nombre a la fila entera, al historial y a la minuta— solo se podía tocar
 * desde el formulario completo de `/reuniones`, que además de estar en otra
 * pantalla exige repasar fecha, tipo, clase, participantes y lugar para
 * cambiar una palabra.
 *
 * ⚠️ SOLO EL TÍTULO, Y POR ESO NO REUTILIZA `editarReunionAction`. La acción
 * de `/reuniones` recibe el formulario entero (`DatosFormulario`), así que
 * llamarla desde aquí obligaría a inventar valores para los campos que esta
 * pantalla no pregunta — y cualquier omisión los sobrescribiría. `editarReunion`
 * distingue `undefined` ("no lo toques") de un valor, así que pasarle solo
 * `titulo` deja fecha, tipo, participantes y lugar exactamente como estaban.
 * La clase también: su validación acepta `undefined` y el `!== undefined` de
 * `editarReunion` no la escribe, de modo que renombrar NO desclasifica una
 * junta (que es justo el defecto que la ronda 14.2 tuvo que arreglar en la
 * dirección contraria).
 *
 * Y COMPRUEBA QUE LA REUNIÓN SEA DE ESTA SALA, igual que `eliminarReunionAction`:
 * el id viaja desde el navegador, así que sin este filtro un editor podría
 * renombrar la junta de otro cliente pasando su id a mano.
 */
export async function renombrarReunionAction(
  salaSlug: string,
  reunionId: string,
  titulo: string,
): Promise<{ error?: string }> {
  await exigirEditor()
  const laReunion = await obtenerReunion(reunionId)
  if (!laReunion || laReunion.salaSlug !== salaSlug) {
    return { error: 'Esa reunión no es de este cliente.' }
  }
  try {
    await editarReunion(reunionId, { titulo })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo renombrar la reunión.' }
  }
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/reuniones')
  revalidatePath('/')
  return {}
}

export async function eliminarReunionAction(salaSlug: string, reunionId: string): Promise<{ error?: string }> {
  await exigirEditor()
  const laReunion = await obtenerReunion(reunionId)
  if (!laReunion || laReunion.salaSlug !== salaSlug) {
    return { error: 'Esa reunión no es de este cliente.' }
  }
  try {
    await eliminarReunion(reunionId, eliminarDocumentoDeReunion)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo borrar la reunión.' }
  }
  revalidatePath(`/cliente/${salaSlug}`)
  revalidatePath('/deck')
  revalidatePath('/')
  return {}
}

/**
 * REUBICA LOS MATERIALES DE UN MÓDULO: quién va en qué subcategoría y en
 * qué orden (Franco: *"debo poder crear subcategorías… y reubicar su orden
 * drag and drop"*).
 *
 * Recibe la lista COMPLETA tal como quedó tras arrastrar, no un "mueve este
 * de aquí a allá": así no hay huecos que calcular y dos personas moviendo a
 * la vez no se dejan dos materiales en la misma posición. `reubicarMateriales`
 * filtra además por sala en el WHERE — el id viaja desde el navegador.
 */
export async function reubicarMaterialesAction(
  salaSlug: string,
  enOrden: Array<{ id: string; grupo: string | null }>,
): Promise<void> {
  await exigirEditor()
  await reubicarMateriales(salaSlug, enOrden)
  revalidatePath(`/cliente/${salaSlug}`)
}

export async function eliminarArchivoAction(salaSlug: string, id: string) {
  await exigirEditor()
  // Franco: "si algo se elimina también se elimina del almacenamiento".
  // Primero la fila, luego el binario: al revés, un fallo al borrar el
  // archivo dejaría una fila que apunta a la nada.
  const quitado = await eliminarArchivo(id)
  // `quitado.ruta` es nula si el material era un ENLACE: no hay binario que
  // borrar, y llamar a `del(null)` sería un error donde no hay nada que
  // limpiar.
  if (quitado?.ruta) await del(quitado.ruta).catch(() => {})
  revalidatePath(`/cliente/${salaSlug}`)
}

export async function registrarArchivoAction(
  salaSlug: string,
  datos: {
  categoria: CategoriaArchivo
  titulo: string
  fecha: string | null
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
  /**
   * De qué reunión es, cuando el archivo se sube desde dentro de una
   * reunión (Tarea 9, `CarasDeReunion`) — `undefined`/`null` para lo que
   * sigue siendo de sala, sin reunión de por medio (p. ej. "archivos de
   * interés", vía `ArchivosSala`). Opcional a propósito: los llamadores que
   * ya existían nunca lo mandaban, y sin un `reunionId` un PDF subido desde
   * una reunión no quedaba referenciado a la junta — quedaba en el limbo.
   */
  reunionId?: string | null
  },
): Promise<{ error?: string }> {
  await exigirEditor()
  /**
   * LA REUNIÓN, SI SE MANDA UNA, TIENE QUE SER DE ESTA SALA (revisión
   * final de la ronda 10, hallazgo 4a). `puedeVerlo`
   * (`src/app/api/archivo/[id]/route.ts`) da prioridad a `reunionId` sobre
   * `salaSlug` al decidir quién puede LEER el archivo después: un archivo
   * registrado bajo la sala A pero apuntando a una reunión de la sala B lo
   * leería el director de B. Hoy no es explotable —solo editores llaman
   * esta acción y la UI nunca cruza salas— pero esconder el botón no
   * protege el endpoint: la comprobación va aquí, no solo en la interfaz.
   */
  if (datos.reunionId) {
    const reunionDelArchivo = await obtenerReunion(datos.reunionId)
    if (!reunionDelArchivo || reunionDelArchivo.salaSlug !== salaSlug) {
      // El binario ya pudo haber subido antes de llegar aquí (la subida es
      // navegador → Blob directo — ver el comentario de `ArchivosSala`):
      // sin fila que lo registre, es basura invisible que se sigue pagando.
      await del(datos.ruta).catch(() => {})
      return { error: 'Esa reunión no es de esta sala.' }
    }
  }
  try {
    await registrarArchivo({
      salaSlug: salaSlug,
      reunionId: datos.reunionId ?? null,
      categoria: datos.categoria,
      titulo: datos.titulo,
      // `instanteEnCDMX` y NO `new Date(fecha)` a secas (arreglo de ronda
      // 14, tarea 6 — encargo directo de Franco): medido el 14-ago,
      // `new Date('2026-09-01')` guarda el día civil "2026-08-31" —
      // medianoche UTC son las 18:00 del día anterior en México. Es la
      // MISMA columna que la Tarea 2 arregló para `fechaCompromiso`
      // (`archivos.fecha`, nota de prensa y material), pero NO el mismo
      // arreglo a secas: a diferencia de `fechaCompromiso`, `datos.fecha`
      // aquí es POLIMÓRFICO. `ReunionesSala` (Tarea 9b, "+ Subir
      // presentación") manda el INSTANTE COMPLETO de la reunión
      // (`reunion.fecha`, p. ej. "2026-06-15T10:00:00.000Z") y no un día
      // civil — pasarlo por `instanteEnCDMX(fecha, '12:00')` concatenaría
      // una hora fija a una fecha que YA la trae y produciría una fecha
      // inválida. El criterio para distinguir los dos casos es el mismo
      // que usa `instanteDe` (privado, `src/lib/fecha.ts`): si el string
      // trae 'T', ya es un instante y se usa tal cual; si no, es un día
      // civil ('YYYY-MM-DD', el que escribe una persona) y se ancla al
      // mediodía CDMX.
      //
      // POR QUÉ ESTE CASO SE ESCAPÓ TANTO TIEMPO (y por qué se arregla
      // igual aunque hoy nadie lo vea en pantalla): al LEER, `desdeFila`
      // (`src/db/archivos.ts:97`) pasa el `Date` guardado por su propio
      // `isoFecha = d.toISOString().slice(0,10)`, que trunca a día UTC y
      // ya descarta la hora corrida; al PINTAR, `MaterialesSala`/
      // `NotasDePrensa` usan `fechaBreveConAnio` (`src/lib/fecha.ts`), que
      // ancla ese día civil sin hora al MEDIODÍA UTC (`instanteDe`,
      // privado) — lejos de cualquier frontera de día en CDMX. Esas dos
      // compensaciones se encadenan y dejan el RENDER de hoy sin síntoma
      // visible (confirmado con un print real contra la sala pausada de
      // Zeus, ver `.superpowers/sdd/…/task-6-report.md`), pero el `Date`
      // que queda guardado en la columna sigue significando el día
      // ANTERIOR por sí solo. Este cambio hace que el instante guardado
      // sea correcto sin depender de esas dos casualidades de lectura.
      fecha: datos.fecha
        ? (datos.fecha.includes('T') ? new Date(datos.fecha) : instanteEnCDMX(datos.fecha, '12:00'))
        : null,
      ruta: datos.ruta,
      nombreOriginal: datos.nombreOriginal,
      tipoContenido: datos.tipoContenido,
      tamanoBytes: datos.tamanoBytes,
    })
  } catch (error) {
    // El binario ya está en el almacén: si la fila no se puede crear, se
    // quita también el archivo. Un blob sin fila es basura invisible que
    // se sigue pagando.
    await del(datos.ruta).catch(() => {})
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el archivo.' }
  }
  revalidatePath(`/cliente/${salaSlug}`)
  return {}
}
