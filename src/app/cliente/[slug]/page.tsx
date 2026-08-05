import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import {
  estadoDeSala, acuerdosAbiertos, acuerdosVencidos, estaCongelado, type Acuerdo,
} from '@/db/consultas'
import {
  sesionesMinutables, type SesionPorConfirmar,
} from '@/dominio/salas'
import { reunionesPorConfirmar } from '@/dominio/reunion'
import { altoDeLogo, archivoDeLogo } from '@/temas/logos'
import { IconoSeccion } from '@/componentes/IconoSeccion'
import {
  moverEstatus, editarAcuerdo, crearAcuerdo, eliminarAcuerdo, refrescarDesdeMonday, type EstatusAcuerdo,
} from '@/db/acuerdos'
import { directorio } from '@/db/personas'
import { participantesDe, registrarEdicion, type Participante } from '@/db/participacion'
import { ErrorMonday } from '@/monday/cliente'
import { obtenerBenchmark } from '@/db/benchmark'
import {
  listarArchivos, registrarArchivo, editarArchivo, eliminarArchivo, type CategoriaArchivo,
} from '@/db/archivos'
import { del } from '@vercel/blob'
import { AcuerdoControles } from '@/componentes/AcuerdoControles'
import { NuevoAcuerdoForm } from '@/componentes/NuevoAcuerdoForm'
import { BenchmarkSala } from '@/componentes/BenchmarkSala'
import { ReunionesSala } from '@/componentes/ReunionesSala'
import { ReunionesPorConfirmar } from '@/componentes/ReunionesPorConfirmar'
import { LevantarMinuta } from '@/componentes/LevantarMinuta'
import { ArchivosSala } from '@/componentes/ArchivosSala'
import { NuevaSesionSala } from '@/componentes/NuevaSesionSala'
import { ClaveDeSala } from '@/componentes/ClaveDeSala'
import { PausaSala } from '@/componentes/PausaSala'
import { Estrella } from '@/componentes/acuerdos/Estrella'
import { estadoDeClave, regenerarClave, quitarClave } from '@/db/claves'
import { secretoConfigurado } from '@/auth/sesion'
import {
  listarReuniones, marcarDada, marcarNoDada, desmarcarNoDada,
} from '@/db/reuniones'
import { crearReunionConDocumento, documentoDeReunion } from '@/db/documentos'
import { pausarSalaAction, reactivarSalaAction, destacarAction } from '@/app/acuerdos/acciones'
import { PLANTILLAS } from '@/secciones/plantillas'
import { fechaBreve, fechaCompleta, textoDiasDesde, diaCivil, instanteEnCDMX } from '@/lib/fecha'
import {
  exigirEdicionDeAcuerdos, puedeEditarAcuerdosDe,
  generarTokenDeSala, puedeVerEstaSala, cerrarSesion,
} from '@/auth/sesion'
import { esAdmin, esLector, exigirAdmin, exigirEditor } from '@/auth/roles'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import { urlBase } from '@/lib/url-base'

// La vista de equipo ahora escribe (cambiar estatus, editar fecha) — se
// necesita fresca en cada carga, no la copia estática que generateStaticParams
// precalcula. revalidatePath ya invalida esta ruta puntual tras cada acción;
// esto cubre además cualquier otra entrada (p. ej. abrir el link tras un
// deploy nuevo sin haber pasado por una acción).
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return (await slugsDeSalas()).map((slug) => ({ slug }))
}

/**
 * La vuelta antes de leer: si Monday movió el estatus o la fecha de un
 * acuerdo, que se refleje en la sala. Nunca debe tumbar la página —regla
 * central de src/monday/sincronizar.ts—, así que el fallo se ignora para
 * efectos de la pantalla. Pero "ignora" no es "en silencio para siempre"
 * (corrección de revisión): si la causa NO es Monday —un SELECT/UPDATE
 * nuestro que falló, no el tablero cayéndose— nadie se enteraría nunca de
 * que la sincronización dejó de funcionar. Se distingue de un `ErrorMonday`
 * (el tablero, que se cae y no es asunto nuestro) para no ensuciar los logs
 * con algo esperable y sin acción posible de este lado.
 *
 * `slug`: se pasa SIEMPRE desde aquí (revisión final de la ronda 7, punto 4)
 * — esta página es de UNA sala, así que solo hace falta reconciliar los
 * acuerdos de esa sala, no los de las nueve. Antes `refrescarDesdeMonday()`
 * sin argumento traía y reconciliaba TODOS en cada carga de CUALQUIER sala.
 */
async function refrescarDesdeMondaySeguro(slug: string): Promise<void> {
  try {
    await refrescarDesdeMonday(slug)
  } catch (error) {
    if (error instanceof ErrorMonday) {
      console.error(`[refrescarDesdeMonday] Monday no respondió: ${error.message}`)
    } else {
      console.error('[refrescarDesdeMonday] Falló algo de nuestro lado, no de Monday:', error)
    }
  }
}

