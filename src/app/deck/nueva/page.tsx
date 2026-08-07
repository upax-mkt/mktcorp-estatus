import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import type { CSSProperties } from 'react'
import estilos from '../deck.module.css'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { crearReunionConDocumento } from '@/db/documentos'
import type { TipoReunion } from '@/db/reuniones'
import { slugsDeSalasPausadas } from '@/db/salas'
import { PLANTILLAS, PLANTILLA_POR_DEFECTO } from '@/secciones/plantillas'
import { exigirEditor, exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion } from '@/componentes/BarraNavegacion'

export const dynamic = 'force-dynamic'

/**
 * "Nueva reunión" es otro camino de preparar el documento de una sala,
 * además del que vive dentro de la propia sala (tarea 12): la escritura ya
 * la rechaza igual —las dos pasan por `crearReunion`, src/db/reuniones.ts,
 * que es donde vive la comprobación que cuenta—, pero sin esto alguien podía
 * elegir una sala en pausa, llenar el formulario entero y enterarse recién
 * al enviarlo. Se marcan aquí para que no llegue a ese punto.
 *
 * YA NO HAY OPCIÓN "Ninguna" (ronda 10, tarea 5b): `DatosDeReunion.salaSlug`
 * es obligatorio desde la Tarea 4 — decisión ya tomada y revisada, "una
 * reunión sin sala... queda fuera de este modelo por ahora" (comentario de
 * ese tipo). Antes existía para un comité o un arranque de campaña; hoy esa
 * necesidad queda sin cubrir por esta pantalla — ver el reporte de esta
 * tarea.
 */
export default async function PagNuevaSesion() {
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9) — la comprobación de sesión va primero.
  await exigirLectura()
  // `connection()`/`hoy` (ronda 11, tarea 2): sin esto Next la prerenderiza y
  // "hoy" queda anclado a la fecha del build — mismo mecanismo, mismo
  // comentario, que `/` y `/deck` (src/app/page.tsx, src/app/deck/page.tsx).
  // Ambos alimentan a `BarraNavegacion`, que esta pantalla no montaba hasta
  // ahora.
  await connection()
  const hoy = new Date()
  const [pausadas, registro, salas, admin] = await Promise.all([
    slugsDeSalasPausadas(),
    cargarTemas(),
    slugsDeSalas(),
    esAdmin(),
  ])

  // Mismo patrón que `salir` en `src/app/page.tsx` / `src/app/deck/page.tsx`:
  // repetido a propósito en cada pantalla que monta `BarraNavegacion`, no
  // centralizado en `@/auth/sesion` — ver el comentario de
  // `comoReunionDeDominio` en `src/app/deck/page.tsx` para el porqué de no
  // tocar un archivo sin dueño a media ronda.
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  async function crear(formData: FormData) {
    'use server'
    await exigirEditor()

    const salaSlug = String(formData.get('salaSlug') ?? '')
    const plantilla = String(formData.get('plantilla') ?? PLANTILLA_POR_DEFECTO)
    const tipo = (String(formData.get('tipo') ?? 'mensual')) as TipoReunion
    const alcanceModo = String(formData.get('alcanceModo') ?? 'todos')
    const alcanceTema = String(formData.get('alcanceTema') ?? '').trim()

    if (!salaSlug || !(await slugsDeSalas()).includes(salaSlug)) {
      throw new Error(`Elige una sala válida (recibido: "${salaSlug}")`)
    }
    if (!PLANTILLAS.some((p) => p.id === plantilla)) {
      throw new Error(`Plantilla desconocida: "${plantilla}"`)
    }

    const alcance = alcanceModo === 'tema' && alcanceTema.length > 0 ? alcanceTema : 'todos'

    // Sin campo de fecha en este formulario (igual que el flujo viejo): nace
    // "ahora", mismo default que aplicaba `crearSesionConEstructura` cuando
    // no se le pasaba `fecha`.
    //
    // EL TÍTULO SÍ VIAJA desde la auditoría UX/UI: antes iba `titulo: ''`
    // fijo y toda reunión creada aquí caía a `tituloPorDefecto`. Vacío sigue
    // siendo válido —el default lo cubre— pero ya no es lo único posible.
    const titulo = String(formData.get('titulo') ?? '').trim()
    const { reunionId } = await crearReunionConDocumento({
      salaSlug, plantilla, tipo, alcance, titulo, fecha: new Date(),
    })
    redirect(`/deck/${reunionId}`)
  }

  return (
    <div className={estilos.app}>
      {/* LA BARRA (ronda 11, tarea 2), arriba del todo — y el "← Presentaciones"
          local se CONSERVA debajo, sin excepción: son dos cosas distintas
          (saltar de sección vs. volver a la lista de la que salió esta
          reunión nueva), mismo criterio que /deck/[id]. */}
      <BarraNavegacion seccionActiva="deck" hoy={hoy} admin={admin} salirAction={salir} />

      <header className={estilos.barra}>
        {/* Deck Designer → Presentaciones (tarea 18): solo el nombre visible. */}
        <Link href="/deck" className={estilos.volver}>← Presentaciones</Link>
        <div className={estilos.barraTitulo}>Nueva reunión</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Nueva reunión</h1>
            {/* Esta línea ha mentido dos veces. Primero describía cuatro
                secciones que ya no existían; después afirmaba que la reunión
                arranca con los ocho bloques del estatus, que dejó de ser
                cierto en cuanto hubo cinco plantillas. Ahora describe la
                ELECCIÓN, que es lo único que no caduca. */}
            <p className={estilos.subtitulo}>
              Elige de quién es la reunión y qué tipo es: la plantilla decide con qué secciones
              arranca, y todas se pueden reordenar y cambiar después.
            </p>
            <p className={estilos.subtitulo}>
              Si lo que quieres es <strong>apuntar una fecha</strong> sin empezar a redactar,
              agéndala desde <Link href="/reuniones">Reuniones</Link>: aparecerá en el hub como
              próxima reunión y se podrá llenar después.
            </p>
          </div>
        </div>

        <form action={crear} className={estilos.form}>
          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Sala</span>
            <div className={estilos.salasGrid}>
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

          {/* EL TÍTULO, que hasta ahora este formulario no pedía y mandaba en
              blanco (ronda 11, auditoría UX/UI). Sin él toda reunión creada
              desde aquí caía a `tituloPorDefecto`, que describe la CADENCIA y
              no el contenido — y con eso se perdía lo único que distingue dos
              reuniones de la misma sala el mismo mes: la "Comercial" y la
              "Digital" de Research Land eran indistinguibles.

              OPCIONAL y con el mismo vocabulario que `AgendarRapido` y
              `FormularioSesion`: quien tenga prisa sigue pudiendo crear sin
              nombrarla, y el defecto ya no colisiona porque lleva el día. */}
          <div className={estilos.campo}>
            <span className={estilos.campoTitulo}>Título</span>
            <input
              type="text"
              name="titulo"
              placeholder="Si lo dejas vacío, se pone uno solo"
              className={estilos.inputTexto}
              maxLength={120}
            />
          </div>

          <div>
            <button type="submit" className={`${estilos.boton} ${estilos.botonAcento}`}>
              Crear reunión →
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
