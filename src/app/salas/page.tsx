import Link from 'next/link'
import { eq } from 'drizzle-orm'
import estilos from './salas.module.css'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { slugsDeSalasPausadas } from '@/db/salas'
import { tokenDeAgenda } from '@/db/enlace-agenda'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirEquipo } from '@/auth/sesion'
import { urlBase } from '@/lib/url-base'
import { FormularioSala } from '@/componentes/salas/FormularioSala'
import { BloqueEnlaceAgenda } from '@/componentes/salas/BloqueEnlaceAgenda'
import { crearSalaAction, editarSalaAction, generarEnlaceAction, revocarEnlaceAction } from './acciones'

export const dynamic = 'force-dynamic'

/**
 * `/SALAS` — la razón de ser de la ronda 8: las nueve salas se mudaron de
 * código a la base (tarea 5) precisamente para que esta pantalla pudiera
 * existir. Aquí Franco crea salas nuevas y edita las que ya tiene, con su
 * marca completa y su logo medido; y aquí mismo se genera y se revoca el
 * enlace público de la agenda (tarea 1), porque es la misma pregunta que el
 * resto de esta pantalla — qué puede ver alguien de fuera.
 *
 * Solo equipo, como cualquier pantalla de configuración de esta app.
 *
 * NINGUNA ACCIÓN DE AQUÍ BORRA SALAS. Para dejar de atender una está la
 * pausa (ronda 7, ver `PausaSala` dentro de la propia sala) — borrarla
 * dejaría sus sesiones, acuerdos y minutas colgando de algo que no existe.
 */
export default async function PagSalas({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; nueva?: string }>
}) {
  await exigirEquipo()

  const { editar, nueva } = await searchParams

  const [slugs, registro, pausadas, token] = await Promise.all([
    slugsDeSalas(),
    cargarTemas(),
    slugsDeSalasPausadas(),
    tokenDeAgenda(),
  ])

  const enlace = token ? `${await urlBase()}/agenda/${token}` : null

  // El slug que se está editando, solo si es de verdad una de las nueve — un
  // `?editar=` con basura o con una sala que ya no existiera no debe reventar
  // la pantalla, solo no abrir ningún formulario de edición.
  const editarSlug = editar && slugs.includes(editar) ? editar : null

  // logoUrl/logoRelacionDeTinta no viven en `Tema` (cargarTemas() no las trae
  // — no formaban parte del tipo antes de esta tarea, ver su cabecera en
  // src/temas/tipos.ts) así que se piden aparte, y SOLO para la sala que se
  // está editando: la lista no enseña miniatura de logo, no hace falta
  // traerlas las nueve.
  const logoDeLaEditada =
    editarSlug && hayDB()
      ? (
          await db()
            .select({ logoUrl: esquema.salas.logoUrl, logoRelacionDeTinta: esquema.salas.logoRelacionDeTinta })
            .from(esquema.salas)
            .where(eq(esquema.salas.slug, editarSlug))
        )[0]
      : null

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Salas</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Salas</h1>
          <p className={estilos.subtitulo}>
            Las nueve unidades de negocio, con su marca y su logo. Crear una sala pide nombre, logo y
            color; todo lo demás —secundario, acento, superficies, textos legibles y el degradado— se
            deriva del color y se puede afinar a mano.
          </p>
        </div>

        <section className={estilos.seccion}>
          <BloqueEnlaceAgenda
            enlace={enlace}
            generarAction={generarEnlaceAction}
            revocarAction={revocarEnlaceAction}
          />
        </section>

        <section className={estilos.seccion}>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Las nueve salas</h2>
            {!nueva && !editarSlug && (
              <Link href="/salas?nueva=1" className="boton">
                + Crear sala
              </Link>
            )}
          </div>

          <ul className={estilos.listaSalas}>
            {slugs.map((slug) => {
              const tema = registro[slug]
              const enPausa = pausadas.has(slug)
              const seEstaEditando = editarSlug === slug
              return (
                <li key={slug} className={estilos.filaSala}>
                  <div className={estilos.filaResumen}>
                    <span className={estilos.filaColor} style={{ background: tema.primario }} aria-hidden />
                    <span className={estilos.filaNombre}>{tema.nombre}</span>
                    <span className="pildora" data-tono={enPausa ? undefined : 'bien'}>
                      {enPausa ? 'en pausa' : 'activa'}
                    </span>
                    <span className={estilos.filaAcciones}>
                      {seEstaEditando ? (
                        <Link href="/salas" className="boton" data-tono="fantasma">
                          Cerrar
                        </Link>
                      ) : (
                        <Link href={`/salas?editar=${slug}`} className="boton" data-tono="suave">
                          Editar
                        </Link>
                      )}
                      <Link href={`/cliente/${slug}`} className="boton" data-tono="fantasma">
                        Ver sala →
                      </Link>
                    </span>
                  </div>

                  {seEstaEditando && (
                    <div className={estilos.filaFormulario}>
                      <FormularioSala
                        guardar={editarSalaAction.bind(null, slug)}
                        slugsUsados={slugs.filter((s) => s !== slug)}
                        sala={{
                          slug,
                          nombre: tema.nombre,
                          primario: tema.primario,
                          familiaDisplay: tema.familiaDisplay,
                          familiaTexto: tema.familiaTexto,
                          logoUrl: logoDeLaEditada?.logoUrl ?? null,
                          logoRelacionDeTinta: logoDeLaEditada?.logoRelacionDeTinta ?? null,
                        }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {nueva && (
          <section className={estilos.seccion}>
            <div className={estilos.seccionCabecera}>
              <h2 className={estilos.seccionTitulo}>Crear una sala</h2>
              <Link href="/salas" className="boton" data-tono="fantasma">
                Cancelar
              </Link>
            </div>
            <FormularioSala guardar={crearSalaAction} slugsUsados={slugs} />
          </section>
        )}
      </main>
    </div>
  )
}
