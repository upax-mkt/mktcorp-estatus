import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../preparar.module.css'
import { slugsDeSalas, obtenerTema } from '@/temas'
import { crearSesionConEstructura, type TipoSesion } from '@/db/sesiones'

export const dynamic = 'force-dynamic'

export default function PagNuevaSesion() {
  async function crear(formData: FormData) {
    'use server'

    const salaSlug = String(formData.get('salaSlug') ?? '')
    const tipo = (String(formData.get('tipo') ?? 'mensual')) as TipoSesion
    const alcanceModo = String(formData.get('alcanceModo') ?? 'todos')
    const alcanceTema = String(formData.get('alcanceTema') ?? '').trim()

    if (!slugsDeSalas().includes(salaSlug)) {
      throw new Error(`Elige una sala válida (recibido: "${salaSlug}")`)
    }

    const alcance = alcanceModo === 'tema' && alcanceTema.length > 0 ? alcanceTema : 'todos'

    const { id } = await crearSesionConEstructura({ salaSlug, tipo, alcance })
    redirect(`/preparar/${id}`)
  }

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/preparar" className={estilos.volver}>← Preparar</Link>
        <div className={estilos.barraTitulo}>Nueva sesión</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Nueva sesión</h1>
            <p className={estilos.subtitulo}>
              Elige sala, tipo y alcance. Arranca con la estructura precargada: Portada, Performance del
              sitio web, Pipeline y demanda, Acuerdos y próximos pasos.
            </p>
          </div>
        </div>

        <form action={crear} className={estilos.form}>
          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Sala</span>
            <div className={estilos.salasGrid}>
              {slugsDeSalas().map((slug, i) => {
                const tema = obtenerTema(slug)
                return (
                  <label
                    key={slug}
                    className={estilos.salaOpcion}
                    style={{ '--sala': tema.primario } as CSSProperties}
                  >
                    <input type="radio" name="salaSlug" value={slug} required defaultChecked={i === 0} />
                    <span className={estilos.salaOpcionPunto} />
                    <span className={estilos.salaOpcionNombre}>{tema.nombre}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Tipo</span>
            <div className={estilos.opcionesFila}>
              <label className={estilos.opcionPill}>
                <input type="radio" name="tipo" value="mensual" defaultChecked />
                Mensual
              </label>
              <label className={estilos.opcionPill}>
                <input type="radio" name="tipo" value="semanal" />
                Semanal
              </label>
            </div>
          </div>

          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Alcance</span>
            <div className={estilos.opcionesFila}>
              <label className={estilos.opcionPill}>
                <input type="radio" name="alcanceModo" value="todos" defaultChecked />
                Todos los squads
              </label>
              <label className={estilos.opcionPill}>
                <input type="radio" name="alcanceModo" value="tema" />
                Tema puntual
              </label>
            </div>
            <input
              type="text"
              name="alcanceTema"
              placeholder="Si elegiste “tema puntual”, especifica cuál (ej. campaña de fin de año)"
              className={estilos.inputTexto}
            />
          </div>

          <div>
            <button type="submit" className={`${estilos.boton} ${estilos.botonAcento}`}>
              Crear sesión →
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
