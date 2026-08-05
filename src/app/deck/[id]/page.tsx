import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../deck.module.css'
import { obtenerReunion } from '@/db/reuniones'
import {
  documentoDeReunion,
  crearDocumento,
  moverItem,
  reordenarItems,
  entradasCrudasDeDocumento,
  guardarDecisiones,
  guardarSeccion,
  anadirSeccion,
  eliminarSeccion,
  guardarItemContenido,
  anadirAcuerdoRetomado,
  itemDeAcuerdosPendientes,
  eliminarDocumentoDeReunion,
} from '@/db/documentos'
import { eliminarReunion } from '@/db/reuniones'
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
import { AcuerdosArrastrables } from '@/componentes/editor/AcuerdosArrastrables'
import { ZonaSoltarAcuerdo } from '@/componentes/editor/ZonaSoltarAcuerdo'
import { estadoDeSeccion, borradorTieneContenido, type BorradorSeccion } from '@/secciones/borrador'
import type { DecisionSlide } from '@/decision/esquema'
import { fechaCompleta } from '@/lib/fecha'
import { registrarArchivo } from '@/db/archivos'
import { del } from '@vercel/blob'
import { registrarEdicion, participantesDe } from '@/db/participacion'
import { acuerdosArrastrablesDe } from '@/db/consultas'
import { retomarAcuerdo } from '@/db/acuerdos'
import { ParticipantesSesion } from '@/componentes/sesion/ParticipantesSesion'

