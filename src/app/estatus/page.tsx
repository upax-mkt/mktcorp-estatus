import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { ModoPresentar } from '@/componentes/sesion/ModoPresentar'
import { EstatusQ3 } from '@/componentes/estatus/EstatusQ3'
import { grupoUpax } from '@/temas/grupo-upax'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estatus Q3',
}

/**
 * EL ESTATUS DE MARKETING CORPORATIVO CON CECI, Q3 2026, como pestaña (1-oct-2026).
 *
 * Franco (29-sep): la agenda y el contenido los pone el equipo —se juntaron
 * en el pizarrón y escribieron el borrador— y la presentación se produce aquí,
 * animada, como pestaña propia del equipo, igual que el concurso y /politico.
 * La proyecta Franco en la junta del viernes 2-oct.
 *
 * SOLO EQUIPO. Trae pipeline, negocios ganados con montos, confirmados con
 * nombre de empresa y cargo: `puedeVerRuta` (src/auth/politica.ts) es lista
 * blanca para una sesión de sala y `/estatus` no está en ella, y aquí
 * `exigirLectura()` es la verificación que manda, pegada al dato.
 */
export default async function PaginaEstatus({ searchParams }: { searchParams: Promise<{ anexo?: string }> }) {
  await exigirLectura()
  // `?anexo=1` es la versión para el PDF: las mismas láminas más el anexo con todo desplegado (ver AnexoQ3).
  const { anexo } = await searchParams
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
      <BarraNavegacion seccionActiva="estatus" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />
      <ProveedorTema tema={grupoUpax} superficie="clara">
        <ModoPresentar personas={[]}>
          <EstatusQ3 anexo={anexo === '1'} />
        </ModoPresentar>
      </ProveedorTema>
    </div>
  )
}
