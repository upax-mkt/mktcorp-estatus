import Link from 'next/link'
import Image from 'next/image'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from './hub.module.css'
import { hayDB } from '@/db/cliente'
import {
  estadoDeSalas, ordenarPorProximaReunion, temperatura, acuerdosAbiertos,
  acuerdosVencidos, pulsoDelMes,
} from '@/db/consultas'
import { type SesionMinutable, type SesionPorConfirmar } from '@/dominio/salas'
import { reunionesMinutables, reunionesPorConfirmar } from '@/dominio/reunion'
import { altoDeLogo, archivoDeLogo } from '@/temas/logos'
import { crearReunion, listarReuniones, marcarDada, marcarNoDada, desmarcarNoDada } from '@/db/reuniones'
import { tituloPorDefecto } from '@/db/documentos'
import { registrarEdicion } from '@/db/participacion'
import { genteParaResponsable } from '@/db/personas'
import { moldeDeMinuta, guardarMoldeDeMinuta } from '@/db/plantillas'
import { loQueFaltaAlMolde, type MoldeMinuta } from '@/minuta/molde'
import { fechaBreve, textoDiasDesde, diasHasta, diaCivil, instanteEnCDMX } from '@/lib/fecha'
import { cerrarSesion } from '@/auth/sesion'
import { exigirEditor, exigirLectura, esAdmin } from '@/auth/roles'
import { ModuloCalendario } from '@/componentes/hogar/ModuloCalendario'
import { ModuloMinutas, type MinutaEnHome } from '@/componentes/hogar/ModuloMinutas'
import { AgendarRapido, type SalaParaAgendar, type DatosAgendarRapido } from '@/componentes/hogar/AgendarRapido'
import { ReunionesPorConfirmar } from '@/componentes/ReunionesPorConfirmar'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { Seccion } from '@/componentes/Seccion'
import { colorDeTextoDeMarca } from '@/temas'

/**
 * Día + hora del formulario de «Agendar rápido» → instante, anclado a CDMX
 * (`instanteEnCDMX`, src/lib/fecha.ts) y no a la zona del proceso: en Vercel
 * el servidor corre en UTC, así que "10:00" se guardaría como las cuatro de
 * la mañana en México. MISMO MECANISMO, con el mismo comentario, que
 * `instanteDe` en `app/agenda/page.tsx` (tarea 14, heredado tal cual, sin
 * reinventarlo): el default de "10:00" cuando la hora llega vacía es una
 * regla de ESTA pantalla —agendar rápido tampoco exige elegir hora—, no del
 * helper genérico, así que se queda aquí y no en `lib/fecha.ts`.
 *
 * Vive FUERA de `Hub()`: dentro, la Server Action la capturaría en su cierre
 * y React intentaría serializarla al cliente ("Functions cannot be passed
 * directly to Client Components") — el build no lo detecta, solo se ve al
 * usar la página.
 */
function instanteDe(dia: string, hora: string): Date {
  return instanteEnCDMX(dia, hora || '10:00')
}

/**
 * El Home.
 *
 * Era una lista de diez renglones con un puntito de color y un panel de
 * acuerdos que solo se podía mirar. Ahora es un tablero: las salas como
 * tarjetas con su logotipo, y los módulos generales —calendario, agendar,
 * minutas— que se USAN sin salir de aquí.
 *
 * SE INVIERTE (ronda 14.5, tarea 1). Franco, textual: *"hay que
 * transformarlo, ya que es el lugar donde lo primero que ves son las salas y
 * luego otros módulos de interés agnósticos y generales"* — hasta esta ronda
 * era al revés: primero "Por confirmar", luego el módulo de acuerdos entero,
 * luego calendario y minutas, y las salas —de lo que trata esta app— recién
 * empezaban a mitad de página (medido: el píxel 1.140 de 2.238 a 1440px).
 *
 * El orden ahora, de arriba abajo: el pulso (las cifras, incluidas las DOS de
 * acuerdos, que llevan a `/acuerdos`), **los clientes**, lo que exige
 * confirmar, calendario y agendar, minutas, y en pausa. Los acuerdos ya NO
 * tienen su propio bloque aquí —decisión de Franco, textual: *"solo una
 * cifra"*, no un módulo más chico— así que ese trabajo se resuelve en
 * `/acuerdos`, no en el Home.
 *
 * RE-REVISIÓN (hallazgo I2): "Por confirmar" vivía delante de "Los clientes"
 * —se quedó ahí cuando se retiró `ModuloAcuerdos`, nadie la movió— así que el
 * primer `<h2>` del documento seguía sin ser el de las salas. Ahora baja,
 * junto con los demás módulos generales, tal como enumera el spec §4: pulso →
 * clientes → calendario y agendar → minutas → en pausa; "Por confirmar" no
 * va delante de clientes.
 */
