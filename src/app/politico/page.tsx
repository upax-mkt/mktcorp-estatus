import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { ModoPresentar } from '@/componentes/sesion/ModoPresentar'
import { EstatusPolitico } from '@/componentes/politico/EstatusPolitico'
import { grupoUpax } from '@/temas/grupo-upax'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Político-Electoral',
}

/**
 * EL ESTATUS DE LA VERTICAL POLÍTICO-ELECTORAL, como pestaña (29-sep-2026).
 *
 * Franco: *«Ángel ya preparó algo pero lo prefiero también como tab dentro del
 * artefacto»*. Es la junta de 30 minutos con Ceci del 30-sep: el deck de Ángel,
 * corregido y cruzado con HubSpot (ver `src/politico/estatus-ago-sep-2026.ts`),
 * convertido en una presentación que se lee con scroll y se proyecta a pantalla
 * completa con el mismo `ModoPresentar` de las sesiones.
 *
 * SOLO EQUIPO. Nombra a políticos, partidos y negocios en curso, así que no se
 * comparte como las salas: `puedeVerRuta` (src/auth/politica.ts) es lista
 * blanca para una sesión de sala y `/politico` no está en ella —el proxy manda
 * al director a su propia sala— y aquí `exigirLectura()` es la verificación que
 * manda, pegada al dato.
 *
 * Se viste con la identidad de Grupo UPAX: el pipeline de la vertical vive en
 * el suyo. `superficie="clara"` para que el botón Presentar tome el primario
 * ajustado a fondo claro (texto blanco legible); las pantallas oscuras se
 * pintan en `politico.module.css`.
 */
export default async function PaginaPolitico() {
  await exigirLectura()
  // Mismo patrón que `/acuerdos`: sin `connection()`, Next prerenderiza y la
  // fecha de la barra queda anclada al día del build.
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
      <BarraNavegacion seccionActiva="politico" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />
      <ProveedorTema tema={grupoUpax} superficie="clara">
        {/* Sin `reunionId`: no hay minuta ni grabación que ofrecer, solo
            pantalla completa, flechas, reloj y láser. */}
        <ModoPresentar personas={[]}>
          <EstatusPolitico />
        </ModoPresentar>
      </ProveedorTema>
    </div>
  )
}
