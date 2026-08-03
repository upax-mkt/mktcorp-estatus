import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../deck.module.css'
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
import { temaDeSala } from '@/temas'
import { cargarTemas } from '@/db/temas'
import { exigirEditor, exigirLectura } from '@/auth/roles'
import { BotonMaquetar } from '@/componentes/BotonMaquetar'
import { ListaOrdenable } from '@/componentes/ListaOrdenable'
import { BorrarSesion } from '@/componentes/BorrarSesion'
import { AnadirSeccion } from '@/componentes/editor/AnadirSeccion'
import { TarjetaSeccion } from '@/componentes/editor/TarjetaSeccion'
import { IndiceSesion, type EntradaIndice } from '@/componentes/editor/IndiceSesion'
import { VistaEditor } from '@/componentes/editor/VistaEditor'
import { estadoDeSeccion, borradorTieneContenido, type BorradorSeccion } from '@/secciones/borrador'
import type { DecisionSlide } from '@/decision/esquema'
import { fechaCompleta } from '@/lib/fecha'
import { registrarArchivo } from '@/db/archivos'
import { del } from '@vercel/blob'
import { registrarEdicion, participantesDe } from '@/db/participacion'
import { ParticipantesSesion } from '@/componentes/sesion/ParticipantesSesion'

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
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9) — la comprobación de sesión va primero,
  // antes incluso de mirar si el id existe.
  await exigirLectura()
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  // ---- Server actions ----
  // Cada una exige editor por su cuenta (`exigirEditor()`: admin o editor,
  // no viewer — ronda 9, tarea 2): una Server Action es un endpoint, y
  // ocultar el botón en la pantalla no protege nada.

  async function guardarSeccionAction(itemId: string, seccion: BorradorSeccion) {
    'use server'
    const quien = await exigirEditor()
    await guardarSeccion(id, itemId, seccion)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function anadirSeccionAction(layout: DecisionSlide['layout'], nombre: string) {
    'use server'
    const quien = await exigirEditor()
    await anadirSeccion(id, layout, nombre)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function anadirSubseccionAction(padre: string, layout: DecisionSlide['layout'], nombre: string) {
    'use server'
    const quien = await exigirEditor()
    await anadirSeccion(id, layout, nombre, padre)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function eliminarSeccionAction(itemId: string) {
    'use server'
    const quien = await exigirEditor()
    await eliminarSeccion(id, itemId)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
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
    await exigirEditor()
    const sesionActual = await obtenerSesion(id)
    const item = sesionActual?.items.find((i) => i.id === itemId)
    if (!item) return { error: 'Esta sección ya no existe.' }

    await guardarItemContenido(id, itemId, { ...item.contenido, texto })

    try {
      const { crearClientePorDefecto } = await import('@/motor/decidir')
      const resultado = await maquetarItem(
        { titulo: item.titulo, texto },
        temaDeSala(sesionActual!.salaSlug, await cargarTemas()),
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

  /**
   * Registra una imagen ya subida a Blob y devuelve la URL con la que se
   * sirve. Cuelga de LA SESIÓN, no de una sala: quien puede ver el documento
   * puede ver su imagen, y hay reuniones que no son de ninguna sala.
   */
  async function subirImagenAction(datos: {
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }): Promise<{ url?: string; error?: string }> {
    'use server'
    await exigirEditor()
    try {
      const { id: archivoId } = await registrarArchivo({
        salaSlug: null,
        sesionId: id,
        categoria: 'imagen',
        titulo: datos.nombreOriginal,
        fecha: null,
        ruta: datos.ruta,
        nombreOriginal: datos.nombreOriginal,
        tipoContenido: datos.tipoContenido,
        tamanoBytes: datos.tamanoBytes,
      })
      return { url: `/api/archivo/${archivoId}` }
    } catch (error) {
      // El binario ya está en el almacén: si la fila no se puede crear se
      // quita también, o queda basura invisible que se sigue pagando.
      await del(datos.ruta).catch(() => {})
      return { error: error instanceof Error ? error.message : 'No se pudo registrar la imagen.' }
    }
  }

  async function subirItem(formData: FormData) {
    'use server'
    const quien = await exigirEditor()
    await moverItem(id, String(formData.get('itemId') ?? ''), 'arriba')
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function bajarItem(formData: FormData) {
    'use server'
    const quien = await exigirEditor()
    await moverItem(id, String(formData.get('itemId') ?? ''), 'abajo')
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  /** Persiste el orden que dejó el arrastre (ver ListaOrdenable). */
  async function reordenar(idsEnOrden: string[]) {
    'use server'
    const quien = await exigirEditor()
    await reordenarItems(id, idsEnOrden)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function maquetar() {
    'use server'
    const quien = await exigirEditor()
    const sesionActual = await obtenerSesion(id)
    if (!sesionActual) throw new Error('Sesión no encontrada')

    const entradas = entradasCrudasDeSesion(sesionActual)
    if (entradas.length === 0) throw new Error('No hay secciones llenadas que presentar')

    const resultados = await maquetarSesion(entradas, sesionActual.salaSlug)
    await guardarDecisiones(id, resultados)
    // Antes del redirect: `redirect()` de Next corta la función lanzando, así
    // que nada después de esta línea se ejecutaría.
    if (quien.sub) await registrarEdicion(id, quien.sub)
    redirect(`/deck/${id}/documento`)
  }

  async function borrarSesionAction() {
    'use server'
    await exigirEditor()
    await eliminarSesion(id)
    revalidatePath('/deck')
    revalidatePath('/')
    redirect('/deck')
  }

  // ---- Vista ----

  const total = sesion.items.length
  // Las secciones base son los bloques de la reunión; el resto cuelga de una.
  const bases = sesion.items.filter((i) => !i.padre)
  // El tema de la sala baja hasta cada editor: la vista previa tiene que
  // pintarse con los colores con los que se va a presentar, no con los del
  // cascarón de preparación.
  const tema = temaDeSala(sesion.salaSlug, await cargarTemas())
  // Si alguna sección se va a resolver con el asistente. Solo entonces
  // maquetar tarda de verdad: una sesión armada a mano no llama a ningún
  // modelo, y anunciar "~25 s" para algo instantáneo enseña a desconfiar del
  // resto de los avisos.
  const usaIA = sesion.items.some((i) => !borradorTieneContenido(i.contenido.seccion) && Boolean(i.contenido.texto?.trim()))

  // Qué le falta a la sesión para poder generarse entera, con el MISMO criterio
  // con el que se va a maquetar. Se calcula en el servidor y se enseña junto al
  // botón: quien lo pulsa no sabe si los demás terminaron sus secciones.
  const estados = sesion.items.map((i) => ({
    titulo: i.contenido.seccion?.titulo || i.titulo,
    estado: estadoDeSeccion(i.contenido.seccion ?? { layout: 'portada' }, i.titulo),
  }))
  const conProblema = estados.filter((e) => e.estado.estado === 'con-problema').map((e) => e.titulo)
  const sinEmpezar = estados
    .filter((e) => e.estado.estado === 'por-empezar' || e.estado.estado === 'incompleta')
    .map((e) => e.titulo)

  // El índice, en el orden REAL en que se leen: cada bloque seguido de sus
  // subsecciones. `sesion.items` viene ordenado por posición, no por árbol.
  const entradasIndice: EntradaIndice[] = bases.flatMap((base) => [
    { id: base.id, titulo: base.titulo, llenado: base.llenado, esSub: false },
    ...sesion.items
      .filter((h) => h.padre === base.tipo)
      .map((h) => ({ id: h.id, titulo: h.titulo, llenado: h.llenado, esSub: true })),
  ])

  // Quién preparó esta sesión y quién la presentó (ronda 9, tarea 4). Esta
  // página es de equipo (`exigirLectura()`, arriba) — nunca la ve un director
  // de sala, así que enseñar correos y nombres de Mkt Corp aquí no repite la
  // fuga de datos que ya se corrigió en /reunion/[id].
  const participantes = await participantesDe(id)

  return (
    <div className={estilos.app} style={{ '--sala': sesion.salaColor } as CSSProperties}>
      <header className={estilos.barra}>
        <Link href="/deck" className={estilos.volver}>← Deck Designer</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {sesion.estado !== 'borrador' && (
            <Link href={`/deck/${sesion.id}/documento`} className={estilos.volver}>Ver documento →</Link>
          )}
          {/* LA MINUTA NO ESPERA A QUE SE MAQUETE. Estaba escondida detrás de
              «no es borrador», y una reunión puede darse sin que a nadie le dé
              tiempo de maquetar: la transcripción existe igual y el acta hace
              falta igual. Es aquí donde uno está cuando sale de la reunión. */}
          <Link href={`/deck/${sesion.id}/minuta`} className={estilos.volver}>
            Minuta con IA →
          </Link>
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

          <ParticipantesSesion participantes={participantes} />
        </div>

        <div className={estilos.editorConIndice}>
        <div className={estilos.columnaSecciones}>
        <VistaEditor
          tema={tema}
          reordenarAction={reordenar}
          secciones={bases.map((b) => ({
            id: b.id,
            // El nombre de la sección en la estructura ("RevOps"), no su
            // título de contenido: ese ya se lee dentro de la vista previa, y
            // repetirlo dos centímetros más arriba es ruido.
            titulo: b.titulo,
            borrador: b.contenido.seccion ?? { layout: 'portada' },
          }))}
          formularios={
          <>
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
                  sesionId={id}
                  subirImagenAction={subirImagenAction}
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
                      sesionId={id}
                      subirImagenAction={subirImagenAction}
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
          </>
          }
        />
        </div>

        {/* El índice va DESPUÉS en el orden del documento y a la izquierda en
            la pantalla: el contenido primero para quien navega con teclado o
            lector, y a la vista para quien mira. */}
        <IndiceSesion entradas={entradasIndice} llenadas={sesion.itemsLlenados} total={total} />
        </div>

        {/* GENERAR CUANDO ESTÉ TODO LISTO, no cuando alguien se canse.
            Franco: "ya cuando todos hayan terminado de editar y estén ok con
            el diseño se genera la presentación web". Varias personas llenan
            secciones distintas de la misma sesión, así que quien pulsa
            "Maquetar" no sabe si los demás terminaron. Ahora se dice cuántas
            faltan y cuáles: generar con la mitad en blanco produce un
            documento que hay que volver a generar. */}
        {sesion.itemsLlenados > 0 ? (
          <form action={maquetar} className={estilos.panelMaquetar}>
            <span className={estilos.panelMaquetarTexto}>
              {conProblema.length > 0 ? (
                <>
                  {conProblema.length === 1
                    ? '1 sección no se puede presentar como está: '
                    : `${conProblema.length} secciones no se pueden presentar como están: `}
                  {conProblema.slice(0, 3).join(', ')}
                  {conProblema.length > 3 && ` y ${conProblema.length - 3} más`}.{' '}
                  {conProblema.length === 1 ? 'Se generaría' : 'Se generarían'} solo con su título.
                </>
              ) : sinEmpezar.length > 0 ? (
                <>
                  {sesion.itemsLlenados} de {total} secciones listas. Faltan por escribir:{' '}
                  {sinEmpezar.slice(0, 3).join(', ')}
                  {sinEmpezar.length > 3 && ` y ${sinEmpezar.length - 3} más`}.
                </>
              ) : (
                <>
                  Las {total} secciones están listas.
                  {sesion.estado !== 'borrador' && ' Ya hay un documento generado — volver a generarlo lo reemplaza.'}
                </>
              )}
            </span>
            <BotonMaquetar
              className={`${estilos.boton} ${estilos.botonAcento}`}
              conIA={usaIA}
              todoListo={conProblema.length === 0 && sinEmpezar.length === 0}
            />
          </form>
        ) : (
          <p className={estilos.panelMaquetarAviso}>Llena al menos una sección para poder generar el documento.</p>
        )}

        <BorrarSesion borrarAction={borrarSesionAction} />
      </main>
    </div>
  )
}
