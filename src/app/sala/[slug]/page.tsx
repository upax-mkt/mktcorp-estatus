import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../sala.module.css'
import { obtenerTema, slugsDeSalas } from '@/temas'
import {
  estadoDeSala, acuerdosAbiertos, acuerdosVencidos, type Acuerdo,
} from '@/db/consultas'
import { sesionesSinMinuta } from '@/dominio/salas'
import { moverEstatus, editarAcuerdo, crearAcuerdo, eliminarAcuerdo, type EstatusAcuerdo } from '@/db/acuerdos'
import { obtenerBenchmark } from '@/db/benchmark'
import {
  listarArchivos, registrarArchivo, editarArchivo, eliminarArchivo, type CategoriaArchivo,
} from '@/db/archivos'
import { del } from '@vercel/blob'
import { AcuerdoControles } from '@/componentes/AcuerdoControles'
import { NuevoAcuerdoForm } from '@/componentes/NuevoAcuerdoForm'
import { BenchmarkSala } from '@/componentes/BenchmarkSala'
import { MinutasSala } from '@/componentes/MinutasSala'
import { NuevaMinutaSala } from '@/componentes/NuevaMinutaSala'
import { ArchivosSala } from '@/componentes/ArchivosSala'
import { fechaBreve, fechaBreveConAnio, fechaCompleta, textoDiasDesde } from '@/lib/fecha'
import { esEquipo, exigirEquipo, generarTokenDeSala, puedeVerEstaSala } from '@/auth/sesion'
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
  const [benchmark, equipo, archivosPresentaciones, archivosDeInteres] = await Promise.all([
    obtenerBenchmark(slug),
    esEquipo(),
    listarArchivos(slug, 'presentacion'),
    listarArchivos(slug, 'interes'),
  ])
  const tokenDeAcceso = equipo ? await generarTokenDeSala(slug) : null

  // ---- Server actions: acuerdos editables (spec §4/§6) ----
  // "Solo el equipo Mkt Corp mueve el estatus": cada acción lo exige por su
  // cuenta. Ocultar los controles en la UI no basta — una Server Action es un
  // endpoint, y quien tenga su id puede llamarla sin pasar por la pantalla.

  async function cambiarEstatusAction(acuerdoId: string, estatus: EstatusAcuerdo) {
    'use server'
    await exigirEquipo()
    await moverEstatus(acuerdoId, estatus)
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  async function editarFechaAction(acuerdoId: string, fecha: string | null) {
    'use server'
    await exigirEquipo()
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
    await exigirEquipo()
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
    await exigirEquipo()
    await eliminarAcuerdo(acuerdoId)
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
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
  const presReciente = s.presentaciones[0]
  const presAnteriores = s.presentaciones.slice(1)

  const pendientesDeMinuta = sesionesSinMinuta(s)

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
        <div className={estilos.barraSala}>
          <span className={estilos.barraPunto} />
          {s.nombre}
        </div>
      </header>

      {/* Encabezado vestido de la marca de la UDN */}
      <div className={estilos.hero}>
        <div className={estilos.heroInner}>
          <div className={estilos.heroKicker}>Sala · Marketing Corp</div>
          <h1 className={estilos.heroNombre}>{s.nombre}</h1>
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
                      {equipo && (
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
          {equipo && <NuevoAcuerdoForm crearAction={crearAcuerdoAction} />}
        </section>

        {/* Presentaciones — las armadas en la app y las antiguas subidas */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Presentaciones</h2>
          {/* Enlaza a la sesión REAL. Una presentación sin `sesionId` es de
              los datos de ejemplo (sin DB): se muestra sin enlace en vez de
              llevar a un documento que no existe. */}
          {presReciente && presReciente.sesionId && (
            <Link href={`/sesion/${presReciente.sesionId}`} className={estilos.presDestacada}>
              <div>
                <div className={estilos.presTag}>Más reciente</div>
                <h3 className={estilos.presTitulo}>{presReciente.titulo}</h3>
                <div className={estilos.presFecha}>{fechaCompleta(presReciente.fecha)}</div>
              </div>
              <span className={estilos.presVer}>Ver presentación →</span>
            </Link>
          )}
          {presAnteriores.length > 0 && (
            <div className={estilos.presTimeline}>
              {presAnteriores.map((p) => (
                <Link
                  key={p.sesionId ?? p.fecha}
                  href={p.sesionId ? `/sesion/${p.sesionId}` : '#'}
                  className={estilos.presFila}
                >
                  <span className={estilos.presFilaTitulo}>{p.titulo}</span>
                  <span className={estilos.presFilaFecha}>{fechaBreveConAnio(p.fecha)}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Las anteriores a esta herramienta: archivos, no documentos web.
              Van en la misma sección porque para el director son lo mismo —
              "las presentaciones de mi sala"—, con su propio subtítulo para
              que se entienda por qué unas se abren y otras se descargan. */}
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

        {/* Minutas */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Minutas
            {s.minutas.length > 0 && <span className={estilos.conteo}>{s.minutas.length}</span>}
          </h2>
          <MinutasSala minutas={s.minutas} equipo={equipo} />
          {equipo && <NuevaMinutaSala sesiones={pendientesDeMinuta} />}
        </section>

        {/* Benchmark competitivo — vive a nivel de sala, se nutre en el tiempo (spec §5) */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Benchmark competitivo
            {benchmark && <span className={estilos.conteo}>{s.nombre} + {benchmark.competidores.length} competidores</span>}
          </h2>
          <BenchmarkSala benchmark={benchmark} nombreSala={s.nombre} />
        </section>

        {/* Archivos de interés — al final, como los pidió Franco: lo que el
            equipo estime conveniente tener a mano en la sala. */}
        {(archivosDeInteres.length > 0 || equipo) && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
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
        {equipo && tokenDeAcceso && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>Acceso del director</h2>
            <div className={estilos.acceso}>
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
          </section>
        )}
      </main>
    </div>
  )
}
