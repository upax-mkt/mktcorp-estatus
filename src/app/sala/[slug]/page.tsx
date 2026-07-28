import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../sala.module.css'
import { obtenerTema, slugsDeSalas } from '@/temas'
import {
  estadoDeSala, acuerdosAbiertos, acuerdosVencidos, type Acuerdo,
} from '@/db/consultas'
import { sesionesMinutables, reunionesDeSala } from '@/dominio/salas'
import { altoDeLogo, archivoDeLogo } from '@/temas/logos'
import { IconoSeccion } from '@/componentes/IconoSeccion'
import { moverEstatus, editarAcuerdo, crearAcuerdo, eliminarAcuerdo, type EstatusAcuerdo } from '@/db/acuerdos'
import { obtenerBenchmark } from '@/db/benchmark'
import {
  listarArchivos, registrarArchivo, editarArchivo, eliminarArchivo, type CategoriaArchivo,
} from '@/db/archivos'
import { del } from '@vercel/blob'
import { AcuerdoControles } from '@/componentes/AcuerdoControles'
import { NuevoAcuerdoForm } from '@/componentes/NuevoAcuerdoForm'
import { BenchmarkSala } from '@/componentes/BenchmarkSala'
import { ReunionesSala } from '@/componentes/ReunionesSala'
import { LevantarMinuta } from '@/componentes/LevantarMinuta'
import { ArchivosSala } from '@/componentes/ArchivosSala'
import { NuevaSesionSala } from '@/componentes/NuevaSesionSala'
import { ClaveDeSala } from '@/componentes/ClaveDeSala'
import { estadoDeClave, regenerarClave, quitarClave } from '@/db/claves'
import { secretoConfigurado } from '@/auth/sesion'
import { crearSesionConEstructura, listarSesiones } from '@/db/sesiones'
import { PLANTILLAS } from '@/secciones/plantillas'
import { fechaBreve, fechaCompleta, textoDiasDesde, diaCivil } from '@/lib/fecha'
import {
  esEquipo, exigirEquipo, exigirEdicionDeAcuerdos, puedeEditarAcuerdosDe,
  generarTokenDeSala, puedeVerEstaSala, cerrarSesion,
} from '@/auth/sesion'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import { urlBase } from '@/lib/url-base'

// La vista de equipo ahora escribe (cambiar estatus, editar fecha) — se
// necesita fresca en cada carga, no la copia estática que generateStaticParams
// precalcula. revalidatePath ya invalida esta ruta puntual tras cada acción;
// esto cubre además cualquier otra entrada (p. ej. abrir el link tras un
// deploy nuevo sin haber pasado por una acción).
export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return slugsDeSalas().map((slug) => ({ slug }))
}

function textoFechaAcuerdo(a: Acuerdo): { txt: string; clase: string } {
  if (a.fechaCompromiso == null) return { txt: 'por definir', clase: 'pordef' }
  return {
    txt: fechaBreve(a.fechaCompromiso),
    clase: a.estatus === 'vencido' ? 'vencida' : '',
  }
}
const ETIQUETA_ESTADO: Record<Acuerdo['estatus'], string> = {
  abierto: 'abierto', cumplido: 'cumplido', vencido: 'vencido',
}

