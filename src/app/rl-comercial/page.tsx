import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { ModoPresentar } from '@/componentes/sesion/ModoPresentar'
import { PresentacionRl } from '@/componentes/rl-comercial/PresentacionRl'
import { researchLand } from '@/temas/research-land'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Research Land · Comercial 2027',
}

/**
 * LA PROPUESTA PARA EL ÁREA COMERCIAL DE RESEARCH LAND, ESTRATEGIA 2027 (6-oct-2026).
 *
 * Franco la presenta a Pablo Levy y Giovanni Sanabria. Diez escenas hechas con
 * motion-studio: la respuesta, la idea, la estructura, el journey (la cumbre),
 * los KPIs, las personas, el plan y las tres decisiones. Mismo patrón que
 * `/politico`: una página propia del equipo que se lee con scroll y se
 * proyecta con `ModoPresentar`.
 *
 * SOLO EQUIPO. Nombra a la persona recomendada para PM y a la que entra a
 * prueba como ejecutiva; no se comparte como las salas. `puedeVerRuta`
 * (src/auth/politica.ts) es lista blanca para una sesión de sala y
 * `/rl-comercial` no está en ella, y aquí `exigirLectura()` es la
 * verificación que manda, pegada al dato.
 *
 * Se viste con la identidad de Research Land: el deck es para ellos.
 */
export default async function PaginaRlComercial() {
  await exigirLectura()
  // Sin `connection()`, Next prerenderiza y la fecha de la barra queda anclada al día del build.
  await connection()
  const hoy = new Date()
  const [admin, clientes] = await Promise.all([esAdmin(), clientesParaBarra()])

  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  return (
    <div>
      <BarraNavegacion hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />
      <ProveedorTema tema={researchLand} superficie="clara">
        <ModoPresentar personas={[]}>
          <PresentacionRl />
        </ModoPresentar>
      </ProveedorTema>
    </div>
  )
}
