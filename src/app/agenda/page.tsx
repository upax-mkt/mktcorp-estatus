import Link from 'next/link'
import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import estilos from './agenda.module.css'
import { crearSesionConEstructura, editarSesion, listarSesiones } from '@/db/sesiones'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { exigirEquipo } from '@/auth/sesion'
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
  await exigirEquipo()
  // Sin esto Next la prerenderiza y el calendario se queda anclado al día del
  // build: "hoy" sería la fecha del despliegue para siempre.
  await connection()
  const hoy = new Date()

  const [sesiones, slugsReales, registro] = await Promise.all([
    listarSesiones(),
    slugsDeSalas(),
    cargarTemas(),
  ])

  const salas = slugsReales.map((slug) => {
    const tema = registro[slug]
    return { slug, nombre: tema.nombre, color: tema.primario }
  })

  const paraElPanel: SesionAgendada[] = sesiones.map((s) => ({
    id: s.id,
    fecha: s.fecha,
    titulo: s.titulo,
    salaSlug: s.salaSlug,
    salaNombre: s.salaNombre,
    salaColor: s.salaColor,
    estado: s.estado,
    alcance: s.alcance,
    tipo: s.tipo,
    lugar: s.lugar,
    participantes: s.participantes,
    itemsLlenados: s.itemsLlenados,
    totalItems: s.totalItems,
  }))

  async function agendarAction(datos: DatosFormulario): Promise<{ error?: string }> {
    'use server'
    await exigirEquipo()
    try {
      await crearSesionConEstructura({
        salaSlug: datos.salaSlug,
        tipo: datos.tipo,
        alcance: datos.alcance.trim() || 'todos',
        fecha: instanteDe(datos.dia, datos.hora),
        titulo: datos.titulo.trim() || undefined,
        participantes: datos.participantes.split(',').map((p) => p.trim()).filter(Boolean),
        lugar: datos.lugar.trim() || null,
        // Nace como fecha en el calendario, no como trabajo en curso: pasa
        // sola a 'borrador' en cuanto alguien escribe algo dentro.
        estado: 'agendada',
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo agendar la sesión.' }
    }
    revalidatePath('/agenda')
    revalidatePath('/')
    return {}
  }

  async function editarAction(id: string, datos: DatosFormulario): Promise<{ error?: string }> {
    'use server'
    await exigirEquipo()
    try {
      await editarSesion(id, {
        fecha: instanteDe(datos.dia, datos.hora),
        titulo: datos.titulo.trim() || undefined,
        tipo: datos.tipo,
        alcance: datos.alcance.trim() || 'todos',
        participantes: datos.participantes.split(',').map((p) => p.trim()).filter(Boolean),
        lugar: datos.lugar.trim() || null,
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo guardar la sesión.' }
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
            Las sesiones de todos los clientes. Lo que se agenda aquí es lo que el hub anuncia como
            próxima sesión.
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
