import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { estatusDeGrupo, rutaDePresentacion } from '@/presentaciones/registro'
import { fechaCompleta } from '@/lib/fecha'
import estilos from '@/app/deck/deck.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estatus',
}

/**
 * ESTATUS (reorganización del hub, 6-oct-2026): los estatus de grupo, los que no son de una UDN. Antes cada uno era
 * una pestaña de la barra (Político, Estatus Q3); ahora la pestaña es una y la lista crece aquí, desde el registro
 * (`src/presentaciones/registro.ts`). Mismo aspecto que Presentaciones (`/deck`), a propósito.
 *
 * `/estatus` era el Q3 hasta esta fecha; `?anexo=1` (su anexo para PDF) se manda a su nuevo lugar.
 */
export default async function PaginaEstatus({ searchParams }: { searchParams: Promise<{ anexo?: string }> }) {
  await exigirLectura()
  const { anexo } = await searchParams
  if (anexo === '1') redirect('/estatus/q3-2026?anexo=1')
  await connection()
  const hoy = new Date()
  const [admin, clientes] = await Promise.all([esAdmin(), clientesParaBarra()])
  const estatus = estatusDeGrupo()

  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  return (
    <div className={estilos.app}>
      <BarraNavegacion seccionActiva="estatus" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />
      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Estatus</h1>
            <p className={estilos.subtitulo}>Los estatus de grupo: el del área y los de cada vertical.</p>
          </div>
        </div>
        <section>
          <div className={estilos.lista}>
            {estatus.map((p) => (
              <div key={p.id} className={estilos.fila}>
                <Link href={rutaDePresentacion(p)} className={estilos.filaIzq}>
                  <div className={estilos.filaNombre}>{p.titulo}</div>
                  {/* La bajada en su renglón y la fecha en el suyo: juntas en una línea, al partirse en el celular el «·»
                      quedaba suelto al principio del segundo renglón. */}
                  <div className={estilos.filaMeta}>{p.bajada}</div>
                  <div className={estilos.filaMeta}>{fechaCompleta(p.fecha)}</div>
                </Link>
                <div className={estilos.filaDcha}>
                  <Link href={rutaDePresentacion(p)} className={estilos.boton}>
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
