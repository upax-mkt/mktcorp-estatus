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
  acuerdosVencidos, todosLosAcuerdos, pulsoDelMes, type EstatusAcuerdo,
} from '@/db/consultas'
import { type SesionMinutable, type SesionPorConfirmar } from '@/dominio/salas'
import { reunionesMinutables, reunionesPorConfirmar } from '@/dominio/reunion'
import { altoDeLogo, archivoDeLogo } from '@/temas/logos'
import { moverEstatus, editarAcuerdo } from '@/db/acuerdos'
import { destacarAction } from '@/app/acuerdos/acciones'
import { listarReuniones, marcarDada, marcarNoDada, desmarcarNoDada } from '@/db/reuniones'
import { crearReunionConDocumento } from '@/db/documentos'
import { registrarEdicion } from '@/db/participacion'
import { directorio } from '@/db/personas'
import { moldeDeMinuta, guardarMoldeDeMinuta } from '@/db/plantillas'
import { loQueFaltaAlMolde, type MoldeMinuta } from '@/minuta/molde'
import { fechaBreve, textoDiasDesde, diasHasta, diaCivil, instanteEnCDMX } from '@/lib/fecha'
import { cerrarSesion } from '@/auth/sesion'
import { exigirEditor, exigirLectura, esAdmin } from '@/auth/roles'
import { ModuloAcuerdos } from '@/componentes/hogar/ModuloAcuerdos'
import { ModuloCalendario } from '@/componentes/hogar/ModuloCalendario'
import { ModuloMinutas, type MinutaEnHome } from '@/componentes/hogar/ModuloMinutas'
import { AgendarRapido, type SalaParaAgendar, type DatosAgendarRapido } from '@/componentes/hogar/AgendarRapido'
import { ReunionesPorConfirmar } from '@/componentes/ReunionesPorConfirmar'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
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
 * tarjetas con su logotipo, y tres módulos que se USAN sin salir de aquí —
 * el mes, los acuerdos en riesgo (editables en el sitio) y las minutas.
 *
 * El orden de la página es el orden de las preguntas que uno se hace al
 * abrirla: qué se me está venciendo, qué viene, y cómo está cada relación.
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

  async function cambiarEstatusAction(id: string, estatus: EstatusAcuerdo) {
    'use server'
    await exigirEditor()
    await moverEstatus(id, estatus)
    revalidatePath('/')
  }

  async function ponerFechaAction(id: string, fecha: string | null) {
    'use server'
    await exigirEditor()
    await editarAcuerdo(id, { fechaCompromiso: fecha ? new Date(fecha) : null })
    revalidatePath('/')
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
   * AGENDAR DESDE EL HOME (tarea 14): reusa `crearReunionConDocumento`, no la
   * `crearReunion` de bajo nivel — y no por casualidad, sino por lo mismo que
   * usa `/agenda` (`agendarAction`, src/app/agenda/page.tsx): hoy TODA
   * reunión agendada desde la app nace con su documento —es lo que hace
   * `/agenda`, y por qué las diez reuniones migradas lo tienen todas.
   * `crearReunionConDocumento` ya sabe qué hacer con un título vacío (cae a
   * `tituloPorDefecto`, src/db/documentos.ts); la `crearReunion` de bajo
   * nivel no tiene esa lógica y hubiera guardado un título en blanco —
   * visible luego en el calendario, en /agenda y en el propio deck. Ser
   * coherente con "toda reunión agendada tiene documento" también evita
   * abrir, desde el atajo del Home, el único camino de la app hacia una
   * reunión sin documento (`documentoDeReunion` lo tolera — devuelve `null` —
   * pero hoy ningún flujo real lo produce).
   *
   * `datos.titulo` SE REENVÍA TAL CUAL (auditoría UX/UI, ronda 11 — "el
   * título de una reunión no dice de qué es"): `AgendarRapido.tsx` sigue
   * siendo a propósito minimalista (sala/día/hora/tipo), pero ahora suma un
   * quinto campo, OPCIONAL, para el título — sin él, dos reuniones de la
   * misma sala y cadencia (el caso real: Research Land, Comercial vs.
   * Digital, las dos quincenales) nacían con el MISMO título derivado,
   * indistinguibles en cualquier lista. ANTES de este arreglo, esta acción
   * mandaba `titulo: ''` FIJO sin mirar `datos.titulo` en absoluto — un
   * campo que el formulario recogiera se habría perdido aquí mismo, el
   * defecto exacto de "se construyó, se probó, y nadie lo montó en pantalla"
   * que este proyecto ya sufrió antes. Vacío o lleno, `datos.titulo` viaja
   * sin tocar: `crearReunionConDocumento` decide qué hacer con cada caso.
   *
   * ESCONDER EL BOTÓN NO PROTEGE EL ENDPOINT: `exigirEditor()` primero, igual
   * que cualquier otra acción de escritura de esta página. Y "una sala en
   * pausa no se ofrece" (constraint del brief, con su test en
   * `AgendarRapido.test.tsx`) es cortesía de interfaz nada más — el rechazo
   * de verdad, contra el freeze real de la base, ya lo hace `crearReunion`
   * por dentro de `crearReunionConDocumento`. El try/catch de aquí solo
   * convierte esa excepción en un mensaje legible para el formulario en vez
   * de tumbar la página entera — mismo patrón que `agendarAction`/
   * `editarAction` en `/agenda`.
   */
  async function agendarRapidoAction(datos: DatosAgendarRapido): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    try {
      await crearReunionConDocumento({
        salaSlug: datos.salaSlug,
        tipo: datos.tipo,
        fecha: instanteDe(datos.dia, datos.hora),
        titulo: datos.titulo,
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

  const [salasCrudas, acuerdos, pulso, reuniones, personas, admin, clientes] = await Promise.all([
    estadoDeSalas(),
    // Las diez salas juntas (tarea 11): de aquí salen los dos bloques de
    // ModuloAcuerdos (tarea 12) — destacados y vencidos son dos filtros sobre
    // la MISMA lista, no dos consultas que se puedan desincronizar entre sí.
    // A PROPÓSITO no son excluyentes: cada uno contesta su propia pregunta
    // completa ("todo lo destacado", "todo lo vencido"), y un acuerdo puede
    // cumplir las dos a la vez — eso es real, no un error de aquí. Que no se
    // PINTE dos veces por eso es responsabilidad de quien pinta: el dedupe y
    // el porqué de "vencidos manda" viven en `ModuloAcuerdos` (crítico de la
    // auditoría UX/UI, ronda 11 — antes de ese arreglo SÍ se pintaba dos veces).
    todosLosAcuerdos(),
    pulsoDelMes(),
    listarReuniones(),
    // Para el selector de responsable de ModuloMinutas → LevantarMinuta →
    // MinutaCliente — directorio() ya aguanta Monday caído.
    directorio(),
    // Ronda 9, tarea 3: si quien mira el Home administra Marketing
    // Corporativo, para enseñar el enlace a /personas en la barra — solo
    // cosmética (esa pantalla vuelve a exigir admin ella sola), pero no tiene
    // sentido ofrecer un enlace a quien va a rebotar en cuanto lo toque.
    esAdmin(),
    clientesParaBarra(),
  ])
  const molde = await moldeDeMinuta(null)
  const salas = ordenarPorProximaReunion(salasCrudas)
  // En pausa, aparte (tarea 12): `ordenarPorProximaReunion` ya las manda al
  // final del mismo orden, pero la tarjeta de una sala congelada no tiene
  // nada en común con la de una activa —ni próxima reunión, ni vencidos que
  // contar— así que se separan en su propio bloque en vez de mezclarse en la
  // misma rejilla con media tarjeta vacía.
  const salasActivas = salas.filter((s) => s.activa)
  const salasPausadas = salas.filter((s) => !s.activa)
  // Ninguno de los dos EXCLUYE al otro (ver el comentario del Promise.all,
  // arriba): un acuerdo destacado que además venció vive en las dos listas
  // que siguen. Quién gana al pintarlo es decisión de `ModuloAcuerdos`, no
  // de aquí.
  const destacados = acuerdos.filter((a) => a.destacado)
  // Nombre distinto de la constante `vencidos` que ya existe MÁS ABAJO, por
  // sala, dentro del .map() de tarjetas — son dos cosas distintas (una lista
  // completa vs. un conteo por sala) y compartir nombre solo confundiría.
  const acuerdosVencidosParaHome = acuerdos.filter((a) => a.estatus === 'vencido')

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
          <div className={estilos.pulsoCifras}>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.salas}</span>
              <span className="micro">clientes</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.reunionesEsteMes}</span>
              <span className="micro">reuniones este mes</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.reunionesDadas}</span>
              {/* Singular/plural (extra de la auditoría UX/UI, ronda 11):
                  decía "1 ya se dieron" con una sola reunión. Mismo criterio
                  que ya usa esta pantalla más abajo, en la píldora de cada
                  tarjeta de sala. */}
              <span className="micro">{pulso.reunionesDadas === 1 ? 'ya se dio' : 'ya se dieron'}</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.acuerdosAbiertos}</span>
              <span className="micro">acuerdos abiertos</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra" data-alerta={pulso.acuerdosVencidos > 0 ? 'true' : undefined}>
                {pulso.acuerdosVencidos}
              </span>
              {/* Mismo arreglo que "ya se dieron", arriba: decía "1 vencidos". */}
              <span className="micro">{pulso.acuerdosVencidos === 1 ? 'vencido' : 'vencidos'}</span>
            </div>
          </div>
        </section>

        {/* POR CONFIRMAR (punto 2/3): las reuniones que la deducción
            automática de `fueDada` ya está contando como dadas —o casi—, sin
            que nadie lo haya dicho todavía. Cierra el ciclo que el pulso, un
            poco más arriba, deja abierto: aquí se responde. */}
        {porConfirmar.length > 0 && (
          <section>
            <div className={estilos.seccionCabecera}>
              <h2 className={estilos.seccionTitulo}>Por confirmar</h2>
              <span className="micro" data-sinpunto>
                {porConfirmar.length === 1
                  ? 'una reunión ya pasó su día sin marcar'
                  : `${porConfirmar.length} reuniones ya pasaron su día sin marcar`}
              </span>
            </div>
            <ReunionesPorConfirmar
              sesiones={porConfirmar}
              marcarPresentadaAction={marcarPresentadaAction}
              marcarNoDadaAction={marcarNoDadaAction}
              desmarcarNoDadaAction={desmarcarNoDadaAction}
            />
          </section>
        )}

        {/* Los módulos: lo que hay que atender y lo que viene. */}
        <div className={estilos.modulos}>
          <ModuloAcuerdos
            destacados={destacados}
            vencidos={acuerdosVencidosParaHome}
            total={acuerdos.length}
            destacarAction={destacarAction}
            cambiarEstatusAction={cambiarEstatusAction}
            ponerFechaAction={ponerFechaAction}
          />
          {/* AGENDAR RÁPIDO (tarea 14), junto al calendario — Franco, literal:
              "el calendario (no lo desaparezcas del home), más sí debe haber
              un botón en el home para agendar rápidamente una sesión". El
              calendario NO SE TOCA: los dos viven envueltos en un mismo
              `<div>`, que sigue siendo UN SOLO hijo directo de `.modulos`
              (columna 2, filas 1-2 — ver `.modulos` en `hub.module.css`). Así
              el CSS de la rejilla queda intacto, a propósito: nada que
              reajustar en `grid-template-rows`, porque `.modulos` sigue
              viendo TRES hijos, exactamente como antes — el mismo hueco de la
              ronda 2 que esas reglas ya resuelven para tres, no para cuatro. */}
          <div style={{ display: 'grid', gap: '0.9rem', alignContent: 'start' }}>
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

        {/* Las salas, con su logotipo. */}
        <section>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Los clientes</h2>
            {/* "Los clientes" es masculino: el adjetivo concuerda con eso, no
                con "salas" (femenino) — extra de la auditoría UX/UI, ronda 11. */}
            <span className="micro" data-sinpunto>ordenados por próxima reunión</span>
          </div>

          <div className={estilos.salas}>
            {salasActivas.map((s) => {
              const t = temperatura(s)
              const abiertos = acuerdosAbiertos(s)
              const vencidos = acuerdosVencidos(s)
              const dias = s.proximaReunion ? diasHasta(s.proximaReunion, hoy) : null
              return (
                <Link
                  key={s.slug}
                  href={`/cliente/${s.slug}`}
                  className={`tarjeta ${estilos.sala}`}
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

                  {s.enPreparacion && s.seccionesTotales ? (
                    <div className={estilos.salaAvance}>
                      <span className={estilos.salaAvanceTexto}>
                        <span>{s.seccionesEscritas} de {s.seccionesTotales} secciones</span>
                        <span>{s.avancePreparacion}%</span>
                      </span>
                      <span className={estilos.salaBarra}>
                        <span className={estilos.salaBarraRelleno} style={{ width: `${s.avancePreparacion ?? 0}%` }} />
                      </span>
                    </div>
                  ) : (
                    <span />
                  )}

                  <div className={estilos.salaChips}>
                    {s.enPreparacion && <span className="pildora" data-tono="marca">en preparación</span>}
                    {vencidos > 0 && <span className="pildora" data-tono="mal">{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
                    {abiertos > 0 && <span className="pildora">{abiertos} abierto{abiertos > 1 ? 's' : ''}</span>}
                    {abiertos === 0 && vencidos === 0 && <span className="pildora">al día</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* EN PAUSA (tarea 12): aparte de "Los clientes", no mezcladas en la
            misma rejilla. Una sala en freeze no se borra —su historia se
            sigue consultando igual, y por eso sigue siendo un link a su
            sala— pero no tiene próxima reunión que anunciar ni vencidos que
            contar, así que la tarjeta dice otra cosa: desde cuándo está en
            pausa. */}
        {salasPausadas.length > 0 && (
          <section>
            <div className={estilos.seccionCabecera}>
              <h2 className={estilos.seccionTitulo}>En pausa</h2>
              <span className="micro" data-sinpunto>freeze comercial — sin reuniones ni gestión hasta nuevo aviso</span>
            </div>

            <div className={estilos.salas}>
              {salasPausadas.map((s) => (
                <Link
                  key={s.slug}
                  href={`/cliente/${s.slug}`}
                  className={`tarjeta ${estilos.sala} ${estilos.salaPausada}`}
                  style={{ '--marca': s.color, '--marca-texto': colorDeTextoDeMarca(s.color) } as CSSProperties}
                >
                  <span className={estilos.salaLogo}>
                    <Image
                      src={archivoDeLogo(s.slug, 'color', s.logoUrl)}
                      alt={s.nombre}
                      width={180}
                      height={40}
                      className={estilos.salaLogoImg}
                      style={{ '--alto-logo': `${altoDeLogo(s.slug)}px` } as CSSProperties}
                    />
                  </span>

                  <div className={estilos.salaCuando}>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV}>{textoDiasDesde(s.diasDesdeUltima)}</span>
                      <span className="micro" data-sinpunto>última</span>
                    </span>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV}>
                        {s.pausadaDesde ? fechaBreve(s.pausadaDesde) : '—'}
                      </span>
                      <span className="micro" data-sinpunto>en pausa desde</span>
                    </span>
                  </div>

                  <span />

                  <div className={estilos.salaChips}>
                    <span className="pildora">en pausa</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
