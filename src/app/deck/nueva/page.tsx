import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../deck.module.css'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { crearSesionConEstructura, type TipoSesion } from '@/db/sesiones'
import { slugsDeSalasPausadas } from '@/db/salas'
import { PLANTILLAS, PLANTILLA_POR_DEFECTO } from '@/secciones/plantillas'
import { exigirEquipo } from '@/auth/sesion'

export const dynamic = 'force-dynamic'

/**
 * "Nueva sesión" es otro camino de preparar una sesión para una sala, además
 * del que vive dentro de la propia sala (tarea 12): la escritura ya la
 * rechaza igual —las dos pasan por `crearSesion`, src/db/sesiones.ts, que es
 * donde vive la comprobación que cuenta—, pero sin esto alguien podía elegir
 * una sala en pausa, llenar el formulario entero y enterarse recién al
 * enviarlo. Se marcan aquí para que no llegue a ese punto.
 */
export default async function PagNuevaSesion() {
  const [pausadas, registro, salas] = await Promise.all([
    slugsDeSalasPausadas(),
    cargarTemas(),
    slugsDeSalas(),
  ])

  async function crear(formData: FormData) {
    'use server'
    await exigirEquipo()

    const salaCruda = String(formData.get('salaSlug') ?? '')
    const plantilla = String(formData.get('plantilla') ?? PLANTILLA_POR_DEFECTO)
    const tipo = (String(formData.get('tipo') ?? 'mensual')) as TipoSesion
    const alcanceModo = String(formData.get('alcanceModo') ?? 'todos')
    const alcanceTema = String(formData.get('alcanceTema') ?? '').trim()

    // "ninguna" es una opción de verdad: un comité o un arranque de campaña no
    // pertenecen a ninguna de las nueve salas.
    const salaSlug = salaCruda === 'ninguna' ? null : salaCruda
    if (salaSlug && !(await slugsDeSalas()).includes(salaSlug)) {
      throw new Error(`Elige una sala válida (recibido: "${salaSlug}")`)
    }
    if (!PLANTILLAS.some((p) => p.id === plantilla)) {
      throw new Error(`Plantilla desconocida: "${plantilla}"`)
    }

    const alcance = alcanceModo === 'tema' && alcanceTema.length > 0 ? alcanceTema : 'todos'

    const { id } = await crearSesionConEstructura({ salaSlug, plantilla, tipo, alcance })
    redirect(`/deck/${id}`)
  }

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/deck" className={estilos.volver}>← Deck Designer</Link>
        <div className={estilos.barraTitulo}>Nueva sesión</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Nueva sesión</h1>
            {/* Esta línea ha mentido dos veces. Primero describía cuatro
                secciones que ya no existían; después afirmaba que la sesión
                arranca con los ocho bloques del estatus, que dejó de ser
                cierto en cuanto hubo cinco plantillas. Ahora describe la
                ELECCIÓN, que es lo único que no caduca. */}
            <p className={estilos.subtitulo}>
              Elige de quién es la reunión y qué tipo es: la plantilla decide con qué secciones
              arranca, y todas se pueden reordenar y cambiar después.
            </p>
            <p className={estilos.subtitulo}>
              Si lo que quieres es <strong>apuntar una fecha</strong> sin empezar a redactar,
              agéndala en <Link href="/agenda">la agenda</Link>: aparecerá en el hub como próxima
              sesión y se podrá llenar después.
            </p>
          </div>
        </div>

        <form action={crear} className={estilos.form}>
          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Sala</span>
            <div className={estilos.salasGrid}>
              {/* Una reunión puede no ser de ninguna sala. */}
              <label className={estilos.salaOpcion} style={{ '--sala': 'var(--tx-3)' } as CSSProperties}>
                <input type="radio" name="salaSlug" value="ninguna" required defaultChecked />
                <span className={estilos.salaOpcionPunto} />
                <span className={estilos.salaOpcionNombre}>Ninguna</span>
              </label>
              {salas.map((slug) => {
                const tema = registro[slug]
                const enPausa = pausadas.has(slug)
                return (
                  <label
                    key={slug}
                    className={estilos.salaOpcion}
                    style={{ '--sala': tema.primario } as CSSProperties}
                  >
                    <input type="radio" name="salaSlug" value={slug} required disabled={enPausa} />
                    <span className={estilos.salaOpcionPunto} />
                    <span className={estilos.salaOpcionNombre}>
                      {tema.nombre}{enPausa ? ' (en pausa)' : ''}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* LA PLANTILLA va primero: decide con qué secciones nace la
              reunión, y es lo que hace que esto sirva para un comité o un
              arranque de campaña y no solo para el estatus de una UDN. */}
          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Qué reunión es</span>
            <div className={estilos.plantillas}>
              {PLANTILLAS.map((p, i) => (
                <label key={p.id} className={estilos.plantilla}>
                  <input type="radio" name="plantilla" value={p.id} defaultChecked={i === 0} />
                  <span className={estilos.plantillaNombre}>{p.nombre}</span>
                  <span className={estilos.plantillaParaQue}>{p.paraQue}</span>
                  <span className={estilos.plantillaCuenta}>
                    {p.items.length} {p.items.length === 1 ? 'sección' : 'secciones'}
                  </span>
                </label>
              ))}
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