export default async function Hub() {
  // El Home era la ÚNICA pantalla de equipo sin guarda de página (revisión
  // final de la rama, punto 1) — todas las demás (`/deck`, `/deck/[id]`,
  // `/salas`, `/personas`...) ya exigen sesión aquí mismo, pegado al render,
  // y no solo en el proxy (chequeo optimista, ver `src/auth/politica.ts`).
  // Sin esto, una sesión que el proxy dejara pasar por error se encontraba
  // con el Home entero pintado y solo tropezaba en el primer `exigir*()` de
  // una Server Action real — que lanza, y hasta `src/app/error.tsx` (mismo
  // punto de esta revisión) eso era la pantalla genérica de Next.
  await exigirLectura()

  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  async function guardarMoldeAction(nuevo: MoldeMinuta): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    // Se revalida en el servidor aunque el editor ya lo compruebe: ocultar un
    // botón no protege una acción.
    const faltas = loQueFaltaAlMolde(nuevo)
    if (faltas.length > 0) return { error: `Falta ${faltas.join(' y ')}.` }
    try {
      await guardarMoldeDeMinuta(null, nuevo)
      revalidatePath('/')
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo guardar el molde.' }
    }
  }

  /**
   * PUNTO 2 del encargo: el botón de marcar presentada existía pero estaba
   * enterrado —solo se llegaba entrando al editor y abriendo el documento—,
   * así que de siete reuniones dadas solo una se marcó. Vive aquí, junto al
   * "por confirmar" que arma más abajo (`reunionesPorConfirmar`).
   *
   * PUNTO 3: junto al "sí" vive el "no" —la reunión se canceló o se pospuso—,
   * porque las dos son la misma pregunta y las dos tienen que poder
   * responderse (y deshacerse) desde donde se ve la reunión.
   *
   * Las tres escriben una reunión: exigen editor primero y quedan enganchadas
   * a `registrarEdicion` (`src/db/participacion.ts`), que NUNCA propaga un
   * fallo suyo — mismo patrón que `marcarPresentadaAction` en
   * src/app/deck/[id]/documento/page.tsx, de donde sale esta misma acción.
   */
  async function marcarPresentadaAction(reunionId: string) {
    'use server'
    const quien = await exigirEditor()
    await marcarDada(reunionId)
    if (quien.sub) await registrarEdicion(reunionId, quien.sub)
    revalidatePath('/')
  }

  async function marcarNoDadaAction(reunionId: string) {
    'use server'
    const quien = await exigirEditor()
    await marcarNoDada(reunionId)
    if (quien.sub) await registrarEdicion(reunionId, quien.sub)
    revalidatePath('/')
  }

  async function desmarcarNoDadaAction(reunionId: string) {
    'use server'
    const quien = await exigirEditor()
    await desmarcarNoDada(reunionId)
    if (quien.sub) await registrarEdicion(reunionId, quien.sub)
    revalidatePath('/')
  }

  /**
   * AGENDAR DESDE EL HOME: crea la REUNIÓN, no su presentación.
   *
   * Llamaba a `crearReunionConDocumento`, que agenda la junta Y le monta el
   * deck de una vez. Ese era el criterio de toda la app —"toda reunión
   * agendada nace con su documento"— hasta que Franco lo desmontó: *"debería
   * ser crear reunión; una vez que la creo debo decidir si la creo con el
   * editor de presentaciones o cargar un archivo ya creado"*.
   *
   * La sala y `/reuniones` ya se cambiaron con esa petición; ESTE ATAJO SE
   * QUEDÓ ATRÁS, y era el tercero de tres. Dejarlo así significa que el mismo
   * gesto —agendar una junta— deja la reunión en dos estados distintos según
   * la pantalla por la que se entre: la agendada aquí saldría en su sala como
   * "a medio armar", con ocho secciones vacías que nadie empezó, y la agendada
   * allí como "sin presentación todavía".
   *
   * EL TÍTULO SIGUE SIN PODER LLEGAR VACÍO. Lo resolvía `crearReunionConDocumento`
   * por dentro; al dejar de usarla hay que reponerlo aquí, o dos reuniones de
   * la misma sala y cadencia —el caso real: Research Land, Comercial vs.
   * Digital, las dos quincenales— nacerían sin nombre en el calendario.
   *
   * ESCONDER EL BOTÓN NO PROTEGE EL ENDPOINT: `exigirEditor()` primero, igual
   * que cualquier otra acción de escritura de esta página. Y "una sala en
   * pausa no se ofrece" es cortesía de interfaz: el rechazo de verdad, contra
   * el freeze de la base, lo hace `crearReunion` por dentro. El try/catch
   * convierte esa excepción en un mensaje legible en vez de tumbar la página.
   *
   * `datos.plantilla` LLEGA `''` CUANDO NADIE TOCÓ EL DESPLEGABLE (cierre de
   * deuda técnica): `''` → `null`, nunca la primera clase del catálogo. Es la
   * misma traducción "cadena vacía en el formulario, `null` en la base" que ya
   * hacen las acciones de `src/app/reuniones/acciones.ts` para
   * `FormularioSesion`, y `crearReunion` valida la que sí venga con
   * `esPlantillaConocida` (`src/db/reuniones.ts`) — un id que no exista en el
   * catálogo se rechaza ahí, no aquí.
   */
  async function agendarRapidoAction(datos: DatosAgendarRapido): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    const cuando = instanteDe(datos.dia, datos.hora)
    try {
      await crearReunion({
        salaSlug: datos.salaSlug,
        tipo: datos.tipo,
        fecha: cuando,
        titulo: datos.titulo.trim() || tituloPorDefecto(datos.tipo, cuando),
        plantilla: datos.plantilla || null,
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo agendar la reunión.' }
    }
    revalidatePath('/')
    return {}
  }

  // Sin esto Next lo prerenderiza y la app queda congelada en la fecha del build.
  await connection()
  const hoy = new Date()

  const [salasCrudas, pulso, reuniones, personas, admin, clientes] = await Promise.all([
    estadoDeSalas(),
    pulsoDelMes(),
    listarReuniones(),
    // Para el selector de responsable de ModuloMinutas → LevantarMinuta →
    // MinutaCliente — la gente de Mkt Corp para el selector de responsable.
    genteParaResponsable(),
    // Ronda 9, tarea 3: si quien mira el Home administra Marketing
    // Corporativo, para enseñar el enlace a /personas en la barra — solo
    // cosmética (esa pantalla vuelve a exigir admin ella sola), pero no tiene
    // sentido ofrecer un enlace a quien va a rebotar en cuanto lo toque.
    esAdmin(),
    clientesParaBarra(),
  ])
  const molde = await moldeDeMinuta(null)
  const salas = ordenarPorProximaReunion(salasCrudas)
  /**
   * ⚠️ UNA SOLA REJILLA, CON LAS PAUSADAS APAGADAS AL FINAL (24-ago-2026).
   *
   * Franco: *"la sala de Zeus no debe quedar abajo en un módulo aparte, basta
   * con que se vea gris apagada al final de la grilla en el módulo principal
   * de Los Clientes"*.
   *
   * Estaban partidas en dos bloques desde la tarea 12, con el argumento de que
   * una tarjeta congelada "no tiene nada en común" con una activa. Tiene lo
   * que importa: es un cliente, y quien abre el Home quiere ver sus clientes
   * en un sitio. El gris dice lo demás, y `ordenarPorProximaReunion` ya las
   * manda al final del orden por su cuenta (bloque 2) — así que no hace falta
   * ni separarlas en dos listas ni ordenarlas aparte.
   */
  /**
   * CLIENTES SIN PRÓXIMA REUNIÓN — el único trabajo que esta pantalla no
   * estaba diciendo en voz alta.
   *
   * El pulso contaba cinco cosas y ninguna era esta: cuántos clientes están
   * hoy sin nada agendado. Es la cifra que define el oficio de Marketing
   * Corporativo —que a ninguna UDN se le pase el estatus— y estaba solo
   * implícita, repartida en cinco tarjetas que ponen "por agendar" en naranja
   * y que hay que ir contando a ojo.
   *
   * Solo las ACTIVAS: una sala en pausa no tiene próxima reunión a propósito,
   * y contarla convertiría el freeze en una tarea pendiente.
   */
  // Las pausadas no cuentan: de una sala en freeze no se espera reunión, así
  // que no está "por agendar" — mismo criterio que `acuerdosVencidos` y
  // `salaMasDesatendida` (src/dominio/salas.ts).
  const sinProxima = salas.filter((s) => s.activa !== false && !s.proximaReunion).length

  /**
   * LOS ACUERDOS VENCIDOS DE TODAS LAS SALAS, para el módulo que sustituye a
   * "En pausa" (24-ago-2026).
   *
   * Se arman aquí y no con una consulta nueva: `estadoDeSalaDB` ya trae los
   * acuerdos de cada sala cosidos, y `/acuerdos` —a donde lleva el botón— es
   * quien tiene la lista completa con sus filtros. Este módulo es el aviso,
   * no el espacio de trabajo.
   *
   * ⚠️ LAS SALAS EN PAUSA QUEDAN FUERA, y es la misma regla que ya aplican
   * `acuerdosVencidos()` y `salaMasDesatendida()`: los compromisos de una sala
   * congelada están parados, no vencidos. Ponerlos aquí sería pedir cuentas
   * por trabajo que alguien decidió detener.
   *
   * Del más antiguo al más reciente: el que lleva más tiempo pasado de fecha
   * es el que más urge, y sin fecha al final — no se puede decir cuánto lleva
   * vencido algo que nunca tuvo plazo.
   */
  const vencidos = salas
    .filter((s) => s.activa !== false)
    .flatMap((s) =>
      s.acuerdos
        .filter((a) => a.estatus === 'vencido')
        .map((a) => ({ ...a, salaSlug: s.slug, salaNombre: s.nombre, salaColor: s.color })),
    )
    .sort((a, b) => (a.fechaCompromiso ?? '9999-99-99').localeCompare(b.fechaCompromiso ?? '9999-99-99'))

  // Las minutas de todas las salas en una sola lista, la más reciente arriba.
  const minutas: MinutaEnHome[] = salasCrudas
    .flatMap((s) =>
      s.reuniones
        .filter((r) => r.minuta)
        .map((r) => ({
          id: r.id,
          titulo: r.minuta!.titulo,
          fecha: r.minuta!.fecha,
          salaSlug: s.slug,
          salaNombre: s.nombre,
          salaColor: s.color,
          texto: r.minuta!.texto,
          reunionId: r.id,
        })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  /**
   * TODA REUNIÓN CUYO DÍA YA LLEGÓ Y QUE NO TENGA MINUTA, sea agendada o
   * dada. Antes solo se ofrecían las marcadas como «presentada», y marcar
   * una reunión como presentada es papeleo: la reunión ocurrió igual. Obligar
   * al papeleo antes de poder minutar es la forma más segura de que nadie
   * encuentre el motor de transcripción.
   *
   * CORREGIDO (revisión final de la ronda 10, hallazgo 1 — Y ES UNA
   * REGRESIÓN DE ESTA MISMA LECCIÓN): esto llamaba a `sesionesMinutables`
   * (`dominio/salas.ts`, retirada en esta misma revisión) sobre `reuniones`
   * —el `ReunionResumen[]` plano de `listarReuniones()`—, cuyo filtro
   * `estado !== 'borrador' && estado !== 'agendada'` se escribió para el
   * modelo viejo de cinco estados, donde dejaba pasar `lista`/`presentada`/
   * `minutada`. Con `EstadoReunion = 'agendada' | 'dada'` ese mismo filtro
   * pasó a significar SOLO 'dada' — el papeleo de vuelta. De siete reuniones
   * dadas en la base real solo una se había marcado a mano.
   *
   * `reunionesMinutables` (`dominio/reunion.ts`, escrita en esta misma
   * ronda) opera sobre las `Reunion[]` de CADA sala (`salasCrudas[].reuniones`,
   * con su respaldo completo ya cosido — `documentoListo`/`archivos`/
   * `minuta`), no sobre el resumen plano: es lo que le permite usar el
   * criterio correcto, `estado === 'dada' || tienePresentacion(r)`. El Home
   * cruza nueve salas a la vez, así que cada resultado se reempaqueta con la
   * identidad de SU sala (`salaNombre`/`salaColor`, que `Reunion` no lleva
   * por su cuenta) antes de unir y reordenar por fecha — mismo patrón que
   * `porConfirmar`, más abajo.
   */
  const hoyCivil = diaCivil(hoy.toISOString())
  const sinMinuta: SesionMinutable[] = salasCrudas
    .flatMap((sl) =>
      reunionesMinutables(sl.reuniones, hoyCivil).map((r) => ({
        id: r.id,
        titulo: r.titulo,
        fecha: r.fecha,
        salaNombre: sl.nombre,
        salaColor: sl.color,
      })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  /**
   * REUNIONES POR CONFIRMAR (punto 2/3): las que la deducción automática de
   * `fueDada` (`dominio/reunion.ts`) ya cuenta como dadas —tienen respaldo y
   * su día ya pasó— sin que nadie lo haya dicho. Aquí se ofrecen las dos
   * respuestas: que sí se dio (de un clic, hoy enterrado en el editor) o que
   * no (nueva).
   *
   * MIGRADO EN LA TAREA 7 de `sesionesPorConfirmar` (dominio/salas.ts, ahora
   * retirada) a `reunionesPorConfirmar` (dominio/reunion.ts): la vieja
   * función leía `listarReuniones()` (`ReunionResumen[]`, sin
   * `documentoListo`/`archivos`/`minuta`) y exigía `estado === 'lista'` —
   * valor que `EstadoReunion` ya no tiene, así que daba SIEMPRE vacío. La
   * nueva opera sobre `EstadoSala.reuniones` de CADA sala (`salasCrudas`,
   * abajo — ahí sí vive el respaldo completo), sala por sala: con el
   * `activa` DE ESA sala pasado en cada reunión (confirmar/negar es
   * "gestión", y una sala en pausa no la admite — mismo criterio que
   * `crearReunion`). El Home cruza NUEVE salas a la vez, así que no basta un
   * único `{sala.activa && ...}` como en la vista de sala (donde todas las
   * reuniones ya son de la MISMA sala).
   */
  const porConfirmar: SesionPorConfirmar[] = salasCrudas
    .flatMap((sl) =>
      reunionesPorConfirmar(
        sl.reuniones.map((r) => ({ ...r, salaActiva: sl.activa })),
        hoyCivil,
      ).map((r) => ({
        id: r.id,
        titulo: r.titulo,
        fecha: r.fecha,
        salaSlug: sl.slug,
        salaNombre: sl.nombre,
        salaColor: sl.color,
        noDadaEn: r.noDadaEn,
      })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const paraCalendario = reuniones.map((s) => ({
    id: s.id,
    fecha: s.fecha,
    titulo: s.titulo,
    salaSlug: s.salaSlug,
    salaNombre: s.salaNombre,
    salaColor: s.salaColor,
    estado: s.estado,
  }))

  // Para AgendarRapido (tarea 14): la forma mínima que pide el componente,
  // no `EstadoSala` entero — mismo criterio que ya usa `ModuloMinutas`
  // (`salas={salasCrudas.map((x) => ({ slug: x.slug, nombre: x.nombre }))}`,
  // más abajo). `activa` es lo que decide qué sala se ofrece en el selector:
  // ver el comentario de `SalaParaAgendar`, `componentes/hogar/AgendarRapido.tsx`.
  const salasParaAgendar: SalaParaAgendar[] = salasCrudas.map((s) => ({
    slug: s.slug,
    nombre: s.nombre,
    activa: s.activa,
  }))

  return (
    <div className={estilos.app}>
      {/* LA BARRA (ronda 11, tarea 2): extraída a `@/componentes/BarraNavegacion`
          — el Home era el original completo (orden, `admin &&`, fecha,
          Salir) y ahora es la fuente que las otras seis pantallas de equipo
          comparten, en vez de cada una inventando (o divergiendo) la suya.
          Sin `seccionActiva`: el Home no es ninguna de las cinco pestañas del
          ciclo — a él se llega por el logo. */}
      <BarraNavegacion hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />

      <main className={estilos.main}>
        {/* SIN DATABASE_URL (revisión final de la rama, punto 5): antes esta
            pantalla se quedaba con cero salas y el pulso en cero, sin decir
            por qué — indistinguible de "todo al día". `estadoDeSalas()` (ver
            src/db/consultas.ts) cae a `[]` a propósito cuando no hay base —
            no hay una lista de salas honesta que inventar sin ella— pero eso
            no puede quedarse en silencio: es justo la rejilla vacía sin
            explicación que esta revisión vino a evitar. Coherente con el
            aviso de `/salas` (mismo problema, tono más suave porque ahí SÍ
            hay algo que mostrar: la semilla). */}
        {!hayDB() && (
          <div className={estilos.avisoSinBase} role="alert">
            <strong>Sin base de datos configurada</strong> — falta <code>DATABASE_URL</code> en este
            entorno. Nada de lo que se ve abajo —salas, acuerdos, reuniones, minutas— es real: es una
            pantalla vacía, no un estado de &quot;todo al día&quot;.
          </div>
        )}

        {/* El pulso: cinco cifras grandes y sus rótulos diminutos.
            Antes eran cuatro y una de ellas —"con sesión este mes"— contaba
            otra cosa de la que decía: SALAS (no reuniones) cuya última sesión
            presentada/minutada cayera en los últimos 30 días corridos, no en
            el mes natural. Franco: "en el contador dice solo una sesión en el
            mes siendo que están agendadas todas". Ahora son dos cifras
            honestas sobre la MISMA pregunta — cuántas reuniones hay este mes,
            y cuántas de esas ya se dieron — en vez de una que mezclaba las
            dos. Ver `construirPulso`, src/db/consultas.ts. */}
        <section className={estilos.pulso}>
          <div>
            <h1 className={estilos.saludo}>Meeting Hub</h1>
            <p className={estilos.saludoSub}>El estado de la relación con cada cliente.</p>
          </div>
          {/* CADA CIFRA LLEVA A DONDE SE ATIENDE (ronda 12).
              El pulso decía cinco números y ninguno se podía tocar: se leían,
              se entendía que algo había que hacer, y para hacerlo tocaba
              buscar dónde. Un tablero cuyos números no llevan a su trabajo es
              decoración con datos dentro. Ahora son enlaces —los tres de
              gestión a su pantalla, los dos de calendario y clientes al
              bloque de esta misma página que los desarrolla— y se les sumó
              `sinProxima`, que es la única de las seis que nadie estaba
              contando (ver arriba). */}
          <div className={estilos.pulsoCifras}>
            <Link href="#clientes" className={estilos.pulsoItem}>
              <span className="cifra">{pulso.salas}</span>
              <span className="micro">clientes</span>
            </Link>
            <Link href="#clientes" className={estilos.pulsoItem}>
              <span className="cifra" data-alerta={sinProxima > 0 ? 'ojo' : undefined}>{sinProxima}</span>
              <span className="micro">sin próxima reunión</span>
            </Link>
            <Link href="#calendario" className={estilos.pulsoItem}>
              <span className="cifra">{pulso.reunionesEsteMes}</span>
              <span className="micro">reuniones este mes</span>
            </Link>
            <Link href="#calendario" className={estilos.pulsoItem}>
              <span className="cifra">{pulso.reunionesDadas}</span>
              {/* Singular/plural (extra de la auditoría UX/UI, ronda 11):
                  decía "1 ya se dieron" con una sola reunión. Mismo criterio
                  que ya usa esta pantalla más abajo, en la píldora de cada
                  tarjeta de sala. */}
              <span className="micro">{pulso.reunionesDadas === 1 ? 'ya se dio' : 'ya se dieron'}</span>
            </Link>
            <Link href="/acuerdos" className={estilos.pulsoItem}>
              <span className="cifra">{pulso.acuerdosAbiertos}</span>
              <span className="micro">acuerdos abiertos</span>
            </Link>
            <Link href="/acuerdos" className={estilos.pulsoItem}>
              <span className="cifra" data-alerta={pulso.acuerdosVencidos > 0 ? 'true' : undefined}>
                {pulso.acuerdosVencidos}
              </span>
              {/* Mismo arreglo que "ya se dieron", arriba: decía "1 vencidos". */}
              <span className="micro">{pulso.acuerdosVencidos === 1 ? 'vencido' : 'vencidos'}</span>
            </Link>
          </div>
        </section>

        {/* LAS SALAS, LO PRIMERO QUE SE VE (ronda 14.5, tarea 1).
            Franco, textual: "el lugar donde lo primero que ves son las salas
            y luego otros módulos de interés agnósticos y generales" — hasta
            esta ronda esta sección vivía después del pulso, Por confirmar,
            Acuerdos y Calendario/Minutas, empezando a mitad de página
            (medido: el píxel 1.140 de 2.238 a 1440px). Ahora es la SEGUNDA
            cosa que se lee, justo después del pulso — antes de "Por
            confirmar" y de los módulos generales de más abajo. Movida en el
            DOCUMENTO, no con `order` de CSS: quien navega con teclado o
            lector de pantalla tiene que toparse con "Los clientes" en el
            mismo orden que se ve (deuda que `/reuniones` dejó viva con el
            calendario; aquí no se repite).

            RE-REVISIÓN (hallazgo I2): hasta esta corrección "Por confirmar"
            seguía siendo el primer `<h2>` del documento —quedó donde estaba
            cuando se retiró `ModuloAcuerdos`, sin que nadie la moviera—, así
            que con datos reales el DOM (y el teclado, y un lector de
            pantalla) topaban con ella antes que con las salas, aunque el
            test se llamara "lo primero que se ve son los clientes". Decisión
            de Franco, textual: *"lo primero que ves son las salas y luego
            otros módulos de interés agnósticos y generales"* — "Por
            confirmar" es justo uno de esos módulos generales, no una excepción,
            así que baja con el resto: ver más abajo, ya después de esta
            sección. */}
        <Seccion
          id="clientes"
          icono="clientes"
          titulo="Los clientes"
          /* Antes decía "ordenados por próxima reunión", que explica el orden
             pero no dice nada del estado. En el sitio del conteo va lo que hay
             que atender: cuántos clientes están sin próxima reunión.
             SOLO ESO, y no también "cuántos hay": el pulso de arriba ya dice
             "9 clientes" contando la sala en pausa, esta rejilla enseña 8, y
             dos cifras que se contradicen a media pantalla de distancia es
             justo lo que hace que un tablero se lea como si no cuadrara. El
             número de tarjetas se cuenta con los ojos; el de los que se van a
             quedar sin junta, no. */
          conteo={sinProxima > 0 && `${sinProxima} por agendar`}
        >
          <div className={estilos.salas}>
            {salas.map((s) => {
              const t = temperatura(s)
              const abiertos = acuerdosAbiertos(s)
              const vencidos = acuerdosVencidos(s)
              const dias = s.proximaReunion ? diasHasta(s.proximaReunion, hoy) : null
              return (
                <Link
                  key={s.slug}
                  href={`/cliente/${s.slug}`}
                  /* Apagada si está en pausa: es la señal entera, y por eso ya
                     no hace falta un módulo aparte para ella. */
                  className={`tarjeta ${estilos.sala}${s.activa === false ? ` ${estilos.salaPausada}` : ''}`}
                  style={{ '--marca': s.color, '--marca-texto': colorDeTextoDeMarca(s.color) } as CSSProperties}
                >
                  {/* El logotipo ES el nombre: la marca identifica más rápido
                      que su nombre escrito en la tipografía del sistema. Las
                      nueve tienen el suyo — Ceci, su firma. */}
                  <span className={estilos.salaLogo}>
                    <Image
                      // logoUrl de la fila, y solo si es null cae al archivo
                      // estático (revisión final de la rama, punto 3) — ver
                      // `archivoDeLogo`, src/temas/logos.ts.
                      src={archivoDeLogo(s.slug, 'color', s.logoUrl)}
                      alt={s.nombre}
                      width={180}
                      height={40}
                      className={estilos.salaLogoImg}
                      // Cada marca a SU altura: igualar alturas hace que un
                      // logotipo apaisado ocupe cuatro veces más mancha.
                      style={{ '--alto-logo': `${altoDeLogo(s.slug)}px` } as CSSProperties}
                    />
                  </span>

                  <div className={estilos.salaCuando}>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV} data-temp={t}>
                        {textoDiasDesde(s.diasDesdeUltima)}
                      </span>
                      <span className="micro" data-sinpunto>última</span>
                    </span>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV} data-pendiente={s.proximaReunion ? undefined : 'true'}>
                        {s.proximaReunion
                          ? `${fechaBreve(s.proximaReunion)}${dias != null && dias >= 0 ? ` · ${dias} d` : ''}`
                          : 'por agendar'}
                      </span>
                      <span className="micro" data-sinpunto>próxima</span>
                    </span>
                  </div>

                  {/* SIN EMPEZAR NO ES 0%. Con el deck recién creado, esto
                      pintaba "0 de 8 secciones · 0%" y una barra vacía: dos
                      ceros y una línea gris que se leen como "esto va mal",
                      cuando lo único que dicen es que la presentación aún no
                      se ha tocado. Tres de los ocho clientes salían así.
                      Empezado, la barra vuelve —ahí sí compara y ahí sí
                      significa avance. */}
                  {s.enPreparacion && s.seccionesTotales ? (
                    <div className={estilos.salaAvance}>
                      <span className={estilos.salaAvanceTexto}>
                        {!s.seccionesEscritas ? (
                          <span>sin empezar · {s.seccionesTotales} secciones</span>
                        ) : (
                          <>
                            <span>{s.seccionesEscritas} de {s.seccionesTotales} secciones</span>
                            <span>{s.avancePreparacion}%</span>
                          </>
                        )}
                      </span>
                      {(s.seccionesEscritas ?? 0) > 0 && (
                        <span className={estilos.salaBarra}>
                          <span className={estilos.salaBarraRelleno} style={{ width: `${s.avancePreparacion ?? 0}%` }} />
                        </span>
                      )}
                    </div>
                  ) : (
                    <span />
                  )}

                  {/* ⚠️ UNA SALA EN PAUSA DICE "EN PAUSA" Y NADA MÁS. No es
                      cosmética: `acuerdosAbiertos`/`acuerdosVencidos` (ver
                      dominio/salas.ts) devuelven 0 para una sala congelada a
                      propósito —sus compromisos están parados, no vencidos—,
                      así que sin este caso la tarjeta de Zeus diría "al día",
                      que es una afirmación sobre un trabajo que nadie está
                      haciendo. */}
                  <div className={estilos.salaChips}>
                    {s.activa === false ? (
                      <span className="pildora">en pausa{s.pausadaDesde ? ` · ${fechaBreve(s.pausadaDesde)}` : ''}</span>
                    ) : (
                      <>
                        {s.enPreparacion && <span className="pildora" data-tono="marca">en preparación</span>}
                        {vencidos > 0 && <span className="pildora" data-tono="mal">{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
                        {abiertos > 0 && <span className="pildora">{abiertos} abierto{abiertos > 1 ? 's' : ''}</span>}
                        {abiertos === 0 && vencidos === 0 && <span className="pildora">al día</span>}
                      </>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </Seccion>

        {/* POR CONFIRMAR (punto 2/3): las reuniones que la deducción
            automática de `fueDada` ya está contando como dadas —o casi—, sin
            que nadie lo haya dicho todavía. Cierra el ciclo que el pulso
            deja abierto: aquí se responde.

            RE-REVISIÓN (hallazgo I2): vive AQUÍ, después de "Los clientes" y
            junto a los demás módulos generales —no antes de las salas—.
            Franco, textual, es sobre las salas: *"lo primero que ves son las
            salas y luego otros módulos de interés agnósticos y
            generales"*; "Por confirmar" es uno de esos módulos, así que baja
            con ellos. Movida en el JSX, no con `order` de CSS (mismo
            criterio que "Los clientes", arriba): el orden del documento es
            el de lectura y el del teclado. */}
        {porConfirmar.length > 0 && (
          <Seccion
            icono="reuniones"
            titulo="Por confirmar"
            conteo={
              porConfirmar.length === 1
                ? 'una ya pasó su día sin marcar'
                : `${porConfirmar.length} ya pasaron su día sin marcar`
            }
          >
            <ReunionesPorConfirmar
              sesiones={porConfirmar}
              marcarPresentadaAction={marcarPresentadaAction}
              marcarNoDadaAction={marcarNoDadaAction}
              desmarcarNoDadaAction={desmarcarNoDadaAction}
            />
          </Seccion>
        )}

        {/* LOS MÓDULOS GENERALES: calendario + agendar, y minutas.
            ACUERDOS YA NO VIVE AQUÍ (ronda 14.5, tarea 1) — decisión de
            Franco, textual: *"solo una cifra"*. El módulo `ModuloAcuerdos`
            —Destacados y Vencidos, editable in situ— se retiró del Home
            entero: las dos cifras que el pulso YA pinta más arriba
            ("acuerdos abiertos" y "vencido(s)", ronda 12) son la única
            supervivencia de los acuerdos en esta pantalla, y las dos llevan a
            `/acuerdos`, que es donde se puede hacer algo con ellos. Al
            quedarse sin llamador dentro de esta app, el componente y su test
            se borraron (ver el historial de `componentes/hogar/`); ningún
            otro archivo lo montaba.

            ESA MISMA RETIRADA SALDA UNA DEUDA ANOTADA EN EL SPEC §4: la
            estrella de un acuerdo dice "Fijar arriba en Acuerdos"
            (`Estrella.tsx`), pero mientras el Home pintara su bloque
            Destacados ese control hacía MÁS de lo que su etiqueta prometía
            —entrar o salir de ESE bloque, no solo fijar el acuerdo arriba en
            `/acuerdos`—. Sin `ModuloAcuerdos`, la etiqueta vuelve a describir
            exactamente lo único que la estrella hace.

            Con acuerdos fuera, `.modulos` pasó de tener TRES hijos a DOS
            —el `<div>` de calendario+agendar y `ModuloMinutas`— y su CSS se
            simplificó con ellos (ver `.modulos` en `hub.module.css`): ya no
            hace falta repartir columnas y filas con `:nth-child`, dos
            columnas iguales alcanzan. */}
        <div className={estilos.modulos}>
          {/* AGENDAR RÁPIDO (tarea 14), junto al calendario — Franco, literal:
              "el calendario (no lo desaparezcas del home), más sí debe haber
              un botón en el home para agendar rápidamente una sesión". El
              calendario NO SE TOCA: los dos viven envueltos en un mismo
              `<div>`, que sigue siendo UN SOLO hijo directo de `.modulos`. */}
          <div id="calendario" style={{ display: 'grid', gap: '0.9rem', alignContent: 'start' }}>
            <AgendarRapido salas={salasParaAgendar} agendar={agendarRapidoAction} />
            <ModuloCalendario sesiones={paraCalendario} hoy={hoy.toISOString()} />
          </div>
          <ModuloMinutas
            minutas={minutas}
            pendientes={sinMinuta}
            salas={salasCrudas.map((x) => ({ slug: x.slug, nombre: x.nombre }))}
            molde={molde}
            guardarMoldeAction={guardarMoldeAction}
            personas={personas}
          />
        </div>

        {/* ═══ LO VENCIDO, DONDE SE VE ═══════════════════════════════════
            Franco: *"el módulo 'en pausa' reemplázalo por un módulo que
            muestre los acuerdos vencidos con un botón que me lleve a la
            pestaña de acuerdos"*.

            El sitio que ocupaba lo tenía una lista de salas congeladas —una,
            Zeus— que ahora vive apagada al final de la rejilla de clientes,
            que es todo lo que necesitaba. En su lugar va lo único que en este
            Home pedía a gritos un sitio: los compromisos que ya se pasaron de
            fecha. El pulso los CUENTA arriba; aquí se dice CUÁLES son y de
            quién, que es lo que permite hacer algo con ellos.

            Solo aparece si hay: un módulo que dice "cero vencidos" ocupa el
            mismo alto que uno con trabajo dentro y no añade nada — misma
            regla que "Por confirmar", justo arriba. */}
        {vencidos.length > 0 && (
          <Seccion
            icono="acuerdos"
            titulo="Acuerdos vencidos"
            conteo={`${vencidos.length} ${vencidos.length === 1 ? 'compromiso pasado de fecha' : 'compromisos pasados de fecha'}`}
          >
            <ul className={estilos.vencidosLista}>
              {vencidos.map((v) => (
                <li key={v.id} className={estilos.vencidoFila}>
                  {/* La fila entera lleva a SU sala, que es donde se mueve el
                      acuerdo: el estatus, la fecha y el dueño se corrigen ahí
                      dentro, no en una lista de lectura. */}
                  <Link href={`/cliente/${v.salaSlug}#s-acuerdos`} className={estilos.vencidoEnlace}>
                    <span className={estilos.vencidoQue}>{v.que}</span>
                    <span className={estilos.vencidoMeta}>
                      <span className={estilos.vencidoSala} style={{ '--marca': v.salaColor } as CSSProperties}>
                        {v.salaNombre}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{v.responsable || 'sin dueño'}</span>
                      {v.fechaCompromiso && (
                        <>
                          <span aria-hidden>·</span>
                          <span className={estilos.vencidoFecha}>venció el {fechaBreve(v.fechaCompromiso)}</span>
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/acuerdos" className={estilos.vencidosBoton}>
              Ver todos los acuerdos →
            </Link>
          </Seccion>
        )}

      </main>
    </div>
  )
}
