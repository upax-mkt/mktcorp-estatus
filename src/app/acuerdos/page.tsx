import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { exigirLectura, esAdmin, esEditor } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { todosLosAcuerdos } from '@/db/consultas'
import { acuerdosPendientesDeSubir, refrescarDesdeMonday } from '@/db/acuerdos'
import { slugsDeSalasPausadas } from '@/db/salas'
import { genteParaResponsable } from '@/db/personas'
import { equiposPara } from '@/lib/equipos'
import { ErrorMonday } from '@/monday/cliente'
import { TablaAcuerdos } from '@/componentes/acuerdos/TablaAcuerdos'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import {
  destacarAction,
  editarAcuerdoEnTablaAction,
  eliminarAcuerdoEnTablaAction,
  cambiarEstatusEnTablaAction,
  editarFechaEnTablaAction,
  moverDeSalaAction,
} from './acciones'
import estilos from '@/componentes/acuerdos/bandeja.module.css'

export const dynamic = 'force-dynamic'

/**
 * La vuelta antes de leer, mismo criterio que src/app/acuerdos/bandeja/page.tsx
 * (y la misma regla central de src/monday/sincronizar.ts): un fallo de Monday
 * nunca debe tumbar esta pantalla, pero "ignora" no es "en silencio para
 * siempre" — si la causa es NUESTRA (no Monday cayéndose) tiene que quedar en
 * el log, o nadie se entera de que la sincronización dejó de andar.
 */
async function refrescarDesdeMondaySeguro(): Promise<void> {
  try {
    await refrescarDesdeMonday()
  } catch (error) {
    if (error instanceof ErrorMonday) {
      console.error(`[refrescarDesdeMonday] Monday no respondió: ${error.message}`)
    } else {
      console.error('[refrescarDesdeMonday] Falló algo de nuestro lado, no de Monday:', error)
    }
  }
}

/**
 * EL ESPACIO DE ACUERDOS: los de las diez salas, juntos.
 *
 * Hoy un acuerdo solo se ve dentro de su propia sala, así que no hay forma de
 * contestar "qué le debemos a quién esta semana" sin entrar sala por sala.
 * Esta pantalla es esa respuesta, y desde aquí se fija arriba lo que más
 * importa mirar primero, con la misma estrella que en la sala — ver
 * Estrella.tsx. Hasta la ronda 14 destacar quería decir "sale en el Home"
 * (tarea 12, pendiente, iba a cablearlo ahí); el Home dejó de listar
 * acuerdos (§4 del spec) antes de que esa tarea llegara a escribirse, así
 * que la estrella cambió lo que DICE sin tocar el gesto ni la columna que lo
 * guarda.
 *
 * SOLO EQUIPO. El proxy ya la niega por defecto a una sesión de sala —
 * `puedeVerRuta` en src/auth/politica.ts es lista blanca estricta y `/acuerdos`
 * no está en ninguna de sus excepciones—, pero esa es la verificación
 * OPTIMISTA (ver la cabecera de src/proxy.ts); la que manda es esta,
 * `exigirLectura()`, pegada al dato. Esta página SOLO MUESTRA — destacar
 * (la estrella) y las acciones de la bandeja se protegen aparte, cada una con
 * su propia exigencia (ver `./acciones.ts`) — así que los tres roles de
 * equipo pueden abrirla. El director de una UDN sigue viendo solo SU sala,
 * como en el resto de la app, y la bandeja que cuelga de aquí es de equipo
 * por la misma razón: no sube nada a Monday por su cuenta.
 */
export default async function PagAcuerdos() {
  await exigirLectura()
  // `connection()`/`hoy`/`admin` (ronda 11, tarea 2): igual que `/` y `/deck`
  // — la fecha y el gate de Clientes/Personas que pinta `BarraNavegacion`,
  // que esta pantalla no montaba hasta ahora. Sin `connection()`, Next
  // prerenderiza y "hoy" queda anclado a la fecha del build.
  await connection()
  const hoy = new Date()

  await refrescarDesdeMondaySeguro()

  const [acuerdos, pendientes, admin, clientes, pausadas, personas, editor] = await Promise.all([
    todosLosAcuerdos(),
    acuerdosPendientesDeSubir(),
    esAdmin(),
    clientesParaBarra(),
    slugsDeSalasPausadas(),
    // El directorio de Mkt Corp y los equipos son para el editor de la fila
    // (ronda 13). Un viewer no lo monta, pero la lista se pide igual: cuesta
    // una consulta a una tabla de 24 filas y evita dos caminos distintos
    // según el rol en una página que ya es lo bastante condicional.
    genteParaResponsable(),
    esEditor(),
  ])

  /**
   * LOS EQUIPOS QUE PUEDEN CARGAR CON UN ACUERDO: los squads de Mkt Corp
   * —escritos en src/lib/equipos.ts— y las UDN, que son las salas VIVAS de
   * esta app. Las pausadas se quedan fuera: a quien está en freeze no se le
   * encarga trabajo nuevo.
   */
  const equipos = equiposPara(
    clientes.map((c) => ({ nombre: c.nombre, activa: !pausadas.has(c.slug) })),
  )

  // Mismo patrón que `salir` en `src/app/page.tsx` / `src/app/deck/page.tsx`:
  // repetido a propósito en cada pantalla que monta `BarraNavegacion`.
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  return (
    <div className={estilos.app}>
      <BarraNavegacion seccionActiva="acuerdos" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Acuerdos</h1>
            <p className={estilos.subtitulo}>
              Los de las nueve salas, juntos: qué le debemos a quién esta semana. La estrella fija
              un acuerdo arriba.
            </p>
          </div>
          <Link
            href="/acuerdos/bandeja"
            className="pildora"
            data-tono={pendientes.length > 0 ? 'ojo' : undefined}
          >
            {pendientes.length > 0 ? `${pendientes.length} por revisar en la bandeja` : 'Bandeja de acuerdos'}
          </Link>
        </div>

        {/* QUIÉN PUEDE QUÉ, decidido aquí y no dentro de la tabla: corregir
            texto, estatus, fecha y sala son trabajo de equipo (editor) —las
            cuatro llaman `exigirEditor()`, ver ./acciones.ts— y eliminar es
            de administración (admin), así que cada acción se pasa —o no—
            según el rol. La tabla solo pinta lo que recibe; la comprobación
            que manda vive en cada Server Action, porque esconder un botón no
            protege un endpoint. `salas` son las VIVAS (`pausadas` ya vino
            cargada arriba, mismo criterio que `equiposPara`): a quien está
            en freeze no se le encarga trabajo. */}
        <TablaAcuerdos
          acuerdos={acuerdos}
          destacar={destacarAction}
          editar={editor ? editarAcuerdoEnTablaAction : undefined}
          personas={personas}
          equipos={equipos}
          eliminar={admin ? eliminarAcuerdoEnTablaAction : undefined}
          cambiarEstatus={editor ? cambiarEstatusEnTablaAction : undefined}
          editarFecha={editor ? editarFechaEnTablaAction : undefined}
          moverDeSala={editor ? moverDeSalaAction : undefined}
          salas={editor ? clientes.filter((c) => !pausadas.has(c.slug)) : undefined}
        />
      </main>
    </div>
  )
}
