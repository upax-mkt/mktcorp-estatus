import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { connection } from 'next/server'
import type { CSSProperties } from 'react'
import estilos from '../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { colorDeTextoSobre } from '@/lib/marca'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import {
  estadoDeSala, acuerdosAbiertos, acuerdosVencidos, estaCongelado, type Acuerdo,
} from '@/db/consultas'
import {
  type SesionPorConfirmar,
} from '@/dominio/salas'
import {
  historialDeReuniones, reunionesMinutables, reunionesPorConfirmar, reunionesPorVenir,
  seEstaArmando,
} from '@/dominio/reunion'
import { altoDeLogo, archivoDeLogo } from '@/temas/logos'
import type { Metadata } from 'next'
import { Seccion } from '@/componentes/Seccion'
import { FilaAcuerdo } from '@/componentes/acuerdos/FilaAcuerdo'
import { RedesDeSala } from '@/componentes/RedesDeSala'
import { MenuSecciones, type EntradaDeMenu } from '@/componentes/MenuSecciones'
import { TableroAnalytics } from '@/componentes/TableroAnalytics'
import {
  moverEstatus, editarAcuerdo, crearAcuerdo, eliminarAcuerdo, refrescarDesdeMonday, salaDeAcuerdo,
  type EstatusAcuerdo,
} from '@/db/acuerdos'
import { genteParaResponsable } from '@/db/personas'
import { participantesDe, registrarEdicion, type Participante } from '@/db/participacion'
import { ErrorMonday } from '@/monday/cliente'
import { obtenerBenchmark } from '@/db/benchmark'
import {
  listarArchivos, registrarArchivo, editarArchivo, eliminarArchivo, reubicarMateriales,
  type CategoriaArchivo,
} from '@/db/archivos'
import { del } from '@vercel/blob'
import { AcuerdoControles } from '@/componentes/AcuerdoControles'
import { NuevoAcuerdoForm } from '@/componentes/NuevoAcuerdoForm'
import { partirAcuerdosDeSala } from '@/dominio/orden-acuerdos'
import { equiposPara } from '@/lib/equipos'
import { BenchmarkSala } from '@/componentes/BenchmarkSala'
import { NotasDePrensa } from '@/componentes/NotasDePrensa'
import { AnadirNotaDePrensa } from '@/componentes/AnadirNotaDePrensa'
import { ReunionesSala } from '@/componentes/ReunionesSala'
import { ReunionesPorConfirmar } from '@/componentes/ReunionesPorConfirmar'
import { LevantarMinuta } from '@/componentes/LevantarMinuta'
import { normalizarEnlace } from '@/lib/materiales'
import { MaterialesAgrupados } from '@/componentes/MaterialesAgrupados'
import { AnadirMaterial } from '@/componentes/AnadirMaterial'
import { NuevaSesionSala } from '@/componentes/NuevaSesionSala'
import { Estrella } from '@/componentes/acuerdos/Estrella'
import { EditarAcuerdo } from '@/componentes/EditarAcuerdo'
import {
  marcarDada, marcarNoDada, desmarcarNoDada, obtenerReunion, eliminarReunion, crearReunion,
} from '@/db/reuniones'
import {
  documentoDeReunion, eliminarDocumentoDeReunion, tituloPorDefecto,
} from '@/db/documentos'
import { destacarAction } from '@/app/acuerdos/acciones'
import { PLANTILLAS } from '@/secciones/plantillas'
import { fechaCompleta, textoDiasDesde, diaCivil, instanteEnCDMX } from '@/lib/fecha'
import { puedeVerEstaSala, cerrarSesion, sesionActual } from '@/auth/sesion'
import { esAdmin, esEditor, esLector, exigirEditor } from '@/auth/roles'
import { slugsDeSalasPausadas } from '@/db/salas'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'

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

// `textoFechaAcuerdo` y `ETIQUETA_ESTADO` se mudaron a
// `componentes/acuerdos/FilaAcuerdo.tsx` con la fila que los usaba: el Home
// pinta ahora esa MISMA fila, y dos copias de "cómo se escribe la fecha de un
// acuerdo" es justo lo que hacía que las dos pantallas no coincidieran.

/**
 * QUÉ DICE EL ENCABEZADO DE ACUERDOS CUANDO ESTÁ PLEGADO.
 *
 * Un número a secas ("11") no sirve para decidir si abrir: once cumplidos y
 * once vencidos son la misma cifra y dos situaciones distintas. Se nombra lo
 * que exige acción —vencidos primero, luego abiertos— y lo cerrado se resume
 * en "al día" solo cuando no queda nada pendiente.
 */
function resumenDeAcuerdos(acuerdos: Acuerdo[]): string {
  if (acuerdos.length === 0) return 'ninguno'
  const vencidos = acuerdos.filter((a) => a.estatus === 'vencido').length
  const abiertos = acuerdos.filter((a) => a.estatus === 'abierto').length
  const partes: string[] = []
  if (vencidos > 0) partes.push(`${vencidos} vencido${vencidos > 1 ? 's' : ''}`)
  if (abiertos > 0) partes.push(`${abiertos} abierto${abiertos > 1 ? 's' : ''}`)
  if (partes.length === 0) return `${acuerdos.length} al día`
  return partes.join(' · ')
}

