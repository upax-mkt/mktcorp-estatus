import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { connection } from 'next/server'
import type { CSSProperties } from 'react'
import estilos from '../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import {
  estadoDeSala, acuerdosAbiertos, acuerdosVencidos, estaCongelado, type Acuerdo,
} from '@/db/consultas'
import {
  type SesionPorConfirmar,
} from '@/dominio/salas'
import { fueDada, reunionesMinutables, reunionesPorConfirmar } from '@/dominio/reunion'
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
import { PausaSala } from '@/componentes/PausaSala'
import { Estrella } from '@/componentes/acuerdos/Estrella'
import {
  marcarDada, marcarNoDada, desmarcarNoDada, obtenerReunion,
} from '@/db/reuniones'
import { crearReunionConDocumento, documentoDeReunion } from '@/db/documentos'
import { pausarSalaAction, reactivarSalaAction, destacarAction } from '@/app/acuerdos/acciones'
import { PLANTILLAS } from '@/secciones/plantillas'
import { fechaBreve, fechaCompleta, textoDiasDesde, diaCivil, instanteEnCDMX } from '@/lib/fecha'
import {
  exigirEdicionDeAcuerdos, puedeEditarAcuerdosDe,
  puedeVerEstaSala, cerrarSesion,
} from '@/auth/sesion'
import { esAdmin, esLector, exigirEditor } from '@/auth/roles'
import { BarraNavegacion } from '@/componentes/BarraNavegacion'

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
  const [benchmark, archivosDeInteres, personas] = await Promise.all([
    obtenerBenchmark(slug),
    listarArchivos(slug, 'interes'),
    /**
     * Para el selector de responsable de NuevoAcuerdoForm/LevantarMinuta —
     * SOLO SI ES EQUIPO (corrección de la revisión final de la ronda 7,
     * punto 7).
     *
     * Esta página se comparte con el cliente interno por un enlace firmado
     * de 30 días: se redime aquí (`puedeVerEstaSala`, arriba, y
     * `src/proxy.ts`, que canjea `?acceso=<token>` por la cookie de sesión)
     * aunque se GENERE en `cliente/[slug]/ajustes/page.tsx` desde la ronda
     * 11, tarea 4 — las dos mitades son independientes: dónde se firma un
     * token no cambia cómo se verifica. Antes `directorio()`
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
  // Fuente única de "qué día es hoy" (src/lib/fecha.ts) — la reutilizan
  // `enPreparacion` (aquí abajo), `pendientesDeMinuta` y `porConfirmar`, más
  // adelante: las tres necesitan la MISMA respuesta a "¿ya pasó el día?".
  // `connection()`/`hoy` (ronda 11, enganche de la tarea 2): mismo mecanismo
  // que las demás pantallas de esta ronda, para que `BarraNavegacion` pinte
  // la fecha de HOY, no la del build. `dynamic = 'force-dynamic'` (arriba)
  // ya vuelve dinámica esta página por otro motivo (necesita datos frescos
  // en cada carga — ver su comentario), pero se deja explícito por el mismo
  // motivo que en las demás pantallas de esta ronda: no depender de un
  // efecto colateral para algo que se puede pedir directamente. `hoyCivil`
  // se deriva de este mismo `hoy`, no de un `new Date()` aparte: un solo
  // instante para toda la función.
  await connection()
  const hoy = new Date()
  const hoyCivil = diaCivil(hoy.toISOString())
  /**
   * LO QUE ESTÁ A MEDIO ARMAR PARA ESTE CLIENTE.
   *
   * CORREGIDO (revisión final de la ronda 10, hallazgo 2): el filtro perdió
   * su segunda mitad al migrar de sesión a reunión. `EstadoReunion` es
   * 'agendada' | 'dada' — `'agendada'` sola ya no basta, porque `fueDada`
   * (`dominio/reunion.ts`, escrita en esta misma ronda) puede deducir una
   * reunión como dada SIN que nadie la haya confirmado a mano (con respaldo
   * y el día ya pasado). Sin el `!fueDada` de aquí, esa misma reunión salía
   * DOS VECES en pantalla: aquí arriba con "Seguir editando →" y más abajo,
   * en "Por confirmar" (`reunionesPorConfirmar`, que sí aplica ese mismo
   * criterio), con "¿se dio?" — la misma pregunta respondida en dos sitios
   * que no se enteran uno del otro.
   *
   * `s.reuniones`, no la vieja `reunionesDeLaSala` (derivada de
   * `listarReuniones()`, un `ReunionResumen[]` sin `documentoListo`/
   * `archivos`/`minuta`): `fueDada` necesita ese respaldo completo, y
   * `EstadoSala.reuniones` (`estadoDeSalaDB`, Tarea 7) ya lo trae cosido —
   * la misma fuente que usa `pendientesDeMinuta`, más abajo.
   */
  const enPreparacion = s.reuniones.filter((r) => r.estado === 'agendada' && !fueDada(r, hoyCivil))
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
   * ADMIN, no `equipo` — `esAdmin()`, no un hardcodeo, por el mismo criterio
   * que el resto de la app: si el gate cambiara, un valor fijo mentiría.
   *
   * YA NO DECIDE UN TOKEN AQUÍ. Hasta la ronda 11 tarea 4, `admin` también
   * gateaba `generarTokenDeSala` (el link firmado de 30 días) directamente
   * en esta pantalla — corrección post-revisión de la ronda 9, "agujero
   * crítico": con `equipo` como guarda, CUALQUIER viewer que abriera esta
   * página se llevaba un link válido servido en el propio HTML. Ese
   * mecanismo se mudó ENTERO a `cliente/[slug]/ajustes/page.tsx` (Crítico A
   * de la auditoría UX/UI: dos secciones "Acceso del director" con el mismo
   * nombre y mecanismos distintos, fusionadas en una sola, allá). Lo que
   * sigue dependiendo de `admin` en ESTA página es el enlace ⚙ hacia esa
   * pantalla (más abajo) y el gate de Clientes/Personas dentro de
   * `BarraNavegacion`.
   */
  const admin = await esAdmin()
  // El director de la UDN mueve los acuerdos de SU sala; el resto de la
  // pantalla sigue siendo de solo lectura para él.
  const editaAcuerdos = await puedeEditarAcuerdosDe(slug)

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
   *
   * `datos.titulo` SE REENVÍA TAL CUAL (deuda menor, cierre de ronda — el
   * tercero de tres formularios que mandaban el título vacío). `AgendarRapido`
   * (Home, `agendarRapidoAction`) y `deck/nueva` ya reenviaban su
   * `datos.titulo`; este atajo mandaba `titulo: ''` FIJO, sin mirar nada —
   * porque `NuevaSesionSala` ni siquiera pedía el campo. Vacío o lleno,
   * `datos.titulo` viaja sin tocar: `crearReunionConDocumento` decide qué
   * hacer con cada caso (cae a `tituloPorDefecto` si llega vacío o solo
   * espacios — ver su comentario, `src/db/documentos.ts`).
   */
  async function crearSesionAction(
    datos: { plantilla: string; dia: string; titulo: string },
  ): Promise<{ error?: string }> {
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
        titulo: datos.titulo,
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

  async function marcarPresentadaAction(reunionId: string) {
    'use server'
    const quien = await exigirEditor()
    await marcarDada(reunionId)
    if (quien.sub) await registrarEdicion(reunionId, quien.sub)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function marcarNoDadaAction(reunionId: string) {
    'use server'
    const quien = await exigirEditor()
    await marcarNoDada(reunionId)
    if (quien.sub) await registrarEdicion(reunionId, quien.sub)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function desmarcarNoDadaAction(reunionId: string) {
    'use server'
    const quien = await exigirEditor()
    await desmarcarNoDada(reunionId)
    if (quien.sub) await registrarEdicion(reunionId, quien.sub)
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

  // ---- Server actions: archivos colgados en la sala ----

  async function registrarArchivoAction(datos: {
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
  }): Promise<{ error?: string }> {
    'use server'
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
      if (!reunionDelArchivo || reunionDelArchivo.salaSlug !== slug) {
        // El binario ya pudo haber subido antes de llegar aquí (la subida es
        // navegador → Blob directo — ver el comentario de `ArchivosSala`):
        // sin fila que lo registre, es basura invisible que se sigue pagando.
        await del(datos.ruta).catch(() => {})
        return { error: 'Esa reunión no es de esta sala.' }
      }
    }
    try {
      await registrarArchivo({
        salaSlug: slug,
        reunionId: datos.reunionId ?? null,
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
  async function editarArchivoAction(id: string, cambios: { titulo: string; fecha?: string | null }) {
    'use server'
    await exigirEditor()
    await editarArchivo(id, {
      titulo: cambios.titulo,
      ...(cambios.fecha !== undefined ? { fecha: cambios.fecha ? new Date(cambios.fecha) : null } : {}),
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
    // El sólido validado del hero (auditoría UX/UI, hallazgo 4) — ver el
    // comentario de `.hero`/`.heroSolida` en cliente.module.css.
    '--hero-superficie': tema.superficieOscura,
    '--hero-texto': tema.textoSobreOscura,
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
  /**
   * TODA REUNIÓN DE ESTA SALA CUYO DÍA YA LLEGÓ Y SIGA SIN MINUTA, sea
   * agendada o dada.
   *
   * CORREGIDO (revisión final de la ronda 10, hallazgo 1 — Y ES UNA
   * REGRESIÓN DE UNA LECCIÓN VIEJA): esto llamaba a `sesionesMinutables`
   * (`dominio/salas.ts`, retirada en esta misma revisión), cuyo filtro
   * `estado !== 'borrador' && estado !== 'agendada'` se escribió para el
   * modelo viejo de cinco estados, donde dejaba pasar `lista`/`presentada`/
   * `minutada`. Con `EstadoReunion = 'agendada' | 'dada'` ese mismo filtro
   * pasó a significar SOLO 'dada' — obligando a confirmar a mano antes de
   * poder minutar, justo el papeleo que esta misma función existía para
   * evitar (ver su comentario original: "obligar al papeleo... es la forma
   * más segura de que nadie encuentre el motor de transcripción"). De siete
   * reuniones dadas en la base real solo una se había marcado a mano.
   *
   * `reunionesMinutables` (`dominio/reunion.ts`, escrita en esta misma
   * ronda) es el reemplazo correcto: `estado === 'dada' || tienePresentacion(r)`
   * — una reunión maquetada cuenta aunque nadie la haya confirmado. Opera
   * sobre `reuniones` (= `s.reuniones`, arriba), que ya trae el respaldo
   * completo (`documentoListo`/`archivos`/`minuta`) que necesita para
   * decidir — la vieja `reunionesDeLaSala` (un `ReunionResumen[]` plano, sin
   * ese respaldo) ya no hace falta.
   */
  const pendientesDeMinuta = reunionesMinutables(reuniones, hoyCivil)
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
      {/* LA BARRA (ronda 11, enganche de la tarea 2) — SOLO EQUIPO, es el
          punto central de esta tarea: a diferencia de las otras siete
          pantallas que ya la montan, esta sala también la ve el DIRECTOR de
          la UDN (sesión `rol: 'sala'`, sin `equipo`). `BarraNavegacion` no
          sabe de roles —recibe `admin` para el gate de Clientes/Personas,
          pero nada que distinga equipo de director—, así que montada a
          secas un director vería el menú global entero: cinco enlaces que
          `puedeVerRuta` (`src/auth/politica.ts`, lista blanca estricta) le
          va a negar a TODOS, más la insinuación de que hay más app de la
          que le toca ver. `equipo` (= `esLector()`, línea arriba) es la
          MISMA variable que ya condiciona el resto de esta pantalla para el
          director — fijado con test en `page.test.ts` ("BarraNavegacion es
          SOLO EQUIPO"): director no la ve, equipo sí. Esto es cortesía de
          interfaz, no la protección real —esa sigue siendo `puedeVerRuta`
          en el proxy y cada `exigir*()`/`puedeVer*()` de página, sin
          tocar—, pero es la que evita prometerle al director una app que no
          puede usar.

          Sin `seccionActiva`: la sala no es ninguna de las cinco pestañas
          del ciclo, mismo motivo que el Home.

          `salirAction={salirDeLaSala}`: reutiliza la Server Action que esta
          pantalla ya define más abajo (idéntica a `salir` de las otras
          siete: `cerrarSesion()` + `redirect('/entrar')`) en vez de declarar
          una segunda copia byte-a-byte en el mismo archivo. El criterio de
          "repetir `salir` a propósito en cada pantalla" (ver `deck/page.tsx`)
          es para no CENTRALIZARLA entre archivos —evitar tocar
          `auth/sesion.ts` a media ronda—; dentro de un mismo archivo sigue
          siendo la misma función, ahora con dos disparadores: el botón
          "Salir" de abajo para el director, y esta barra para el equipo. */}
      {equipo && (
        <BarraNavegacion hoy={hoy} admin={admin} salirAction={salirDeLaSala} />
      )}

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
        {/* AJUSTES DE LA SALA (ronda 10, tarea 9b). Franco, en la misma queja
            que originó la ronda: "además la sala debería tener arriba un
            enlace para los ajustes de la misma sala". Lleva a
            `/cliente/[slug]/ajustes` (Tarea 15). SOLO ADMIN — no porque
            esconderlo proteja nada (esa página exige `exigirAdmin()` como su
            primera línea, y ESO es lo que protege), sino porque a un editor
            este enlace le rebotaría. Nunca coincide con el "Salir" de abajo:
            admin implica equipo (`esLector()`), así que cuando este enlace
            se pinta, `!equipo` ya es falso. */}
        {admin && (
          <Link href={`/cliente/${slug}/ajustes`} className={estilos.ajustesEnlace} aria-label="Ajustes de la sala">
            <span aria-hidden>⚙</span>
          </Link>
        )}
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
        </div>
      </div>
      {/* EL KICKER Y LAS CIFRAS VAN AQUÍ, NO DENTRO DEL DEGRADADO (auditoría
          UX/UI, hallazgo 4): ver el comentario de `.hero`/`.heroSolida` en
          cliente.module.css. */}
      <div className={estilos.heroSolida}>
        <div className={estilos.heroInner}>
          <div className={estilos.heroKicker}>Cliente · Marketing Corp</div>
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

          <ReunionesSala
            reuniones={reuniones}
            equipo={equipo}
            participacionPorReunion={participacionPorReunion}
            salaSlug={slug}
            registrarArchivoAction={registrarArchivoAction}
            editarArchivoAction={editarArchivoAction}
          />

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

        {/* ACCESO DEL DIRECTOR (clave + link firmado): SE MUDÓ ENTERO A
            AJUSTES (ronda 11, tarea 4 — cierra el Crítico A de la auditoría
            UX/UI). Hasta esta tarea, la tarea 3 solo había mudado la clave
            (`ClaveDeSala`); el link firmado de 30 días se quedó aquí, en su
            propia tarjeta, TAMBIÉN titulada "Acceso del director" — dos
            secciones iguales de nombre y mecanismos distintos, en dos
            pantallas, que es justo lo que reportó la auditoría (peor que el
            problema que Franco había señalado en la ronda 11). Ahora las dos
            viven juntas en `cliente/[slug]/ajustes/page.tsx`, bajo un solo
            encabezado que explica la diferencia entre ambas. El enlace ⚙ de
            la cabecera (arriba) es la ÚNICA puerta hacia ellas — en la sala
            no queda nada de esto. */}
      </main>
    </div>
  )
}
