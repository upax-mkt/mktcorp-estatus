import Link from 'next/link'
import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import estilos from './agenda.module.css'
import { editarReunion, listarReuniones } from '@/db/reuniones'
import { crearReunionConDocumento, documentoDeReunion } from '@/db/documentos'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { PanelAgenda, type SesionAgendada } from '@/componentes/agenda/PanelAgenda'
import type { DatosFormulario } from '@/componentes/agenda/FormularioSesion'
import { fechaLarga, instanteEnCDMX } from '@/lib/fecha'

export const dynamic = 'force-dynamic'

/**
 * Día + hora del formulario → instante, anclado a CDMX (ver `instanteEnCDMX`,
 * src/lib/fecha.ts) y no a la zona del proceso: en Vercel el servidor corre
 * en UTC, así que "10:00" se guardaría como las cuatro de la mañana en
 * México. El default de "10:00" cuando no se especifica hora es una regla de
 * esta pantalla (una reunión sin hora se asume de mañana), no del helper
 * genérico, así que se queda aquí.
 *
 * Vive FUERA del componente. Dentro, las Server Actions la capturaban en su
 * cierre y React intentaba serializarla al cliente: "Functions cannot be
 * passed directly to Client Components". El build no lo detecta — solo se ve
 * al usar la página.
 */
function instanteDe(dia: string, hora: string): Date {
  return instanteEnCDMX(dia, hora || '10:00')
}

/**
 * Dónde se agendan las sesiones y dónde el equipo ve el mes.
 *
 * Existe porque hasta ahora una sesión solo nacía al empezar a PREPARARLA:
 * "próxima sesión" en el hub se deducía de eso, así que no había manera de
 * decir "el 19 de agosto tenemos Zeus" sin ponerse a redactar el estatus, y
 * el aviso nunca podía estar verde.
 *
 * Outlook queda para después. El modelo guarda lo que trae un evento de
 * calendario —cuándo, dónde, quién— para que integrarlo sea rellenar estos
 * campos y no rehacerlos.
 */
export default async function PagAgenda() {
  // Esta página SOLO MUESTRA el mes y el formulario; agendar/editar son
  // Server Actions aparte (abajo), cada una con su propia exigencia.
  await exigirLectura()
  // Sin esto Next la prerenderiza y el calendario se queda anclado al día del
  // build: "hoy" sería la fecha del despliegue para siempre.
  await connection()
  const hoy = new Date()

  const [reuniones, slugsReales, registro] = await Promise.all([
    listarReuniones(),
    slugsDeSalas(),
    cargarTemas(),
  ])

  const salas = slugsReales.map((slug) => {
    const tema = registro[slug]
    return { slug, nombre: tema.nombre, color: tema.primario }
  })

  /**
   * `itemsLlenados`/`totalItems` no viven en `ReunionResumen` (son del
   * documento, no de la reunión — spec §1): se resuelven aquí, una consulta
   * por reunión en paralelo. La lista de la agenda es de decenas de
   * reuniones, no miles, así que esto no es el problema de N+1 que sería en
   * una lista sin cota.
   */
  const documentos = await Promise.all(reuniones.map((r) => documentoDeReunion(r.id)))
  const paraElPanel: SesionAgendada[] = reuniones.map((r, i) => {
    const doc = documentos[i]
    return {
      id: r.id,
      fecha: r.fecha,
      titulo: r.titulo,
      salaSlug: r.salaSlug,
      salaNombre: r.salaNombre,
      salaColor: r.salaColor,
      estado: r.estado,
      alcance: r.alcance,
      tipo: r.tipo,
      lugar: r.lugar,
      participantes: r.participantes,
      itemsLlenados: doc?.items.filter((it) => it.llenado).length ?? 0,
      totalItems: doc?.items.length ?? 0,
    }
  })

  async function agendarAction(datos: DatosFormulario): Promise<{ error?: string }> {
    'use server'
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
    revalidatePath('/agenda')
    revalidatePath('/')
    return {}
  }

  async function editarAction(id: string, datos: DatosFormulario): Promise<{ error?: string }> {
    'use server'
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
    revalidatePath('/agenda')
    revalidatePath('/')
    return {}
  }

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Agenda</div>
        <nav className={estilos.barraDcha}>
          <Link href="/deck" className={estilos.barraLink}>Deck Designer</Link>
          <span className={estilos.barraFecha}>{fechaLarga(hoy)}</span>
        </nav>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Agenda</h1>
          <p className={estilos.subtitulo}>
            Las reuniones de todos los clientes. Lo que se agenda aquí es lo que el hub anuncia como
            próxima reunión.
          </p>
        </div>

        <PanelAgenda
          sesiones={paraElPanel}
          salas={salas}
          hoy={hoy.toISOString()}
          agendarAction={agendarAction}
          editarAction={editarAction}
        />
      </main>
    </div>
  )
}