/**
 * Guarda un enlace en uno de los dos módulos de la sala.
 *
 * A NIVEL DE MÓDULO, NO DENTRO DE LA PÁGINA, y esto no es estilo. Declarada
 * dentro del componente, las dos Server Actions que la llaman se la llevarían
 * en su cierre, y React intenta serializarla al mandarlas al cliente:
 * "Functions cannot be passed directly to Client Components", con un 500 en
 * la sala entera. Aquí es una referencia de módulo que el servidor resuelve
 * sola. Por eso `slug` llega por parámetro en vez de por cierre.
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
 * LO QUE SE VE AL COMPARTIR EL ENLACE DE UNA SALA.
 *
 * Es la URL que Franco reparte a las UDNs, así que su vista previa es lo
 * primero que un director ve de esta app — antes de abrirla. Hasta la ronda 12
 * enseñaba el título genérico del layout ("Meeting Hub · Marketing Corp") en
 * las nueve salas por igual, describiendo la herramienta desde dentro en vez
 * de decirle a quien la recibe qué va a encontrar.
 *
 * `cargarTemas()` va cacheada por petición (`cache()`, src/db/temas.ts), así
 * que pedirla aquí no añade una consulta: es la misma que ya hace la página.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const tema = (await cargarTemas())[slug]
  // Sin tema no hay sala: la página va a devolver 404, y anunciar un nombre
  // inventado en la vista previa sería peor que no anunciar ninguno.
  if (!tema) return { title: 'Cliente' }

  const descripcion = `Acuerdos, reuniones, minutas y materiales de ${tema.nombre} con Marketing Corporativo.`
  return {
    title: tema.nombre,
    description: descripcion,
    openGraph: {
      title: `${tema.nombre} · Meeting Hub`,
      description: descripcion,
      // La imagen la genera `opengraph-image.tsx` de esta misma carpeta; Next
      // la enlaza sola. Se declara el resto para que el título y el texto no
      // caigan al del layout.
      type: 'website',
    },
  }
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
  // si se pide `genteParaResponsable()` — necesita el valor YA resuelto, no una
  // promesa hermana que todavía no corrió. `esLector()` y no la vieja
  // `esEquipo()` (retirada, corrección post-revisión de la ronda 9): esta
  // variable solo condiciona VISIBILIDAD (qué se pinta, si se carga el
  // directorio interno), nunca una escritura — para eso, más abajo, cada
  // Server Action exige lo suyo por su cuenta.
  const equipo = await esLector()
  /**
   * SI HAY ALGUNA SESIÓN QUE CERRAR. Desde que la sala es pública (Franco:
   * *"todo sin login, pueden descargar pero no pueden editar nada"*) hay tres
   * visitantes y no dos: el equipo, el director con su cookie de sala, y
   * QUIEN NO TRAE NADA — que es el caso principal, el del enlace que se
   * comparte. A ese último se le estaba pintando un botón "Salir" que no
   * tenía nada que cerrar. Ver el `<header>` de más abajo.
   */
  const conSesion = (await sesionActual()) !== null
  const [benchmark, materialesComerciales, notasDePrensa, archivosDeInteres, personas] = await Promise.all([
    obtenerBenchmark(slug),
    listarArchivos(slug, 'comercial'),
    listarArchivos(slug, 'prensa'),
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
     * token no cambia cómo se verifica. Antes `genteParaResponsable()`
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
    equipo ? genteParaResponsable() : Promise.resolve([]),
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
   * LO QUE VIENE Y LO QUE YA PASÓ — la única frontera que cambia lo que se
   * puede hacer con una reunión.
   *
   * Franco: *"sigue estando rara la lógica en el módulo de reuniones dentro
   * de la sala"*. Estaba raro porque la misma reunión se repartía en tres
   * bloques que no se hablaban —una tira de "en preparación" aquí, la lista
   * de reuniones en medio, "por confirmar" abajo— y el de arriba ofrecía
   * "Seguir editando" a toda reunión agendada, mirara o no si había un
   * documento que editar. Al descartar una presentación, la reunión seguía
   * ofreciéndose como editable con "0 de 0 secciones" debajo.
   *
   * Las dos listas las parte el dominio y son COMPLEMENTARIAS por
   * construcción (`historialDeReuniones` se define como "lo que no está por
   * venir"), así que ninguna reunión puede salir en las dos ni en ninguna.
   */
  /**
   * DE QUÉ REUNIÓN SALIÓ CADA ACUERDO (Franco: *"la lógica de los acuerdos
   * tiene que estar bien conectada a la minuta"*).
   *
   * La dirección reunión → acuerdos ya existía (cada reunión despliega los
   * suyos). Faltaba la de vuelta: leyendo un compromiso, no había forma de
   * llegar a la junta donde se acordó ni a su minuta. `reunionOrigenId` estaba
   * en el dato desde la ronda 10 y no lo usaba nadie.
   *
   * Se enlaza al ANCLA de la reunión en esta misma página (`#r-<id>`) y no a
   * `/reunion/<id>`: esa ruta enseña el documento, y lo que se quiere es la
   * junta con su minuta al lado, que es donde está el contexto del acuerdo.
   */
  const origenDeAcuerdo = new Map(s.reuniones.map((r) => [r.id, r]))

  const porVenir = reunionesPorVenir(s.reuniones, hoyCivil)
  const historial = historialDeReuniones(s.reuniones, hoyCivil)
  /**
   * CUÁNTAS SECCIONES LLEVA cada presentación por armar. No vive en
   * `ReunionResumen` (es del documento, no de la reunión), así que se resuelve
   * aquí — solo si hay equipo mirando, que es lo único que lo renderiza, y
   * solo para las que están por venir, que son unas pocas.
   *
   * `null` cuando la reunión no tiene documento: es lo que distingue "sin
   * presentación todavía" de "empezada", y lo que evita volver a ofrecer
   * seguir editando algo que no existe.
   */
  const avancePorReunion: Record<string, { llenados: number; total: number } | null> = {}
  if (equipo) {
    const docs = await Promise.all(
      porVenir.map(async (r) => [r.id, seEstaArmando(r) ? await documentoDeReunion(r.id) : null] as const),
    )
    for (const [id, doc] of docs) {
      avancePorReunion[id] = doc
        ? { llenados: doc.items.filter((it) => it.llenado).length, total: doc.items.length }
        : null
    }
  }

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
  // Los clientes del desplegable de la barra. Prop obligatoria a propósito:
  // así una pantalla nueva no puede montar la barra y olvidarse de ellos.
  const [clientes, pausadas] = await Promise.all([clientesParaBarra(), slugsDeSalasPausadas()])
  /**
   * Los equipos que pueden cargar con un acuerdo (ronda 13): los squads de Mkt
   * Corp y las salas vivas. Mismo criterio que en `/acuerdos` — si un
   * compromiso puede ser de RevOps, poder decirlo desde la sala donde se
   * levantó es lo natural. Las pausadas quedan fuera: a quien está en freeze no
   * se le encarga trabajo nuevo.
   */
  const equipos = equiposPara(
    clientes.map((c) => ({ nombre: c.nombre, activa: !pausadas.has(c.slug) })),
  )
  // El director de la UDN mueve los acuerdos de SU sala; el resto de la
  // pantalla sigue siendo de solo lectura para él.
  /**
   * QUIÉN EDITA LOS ACUERDOS EN ESTA PANTALLA: SOLO EL EQUIPO.
   *
   * Franco: *"cuando comparto esta URL, quien no está logueado solo puede ver
   * la vista de solo lectura; por ende no tiene que verse el botón añadir
   * acuerdo, ni poder modificar fechas o estatus"*.
   *
   * Era `puedeEditarAcuerdosDe(slug)`, que SÍ deja pasar al director de la UDN
   * para su propia sala — una decisión de la ronda 7 ("el director mueve sus
   * compromisos"). Franco la revierte: el enlace de una sala se comparte, y lo
   * compartido se mira, no se toca.
   *
   * `esEditor()` y no `equipo` (`esLector()`): un viewer de Marketing Corp
   * tampoco escribe. Y el gate de verdad está abajo, en cada acción —esconder
   * el botón nunca fue la protección—: las cuatro pasaron de
   * `exigirEdicionDeAcuerdos(slug)` a `exigirEditor()` en el mismo cambio.
   */
  const editaAcuerdos = await esEditor()

  // ---- Server actions: acuerdos editables (spec §4/§6) ----
  // "Solo el equipo Mkt Corp mueve el estatus": cada acción lo exige por su
  // cuenta. Ocultar los controles en la UI no basta — una Server Action es un
  // endpoint, y quien tenga su id puede llamarla sin pasar por la pantalla.

  async function cambiarEstatusAction(acuerdoId: string, estatus: EstatusAcuerdo) {
    'use server'
    await exigirEditor()
    await moverEstatus(acuerdoId, estatus)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
  }

  async function editarFechaAction(acuerdoId: string, fecha: string | null) {
    'use server'
    await exigirEditor()
    // `instanteEnCDMX` y NO `new Date(fecha)` (arreglo de ronda 14, tarea 2):
    // medido antes de tocar esta línea, `new Date('2026-09-01')` guarda el
    // día civil "2026-08-31" — medianoche UTC son las 18:00 del día anterior
    // en México — así que el acuerdo quedaba venciendo un día antes de lo
    // tecleado. La pestaña `/acuerdos` (`editarFechaEnTablaAction`, en
    // src/app/acuerdos/acciones.ts) escribe esta MISMA columna
    // (`fechaCompromiso`) con `instanteEnCDMX`; sin este cambio, el mismo
    // acuerdo mostraría un día distinto según por dónde se le tocó la fecha.
    await editarAcuerdo(acuerdoId, { fechaCompromiso: fecha ? instanteEnCDMX(fecha, '12:00') : null })
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
    await exigirEditor()
    await crearAcuerdo(slug, {
      que: datos.que,
      responsable: datos.responsable,
      responsableMondayId: datos.responsableMondayId,
      squad: datos.squad,
      // Misma columna, mismo arreglo que `editarFechaAction` arriba: un
      // acuerdo NUEVO no puede nacer con el día corrido solo porque se dio de
      // alta desde el formulario de la sala en vez de editado después.
      fechaCompromiso: datos.fechaCompromiso ? instanteEnCDMX(datos.fechaCompromiso, '12:00') : null,
    })
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
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
   * ⚠️ `exigirEditor()`, NO `exigirEdicionDeAcuerdos(slug)` — es la única
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
  async function editarAcuerdoTextoAction(
    acuerdoId: string,
    cambios: { que: string; responsable: string; responsableMondayId: string | null },
  ): Promise<{ error?: string }> {
    'use server'
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
    if ((await salaDeAcuerdo(acuerdoId)) !== slug) {
      return { error: 'Ese acuerdo no es de este cliente.' }
    }
    try {
      await editarAcuerdo(acuerdoId, {
        que,
        responsable: cambios.responsable.trim() || 'por asignar',
        responsableMondayId: cambios.responsableMondayId,
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo guardar el cambio.' }
    }
    revalidatePath(`/cliente/${slug}`)
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
  async function descartarBorradorAction(reunionId: string) {
    'use server'
    await exigirEditor()
    const reunion = await obtenerReunion(reunionId)
    if (!reunion || reunion.salaSlug !== slug) return
    await eliminarDocumentoDeReunion(reunionId)
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
    revalidatePath('/deck')
  }

  async function eliminarAcuerdoAction(acuerdoId: string) {
    'use server'
    await exigirEditor()
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
  async function crearSesionAction(
    datos: { plantilla: string; dia: string; titulo: string },
  ): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    if (!PLANTILLAS.some((p) => p.id === datos.plantilla)) {
      return { error: 'Plantilla desconocida.' }
    }
    try {
      await crearReunion({
        salaSlug: slug,
        plantilla: datos.plantilla,
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
    revalidatePath(`/cliente/${slug}`)
    revalidatePath('/')
    return {}
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
  // EL FREEZE SE GOBIERNA EN AJUSTES (ronda 12). `pausarEstaSalaAction` y
  // `reactivarEstaSalaAction` vivían aquí para el interruptor que Franco
  // mandó mudar —*"pausar la sala solo debe vivir dentro de los ajustes de la
  // sala"*—; se retiran con él y no se dejan sin llamadores. Las de verdad
  // (`pausarSalaAction`/`reactivarSalaAction`, src/app/acuerdos/acciones.ts,
  // que exigen equipo por su cuenta) las usa `cliente/[slug]/ajustes`.
  //
  // Lo que NO se movió: la comprobación de "¿se puede preparar una reunión
  // con la sala en pausa?" nunca estuvo aquí. Vive en `crearReunion`
  // (src/db/reuniones.ts), el único punto por el que pasan los tres caminos
  // que crean una, y repetirla por página sería justo el tipo de protección
  // que se olvida en una de las tres.

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
    revalidatePath(`/cliente/${slug}`)
    return {}
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
  async function registrarMaterialArchivoAction(datos: {
    titulo: string
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }): Promise<{ error?: string }> {
    'use server'
    return registrarArchivoAction({ ...datos, categoria: 'comercial', fecha: null })
  }

  /** Lo mismo, para Archivos de Interés. Ver el comentario de arriba. */
  async function registrarInteresArchivoAction(datos: {
    titulo: string
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }): Promise<{ error?: string }> {
    'use server'
    return registrarArchivoAction({ ...datos, categoria: 'interes', fecha: null })
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
  async function registrarEnlaceAction(datos: {
    titulo: string
    enlace: string
  }): Promise<{ error?: string }> {
    'use server'
    const r = await guardarEnlaceDeSala(slug, 'comercial', datos)
    if (!r.error) revalidatePath(`/cliente/${slug}`)
    return r
  }

  async function registrarEnlaceInteresAction(datos: {
    titulo: string
    enlace: string
  }): Promise<{ error?: string }> {
    'use server'
    const r = await guardarEnlaceDeSala(slug, 'interes', datos)
    if (!r.error) revalidatePath(`/cliente/${slug}`)
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
  async function registrarNotaDePrensaAction(datos: {
    titulo: string
    enlace: string
    medio: string
    fecha: string | null
    portada: { ruta: string; nombreOriginal: string; tipoContenido: string | null; tamanoBytes: number | null } | null
  }): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    const normalizado = normalizarEnlace(datos.enlace)
    if ('error' in normalizado) return { error: normalizado.error }
    try {
      await registrarArchivo({
        salaSlug: slug,
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
    revalidatePath(`/cliente/${slug}`)
  }

  /**
   * BORRAR UNA REUNIÓN DESDE LA SALA (Franco: *"la otra reunión tampoco puedo
   * eliminarla de la sala"*).
   *
   * No se podía: el borrado vivía solo en Presentaciones (`/deck`), y la sala
   * es donde uno se encuentra la reunión que sobra. Es la misma operación,
   * ofrecida donde hace falta.
   *
   * COMPRUEBA QUE LA REUNIÓN ES DE ESTA SALA antes de borrarla. El id lo manda
   * el navegador y una Server Action es un endpoint: sin esto, quien tenga el
   * id de una reunión de OTRA sala podría borrarla desde aquí. Esconder el
   * botón no protege nada.
   *
   * `eliminarDocumentoDeReunion` como segundo argumento: `eliminarReunion` lo
   * exige cuando la reunión tiene documento —`documentos.reunion_id` es NOT
   * NULL + UNIQUE, así que hay que borrarlo antes— y se pasa siempre, tenga o
   * no. Los acuerdos ya publicados NO se van: cuelgan de la sala y pueden
   * llevar semanas moviéndose (`eliminarReunion` les suelta el origen).
   */
  async function eliminarReunionAction(reunionId: string): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    const laReunion = await obtenerReunion(reunionId)
    if (!laReunion || laReunion.salaSlug !== slug) {
      return { error: 'Esa reunión no es de este cliente.' }
    }
    try {
      await eliminarReunion(reunionId, eliminarDocumentoDeReunion)
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo borrar la reunión.' }
    }
    revalidatePath(`/cliente/${slug}`)
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
  async function reubicarMaterialesAction(
    enOrden: Array<{ id: string; grupo: string | null }>,
  ): Promise<void> {
    'use server'
    await exigirEditor()
    await reubicarMateriales(slug, enOrden)
    revalidatePath(`/cliente/${slug}`)
  }

  async function eliminarArchivoAction(id: string) {
    'use server'
    await exigirEditor()
    // Franco: "si algo se elimina también se elimina del almacenamiento".
    // Primero la fila, luego el binario: al revés, un fallo al borrar el
    // archivo dejaría una fila que apunta a la nada.
    const quitado = await eliminarArchivo(id)
    // `quitado.ruta` es nula si el material era un ENLACE: no hay binario que
    // borrar, y llamar a `del(null)` sería un error donde no hay nada que
    // limpiar.
    if (quitado?.ruta) await del(quitado.ruta).catch(() => {})
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
    /**
     * EL TEXTO DE UNA SECCIÓN PLEGADA, que va sobre el DEGRADADO y no sobre la
     * superficie sólida (Franco: *"los módulos colapsados deberían estar de un
     * color como el de la cabecera degradado"*).
     *
     * Se calcula contra `gradiente[0]` —la primera parada, que es donde cae el
     * título— y no se reusa `textoSobreOscura`, que está validado contra otro
     * color. La diferencia no es teórica: el blanco de Marketing United da
     * 21:1 sobre su superficie oscura y **1,14 sobre el lima con el que
     * arranca su degradado**. Ilegible, y solo se ve en las marcas claras.
     */
    '--texto-sobre-gradiente': colorDeTextoSobre(tema.gradiente[0]),
    // El alto de la barra global, para que el riel de secciones se pegue justo
    // debajo. CERO cuando no la hay: el director de la UDN no ve el menú de
    // Marketing Corp, y su riel tiene que pegarse arriba del todo (ver
    // `.menuSecciones`).
    '--barra-alta': equipo ? '62px' : '0px',
  } as CSSProperties

  /**
   * LO VIVO Y LO CUMPLIDO, cada grupo ya ordenado (ronda 13, ver
   * `dominio/orden-acuerdos.ts`).
   */
  const { vivos, cumplidos } = partirAcuerdosDeSala(s.acuerdos)

  const abiertos = acuerdosAbiertos(s)
  const vencidos = acuerdosVencidos(s)

  /**
   * LAS SECCIONES QUE ESTA VISTA VA A PINTAR, para el índice de arriba.
   *
   * Se arma con las MISMAS condiciones que deciden cada `<Seccion>` más abajo
   * —el tablero solo si la sala tiene URL, el benchmark solo si hay o si eres
   * del equipo, cada módulo de material solo si tiene algo o si eres del
   * equipo— porque un índice escrito aparte acabaría ofreciéndole a un
   * director enlaces a secciones que en su vista no existen. Si alguna
   * condición cambia allí abajo, tiene que cambiar aquí: son la misma
   * decisión escrita dos veces, y por eso van pegadas.
   */
  const seccionesDeLaSala: EntradaDeMenu[] = [
    ...(tema?.analyticsUrl ? [{ id: 's-analytics', titulo: 'Data & Analytics' }] : []),
    { id: 's-acuerdos', titulo: 'Acuerdos', conteo: abiertos > 0 ? `${abiertos}` : undefined },
    { id: 's-reuniones', titulo: 'Reuniones', conteo: s.reuniones.length > 0 ? `${s.reuniones.length}` : undefined },
    ...(benchmark || equipo ? [{ id: 's-benchmark', titulo: 'Benchmark' }] : []),
    ...(materialesComerciales.length > 0 || equipo
      ? [{ id: 's-comercial', titulo: 'Materiales', conteo: materialesComerciales.length > 0 ? `${materialesComerciales.length}` : undefined }]
      : []),
    ...(notasDePrensa.length > 0 || equipo
      ? [{ id: 's-prensa', titulo: 'Prensa', conteo: notasDePrensa.length > 0 ? `${notasDePrensa.length}` : undefined }]
      : []),
    ...(archivosDeInteres.length > 0 || equipo
      ? [{ id: 's-interes', titulo: 'Archivos', conteo: archivosDeInteres.length > 0 ? `${archivosDeInteres.length}` : undefined }]
      : []),
  ]
  // La reunión ya llega cosida —presentación, minuta y acuerdos juntos— desde
  // `estadoDeSalaDB` (Tarea 7). Ver `EstadoSala.reuniones`, `dominio/salas.ts`.
  const reuniones = s.reuniones
  /**
   * QUIÉN PREPARÓ Y QUIÉN PRESENTÓ CADA REUNIÓN, junto a cada una en la sala
   * (ronda 10) — SOLO EQUIPO, con el mismo `equipo` de arriba (`esLector()`).
   *
   * Mismo razonamiento que `genteParaResponsable()` unas líneas más arriba, y mismo
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

  /**
   * `s` con el `notFound()` ya aplicado. TypeScript no retiene el
   * estrechamiento de una `const` externa dentro de una función anidada —el
   * mismo caso que el `reunion!` del editor—, y aquí hace falta porque la fila
   * se pinta desde una función.
   */
  const sala = s

  /**
   * UNA FILA DE ACUERDO, y las dos listas la usan: la de lo vivo y la de lo
   * cumplido (plegada). Está aquí y no repetida dos veces porque es el mismo
   * acuerdo con la misma cara — duplicar el bloque es exactamente lo que dejó
   * divergir el Home y la sala en su día.
   *
   * ⚠️ No viola la regla del cierre de Server Actions: esta función no LLAMA a
   * ninguna, solo las pasa como props a componentes cliente, y se ejecuta
   * durante el render del servidor. Lo que no puede hacerse nunca es pasarla a
   * un componente cliente.
   */
  function pintarAcuerdo(a: (typeof sala.acuerdos)[number]) {
    const origen = a.reunionOrigenId ? origenDeAcuerdo.get(a.reunionOrigenId) : undefined
    return (
      <FilaAcuerdo
        key={a.id}
        acuerdo={{ ...a, congelado: estaCongelado(a, sala) }}
        // Con "hoy" la fecha se pinta como semáforo y lo cumplido se apaga
        // (ver `FilaAcuerdo`).
        hoyCivil={hoyCivil}
        // Dentro de una sala no se dice de qué sala es: son todos de la
        // misma. El Home sí lo pasa — ver `FilaAcuerdo`.
        origen={origen ? { href: `#r-${origen.id}`, fecha: origen.fecha } : undefined}
        texto={
          /* EL LÁPIZ VA FUERA DEL TEXTO, no dentro. Estuvo dentro de
             `.acuerdoQue` y el glifo pasaba a formar parte del acuerdo al
             seleccionarlo o copiarlo — me lo demostró un script de prueba que
             leyó el texto renderizado y guardó "…casos de éxito✎" en la base.

             CORREGIRLO ES SOLO DE ADMIN Y EDITORES (`equipo`), no del director
             de la UDN — Franco: *"solo el admin y editores pueden hacer
             cambios en los acuerdos ya publicados"*. Él sigue moviendo estatus
             y fecha de los suyos, con `AcuerdoControles`, a la derecha. */
          equipo ? (
            <EditarAcuerdo
              acuerdoId={a.id}
              queInicial={a.que}
              responsableInicial={a.responsable}
              personas={personas}
              equipos={equipos}
              editarAction={editarAcuerdoTextoAction}
            />
          ) : (
            // El director de la UDN lee el acuerdo; no lo reescribe.
            <div className={estilos.acuerdoQue}>{a.que}</div>
          )
        }
      >
        {/* La estrella: SOLO equipo, no `editaAcuerdos` — es Mkt Corp quien
            cura el Home, el director de la UDN no se auto-destaca. */}
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
      </FilaAcuerdo>
    )
  }

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
        <BarraNavegacion hoy={hoy} admin={admin} clientes={clientes} salirAction={salirDeLaSala} />
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
            hueco y dejaba «Salir» flotando en mitad de la barra.
            Y SOLO SI HAY SESIÓN (`conSesion`, arriba): ahora que la sala se ve
            sin ninguna, este botón se le estaba ofreciendo también a quien no
            había entrado — el visitante mayoritario, el del enlace que se
            comparte con las UDNs. Un "Salir" que no cierra nada. */}
        {!equipo && conSesion && (
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

            {/* Los enlaces públicos de la marca, al final de la misma franja:
                es identidad, no gestión, y quien abre la sala —incluido el
                director con el enlace compartido— tiene ahí por dónde ver a
                esa marca por fuera. Sin ninguno, no se pinta nada. */}
            <RedesDeSala redes={tema?.redes} nombre={s.nombre} />
          </div>
        </div>
      </div>

      {/* EL ÍNDICE DE LA SALA. Se arma AQUÍ, pegado a las condiciones que
          deciden qué secciones existen: son todas condicionales —el tablero
          solo si la sala tiene URL, el benchmark solo si hay o si eres del
          equipo, los materiales solo si hay o si eres del equipo— y una lista
          escrita aparte acabaría ofreciéndole a un director enlaces a
          secciones que en su vista no se pintan.
          Con menos de tres entradas no se pinta: un índice de dos líneas para
          dos módulos es cromo que no ahorra ningún scroll. */}
      {seccionesDeLaSala.length >= 3 && <MenuSecciones entradas={seccionesDeLaSala} />}

      <main className={estilos.main}>
        {/* EL FREEZE: AQUÍ SE INFORMA, NO SE DECIDE (ronda 12).
            Franco: *"pausar la sala solo debe vivir dentro de los ajustes de
            la sala"*. Hasta ahora el equipo veía el interruptor completo
            —pausar o reactivar— en lo primero de la sala, encima de los
            acuerdos, todos los días, para un gesto que se hace una vez al
            año. El control ya existía además en `/cliente/<slug>/ajustes`, así
            que era el mismo botón en dos sitios, y el de aquí era el que
            estorbaba.
            LO QUE SÍ SE QUEDA es el aviso, y ahora PARA TODOS y no solo para
            el director: que una sala esté congelada explica por qué no tiene
            próxima reunión ni vencimientos, y esa pregunta se la hace igual
            quien la gestiona. Con el enlace a los ajustes para quien puede
            cambiarlo. */}
        {!s.activa && (
          <div className={estilos.avisoCongelado}>
            <span>
              <strong>{s.nombre} está en pausa</strong>
              {s.pausadaDesde ? ` desde el ${fechaCompleta(s.pausadaDesde)}` : ''}: no hay reuniones ni
              gestión hasta nuevo aviso. Los acuerdos se pueden seguir consultando y no vencen
              mientras tanto.
            </span>
            {admin && (
              <Link href={`/cliente/${slug}/ajustes`} className={estilos.avisoEnlace}>
                Reactivar en los ajustes →
              </Link>
            )}
          </div>
        )}

        {/* Acuerdos primero — es lo que el director quiere ver.
            PLEGABLE (Franco: *"el módulo acuerdos debería ser colapsable
            dentro de la sala"*): con once compromisos abiertos, la lista
            empuja reuniones, benchmark y materiales media pantalla hacia
            abajo, y quien entra a mirar la última presentación tiene que
            pasarlos todos. `details`/`summary` nativos —teclado y toque
            gratis, cero JS— y ABIERTO por defecto: plegarlo es una decisión
            de quien mira, no el estado en que se le entrega.
            EL RESUMEN VIAJA AL ENCABEZADO para que plegado siga informando:
            "5 abiertos · 2 vencidos" es lo que se necesita saber sin abrir. */}
        {/* DATA & ANALYTICS — arriba de Acuerdos, como pidió Franco. Solo si
            esta sala tiene tablero: sin él no hay módulo, ni vacío ni aviso
            (ver `analyticsUrl` en el esquema y `TableroAnalytics`). */}
        {tema?.analyticsUrl && (
          <TableroAnalytics id="s-analytics" url={tema.analyticsUrl} nombreSala={s.nombre} />
        )}

        <Seccion id="s-acuerdos" icono="acuerdos" titulo="Acuerdos" conteo={resumenDeAcuerdos(s.acuerdos)} plegable>
          {s.acuerdos.length === 0 && !equipo ? (
            <p className={estilos.benchmarkNota}>Sin acuerdos registrados todavía.</p>
          ) : (
            <>
              {/* EL ORDEN LO DECIDE EL DOMINIO (ronda 13): lo vivo primero,
                  por lo que vence antes; lo cumplido, aparte y plegado — ver
                  `partirAcuerdosDeSala`. Antes llegaban en el orden en que
                  salían de la base, así que un compromiso entregado en mayo
                  podía estar encima de uno que vence pasado mañana. */}
              <div className={estilos.acuerdos}>
                {vivos.map((a) => pintarAcuerdo(a))}
                {vivos.length === 0 && (
                  <p className={estilos.benchmarkNota}>
                    Nada abierto ahora mismo{cumplidos.length > 0 ? ': todo lo acordado está cumplido.' : '.'}
                  </p>
                )}
              </div>

              {/* LO CUMPLIDO, PLEGADO Y DENTRO DEL MISMO MÓDULO. Franco: *"los
                  cumplidos déjalos desplegables y colapsados… dentro del mismo
                  módulo"*. Apagarlos no bastaba: en una sala con historia
                  siguen siendo una columna larga debajo de lo que importa hoy.
                  `details` nativo, como el resto de la app: teclado y toque
                  gratis, y el estado lo anuncia el navegador. */}
              {cumplidos.length > 0 && (
                <details className={estilos.cumplidosPlegable}>
                  <summary className={estilos.cumplidosResumen}>
                    {cumplidos.length === 1 ? '1 acuerdo cumplido' : `${cumplidos.length} acuerdos cumplidos`}
                  </summary>
                  <div className={estilos.acuerdos}>{cumplidos.map((a) => pintarAcuerdo(a))}</div>
                </details>
              )}
            </>
          )}
            {editaAcuerdos && <NuevoAcuerdoForm crearAction={crearAcuerdoAction} personas={personas} />}
        </Seccion>

        {/* REUNIONES — la presentación y su minuta, juntas.
            Franco: "el módulo Presentaciones y minutas creo que debe ser uno,
            así la presentación está asociada a una minuta, es decir a una
            reunión". Eran dos listas paralelas ordenadas cada una por su
            cuenta; para saber qué se acordó en la presentación de mayo había
            que buscar mayo dos veces. */}
        <Seccion id="s-reuniones" icono="reuniones" titulo="Reuniones" conteo={reuniones.length > 0 && reuniones.length} plegable>

          {/* UN SOLO MÓDULO. `porVenir` es lo que hay que preparar —con lo
              que le falta y las tres salidas: seguir editando, subir la que
              ya existe o armarla— y `reuniones` es el historial. Antes lo
              primero vivía en una tira aparte que no sabía de lo segundo, y
              una junta futura salía rotulada "La última". */}
          <ReunionesSala
            reuniones={historial}
            porVenir={porVenir}
            avancePorReunion={avancePorReunion}
            equipo={equipo}
            participacionPorReunion={participacionPorReunion}
            salaSlug={slug}
            registrarArchivoAction={registrarArchivoAction}
            editarArchivoAction={editarArchivoAction}
            eliminarReunionAction={eliminarReunionAction}
            descartarBorradorAction={equipo ? descartarBorradorAction : undefined}
            marcarDadaAction={marcarPresentadaAction}
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
        </Seccion>

        {/* Benchmark competitivo — vive a nivel de sala, se nutre en el tiempo (spec §5).
            SOLO SI HAY BENCHMARK O SI QUIEN MIRA PUEDE CARGARLO. Franco: *"si
            hay algún módulo que no tenga contenido en la vista de viewer no
            debe mostrarse"*. Al director de la UDN, "Benchmark aún no cargado
            para esta sala" no le dice nada que pueda hacer: es una nota
            interna sobre trabajo de Marketing Corp, en la sala que se le
            comparte. Al equipo sí se le enseña vacío, porque para él ES la
            puerta de entrada a cargarlo. Mismo criterio que ya seguían los dos
            módulos de material. */}
        {(benchmark || equipo) && (
        <Seccion
          id="s-benchmark"
          icono="benchmark"
          titulo="Benchmark competitivo"
          conteo={benchmark && `${s.nombre} + ${benchmark.competidores.length} competidores`}
          plegable
        >
          <BenchmarkSala benchmark={benchmark} nombreSala={s.nombre} salaSlug={slug} />
        </Seccion>
        )}

        {/* LOS DOS MÓDULOS DE MATERIAL, al final de la sala.

            Son dos y no uno con un filtro porque responden a dos preguntas
            distintas: "¿qué le enseño a un prospecto?" y "¿dónde estaba aquel
            estudio?". Quien abre la sala cinco minutos antes de una reunión
            hace la primera, y mezclarlos le pone delante lo que no le sirve.
            Misma mecánica en los dos: fichero o enlace, rejilla con
            miniatura, renombrar y quitar. */}
        {(materialesComerciales.length > 0 || equipo) && (
          /* El módulo dibuja su PROPIA cabecera (ver `MaterialesAgrupados`):
             el botón «Organizar» va en la esquina donde `Seccion` pone el
             conteo, y ese botón tiene estado — el estado es del cliente. */
          <MaterialesAgrupados
            id="s-comercial"
            titulo="Materiales Comerciales"
            materiales={materialesComerciales}
            equipo={equipo}
            editarAction={editarArchivoAction}
            eliminarAction={eliminarArchivoAction}
            reubicarAction={reubicarMaterialesAction}
            vacio="Credenciales, casos de éxito, un vídeo de YouTube, una nota de prensa: lo que la UDN necesite tener a mano para vender."
          >
            {equipo && (
              <AnadirMaterial
                salaSlug={slug}
                categoria="comercial"
                registrarArchivoAction={registrarMaterialArchivoAction}
                registrarEnlaceAction={registrarEnlaceAction}
              />
            )}
          </MaterialesAgrupados>
        )}

        {/* NOTAS DE PRENSA (ronda 13). Franco: *"debemos agregar antes de
            archivos de interés, abajo de archivos comerciales, algo que se
            llame Notas de Prensa Destacadas o algo así; la mayoría son link
            pero se deben ver distintas a como se ve el otro módulo de
            materiales"*.

            Va en ese orden y no en otro porque sigue la escala de lo que se
            usa para vender: primero lo que la UDN enseña (sus materiales),
            luego lo que otros dijeron de ella (la prensa) y al final lo que
            conviene tener a mano. El componente es propio —no
            `MaterialesAgrupados` con otro título— por lo que se explica en su
            cabecera: una nota se lee por su medio y su fecha, no por su
            formato. */}
        <NotasDePrensa
          id="s-prensa"
          titulo="Notas de Prensa"
          notas={notasDePrensa}
          equipo={equipo}
          eliminarAction={equipo ? eliminarArchivoAction : undefined}
        >
          {equipo && (
            <AnadirNotaDePrensa salaSlug={slug} registrarAction={registrarNotaDePrensaAction} />
          )}
        </NotasDePrensa>

        {/* ARCHIVOS DE INTERÉS (Franco: *"después de materiales comerciales
            hay que agregar Archivos de Interés con las mismas
            características"*). Todo lo que no es material de venta pero
            conviene tener a mano: un estudio, un brief, el enlace a un
            tablero. */}
        {(archivosDeInteres.length > 0 || equipo) && (
          <MaterialesAgrupados
            id="s-interes"
            titulo="Archivos de Interés"
            materiales={archivosDeInteres}
            equipo={equipo}
            editarAction={editarArchivoAction}
            eliminarAction={eliminarArchivoAction}
            reubicarAction={reubicarMaterialesAction}
            vacio="Un estudio, un brief, una hoja de cálculo, el enlace a un tablero: lo que no es material de venta pero conviene tener a mano."
          >
            {equipo && (
              <AnadirMaterial
                salaSlug={slug}
                categoria="interes"
                registrarArchivoAction={registrarInteresArchivoAction}
                registrarEnlaceAction={registrarEnlaceInteresAction}
              />
            )}
          </MaterialesAgrupados>
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

        {/* LA PUERTA DE MARKETING CORP, AL PIE Y EN UNA LÍNEA (ronda 12).
            Franco: *"saca de la vista de viewers el módulo que dice si eres de
            marketing ingresa aquí; déjalo abajo pero como hiperlink, más
            sutil"*.
            Era un aviso ancho arriba del todo, encima de los acuerdos, y su
            destinatario es UNO: el de Mkt Corp que abre el enlace compartido
            para comprobar que sirve. Al director de la UDN —que es quien de
            verdad usa esta pantalla, todos los días— le ocupaba el primer
            renglón de su sala para ofrecerle una puerta que no es suya.
            Abajo sigue estando cuando hace falta, y no cuesta nada al resto. */}
        {!equipo && (
          <p className={estilos.pieAcceso}>
            Vista de solo lectura de <strong>{s.nombre}</strong>.{' '}
            <a href="/entrar">¿Eres de Marketing Corporativo?</a>
          </p>
        )}
      </main>
    </div>
  )
}