// Maquetar un documento armado a mano es instantáneo. El margen de 60 s es
// para el asistente de IA, que sí llama al modelo.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Dos estados, no cinco (ronda 10): `EstadoDocumento` es `'borrador' | 'listo'`. */
const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: 'borrador',
  listo: 'lista para presentar',
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
  // El id de la URL es el de la REUNIÓN (heredado de la vieja sesión: las
  // dos comparten id). El documento es una fila aparte, ligada 1:1 — puede
  // no existir todavía (una reunión registrada solo con minuta, sin pasar
  // por "preparar", ver publicarMinutaAction; o creada a secas con
  // `crearReunion`). `documentoDeReunion` (lectura pública) devuelve `null`
  // ahí con normalidad — es el mismo caso que ya toleraba `crearSesion` sin
  // plantilla.
  //
  // ESTE EDITOR, A DIFERENCIA DE ESA lectura, NECESITA UN DOCUMENTO DE
  // VERDAD (Tarea 7, ver su brief: "abre el documento de esa reunión, y lo
  // crea si aún no tiene"): sus Server Actions —`guardarSeccionAction`,
  // `anadirSeccionAction`...— escriben contra `documentoId`, y sin uno real
  // escribirían contra la cadena vacía. Se crea A DEMANDA, sin plantilla
  // (`crearDocumento` a secas): quien llega aquí sin haber pasado por
  // `crearReunionConDocumento` no pidió ninguna estructura en particular, y
  // el editor ya sabe presentarse con cero secciones (`AnadirSeccion` sigue
  // ahí para armarlo a mano).
  const [reunion, documentoPrevio] = await Promise.all([obtenerReunion(id), documentoDeReunion(id)])
  if (!reunion) notFound()
  if (!documentoPrevio) await crearDocumento(id)
  const documento = documentoPrevio ?? (await documentoDeReunion(id))
  const documentoId = documento?.id ?? ''
  const items = documento?.items ?? []
  const documentoEstado = documento?.estado ?? 'borrador'

  // ---- Server actions ----
  // Cada una exige editor por su cuenta (`exigirEditor()`: admin o editor,
  // no viewer — ronda 9, tarea 2): una Server Action es un endpoint, y
  // ocultar el botón en la pantalla no protege nada.

  async function guardarSeccionAction(itemId: string, seccion: BorradorSeccion) {
    'use server'
    const quien = await exigirEditor()
    await guardarSeccion(documentoId, itemId, seccion)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function anadirSeccionAction(layout: DecisionSlide['layout'], nombre: string) {
    'use server'
    const quien = await exigirEditor()
    await anadirSeccion(documentoId, layout, nombre)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function anadirSubseccionAction(padre: string, layout: DecisionSlide['layout'], nombre: string) {
    'use server'
    const quien = await exigirEditor()
    await anadirSeccion(documentoId, layout, nombre, padre)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function eliminarSeccionAction(itemId: string) {
    'use server'
    const quien = await exigirEditor()
    await eliminarSeccion(documentoId, itemId)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  /**
   * El atajo opcional: texto crudo → propuesta de sección.
   *
   * Devuelve la propuesta SIN guardarla. Cae en el formulario del navegador y
   * ahí se corrige; nadie presenta algo que no revisó. Guarda el texto crudo
   * para que reabrir el asistente no obligue a volver a pegarlo.
   *
   * `guardarItemContenido`, más abajo, escribe el documento ya —el texto
   * crudo— aunque la propuesta que arma el modelo nunca llegue a guardarse
   * como sección. A diferencia de la vieja `sesiones.ts`, esto ya NO dispara
   * ninguna transición de estado (`empezarAPrepararse` no tiene equivalente:
   * `EstadoDocumento` nace directamente en `'borrador'`, ver el comentario de
   * sección en documentos.ts) — pero SÍ se sigue registrando la edición
   * (revisión de la ronda 9, tarea 4): si alguien pega un texto, ve la
   * propuesta y se va sin confirmar, el documento queda con contenido nuevo y
   * nadie registrado si esto no lo hiciera aquí también, no solo en
   * `guardarSeccionAction` cuando se confirma.
   */
  async function proponerAction(itemId: string, texto: string): Promise<BorradorSeccion | { error: string }> {
    'use server'
    const quien = await exigirEditor()
    const documentoActual = await documentoDeReunion(id)
    const item = documentoActual?.items.find((i) => i.id === itemId)
    if (!item) return { error: 'Esta sección ya no existe.' }

    await guardarItemContenido(documentoId, itemId, { ...item.contenido, texto })
    if (quien.sub) await registrarEdicion(id, quien.sub)

    try {
      const { crearClientePorDefecto } = await import('@/motor/decidir')
      const resultado = await maquetarItem(
        { titulo: item.titulo, texto },
        // `!`: mismo motivo que `sesionActual!` en el original — el
        // `notFound()` de arriba ya lo garantiza en runtime, pero TS no
        // retiene el estrechamiento de una `const` externa dentro de una
        // Server Action anidada.
        temaDeSala(reunion!.salaSlug, await cargarTemas()),
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
   * sirve. Cuelga de LA REUNIÓN, no de una sala: quien puede ver el documento
   * puede ver su imagen — toda reunión es de una sala desde la Tarea 4, pero
   * la comprobación real de permiso (`puedeVerlo`, src/app/api/archivo/[id]/route.ts)
   * sigue siendo por reunión, no por sala directamente.
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
        reunionId: id,
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

  /**
   * Lo mismo que `subirImagenAction`, para el vídeo de una sección (ronda 9,
   * tarea 7): registra el binario ya subido a Blob —categoría `video`— y
   * devuelve la URL con la que se sirve. También cuelga de LA REUNIÓN: el
   * tope real de tamaño y de formato ya se comprobó en `/api/archivos/subir`,
   * la ruta que autoriza la subida; esto solo dobla el binario en una fila.
   */
  async function subirVideoAction(datos: {
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
        reunionId: id,
        categoria: 'video',
        titulo: datos.nombreOriginal,
        fecha: null,
        ruta: datos.ruta,
        nombreOriginal: datos.nombreOriginal,
        tipoContenido: datos.tipoContenido,
        tamanoBytes: datos.tamanoBytes,
      })
      return { url: `/api/archivo/${archivoId}` }
    } catch (error) {
      await del(datos.ruta).catch(() => {})
      return { error: error instanceof Error ? error.message : 'No se pudo registrar el vídeo.' }
    }
  }

  async function subirItem(formData: FormData) {
    'use server'
    const quien = await exigirEditor()
    await moverItem(documentoId, String(formData.get('itemId') ?? ''), 'arriba')
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function bajarItem(formData: FormData) {
    'use server'
    const quien = await exigirEditor()
    await moverItem(documentoId, String(formData.get('itemId') ?? ''), 'abajo')
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  /** Persiste el orden que dejó el arrastre (ver ListaOrdenable). */
  async function reordenar(idsEnOrden: string[]) {
    'use server'
    const quien = await exigirEditor()
    await reordenarItems(documentoId, idsEnOrden)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  /**
   * Retoma un acuerdo abierto de la sala en este documento — por arrastre
   * (ZonaSoltarAcuerdo) o por el botón «Añadir» (AcuerdosArrastrables): las
   * dos vías llegan aquí igual.
   *
   * NO crea un acuerdo nuevo. Dos escrituras, ninguna copia su contenido:
   *
   * 1. `anadirAcuerdoRetomado` (src/db/documentos.ts) lo REFERENCIA en la
   *    sección de Acuerdos y Pendientes de este documento — solo el id. Es lo
   *    que hace que se VEA: el editor y "Maquetar" resuelven esa referencia
   *    contra la tabla `acuerdos` en cada lectura, así que si alguien lo
   *    cierra desde la sala, se cierra el mismo — no queda un gemelo vivo.
   * 2. `retomarAcuerdo` (src/db/acuerdos.ts) deja constancia en la HISTORIA
   *    del propio acuerdo de que esta reunión lo retomó — auditoría, no lo
   *    que decide si se ofrece o se ve (eso ya lo hizo el punto 1).
   *
   * `revalidatePath` es lo que lo saca de la columna de arrastrables en el
   * siguiente render, porque `acuerdosArrastrablesDe` deja de ofrecer lo que
   * ya está referenciado — no hace falta borrarlo de ningún lado a mano.
   */
  async function retomarAcuerdoAction(acuerdoId: string) {
    'use server'
    const quien = await exigirEditor()
    await anadirAcuerdoRetomado(documentoId, acuerdoId)
    await retomarAcuerdo(acuerdoId, id)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}`)
  }

  async function maquetar() {
    'use server'
    const quien = await exigirEditor()
    const documentoActual = await documentoDeReunion(id)
    if (!documentoActual) throw new Error('Documento no encontrado')

    const entradas = entradasCrudasDeDocumento(documentoActual)
    if (entradas.length === 0) throw new Error('No hay secciones llenadas que presentar')

    const resultados = await maquetarSesion(entradas, reunion!.salaSlug)
    await guardarDecisiones(documentoActual.id, resultados)
    // Antes del redirect: `redirect()` de Next corta la función lanzando, así
    // que nada después de esta línea se ejecutaría.
    if (quien.sub) await registrarEdicion(id, quien.sub)
    redirect(`/deck/${id}/documento`)
  }

  async function borrarSesionAction() {
    'use server'
    await exigirEditor()
    await eliminarReunion(id, eliminarDocumentoDeReunion)
    revalidatePath('/deck')
    revalidatePath('/')
    redirect('/deck')
  }

  // ---- Vista ----

  const total = items.length
  const itemsLlenados = items.filter((i) => i.llenado).length
  // Las secciones base son los bloques de la reunión; el resto cuelga de una.
  const bases = items.filter((i) => !i.padre)
  // El tema de la sala baja hasta cada editor: la vista previa tiene que
  // pintarse con los colores con los que se va a presentar, no con los del
  // cascarón de preparación.
  const tema = temaDeSala(reunion.salaSlug, await cargarTemas())
  // Si alguna sección se va a resolver con el asistente. Solo entonces
  // maquetar tarda de verdad: un documento armado a mano no llama a ningún
  // modelo, y anunciar "~25 s" para algo instantáneo enseña a desconfiar del
  // resto de los avisos.
  const usaIA = items.some((i) => !borradorTieneContenido(i.contenido.seccion) && Boolean(i.contenido.texto?.trim()))

  // Qué le falta al documento para poder generarse entero, con el MISMO
  // criterio con el que se va a maquetar. Se calcula en el servidor y se
  // enseña junto al botón: quien lo pulsa no sabe si los demás terminaron
  // sus secciones.
  const estados = items.map((i) => ({
    titulo: i.contenido.seccion?.titulo || i.titulo,
    estado: estadoDeSeccion(i.contenido.seccion ?? { layout: 'portada' }, i.titulo),
  }))
  const conProblema = estados.filter((e) => e.estado.estado === 'con-problema').map((e) => e.titulo)
  const sinEmpezar = estados
    .filter((e) => e.estado.estado === 'por-empezar' || e.estado.estado === 'incompleta')
    .map((e) => e.titulo)

  // El índice, en el orden REAL en que se leen: cada bloque seguido de sus
  // subsecciones. `items` viene ordenado por posición, no por árbol.
  const entradasIndice: EntradaIndice[] = bases.flatMap((base) => [
    { id: base.id, titulo: base.titulo, llenado: base.llenado, esSub: false },
    ...items
      .filter((h) => h.padre === base.tipo)
      .map((h) => ({ id: h.id, titulo: h.titulo, llenado: h.llenado, esSub: true })),
  ])

  // Quién preparó esta reunión y quién la presentó (ronda 9, tarea 4). Esta
  // página es de equipo (`exigirLectura()`, arriba) — nunca la ve un director
  // de sala, así que enseñar correos y nombres de Mkt Corp aquí no repite la
  // fuga de datos que ya se corrigió en /reunion/[id].
  const participantes = await participantesDe(id)

  // Los acuerdos abiertos de la sala que se pueden arrastrar a este
  // documento (ronda 9, tarea 6). Sin sala (comité, interna de Mkt Corp —
  // Tarea 8b) no hay sala cuyos acuerdos ofrecer: "acuerdos abiertos de LA
  // SALA" no tiene respuesta para una reunión que no es de ninguna UDN —
  // vuelve a condicionarse, mismo criterio que el modelo viejo
  // (`sesion.salaSlug ? await acuerdosArrastrablesDe(...) : []`, git show
  // d5396be:src/app/deck/[id]/page.tsx).
  const acuerdosArrastrables = reunion.salaSlug ? await acuerdosArrastrablesDe(reunion.salaSlug, id) : []
  // En qué sección "aterriza" un acuerdo retomado: la de Acuerdos y
  // Pendientes, si este documento tiene una (ver `itemDeAcuerdosPendientes`).
  // Es la ÚNICA tarjeta que recibe la zona de destino del arrastre.
  const itemAcuerdos = documento ? itemDeAcuerdosPendientes(documento) : undefined

  return (
    <div className={estilos.app} style={{ '--sala': reunion.salaColor } as CSSProperties}>
      <header className={estilos.barra}>
        <Link href="/deck" className={estilos.volver}>← Deck Designer</Link>
        <div className={estilos.barraTitulo}>{reunion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {documentoEstado === 'listo' && (
            <Link href={`/deck/${id}/documento`} className={estilos.volver}>Ver documento →</Link>
          )}
          {/* LA MINUTA NO ESPERA A QUE SE MAQUETE. Estaba escondida detrás de
              «no es borrador», y una reunión puede darse sin que a nadie le dé
              tiempo de maquetar: la transcripción existe igual y el acta hace
              falta igual. Es aquí donde uno está cuando sale de la reunión. */}
          <Link href={`/deck/${id}/minuta`} className={estilos.volver}>
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
                {reunion.salaNombre}
              </div>
              <div className={estilos.heroMeta}>
                <span>{reunion.tipo}</span>
                <span className={estilos.sep}>·</span>
                <span>{etiquetaAlcance(reunion.alcance)}</span>
                <span className={estilos.sep}>·</span>
                <span>{fechaCompleta(reunion.fecha)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`${estilos.chip} ${estilos[documentoEstado]}`}>{ETIQUETA_ESTADO[documentoEstado]}</span>
              <div className={estilos.avance} style={{ marginTop: '0.6rem', minWidth: 160 }}>
                <div className={estilos.avanceBarra}>
                  <div
                    className={estilos.avanceRelleno}
                    style={{ width: `${total > 0 ? Math.round((itemsLlenados / total) * 100) : 0}%` }}
                  />
                </div>
                <span className={estilos.avanceTexto}>{itemsLlenados}/{total} listas</span>
              </div>
            </div>
          </div>

          <ParticipantesSesion participantes={participantes} />
        </div>

        {/* Los acuerdos abiertos de la sala, listos para retomarse en este
            documento (ronda 9, tarea 6). Antes de la lista de secciones: es
            lo primero que hay que revisar al abrir una reunión nueva de la
            sala, igual que Franco lo pidió — "si quiero agregar Acuerdos y
            Pendientes me debería sugerir...". Solo si la reunión es de una
            sala (Tarea 8c): una reunión sin sala no tiene de dónde
            sugerirlos — mismo criterio que el modelo viejo
            (`sesion.salaSlug && (<AcuerdosArrastrables .../>)`, git show
            d5396be:src/app/deck/[id]/page.tsx). */}
        {reunion.salaSlug && (
          <AcuerdosArrastrables
            acuerdos={acuerdosArrastrables}
            alArrastrar={retomarAcuerdoAction}
            // Revisión final de la rama, punto 5: `itemAcuerdos` (arriba) es
            // `undefined` en las plantillas sin sección de Acuerdos y
            // Pendientes («en blanco», «comité») — sin este dato, el panel
            // ofrecía arrastre y el botón «Añadir» aunque la acción SIEMPRE
            // fuera a lanzar (`anadirAcuerdoRetomado` exige esa sección).
            hayDestino={itemAcuerdos !== undefined}
          />
        )}

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
            // Para que "Ver y ordenar" enseñe EXACTAMENTE lo que va a
            // generar "Maquetar" — acuerdos retomados incluidos, resueltos
            // al momento (ronda 9, tarea 6).
            acuerdosRetomados: b.acuerdosRetomados,
          }))}
          formularios={
          <>
        {/* El editor enseña el ÁRBOL del documento: las secciones base son
            los bloques de la reunión y dentro cuelgan sus subsecciones, que
            es lo que cambia de un mes a otro. El arrastre reordena los
            bloques; las subsecciones se mueven con las flechas dentro del
            suyo. */}
        <ListaOrdenable ids={bases.map((i) => i.id)} reordenarAction={reordenar}>
          {bases.map((base, i) => {
            const hijas = items.filter((h) => h.padre === base.tipo)
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
                  subirVideoAction={subirVideoAction}
                  zonaDeAcuerdos={
                    base.id === itemAcuerdos?.id ? (
                      <ZonaSoltarAcuerdo acuerdos={base.acuerdosRetomados} alSoltar={retomarAcuerdoAction} />
                    ) : undefined
                  }
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
                      subirVideoAction={subirVideoAction}
                      // Caso raro pero posible: una "Pendientes con semáforo"
                      // añadida a mano como SUBSECCIÓN de otro bloque, en un
                      // documento sin la fija 'acuerdos-pendientes'
                      // (`itemDeAcuerdosPendientes` no distingue base de
                      // subsección al buscarla — ver src/db/documentos.ts).
                      zonaDeAcuerdos={
                        hija.id === itemAcuerdos?.id ? (
                          <ZonaSoltarAcuerdo acuerdos={hija.acuerdosRetomados} alSoltar={retomarAcuerdoAction} />
                        ) : undefined
                      }
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
        <IndiceSesion entradas={entradasIndice} llenadas={itemsLlenados} total={total} />
        </div>

        {/* GENERAR CUANDO ESTÉ TODO LISTO, no cuando alguien se canse.
            Franco: "ya cuando todos hayan terminado de editar y estén ok con
            el diseño se genera la presentación web". Varias personas llenan
            secciones distintas del mismo documento, así que quien pulsa
            "Maquetar" no sabe si los demás terminaron. Ahora se dice cuántas
            faltan y cuáles: generar con la mitad en blanco produce un
            documento que hay que volver a generar. */}
        {itemsLlenados > 0 ? (
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
                  {itemsLlenados} de {total} secciones listas. Faltan por escribir:{' '}
                  {sinEmpezar.slice(0, 3).join(', ')}
                  {sinEmpezar.length > 3 && ` y ${sinEmpezar.length - 3} más`}.
                </>
              ) : (
                <>
                  Las {total} secciones están listas.
                  {documentoEstado === 'listo' && ' Ya hay un documento generado — volver a generarlo lo reemplaza.'}
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
