import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../preparar.module.css'
import {
  obtenerSesion,
  moverItem,
  reordenarItems,
  entradasCrudasDeSesion,
  guardarDecisiones,
  guardarSeccion,
  anadirSeccion,
  eliminarSeccion,
  guardarItemContenido,
} from '@/db/sesiones'
import { eliminarSesion } from '@/db/sesiones'
import { maquetarSesion } from '@/motor/maquetar'
import { maquetarItem } from '@/motor/maquetar'
import { obtenerTema } from '@/temas'
import { exigirEquipo } from '@/auth/sesion'
import { BotonMaquetar } from '@/componentes/BotonMaquetar'
import { ListaOrdenable } from '@/componentes/ListaOrdenable'
import { BorrarSesion } from '@/componentes/BorrarSesion'
import { AnadirSeccion } from '@/componentes/editor/AnadirSeccion'
import { TarjetaSeccion } from '@/componentes/editor/TarjetaSeccion'
import type { BorradorSeccion } from '@/secciones/borrador'
import type { DecisionSlide } from '@/decision/esquema'
import { fechaCompleta } from '@/lib/fecha'

// Maquetar una sesión armada a mano es instantáneo. El margen de 60 s es para
// el asistente de IA, que sí llama al modelo.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: 'borrador',
  lista: 'lista para presentar',
  presentada: 'presentada',
  minutada: 'minutada',
}

function etiquetaAlcance(alcance: string): string {
  return alcance === 'todos' ? 'todos los squads' : alcance
}

