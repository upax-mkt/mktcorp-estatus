import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { todosLosAcuerdos } from '@/db/consultas'
import { acuerdosPendientesDeSubir, refrescarDesdeMonday } from '@/db/acuerdos'
import { ErrorMonday } from '@/monday/cliente'
import { TablaAcuerdos } from '@/componentes/acuerdos/TablaAcuerdos'
import { BarraNavegacion } from '@/componentes/BarraNavegacion'
import { destacarAction } from './acciones'
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
 * Esta pantalla es esa respuesta, y desde aquí se destaca lo poco que se
 * quiere ver en el Home (tarea 12) con la misma estrella que ahí y en la
 * sala — ver Estrella.tsx.
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

  const [acuerdos, pendientes, admin] = await Promise.all([
    todosLosAcuerdos(),
    acuerdosPendientesDeSubir(),
    esAdmin(),
  ])

  // Mismo patrón que `salir` en `src/app/page.tsx` / `src/app/deck/page.tsx`:
  // repetido a propósito en cada pantalla que monta `BarraNavegacion`.
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  return (
    <div className={estilos.app}>
      <BarraNavegacion seccionActiva="acuerdos" hoy={hoy} admin={admin} salirAction={salir} />

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Acuerdos</h1>
            <p className={estilos.subtitulo}>
              Los de las nueve salas, juntos: qué le debemos a quién esta semana. La estrella marca
              los que se ven en el Home.
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

        <TablaAcuerdos acuerdos={acuerdos} destacar={destacarAction} />
      </main>
    </div>
  )
}