function textoFechaAcuerdo(a: Acuerdo): { txt: string; clase: string } {
  if (a.fechaCompromiso == null) return { txt: 'por definir', clase: 'pordef' }
  return {
    txt: fechaBreve(a.fechaCompromiso),
    clase: a.estatus === 'vencido' ? 'vencida' : '',
  }
}
const ETIQUETA_ESTADO: Record<Acuerdo['estatus'], string> = {
  abierto: 'abierto', cumplido: 'cumplido', vencido: 'vencido',
}

export default async function VistaSala({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Guarda contra las nueve salas reales, no contra las diez filas de
  // `salas`: `grupo-upax` tiene tema (cargarTemas() lo trae) pero no es una
  // sala navegable desde aquí, igual que no lo era cuando `TEMAS` la excluía
  // en código — ver slugsDeSalas(), src/db/temas.ts.
  const [slugsReales, registro] = await Promise.all([slugsDeSalas(), cargarTemas()])
  if (!slugsReales.includes(slug)) notFound()
  const tema = registro[slug]
  // El proxy ya filtró, pero esta es la comprobación que cuenta: pegada al
  // dato, no en la puerta. Un director solo abre su sala.
  if (!(await puedeVerEstaSala(slug))) notFound()

  // La sala se pinta igual con lo que ya hay en la base pase lo que pase
  // aquí — ver el comentario de refrescarDesdeMondaySeguro más arriba.
  await refrescarDesdeMondaySeguro(slug)

  const s = await estadoDeSala(slug)
  if (!s) notFound()
  // Se resuelve ANTES del Promise.all de abajo (y no dentro) porque decide
  // si se pide `directorio()` — necesita el valor YA resuelto, no una
  // promesa hermana que todavía no corrió. `esLector()` y no la vieja
  // `esEquipo()` (retirada, corrección post-revisión de la ronda 9): esta
  // variable solo condiciona VISIBILIDAD (qué se pinta, si se carga el
  // directorio interno), nunca una escritura — para eso, más abajo, cada
  // Server Action exige lo suyo por su cuenta.
  const equipo = await esLector()
  const [benchmark, archivosPresentaciones, archivosDeInteres, todasLasReuniones, personas] = await Promise.all([
    obtenerBenchmark(slug),
    listarArchivos(slug, 'presentacion'),
    listarArchivos(slug, 'interes'),
    listarReuniones(),
    /**
     * Para el selector de responsable de NuevoAcuerdoForm/LevantarMinuta —
     * SOLO SI ES EQUIPO (corrección de la revisión final de la ronda 7,
     * punto 7).
     *
     * Esta página se comparte con el cliente interno por un enlace firmado
     * de 30 días (`generarTokenDeSala`, ver más abajo). Antes `directorio()`
     * —los nombres Y CORREOS de las 24 personas de Mkt Corp— se pedía
     * siempre, sin condicionar a quién mira, y viajaba entero al HTML/RSC de
     * la página en cuanto algo lo renderizaba (`editaAcuerdos` es cierto
     * para CUALQUIER director en su propia sala, así que esto no era un caso
     * raro: era el camino normal de todo director que da de alta un
     * acuerdo). Sin equipo, `personas` llega vacío: el grupo "Mkt Corp" del
     * selector sale con su aviso de siempre ("no se pudo cargar…", el mismo
     * que ya usa cuando Monday está caído) y el director sigue pudiendo
     * escribir el responsable de su UDN en texto libre — lo que pierde es
     * poder asignar directo a alguien de Mkt Corp, y eso Mkt Corp lo puede
     * corregir después (ver FilaBandeja, ahora editable en sitio).
     */
    equipo ? directorio() : Promise.resolve([]),
  ])
  const reunionesDeLaSala = todasLasReuniones.filter((x) => x.salaSlug === slug)
  // Fuente única de "qué día es hoy" (src/lib/fecha.ts) — la reutilizan
  // `enPreparacion` (aquí abajo), `pendientesDeMinuta` y `porConfirmar`, más
  // adelante: las tres necesitan la MISMA respuesta a "¿ya pasó el día?".
  const hoyCivil = diaCivil(new Date().toISOString())
  // Lo que está a medio armar para este cliente. No es una reunión todavía —
  // no se ha dado— así que no entra en la lista de reuniones: es trabajo
  // abierto. `EstadoReunion` es 'agendada' | 'dada' (ronda 10): a diferencia
  // de la vieja sesión, ya no hace falta `fueDada` para distinguir una
  // "lista" cuyo día pasó (esa era la mitad DOCUMENTO del viejo estado
  // fundido) — `'agendada'` es exactamente "todavía no confirmada como
  // dada", sin ambigüedad. La deducción automática por fecha pasada
  // (`fueDada`) no tiene hoy equivalente para reuniones — es trabajo de la
  // Tarea 6 (`dominio/reunion.ts`); hasta entonces, una reunión con el día ya
  // pasado sigue aquí, en preparación, hasta que alguien la confirme dada.
  const enPreparacion = reunionesDeLaSala.filter((x) => x.estado === 'agendada')
  /**
   * `itemsLlenados`/`totalItems` no viven en `ReunionResumen` (son del
   * documento, no de la reunión) — se resuelven aquí, solo si hay equipo
   * mirando (es lo único que renderiza esta lista) y solo para las reuniones
   * en preparación de ESTA sala, que en la práctica son unas pocas.
   */
  const documentosEnPreparacion = equipo
    ? new Map(await Promise.all(enPreparacion.map(async (r) => [r.id, await documentoDeReunion(r.id)] as const)))
    : new Map<string, Awaited<ReturnType<typeof documentoDeReunion>>>()
  async function salirDeLaSala() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  /**
   * ADMIN, no `equipo` (corrección post-revisión de la ronda 9: agujero
   * crítico).
   *
   * `generarTokenDeSala` no es una vista previa: firma, en el momento,
   * un link real de 30 días que da acceso de lectura a esta sala desde
   * fuera del equipo — el mismo tipo de secreto que `regenerarClaveAction`/
   * `quitarClaveAction` (más abajo), que ya son de admin. Con `equipo` como
   * guarda, CUALQUIER viewer que abriera esta página se llevaba un link
   * válido servido en el propio HTML, con su botón de copiar, sin pedir
   * nada más: no era un botón que no debía ver, era el secreto ya
   * entregado. Mismo razonamiento, misma exigencia.
   */
  const admin = await esAdmin()
  const tokenDeAcceso = admin ? await generarTokenDeSala(slug) : null
  // El director de la UDN mueve los acuerdos de SU sala; el resto de la
  // pantalla sigue siendo de solo lectura para él.
  const editaAcuerdos = await puedeEditarAcuerdosDe(slug)
  const secreto = secretoConfigurado()
  const clave = equipo && secreto
    ? await estadoDeClave(slug, secreto)
    : { tiene: false, creadaEn: null }

  // ---- Server actions: acuerdos editables (spec §4/§6) ----
  // "Solo el equipo Mkt Corp mueve el estatus": cada acción lo exige por su
  // cuenta. Ocultar los controles en la UI no basta — una Server Action es un
  // endpoint, y quien tenga su id puede llamarla sin pasar por la pantalla.

  async function cambiarEstatusAction(acuerdoId: string, estatus: EstatusAcuerdo) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await moverEstatus(acuerdoId, estatus)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function editarFechaAction(acuerdoId: string, fecha: string | null) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await editarAcuerdo(acuerdoId, { fechaCompromiso: fecha ? new Date(fecha) : null })
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function crearAcuerdoAction(datos: {
    que: string
    responsable: string
    responsableMondayId: string | null
    squad?: string
    fechaCompromiso: string | null
  }) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await crearAcuerdo(slug, {
      que: datos.que,
      responsable: datos.responsable,
      responsableMondayId: datos.responsableMondayId,
      squad: datos.squad,
      fechaCompromiso: datos.fechaCompromiso ? new Date(datos.fechaCompromiso) : null,
    })
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function eliminarAcuerdoAction(acuerdoId: string) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await eliminarAcuerdo(acuerdoId)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  /**
   * Preparar una presentación desde la sala (Franco, punto 3).
   *
   * La sala ya sabe de quién es: no se vuelve a preguntar. Redirige al editor
   * porque crear una reunión sin abrirla es dejar a alguien mirando la misma
   * pantalla preguntándose si pasó algo.
   */
  async function crearSesionAction(datos: { plantilla: string; dia: string }): Promise<{ error?: string }> {
    'use server'
    // EDITOR, no `exigirEdicionDeAcuerdos`: preparar una presentación no es
    // editar un acuerdo. El director de la UDN mueve sus compromisos; no
    // arma la sesión en la que se los van a presentar.
    await exigirEditor()
    if (!PLANTILLAS.some((p) => p.id === datos.plantilla)) {
      return { error: 'Plantilla desconocida.' }
    }
    let nueva: { reunionId: string }
    try {
      nueva = await crearReunionConDocumento({
        salaSlug: slug,
        plantilla: datos.plantilla,
        tipo: 'mensual',
        alcance: 'todos',
        // Las 10:00 de CDMX, no la medianoche UTC: sin huso explícito una
        // reunión "del 19" se guarda como las 18:00 del 18 en México. Ver
        // `instanteEnCDMX`, src/lib/fecha.ts.
        fecha: instanteEnCDMX(datos.dia, '10:00'),
        titulo: '',
        // Nace agendada — toda reunión nace así (`DatosDeReunion` no tiene
        // parámetro de estado, a diferencia de la vieja `DatosDeSesion`).
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo crear la reunión.' }
    }
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
    redirect(`/deck/${nueva.reunionId}`)
  }

  // ---- Confirmar si una reunión se dio o no (punto 2/3) ----
  //
  // El botón de marcar presentada existía (`MarcarPresentada`) pero estaba
  // enterrado —solo se llegaba entrando al editor y abriendo el documento—,
  // así que de siete reuniones dadas solo una se marcó. Vive aquí, junto a
  // "por confirmar" (`reunionesPorConfirmar`, más abajo). Las tres escriben
  // una sesión: exigen editor primero y quedan enganchadas a
  // `registrarEdicion`, que nunca propaga un fallo suyo.

  async function marcarPresentadaAction(sesionId: string) {
    'use server'
    const quien = await exigirEditor()
    await marcarDada(sesionId)
    if (quien.sub) await registrarEdicion(sesionId, quien.sub)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function marcarNoDadaAction(sesionId: string) {
    'use server'
    const quien = await exigirEditor()
    await marcarNoDada(sesionId)
    if (quien.sub) await registrarEdicion(sesionId, quien.sub)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function desmarcarNoDadaAction(sesionId: string) {
    'use server'
    const quien = await exigirEditor()
    await desmarcarNoDada(sesionId)
    if (quien.sub) await registrarEdicion(sesionId, quien.sub)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  // ---- El freeze de esta sala (tarea 12, ronda 7) ----
  // Cierres finos sobre `pausarSalaAction`/`reactivarSalaAction` (ambas ya
  // exigen equipo por su cuenta) para que `PausaSala` no tenga que conocer el
  // slug. La comprobación real de "¿se puede preparar una sesión con la sala
  // en pausa?" NO vive aquí, sino en `crearSesion` (src/db/sesiones.ts): es
  // el único punto por el que pasan los tres caminos que crean una sesión, y
  // repetirla en cada página sería justo el tipo de protección que se olvida
  // en una de las tres.

  async function pausarEstaSalaAction(): Promise<void> {
    'use server'
    await pausarSalaAction(slug)
  }

  async function reactivarEstaSalaAction(): Promise<void> {
    'use server'
    await reactivarSalaAction(slug)
  }

  /**
   * Pone una clave nueva y la devuelve EN CLARO, una sola vez.
   *
   * Se guarda su hash, así que esta es la única oportunidad de leerla. El
   * componente la enseña con un "cópiala ahora".
   */
  async function regenerarClaveAction(): Promise<{ clave?: string; error?: string }> {
    'use server'
    // ADMIN, no editor: generar/revocar la clave decide QUIÉN puede entrar a
    // esta sala desde fuera del equipo — el mismo nivel que el enlace de
    // agenda (`generarEnlaceAction`/`revocarEnlaceAction`, src/app/salas/acciones.ts).
    await exigirAdmin()
    const s = secretoConfigurado()
    if (!s) return { error: 'Falta SESSION_SECRET en el despliegue: sin él no se pueden firmar claves.' }
    try {
      const nueva = await regenerarClave(slug, s)
      revalidatePath(`/cliente/${slug}`)
      return { clave: nueva }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo generar la clave.' }
    }
  }

  async function quitarClaveAction() {
    'use server'
    // Misma exigencia que regenerarClaveAction: es la otra mitad del acceso
    // externo de esta sala.
    await exigirAdmin()
    await quitarClave(slug)
    revalidatePath(`/cliente/${slug}`)
  }

  // ---- Server actions: archivos colgados en la sala ----

  async function registrarArchivoAction(datos: {
    categoria: CategoriaArchivo
    titulo: string
    fecha: string | null
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    try {
      await registrarArchivo({
        salaSlug: slug,
        categoria: datos.categoria,
        titulo: datos.titulo,
        fecha: datos.fecha ? new Date(datos.fecha) : null,
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
    revalidatePath(`/cliente/${slug}`)
    return {}
  }

  async function editarArchivoAction(id: string, cambios: { titulo: string; fecha: string | null }) {
    'use server'
    await exigirEditor()
    await editarArchivo(id, {
      titulo: cambios.titulo,
      fecha: cambios.fecha ? new Date(cambios.fecha) : null,
    })
    revalidatePath(`/cliente/${slug}`)
  }

  async function eliminarArchivoAction(id: string) {
    'use server'
    await exigirEditor()
    // Franco: "si algo se elimina también se elimina del almacenamiento".
    // Primero la fila, luego el binario: al revés, un fallo al borrar el
    // archivo dejaría una fila que apunta a la nada.
    const quitado = await eliminarArchivo(id)
    if (quitado) await del(quitado.ruta).catch(() => {})
    revalidatePath(`/cliente/${slug}`)
  }

  const estiloMarca = {
    '--marca': tema.primario,
    '--marca-texto': colorDeTextoDeMarca(tema.primario),
    '--gradiente': `linear-gradient(120deg, ${tema.gradiente.join(', ')})`,
  } as CSSProperties

  const abiertos = acuerdosAbiertos(s)
  const vencidos = acuerdosVencidos(s)
  // La reunión ya llega cosida —presentación, minuta y acuerdos juntos— desde
  // `estadoDeSalaDB` (Tarea 7). Ver `EstadoSala.reuniones`, `dominio/salas.ts`.
  const reuniones = s.reuniones
  /**
   * QUIÉN PREPARÓ Y QUIÉN PRESENTÓ CADA REUNIÓN, junto a cada una en la sala
   * (ronda 10) — SOLO EQUIPO, con el mismo `equipo` de arriba (`esLector()`).
   *
   * Mismo razonamiento que `directorio()` unas líneas más arriba, y mismo
   * agujero que ya se cerró en `/reunion/[id]`: la guarda no puede estar
   * solo en lo que se PINTA —`ReunionesSala` es `'use client'`, y lo que
   * un Server Component le pasa de prop se serializa en el payload aunque el
   * propio componente decida no mostrarlo— sino en lo que se PIDE. Sin
   * equipo, `participantesDe` NI SIQUIERA SE LLAMA: los nombres de Mkt Corp
   * no llegan a existir en este cierre, así que no hay nada que viajar al
   * navegador del director.
   *
   * `r.id`, no `r.sesionId` (Tarea 7): el `Reunion` nuevo siempre lo trae —no
   * hace falta el filtro `Boolean(...)` que exigía el viejo campo opcional.
   */
  const idsDeReunion = reuniones.map((r) => r.id)
  const participacionPorReunion: Record<string, Participante[]> = {}
  if (equipo) {
    const listas = await Promise.all(idsDeReunion.map((id) => participantesDe(id)))
    idsDeReunion.forEach((id, i) => { participacionPorReunion[id] = listas[i] })
  }
  // Toda reunión de ESTA sala cuyo día ya llegó y siga sin minuta, sea
  // agendada o dada. Ver `sesionesMinutables`.
  //
  // Sigue funcionando sin cambios contra `EstadoReunion` (ronda 10): su
  // filtro excluye `estado !== 'borrador' && estado !== 'agendada'` — con
  // solo dos valores posibles (`'agendada'` | `'dada'`), eso sigue
  // significando exactamente "excluye las agendadas", que es lo mismo que
  // significaba antes.
  const conMinuta = new Set(reuniones.filter((r) => r.minuta).map((r) => r.id))
  const pendientesDeMinuta = sesionesMinutables(
    reunionesDeLaSala.map((x) => ({ ...x, salaSlug: slug })),
    conMinuta,
    hoyCivil,
  )
  /**
   * POR CONFIRMAR (punto 2/3): reuniones que la deducción automática de
   * `fueDada` (`dominio/reunion.ts`) ya cuenta como dadas —tienen respaldo y
   * su día ya pasó— pero que nadie ha confirmado ni negado todavía.
   *
   * MIGRADO EN LA TAREA 7 de `sesionesPorConfirmar` (dominio/salas.ts, ahora
   * retirada) a `reunionesPorConfirmar` (dominio/reunion.ts): la vieja
   * función leía `listarReuniones()` (`ReunionResumen[]`, sin
   * `documentoListo`/`archivos`/`minuta`) y su filtro exigía `estado ===
   * 'lista'` — un valor que `EstadoReunion` ya no tiene, así que daba
   * SIEMPRE vacío. La nueva opera sobre `reuniones` (arriba, ya trae el
   * respaldo completo) y de verdad detecta lo que quedó dado sin que nadie
   * lo confirmara — cerrando el hueco que dejó la T5b.
   *
   * `salaActiva: s.activa` (revisión: confirmar/negar es "gestión", y una
   * sala en pausa no la admite — mismo criterio que `crearReunion`). Basta
   * con el `activa` DE ESTA SALA para todas: a diferencia del Home, `reuniones`
   * es siempre de la MISMA sala. El resultado —`Reunion[]`, sin nombre ni
   * color de sala— se reempaqueta en `SesionPorConfirmar` con la identidad
   * que esta página ya conoce, para lo que espera `ReunionesPorConfirmar`.
   */
  const porConfirmar: SesionPorConfirmar[] = reunionesPorConfirmar(
    reuniones.map((r) => ({ ...r, salaActiva: s.activa })),
    hoyCivil,
  ).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    fecha: r.fecha,
    salaSlug: slug,
    salaNombre: s.nombre,
    salaColor: s.color,
    noDadaEn: r.noDadaEn,
  }))

  return (
    <div className={estilos.app} style={estiloMarca}>
      <header className={estilos.barra}>
        {/* El director solo tiene acceso a esta sala: mandarlo al hub sería
            ofrecerle una puerta que el proxy le cierra en la cara. */}
        {equipo ? (
          <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        ) : (
          <span className={estilos.volver}>Marketing Corp</span>
        )}
        <div className={estilos.barraSala}>
          <span className={estilos.barraPunto} />
          {s.nombre}
        </div>
        {/* SIEMPRE HAY SALIDA. Quien entra con un link de sala se quedaba sin
            ninguna: la raíz lo devolvía aquí, esta pantalla no ofrecía nada, y
            la cookie dura 30 días. Una sesión que no se puede terminar no es
            una sesión, es una trampa — y en un ordenador compartido, además,
            deja la sala de una UDN abierta a quien se siente después.
            Va DESPUÉS del nombre: el `margin-left:auto` del nombre ya empuja
            el bloque a la derecha, y con dos autos el primero se comía todo el
            hueco y dejaba «Salir» flotando en mitad de la barra. */}
        {!equipo && (
          <form action={salirDeLaSala}>
            <button type="submit" className={estilos.salirBoton}>Salir</button>
          </form>
        )}
      </header>

      {/* Encabezado vestido de la marca de la UDN.
          Franco: "la sala de cada UDN debería estar bandeada con su logo
          también". El logotipo va en su variante BLANCA sobre el degradado: la
          de color trae tintas que contra el degradado de su propia marca
          desaparecen —el morado de Zeus sobre morado— y ninguna de las diez
          está pensada para ir sobre color. */}
      <div className={estilos.hero}>
        <div className={estilos.heroInner}>
          <div className={estilos.heroKicker}>Cliente · Marketing Corp</div>
          <Image
            // logoUrl de la fila, y solo si es null cae al archivo estático
            // (revisión final de la rama, punto 3) — `s` ya trae la columna
            // real (ver EstadoSala.logoUrl, src/dominio/salas.ts).
            src={archivoDeLogo(slug, 'blanco', s.logoUrl)}
            alt={s.nombre}
            width={340}
            height={80}
            priority
            className={estilos.heroLogo}
            // Cada marca a SU altura: igualar alturas hace que un logotipo
            // apaisado ocupe cuatro veces más mancha. Ver `temas/logos.ts`.
            // El ×2,2 es porque aquí el logo ES el título de la página, no una
            // marca de identificación dentro de una tarjeta.
            style={{ '--alto-logo': `${altoDeLogo(slug) * 2.2}px` } as CSSProperties}
          />
          {/* El nombre sigue en el árbol para quien no ve la imagen: el
              logotipo lleva `alt`, pero un h1 real es lo que da a la página su
              encabezado. */}
          <h1 className={estilos.heroNombreOculto}>{s.nombre}</h1>
          <div className={estilos.heroMeta}>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{textoDiasDesde(s.diasDesdeUltima)}</span>
              <span className={estilos.heroMetaL}>última reunión</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>
                {s.proximaReunion ? fechaCompleta(s.proximaReunion) : 'por agendar'}
              </span>
              <span className={estilos.heroMetaL}>próxima reunión</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{abiertos}{vencidos > 0 ? ` · ${vencidos} venc.` : ''}</span>
              <span className={estilos.heroMetaL}>acuerdos abiertos</span>
            </div>
          </div>
        </div>
      </div>

      <main className={estilos.main}>
        {/* EL FREEZE (tarea 12): equipo ve el interruptor completo —pausar o
            reactivar, con lo que cada uno implica—; el director de solo
            lectura, si está en pausa, ve el mismo aviso sin el control, para
            no ofrecerle un botón que su sesión no puede usar. */}
        {equipo ? (
          <PausaSala
            nombreSala={s.nombre}
            activa={s.activa}
            pausadaDesde={s.pausadaDesde}
            pausarAction={pausarEstaSalaAction}
            reactivarAction={reactivarEstaSalaAction}
          />
        ) : (
          !s.activa && (
            <div className={estilos.avisoCongelado}>
              <span>
                <strong>{s.nombre} está en pausa</strong>
                {s.pausadaDesde ? ` desde el ${fechaCompleta(s.pausadaDesde)}` : ''}: no hay reuniones ni
                gestión hasta nuevo aviso. Los acuerdos se pueden seguir consultando y no vencen
                mientras tanto.
              </span>
            </div>
          )
        )}

        {/* POR QUÉ ESTÁS AQUÍ, dicho en vez de dejarlo adivinar.
            Quien llega con un link de sala y no esperaba estar aquí —alguien
            de Mkt Corp que abrió el link para comprobar que servía— veía una
            sala ajena, sin explicación, y un «Salir» diminuto en la esquina.
            Un redirect silencioso no deja a nadie de pie. */}
        {!equipo && (
          <div className={estilos.avisoAcceso}>
            <span>
              Estás viendo el espacio de <strong>{s.nombre}</strong> con un acceso de solo lectura.
            </span>
            <a href="/entrar" className={estilos.avisoEnlace}>
              ¿Eres de Marketing Corporativo? Entra con tu clave →
            </a>
          </div>
        )}

        {/* Acuerdos primero — es lo que el director quiere ver */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            <IconoSeccion nombre="acuerdos" />
            Acuerdos
            <span className={estilos.conteo}>{s.acuerdos.length}</span>
          </h2>
          {s.acuerdos.length === 0 && !equipo ? (
            <p className={estilos.benchmarkNota}>Sin acuerdos registrados todavía.</p>
          ) : (
            <div className={estilos.acuerdos}>
              {s.acuerdos.map((a) => {
                const f = textoFechaAcuerdo(a)
                // Congelado (tarea 12): un abierto de una sala en pausa. Su
                // estatus efectivo ya llega como 'abierto' —estatusEfectivo
                // no lo pasa a vencido mientras la sala está apagada—, pero
                // decir solo "abierto" sobre una fecha vieja no explicaría
                // por qué no está en rojo. Se lo dice esta etiqueta aparte.
                const congelado = estaCongelado(a, s)
                const claseEstado = congelado ? estilos.congelado : estilos[a.estatus]
                return (
                  <div key={a.id} className={estilos.acuerdo}>
                    <span className={`${estilos.acuerdoEstado} ${claseEstado}`} />
                    <div>
                      <div className={estilos.acuerdoQue}>{a.que}</div>
                      <div className={estilos.acuerdoMeta}>
                        <span>{a.responsable === 'por asignar' ? 'sin dueño' : a.responsable}</span>
                        {a.squad && <><span className={estilos.sep}>·</span><span>{a.squad}</span></>}
                        <span className={estilos.sep}>·</span>
                        <span className={`${estilos.acuerdoFecha} ${f.clase ? estilos[f.clase] : ''}`}>{f.txt}</span>
                      </div>
                    </div>
                    <div className={estilos.acuerdoDcha}>
                      <span className={`${estilos.acuerdoBadge} ${claseEstado}`}>
                        {congelado ? 'congelado' : ETIQUETA_ESTADO[a.estatus]}
                      </span>
                      {/* La estrella: SOLO equipo, no `editaAcuerdos` — es
                          Mkt Corp quien cura el Home, el director de la UDN
                          no se auto-destaca (ver destacarAction). */}
                      {equipo && (
                        <Estrella acuerdoId={a.id} destacado={a.destacado ?? false} destacar={destacarAction} />
                      )}
                      {/* El director de la UDN ve el estatus; solo Mkt Corp lo mueve. */}
                      {editaAcuerdos && (
                        <AcuerdoControles
                          acuerdoId={a.id}
                          estatusInicial={a.estatus}
                          fechaInicial={a.fechaCompromiso}
                          cambiarEstatusAction={cambiarEstatusAction}
                          editarFechaAction={editarFechaAction}
                          eliminarAction={eliminarAcuerdoAction}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {editaAcuerdos && <NuevoAcuerdoForm crearAction={crearAcuerdoAction} personas={personas} />}
        </section>

        {/* REUNIONES — la presentación y su minuta, juntas.
            Franco: "el módulo Presentaciones y minutas creo que debe ser uno,
            así la presentación está asociada a una minuta, es decir a una
            reunión". Eran dos listas paralelas ordenadas cada una por su
            cuenta; para saber qué se acordó en la presentación de mayo había
            que buscar mayo dos veces. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            <IconoSeccion nombre="reuniones" />
            Reuniones
            {reuniones.length > 0 && <span className={estilos.conteo}>{reuniones.length}</span>}
          </h2>

          {/* LO QUE SE ESTÁ PREPARANDO, arriba y con su avance.
              Franco: "si trae una presentación en preparación debería aparecer
              dentro del espacio, así el usuario ingresa y sigue editando".
              Tenía razón y era un agujero raro: el Home SÍ lo enseñaba —"18 de
              18 secciones"— y el espacio del propio cliente, que es donde uno
              entra a trabajar, no. */}
          {equipo && enPreparacion.length > 0 && (
            <div className={estilos.enPreparacion}>
              {enPreparacion.map((p) => {
                const doc = documentosEnPreparacion.get(p.id)
                const totalItems = doc?.items.length ?? 0
                const itemsLlenados = doc?.items.filter((it) => it.llenado).length ?? 0
                return (
                <Link key={p.id} href={`/deck/${p.id}`} className={estilos.enPreparacionFila}>
                  <span className={estilos.enPreparacionTexto}>
                    <strong>{p.titulo}</strong>
                    <span>
                      {fechaBreve(p.fecha)} · {itemsLlenados} de {totalItems} secciones
                    </span>
                  </span>
                  <span className={estilos.enPreparacionSeguir}>Seguir editando →</span>
                </Link>
                )
              })}
            </div>
          )}

          <ReunionesSala reuniones={reuniones} equipo={equipo} participacionPorReunion={participacionPorReunion} />

          {/* POR CONFIRMAR (punto 2/3): reuniones `lista` con el día ya
              pasado que la deducción automática de `fueDada` ya cuenta como
              dadas —o casi— en el contador y arriba, en "Reuniones", pero que
              nadie ha confirmado ni negado todavía. Solo equipo: las dos
              acciones exigen editor. */}
          {equipo && porConfirmar.length > 0 && (
            <div className={estilos.subseccion}>
              <h3 className={estilos.subseccionTitulo}>Por confirmar</h3>
              <ReunionesPorConfirmar
                sesiones={porConfirmar}
                marcarPresentadaAction={marcarPresentadaAction}
                marcarNoDadaAction={marcarNoDadaAction}
                desmarcarNoDadaAction={desmarcarNoDadaAction}
              />
            </div>
          )}

          {equipo && (
            <div className={estilos.reunionAcciones}>
              {/* Con la sala en pausa no se puede preparar una reunión nueva
                  sin reactivarla primero: consultar su historia sí, empezar
                  trabajo nuevo no. Esto es solo el atajo —lo que de verdad
                  lo impide es que `crearReunion` (src/db/reuniones.ts) rechaza
                  la escritura del lado del servidor pase lo que pase aquí. */}
              {s.activa && <NuevaSesionSala nombreSala={s.nombre} crearAction={crearSesionAction} />}
              <LevantarMinuta
                sesiones={pendientesDeMinuta}
                salaFija={slug}
                claseBoton={estilos.nuevaMinutaBoton}
                personas={personas}
              />
            </div>
          )}

          {/* Las anteriores a esta herramienta: archivos, no documentos web.
              Van en la misma sección porque para el director son lo mismo —lo
              que se le presentó— con su propio subtítulo para que se entienda
              por qué unas se abren y otras se descargan. */}
          {(archivosPresentaciones.length > 0 || equipo) && (
            <div className={estilos.subseccion}>
              <h3 className={estilos.subseccionTitulo}>Antes de esta herramienta</h3>
              <ArchivosSala
                salaSlug={slug}
                categoria="presentacion"
                archivos={archivosPresentaciones}
                equipo={equipo}
                registrarAction={registrarArchivoAction}
                editarAction={editarArchivoAction}
                eliminarAction={eliminarArchivoAction}
              />
            </div>
          )}
        </section>

        {/* Benchmark competitivo — vive a nivel de sala, se nutre en el tiempo (spec §5) */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            <IconoSeccion nombre="benchmark" />
            Benchmark competitivo
            {benchmark && <span className={estilos.conteo}>{s.nombre} + {benchmark.competidores.length} competidores</span>}
          </h2>
          <BenchmarkSala benchmark={benchmark} nombreSala={s.nombre} salaSlug={slug} />
        </section>

        {/* Archivos de interés — al final, como los pidió Franco: lo que el
            equipo estime conveniente tener a mano en la sala. */}
        {(archivosDeInteres.length > 0 || equipo) && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              <IconoSeccion nombre="archivos" />
              Archivos de interés
              {archivosDeInteres.length > 0 && (
                <span className={estilos.conteo}>{archivosDeInteres.length}</span>
              )}
            </h2>
            <ArchivosSala
              salaSlug={slug}
              categoria="interes"
              archivos={archivosDeInteres}
              equipo={equipo}
              registrarAction={registrarArchivoAction}
              editarAction={editarArchivoAction}
              eliminarAction={eliminarArchivoAction}
            />
          </section>
        )}

        {/* Compartir la sala con su director. Solo lo ve el equipo. */}
        {equipo && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              <IconoSeccion nombre="clave" />
              Acceso del director
            </h2>
            <ClaveDeSala
              nombreSala={s.nombre}
              tiene={clave.tiene}
              creadaEn={clave.creadaEn}
              regenerarAction={regenerarClaveAction}
              quitarAction={quitarClaveAction}
            />

            {/* El link firmado sigue existiendo, DENTRO de la misma tarjeta:
                las dos son la misma pregunta —cómo entra el director— y
                separarlas en dos secciones las hacía parecer dos temas. */}
            {tokenDeAcceso && (
            <div className={estilos.acceso} style={{ marginTop: '0.9rem' }}>
              <div className={estilos.accesoTexto}>
                <div className={estilos.accesoTitulo}>Link de solo lectura para {s.nombre}</div>
                <p className={estilos.accesoNota}>
                  Quien tenga este link entra a este espacio —y solo a este— sin clave: compártelo por
                  canal privado. Caduca en 30 días y no permite mover acuerdos.
                </p>
              </div>
              <CopiarBoton
                texto={`${await urlBase()}/cliente/${slug}?acceso=${tokenDeAcceso}`}
                className={estilos.accesoBoton}
              />
            </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