export default async function VistaSala({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let tema
  try {
    tema = obtenerTema(slug)
  } catch {
    notFound()
  }
  // El proxy ya filtró, pero esta es la comprobación que cuenta: pegada al
  // dato, no en la puerta. Un director solo abre su sala.
  if (!(await puedeVerEstaSala(slug))) notFound()

  const s = await estadoDeSala(slug)
  if (!s) notFound()
  const [benchmark, equipo, archivosPresentaciones, archivosDeInteres, todasLasSesiones] = await Promise.all([
    obtenerBenchmark(slug),
    esEquipo(),
    listarArchivos(slug, 'presentacion'),
    listarArchivos(slug, 'interes'),
    listarSesiones(),
  ])
  const sesionesDeLaSala = todasLasSesiones.filter((x) => x.salaSlug === slug)
  async function salirDeLaSala() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  const tokenDeAcceso = equipo ? await generarTokenDeSala(slug) : null
  // El director de la UDN mueve los acuerdos de SU sala; el resto de la
  // pantalla sigue siendo de solo lectura para él.
  const editaAcuerdos = await puedeEditarAcuerdosDe(slug)
  const secreto = secretoConfigurado()
  const clave = equipo && secreto
    ? await estadoDeClave(slug, secreto)
    : { tiene: false, creadaEn: null }

  // ---- Server actions: acuerdos editables (spec §4/§6) ----
  // "Solo el equipo Mkt Corp mueve el estatus": cada acción lo exige por su
  // cuenta. Ocultar los controles en la UI no basta — una Server Action es un
  // endpoint, y quien tenga su id puede llamarla sin pasar por la pantalla.

  async function cambiarEstatusAction(acuerdoId: string, estatus: EstatusAcuerdo) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await moverEstatus(acuerdoId, estatus)
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  async function editarFechaAction(acuerdoId: string, fecha: string | null) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await editarAcuerdo(acuerdoId, { fechaCompromiso: fecha ? new Date(fecha) : null })
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  async function crearAcuerdoAction(datos: {
    que: string
    responsable: string
    squad?: string
    fechaCompromiso: string | null
  }) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await crearAcuerdo(slug, {
      que: datos.que,
      responsable: datos.responsable,
      squad: datos.squad,
      fechaCompromiso: datos.fechaCompromiso ? new Date(datos.fechaCompromiso) : null,
    })
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  async function eliminarAcuerdoAction(acuerdoId: string) {
    'use server'
    await exigirEdicionDeAcuerdos(slug)
    await eliminarAcuerdo(acuerdoId)
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  /**
   * Preparar una presentación desde la sala (Franco, punto 3).
   *
   * La sala ya sabe de quién es: no se vuelve a preguntar. Redirige al editor
   * porque crear una sesión sin abrirla es dejar a alguien mirando la misma
   * pantalla preguntándose si pasó algo.
   */
  async function crearSesionAction(datos: { plantilla: string; dia: string }): Promise<{ error?: string }> {
    'use server'
    // EQUIPO, no `exigirEdicionDeAcuerdos`: preparar una presentación no es
    // editar un acuerdo. El director de la UDN mueve sus compromisos; no
    // arma la sesión en la que se los van a presentar.
    await exigirEquipo()
    if (!PLANTILLAS.some((p) => p.id === datos.plantilla)) {
      return { error: 'Plantilla desconocida.' }
    }
    let nueva: { id: string }
    try {
      nueva = await crearSesionConEstructura({
        salaSlug: slug,
        plantilla: datos.plantilla,
        tipo: 'mensual',
        alcance: 'todos',
        // Las 10:00 de CDMX, no la medianoche UTC: sin huso explícito una
        // reunión "del 19" se guarda como las 18:00 del 18 en México.
        fecha: new Date(`${datos.dia}T10:00:00-06:00`),
        estado: 'agendada',
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo crear la sesión.' }
    }
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
    redirect(`/preparar/${nueva.id}`)
  }

  /**
   * Pone una clave nueva y la devuelve EN CLARO, una sola vez.
   *
   * Se guarda su hash, así que esta es la única oportunidad de leerla. El
   * componente la enseña con un "cópiala ahora".
   */
  async function regenerarClaveAction(): Promise<{ clave?: string; error?: string }> {
    'use server'
    await exigirEquipo()
    const s = secretoConfigurado()
    if (!s) return { error: 'Falta SESSION_SECRET en el despliegue: sin él no se pueden firmar claves.' }
    try {
      const nueva = await regenerarClave(slug, s)
      revalidatePath(`/sala/${slug}`)
      return { clave: nueva }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo generar la clave.' }
    }
  }

  async function quitarClaveAction() {
    'use server'
    await exigirEquipo()
    await quitarClave(slug)
    revalidatePath(`/sala/${slug}`)
  }

  // ---- Server actions: archivos colgados en la sala ----

  async function registrarArchivoAction(datos: {
    categoria: CategoriaArchivo
    titulo: string
    fecha: string | null
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }): Promise<{ error?: string }> {
    'use server'
    await exigirEquipo()
    try {
      await registrarArchivo({
        salaSlug: slug,
        categoria: datos.categoria,
        titulo: datos.titulo,
        fecha: datos.fecha ? new Date(datos.fecha) : null,
        ruta: datos.ruta,
        nombreOriginal: datos.nombreOriginal,
        tipoContenido: datos.tipoContenido,
        tamanoBytes: datos.tamanoBytes,
      })
    } catch (error) {
      // El binario ya está en el almacén: si la fila no se puede crear, se
      // quita también el archivo. Un blob sin fila es basura invisible que
      // se sigue pagando.
      await del(datos.ruta).catch(() => {})
      return { error: error instanceof Error ? error.message : 'No se pudo registrar el archivo.' }
    }
    revalidatePath(`/sala/${slug}`)
    return {}
  }

  async function editarArchivoAction(id: string, cambios: { titulo: string; fecha: string | null }) {
    'use server'
    await exigirEquipo()
    await editarArchivo(id, {
      titulo: cambios.titulo,
      fecha: cambios.fecha ? new Date(cambios.fecha) : null,
    })
    revalidatePath(`/sala/${slug}`)
  }

  async function eliminarArchivoAction(id: string) {
    'use server'
    await exigirEquipo()
    // Franco: "si algo se elimina también se elimina del almacenamiento".
    // Primero la fila, luego el binario: al revés, un fallo al borrar el
    // archivo dejaría una fila que apunta a la nada.
    const quitado = await eliminarArchivo(id)
    if (quitado) await del(quitado.ruta).catch(() => {})
    revalidatePath(`/sala/${slug}`)
  }

  const estiloMarca = {
    '--marca': tema.primario,
    '--gradiente': `linear-gradient(120deg, ${tema.gradiente.join(', ')})`,
  } as CSSProperties

  const abiertos = acuerdosAbiertos(s)
  const vencidos = acuerdosVencidos(s)
  // Una reunión = la presentación y su minuta, unidas por la sesión de la que
  // salieron. Ver `reunionesDeSala`.
  const reuniones = reunionesDeSala(s.presentaciones, s.minutas)
  // Toda sesión de ESTA sala cuyo día ya llegó y siga sin minuta, sea
  // borrador o no. Ver `sesionesMinutables`.
  const conMinuta = new Set(s.minutas.map((m) => m.sesionId).filter((x): x is string => Boolean(x)))
  const pendientesDeMinuta = sesionesMinutables(
    sesionesDeLaSala.map((x) => ({ ...x, salaSlug: slug })),
    conMinuta,
    diaCivil(new Date().toISOString()),
  )

  return (
    <div className={estilos.app} style={estiloMarca}>
      <header className={estilos.barra}>
        {/* El director solo tiene acceso a esta sala: mandarlo al hub sería
            ofrecerle una puerta que el proxy le cierra en la cara. */}
        {equipo ? (
          <Link href="/" className={estilos.volver}>← Salas</Link>
        ) : (
          <span className={estilos.volver}>Marketing Corp</span>
        )}
        {/* SIEMPRE HAY SALIDA. Quien entra con un link de sala se quedaba sin
            ninguna: la raíz lo devolvía aquí, esta pantalla no ofrecía nada, y
            la cookie dura 30 días. Una sesión que no se puede terminar no es
            una sesión, es una trampa — y en un ordenador compartido, además,
            deja la sala de una UDN abierta a quien se siente después. */}
        {!equipo && (
          <form action={salirDeLaSala} className={estilos.salirForm}>
            <button type="submit" className={estilos.salirBoton}>Salir</button>
          </form>
        )}
        <div className={estilos.barraSala}>
          <span className={estilos.barraPunto} />
          {s.nombre}
        </div>
      </header>

      {/* Encabezado vestido de la marca de la UDN.
          Franco: "la sala de cada UDN debería estar bandeada con su logo
          también". El logotipo va en su variante BLANCA sobre el degradado: la
          de color trae tintas que contra el degradado de su propia marca
          desaparecen —el morado de Zeus sobre morado— y ninguna de las diez
          está pensada para ir sobre color. */}
      <div className={estilos.hero}>
        <div className={estilos.heroInner}>
          <div className={estilos.heroKicker}>Sala · Marketing Corp</div>
          <Image
            src={archivoDeLogo(slug, 'blanco')}
            alt={s.nombre}
            width={340}
            height={80}
            priority
            className={estilos.heroLogo}
            // Cada marca a SU altura: igualar alturas hace que un logotipo
            // apaisado ocupe cuatro veces más mancha. Ver `temas/logos.ts`.
            // El ×2,2 es porque aquí el logo ES el título de la página, no una
            // marca de identificación dentro de una tarjeta.
            style={{ '--alto-logo': `${altoDeLogo(slug) * 2.2}px` } as CSSProperties}
          />
          {/* El nombre sigue existiendo para quien no ve la imagen: el
              logotipo lleva `alt`, pero un h1 real es lo que da a la página su
              encabezado. Y en Ceci, que comparte el logotipo de Grupo UPAX, es
              lo único que las distingue: por eso aquí sí se enseña. */}
          {slug === 'ceci'
            ? <h1 className={estilos.heroNombre}>{s.nombre}</h1>
            : <h1 className={estilos.heroNombreOculto}>{s.nombre}</h1>}
          <div className={estilos.heroMeta}>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{textoDiasDesde(s.diasDesdeUltima)}</span>
              <span className={estilos.heroMetaL}>última sesión</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>
                {s.proximaSesion ? fechaCompleta(s.proximaSesion) : 'por agendar'}
              </span>
              <span className={estilos.heroMetaL}>próxima sesión</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{abiertos}{vencidos > 0 ? ` · ${vencidos} venc.` : ''}</span>
              <span className={estilos.heroMetaL}>acuerdos abiertos</span>
            </div>
          </div>
        </div>
      </div>

      <main className={estilos.main}>
        {/* Acuerdos primero — es lo que el director quiere ver */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            <IconoSeccion nombre="acuerdos" />
            Acuerdos
            <span className={estilos.conteo}>{s.acuerdos.length}</span>
          </h2>
          {s.acuerdos.length === 0 && !equipo ? (
            <p className={estilos.benchmarkNota}>Sin acuerdos registrados todavía.</p>
          ) : (
            <div className={estilos.acuerdos}>
              {s.acuerdos.map((a) => {
                const f = textoFechaAcuerdo(a)
                return (
                  <div key={a.id} className={estilos.acuerdo}>
                    <span className={`${estilos.acuerdoEstado} ${estilos[a.estatus]}`} />
                    <div>
                      <div className={estilos.acuerdoQue}>{a.que}</div>
                      <div className={estilos.acuerdoMeta}>
                        <span>{a.responsable === 'por asignar' ? 'sin dueño' : a.responsable}</span>
                        {a.squad && <><span className={estilos.sep}>·</span><span>{a.squad}</span></>}
                        <span className={estilos.sep}>·</span>
                        <span className={`${estilos.acuerdoFecha} ${f.clase ? estilos[f.clase] : ''}`}>{f.txt}</span>
                      </div>
                    </div>
                    <div className={estilos.acuerdoDcha}>
                      <span className={`${estilos.acuerdoBadge} ${estilos[a.estatus]}`}>{ETIQUETA_ESTADO[a.estatus]}</span>
                      {/* El director de la UDN ve el estatus; solo Mkt Corp lo mueve. */}
                      {editaAcuerdos && (
                        <AcuerdoControles
                          acuerdoId={a.id}
                          estatusInicial={a.estatus}
                          fechaInicial={a.fechaCompromiso}
                          cambiarEstatusAction={cambiarEstatusAction}
                          editarFechaAction={editarFechaAction}
                          eliminarAction={eliminarAcuerdoAction}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {editaAcuerdos && <NuevoAcuerdoForm crearAction={crearAcuerdoAction} />}
        </section>

        {/* REUNIONES — la presentación y su minuta, juntas.
            Franco: "el módulo Presentaciones y minutas creo que debe ser uno,
            así la presentación está asociada a una minuta, es decir a una
            reunión". Eran dos listas paralelas ordenadas cada una por su
            cuenta; para saber qué se acordó en la presentación de mayo había
            que buscar mayo dos veces. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            <IconoSeccion nombre="reuniones" />
            Reuniones
            {reuniones.length > 0 && <span className={estilos.conteo}>{reuniones.length}</span>}
          </h2>

          <ReunionesSala reuniones={reuniones} equipo={equipo} />

          {equipo && (
            <div className={estilos.reunionAcciones}>
              <NuevaSesionSala nombreSala={s.nombre} crearAction={crearSesionAction} />
              <LevantarMinuta sesiones={pendientesDeMinuta} />
            </div>
          )}

          {/* Las anteriores a esta herramienta: archivos, no documentos web.
              Van en la misma sección porque para el director son lo mismo —lo
              que se le presentó— con su propio subtítulo para que se entienda
              por qué unas se abren y otras se descargan. */}
          {(archivosPresentaciones.length > 0 || equipo) && (
            <div className={estilos.subseccion}>
              <h3 className={estilos.subseccionTitulo}>Antes de esta herramienta</h3>
              <ArchivosSala
                salaSlug={slug}
                categoria="presentacion"
                archivos={archivosPresentaciones}
                equipo={equipo}
                registrarAction={registrarArchivoAction}
                editarAction={editarArchivoAction}
                eliminarAction={eliminarArchivoAction}
              />
            </div>
          )}
        </section>

        {/* Benchmark competitivo — vive a nivel de sala, se nutre en el tiempo (spec §5) */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            <IconoSeccion nombre="benchmark" />
            Benchmark competitivo
            {benchmark && <span className={estilos.conteo}>{s.nombre} + {benchmark.competidores.length} competidores</span>}
          </h2>
          <BenchmarkSala benchmark={benchmark} nombreSala={s.nombre} salaSlug={slug} />
        </section>

        {/* Archivos de interés — al final, como los pidió Franco: lo que el
            equipo estime conveniente tener a mano en la sala. */}
        {(archivosDeInteres.length > 0 || equipo) && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              <IconoSeccion nombre="archivos" />
              Archivos de interés
              {archivosDeInteres.length > 0 && (
                <span className={estilos.conteo}>{archivosDeInteres.length}</span>
              )}
            </h2>
            <ArchivosSala
              salaSlug={slug}
              categoria="interes"
              archivos={archivosDeInteres}
              equipo={equipo}
              registrarAction={registrarArchivoAction}
              editarAction={editarArchivoAction}
              eliminarAction={eliminarArchivoAction}
            />
          </section>
        )}

        {/* Compartir la sala con su director. Solo lo ve el equipo. */}
        {equipo && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              <IconoSeccion nombre="clave" />
              Acceso del director
            </h2>
            <ClaveDeSala
              nombreSala={s.nombre}
              tiene={clave.tiene}
              creadaEn={clave.creadaEn}
              regenerarAction={regenerarClaveAction}
              quitarAction={quitarClaveAction}
            />

            {/* El link firmado sigue existiendo, DENTRO de la misma tarjeta:
                las dos son la misma pregunta —cómo entra el director— y
                separarlas en dos secciones las hacía parecer dos temas. */}
            {tokenDeAcceso && (
            <div className={estilos.acceso} style={{ marginTop: '0.9rem' }}>
              <div className={estilos.accesoTexto}>
                <div className={estilos.accesoTitulo}>Link de solo lectura para {s.nombre}</div>
                <p className={estilos.accesoNota}>
                  Quien tenga este link entra a esta sala —y solo a esta— sin clave: compártelo por
                  canal privado. Caduca en 30 días y no permite mover acuerdos.
                </p>
              </div>
              <CopiarBoton
                texto={`${await urlBase()}/sala/${slug}?acceso=${tokenDeAcceso}`}
                className={estilos.accesoBoton}
              />
            </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