export default async function PagSesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  // ---- Server actions ----
  // Cada una exige equipo por su cuenta: una Server Action es un endpoint, y
  // ocultar el botón en la pantalla no protege nada.

  async function guardarSeccionAction(itemId: string, seccion: BorradorSeccion) {
    'use server'
    await exigirEquipo()
    await guardarSeccion(id, itemId, seccion)
    revalidatePath(`/preparar/${id}`)
  }

  async function anadirSeccionAction(layout: DecisionSlide['layout'], nombre: string) {
    'use server'
    await exigirEquipo()
    await anadirSeccion(id, layout, nombre)
    revalidatePath(`/preparar/${id}`)
  }

  async function anadirSubseccionAction(padre: string, layout: DecisionSlide['layout'], nombre: string) {
    'use server'
    await exigirEquipo()
    await anadirSeccion(id, layout, nombre, padre)
    revalidatePath(`/preparar/${id}`)
  }

  async function eliminarSeccionAction(itemId: string) {
    'use server'
    await exigirEquipo()
    await eliminarSeccion(id, itemId)
    revalidatePath(`/preparar/${id}`)
  }

  /**
   * El atajo opcional: texto crudo → propuesta de sección.
   *
   * Devuelve la propuesta SIN guardarla. Cae en el formulario del navegador y
   * ahí se corrige; nadie presenta algo que no revisó. Guarda el texto crudo
   * para que reabrir el asistente no obligue a volver a pegarlo.
   */
  async function proponerAction(itemId: string, texto: string): Promise<BorradorSeccion | { error: string }> {
    'use server'
    await exigirEquipo()
    const sesionActual = await obtenerSesion(id)
    const item = sesionActual?.items.find((i) => i.id === itemId)
    if (!item) return { error: 'Esta sección ya no existe.' }

    await guardarItemContenido(id, itemId, { ...item.contenido, texto })

    try {
      const { crearClientePorDefecto } = await import('@/motor/decidir')
      const resultado = await maquetarItem(
        { titulo: item.titulo, texto },
        obtenerTema(sesionActual!.salaSlug),
        crearClientePorDefecto(),
      )
      // `razon` es la explicación que da el modelo de su decisión. En cuanto
      // una persona toca la sección, deja de ser suya: se descarta aquí.
      const { razon: _razon, ...propuesta } = resultado.decision
      return propuesta
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      return { error: `No se pudo proponer: ${mensaje}. Puedes armar la sección a mano.` }
    }
  }

  async function subirItem(formData: FormData) {
    'use server'
    await exigirEquipo()
    await moverItem(id, String(formData.get('itemId') ?? ''), 'arriba')
    revalidatePath(`/preparar/${id}`)
  }

  async function bajarItem(formData: FormData) {
    'use server'
    await exigirEquipo()
    await moverItem(id, String(formData.get('itemId') ?? ''), 'abajo')
    revalidatePath(`/preparar/${id}`)
  }

  /** Persiste el orden que dejó el arrastre (ver ListaOrdenable). */
  async function reordenar(idsEnOrden: string[]) {
    'use server'
    await exigirEquipo()
    await reordenarItems(id, idsEnOrden)
    revalidatePath(`/preparar/${id}`)
  }

  async function maquetar() {
    'use server'
    await exigirEquipo()
    const sesionActual = await obtenerSesion(id)
    if (!sesionActual) throw new Error('Sesión no encontrada')

    const entradas = entradasCrudasDeSesion(sesionActual)
    if (entradas.length === 0) throw new Error('No hay secciones llenadas que presentar')

    const resultados = await maquetarSesion(entradas, sesionActual.salaSlug)
    await guardarDecisiones(id, resultados)
    redirect(`/preparar/${id}/deck`)
  }

  async function borrarSesionAction() {
    'use server'
    await exigirEquipo()
    await eliminarSesion(id)
    revalidatePath('/preparar')
    revalidatePath('/')
    redirect('/preparar')
  }

  // ---- Vista ----

  const total = sesion.items.length
  // Las secciones base son los bloques de la reunión; el resto cuelga de una.
  const bases = sesion.items.filter((i) => !i.padre)
  // El tema de la sala baja hasta cada editor: la vista previa tiene que
  // pintarse con los colores con los que se va a presentar, no con los del
  // cascarón de preparación.
  const tema = obtenerTema(sesion.salaSlug)

  return (
    <div className={estilos.app} style={{ '--sala': sesion.salaColor } as CSSProperties}>
      <header className={estilos.barra}>
        <Link href="/preparar" className={estilos.volver}>← Preparar</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {sesion.estado !== 'borrador' && (
            <>
              <Link href={`/preparar/${sesion.id}/deck`} className={estilos.volver}>Ver documento →</Link>
              <Link href={`/preparar/${sesion.id}/minuta`} className={estilos.volver}>Minuta →</Link>
            </>
          )}
        </div>
      </header>

      <main className={`${estilos.main} ${estilos.mainEditor}`}>
        <div className={estilos.heroSesion}>
          <div className={estilos.heroFila}>
            <div>
              <div className={estilos.heroSala}>
                <span className={estilos.heroPunto} />
                {sesion.salaNombre}
              </div>
              <div className={estilos.heroMeta}>
                <span>{sesion.tipo}</span>
                <span className={estilos.sep}>·</span>
                <span>{etiquetaAlcance(sesion.alcance)}</span>
                <span className={estilos.sep}>·</span>
                <span>{fechaCompleta(sesion.fecha)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`${estilos.chip} ${estilos[sesion.estado]}`}>{ETIQUETA_ESTADO[sesion.estado]}</span>
              <div className={estilos.avance} style={{ marginTop: '0.6rem', minWidth: 160 }}>
                <div className={estilos.avanceBarra}>
                  <div
                    className={estilos.avanceRelleno}
                    style={{ width: `${total > 0 ? Math.round((sesion.itemsLlenados / total) * 100) : 0}%` }}
                  />
                </div>
                <span className={estilos.avanceTexto}>{sesion.itemsLlenados}/{total} listas</span>
              </div>
            </div>
          </div>
        </div>

        {/* El editor enseña el ÁRBOL de la sesión: las secciones base son los
            bloques de la reunión y dentro cuelgan sus subsecciones, que es lo
            que cambia de un mes a otro. El arrastre reordena los bloques; las
            subsecciones se mueven con las flechas dentro del suyo. */}
        <ListaOrdenable ids={bases.map((i) => i.id)} reordenarAction={reordenar}>
          {bases.map((base, i) => {
            const hijas = sesion.items.filter((h) => h.padre === base.tipo)
            return (
              <div key={base.id} className={estilos.bloqueSeccion}>
                <TarjetaSeccion
                  item={base}
                  primera={i === 0}
                  ultima={i === bases.length - 1}
                  subirAction={subirItem}
                  bajarAction={bajarItem}
                  guardarSeccionAction={guardarSeccionAction}
                  proponerAction={proponerAction}
                  eliminarSeccionAction={base.esBase ? undefined : eliminarSeccionAction}
                  tema={tema}
                />

                <div className={estilos.subsecciones}>
                  {hijas.map((hija, j) => (
                    <TarjetaSeccion
                      key={hija.id}
                      item={hija}
                      primera={j === 0}
                      ultima={j === hijas.length - 1}
                      subirAction={subirItem}
                      bajarAction={bajarItem}
                      guardarSeccionAction={guardarSeccionAction}
                      proponerAction={proponerAction}
                      eliminarSeccionAction={eliminarSeccionAction}
                      esSub
                      tema={tema}
                    />
                  ))}
                  {/* SOLO UN DIVISOR ABRE UN BLOQUE. Una sección que ya lleva
                      contenido propio —la portada, la agenda, la tabla de
                      pendientes— es una hoja del árbol: colgarle una
                      subsección sería repetir lo que ya dice. */}
                  {base.contenido.seccion?.layout === 'divisor-seccion' && (
                      <AnadirSeccion
                        dentroDe={base.titulo}
                        anadirAction={anadirSubseccionAction.bind(null, base.tipo)}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </ListaOrdenable>

        <AnadirSeccion anadirAction={anadirSeccionAction} />

        {sesion.itemsLlenados > 0 ? (
          <form action={maquetar} className={estilos.panelMaquetar}>
            <span className={estilos.panelMaquetarTexto}>
              {sesion.itemsLlenados} de {total} secciones listas.
              {sesion.estado !== 'borrador' && ' Ya hay un documento generado — volver a generarlo lo reemplaza.'}
            </span>
            <BotonMaquetar className={`${estilos.boton} ${estilos.botonAcento}`} />
          </form>
        ) : (
          <p className={estilos.panelMaquetarAviso}>Llena al menos una sección para poder generar el documento.</p>
        )}

        <BorrarSesion borrarAction={borrarSesionAction} />
      </main>
    </div>
  )
}
