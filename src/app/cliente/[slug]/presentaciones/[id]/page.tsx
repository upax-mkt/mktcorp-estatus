import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { esLector, esAdmin } from '@/auth/roles'
import { cerrarSesion, secretoConfigurado } from '@/auth/sesion'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { ModoPresentar } from '@/componentes/sesion/ModoPresentar'
import { presentacionDeSala, rutaDePresentacion } from '@/presentaciones/registro'
import { VISTAS_DE_SALA } from '@/presentaciones/vistas'
import { claveConfigurada, claveCorrecta } from '@/presentaciones/clave'
import { cookieDePase, firmarPase, paseValido, DIAS_DE_PASE } from '@/presentaciones/pase'
import estilos from './clave.module.css'

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string; id: string }>

/**
 * UNA PRESENTACIÓN WEB QUE VIVE EN LA SALA DE SU CLIENTE (reorganización del hub, 6-oct-2026).
 *
 * La sala es pública por decisión de Franco (`src/auth/politica.ts`), así que esta ruta responde sin sesión. Lo que
 * la protege está aquí:
 * - El equipo entra directo, con la barra.
 * - Cualquier otra persona —el director de la sala o quien tenga la liga— necesita el pase de la clave de esa
 *   presentación (`src/presentaciones/pase.ts`). Sin pase ve el formulario; si la presentación no declara clave, o la
 *   variable no existe en este despliegue, no se abre para nadie de fuera.
 *
 * La de Research Land trae la evaluación de las candidatas a PM, que trabajan en RL: por eso la clave.
 * Una presentación `abierta` (la de Fortaleza Mexicana, 20-oct-2026) se ve con la liga, sin clave y sin el enlace
 * de regreso a la sala: es para alguien de fuera del hub.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, id } = await params
  const p = presentacionDeSala(slug, id)
  const robots = { index: false, follow: false }
  // Una presentación abierta se manda a alguien de fuera: su liga enseña la pieza, no la sala ni el hub.
  if (p?.abierta && p.vistaPrevia) {
    const titulo = `${p.titulo} · Grupo UPAX`
    return {
      title: { absolute: titulo },
      description: p.vistaPrevia.descripcion,
      robots,
      openGraph: {
        title: titulo,
        description: p.vistaPrevia.descripcion,
        siteName: 'Grupo UPAX',
        locale: 'es_MX',
        type: 'website',
        images: [{ url: p.vistaPrevia.imagen, width: 1200, height: 630, alt: p.titulo }],
      },
      twitter: { card: 'summary_large_image', title: titulo, description: p.vistaPrevia.descripcion, images: [p.vistaPrevia.imagen] },
    }
  }
  return { title: p?.titulo ?? 'Presentación', robots }
}

async function abrirConClave(slug: string, id: string, formData: FormData): Promise<void> {
  'use server'
  const p = presentacionDeSala(slug, id)
  const secreto = secretoConfigurado()
  if (!p || !secreto) notFound()
  const intento = String(formData.get('clave') ?? '')
  if (!(await claveCorrecta(p, intento))) {
    // Frena el tanteo: la clave es sencilla a propósito y la ruta es pública.
    await new Promise((r) => setTimeout(r, 900))
    redirect(`${rutaDePresentacion(p)}?clave=incorrecta`)
  }
  const tienda = await cookies()
  tienda.set(cookieDePase(p.id), await firmarPase(p.id, slug, secreto), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: rutaDePresentacion(p),
    maxAge: DIAS_DE_PASE * 86_400,
  })
  redirect(rutaDePresentacion(p))
}

export default async function PaginaPresentacionDeSala({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<{ clave?: string }>
}) {
  const { slug, id } = await params
  const p = presentacionDeSala(slug, id)
  const vista = p ? VISTAS_DE_SALA[p.id] : undefined
  if (!p || !vista) notFound()
  await connection()
  const { Componente, tema } = vista

  if (await esLector()) {
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
        <ProveedorTema tema={tema} superficie="clara">
          <ModoPresentar personas={[]} transiciones={vista.transiciones} controlesOcultos={vista.controlesOcultos}>
            <Componente />
          </ModoPresentar>
        </ProveedorTema>
      </div>
    )
  }

  if (p.abierta) {
    return (
      <div>
        <ProveedorTema tema={tema} superficie="clara">
          <ModoPresentar personas={[]} botonArriba transiciones={vista.transiciones} controlesOcultos={vista.controlesOcultos}>
            <Componente />
          </ModoPresentar>
        </ProveedorTema>
      </div>
    )
  }

  const secreto = secretoConfigurado()
  const token = (await cookies()).get(cookieDePase(p.id))?.value
  if (secreto && claveConfigurada(p) && (await paseValido(token, secreto, p.id, slug))) {
    return (
      <div>
        <nav className={estilos.volver}>
          <Link href={`/cliente/${slug}`}>← Sala de {tema.nombre}</Link>
        </nav>
        <ProveedorTema tema={tema} superficie="clara">
          <ModoPresentar personas={[]} transiciones={vista.transiciones} controlesOcultos={vista.controlesOcultos}>
            <Componente />
          </ModoPresentar>
        </ProveedorTema>
      </div>
    )
  }

  const { clave } = await searchParams
  const abrir = abrirConClave.bind(null, slug, p.id)
  return (
    <div className={estilos.pantalla}>
      <div className={estilos.tarjeta}>
        <p className={estilos.antetitulo}>{tema.nombre}</p>
        <h1 className={estilos.titulo}>{p.titulo}</h1>
        {secreto && claveConfigurada(p) ? (
          <>
            <p className={estilos.texto}>Para abrirla, escribe la clave que te compartió Marketing Corporativo.</p>
            {clave === 'incorrecta' && <div className={estilos.error}>Esa no es la clave. Vuelve a intentarlo.</div>}
            <form action={abrir}>
              <label className={estilos.campo}>
                <span className={estilos.etiqueta}>Clave</span>
                <input className={estilos.input} name="clave" type="password" autoComplete="off" required />
              </label>
              <button type="submit" className={estilos.boton}>Abrir</button>
            </form>
          </>
        ) : (
          <p className={estilos.texto}>Esta presentación todavía no está abierta fuera del equipo de Marketing Corporativo.</p>
        )}
        <Link href={`/cliente/${slug}`} className={estilos.regresar}>← Volver a la sala</Link>
      </div>
    </div>
  )
}
