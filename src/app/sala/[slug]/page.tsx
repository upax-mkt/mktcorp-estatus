import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../sala.module.css'
import { obtenerTema, slugsDeSalas } from '@/temas'
import {
  estadoDeSala, acuerdosAbiertos, acuerdosVencidos, type Acuerdo,
} from '@/db/consultas'
import { moverEstatus, editarAcuerdo, type EstatusAcuerdo } from '@/db/acuerdos'
import { obtenerBenchmark } from '@/db/benchmark'
import { AcuerdoControles } from '@/componentes/AcuerdoControles'
import { BenchmarkSala } from '@/componentes/BenchmarkSala'

const FECHA = new Date('2026-07-24T12:00:00')

// La vista de equipo ahora escribe (cambiar estatus, editar fecha) — se
// necesita fresca en cada carga, no la copia estática que generateStaticParams
// precalcula. revalidatePath ya invalida esta ruta puntual tras cada acción;
// esto cubre además cualquier otra entrada (p. ej. abrir el link tras un
// deploy nuevo sin haber pasado por una acción).
export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return slugsDeSalas().map((slug) => ({ slug }))
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fechaBreve(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })
}
function textoUltima(dias: number | null): string {
  if (dias == null) return 'sin sesión aún'
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}
function textoFechaAcuerdo(a: Acuerdo): { txt: string; clase: string } {
  if (a.fechaCompromiso == null) return { txt: 'por definir', clase: 'pordef' }
  const d = new Date(a.fechaCompromiso)
  const txt = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return { txt, clase: a.estatus === 'vencido' ? 'vencida' : '' }
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
  const s = await estadoDeSala(slug)
  if (!s) notFound()
  const benchmark = await obtenerBenchmark(slug)

  // ---- Server actions: acuerdos editables (spec §4/§6, tarea "Acuerdos editables") ----
  // Solo el equipo Mkt Corp debería llegar aquí (spec §4: "Solo el equipo Mkt
  // Corp mueve el estatus"); sin auth todavía (ver AcuerdoControles.tsx), la
  // protección real queda pendiente de la tarea de Login SSO.

  async function cambiarEstatusAction(acuerdoId: string, estatus: EstatusAcuerdo) {
    'use server'
    await moverEstatus(acuerdoId, estatus)
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  async function editarFechaAction(acuerdoId: string, fecha: string | null) {
    'use server'
    await editarAcuerdo(acuerdoId, { fechaCompromiso: fecha ? new Date(fecha) : null })
    revalidatePath(`/sala/${slug}`)
    revalidatePath('/')
  }

  const estiloMarca = {
    '--marca': tema.primario,
    '--gradiente': `linear-gradient(120deg, ${tema.gradiente.join(', ')})`,
  } as CSSProperties

  const abiertos = acuerdosAbiertos(s)
  const vencidos = acuerdosVencidos(s)
  const presReciente = s.presentaciones[0]
  const presAnteriores = s.presentaciones.slice(1)

  return (
    <div className={estilos.app} style={estiloMarca}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Salas</Link>
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
              <span className={estilos.heroMetaV}>{textoUltima(s.diasDesdeUltima)}</span>
              <span className={estilos.heroMetaL}>última sesión</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>
                {s.proximaSesion ? fechaCorta(s.proximaSesion) : 'por agendar'}
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
          {s.acuerdos.length === 0 ? (
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
                      {/* Equipo Mkt Corp: siempre visibles hoy (sin auth aún, ver AcuerdoControles.tsx) */}
                      <AcuerdoControles
                        acuerdoId={a.id}
                        estatusInicial={a.estatus}
                        fechaInicial={a.fechaCompromiso}
                        cambiarEstatusAction={cambiarEstatusAction}
                        editarFechaAction={editarFechaAction}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Presentaciones */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Presentaciones</h2>
          {presReciente && (
            <Link href={`/demo/${slug}`} className={estilos.presDestacada}>
              <div>
                <div className={estilos.presTag}>Más reciente</div>
                <h3 className={estilos.presTitulo}>{presReciente.titulo}</h3>
                <div className={estilos.presFecha}>{fechaCorta(presReciente.fecha)}</div>
              </div>
              <span className={estilos.presVer}>Ver presentación →</span>
            </Link>
          )}
          {presAnteriores.length > 0 && (
            <div className={estilos.presTimeline}>
              {presAnteriores.map((p) => (
                <div key={p.fecha} className={estilos.presFila}>
                  <span className={estilos.presFilaTitulo}>{p.titulo}</span>
                  <span className={estilos.presFilaFecha}>{fechaBreve(p.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Minutas */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Minutas</h2>
          <div className={estilos.minutas}>
            {s.minutas.map((m) => (
              <div key={m.fecha} className={estilos.minuta}>
                <div className={estilos.minutaIzq}>
                  <span className={estilos.minutaIcono}>▤</span>
                  <span>{m.titulo}</span>
                </div>
                <span className={estilos.minutaEnviada}>{fechaBreve(m.fecha)} · enviada a {m.enviadaA}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Benchmark competitivo — vive a nivel de sala, se nutre en el tiempo (spec §5) */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Benchmark competitivo
            {benchmark && <span className={estilos.conteo}>{s.nombre} + {benchmark.competidores.length} competidores</span>}
          </h2>
          <BenchmarkSala benchmark={benchmark} nombreSala={s.nombre} />
        </section>
      </main>
    </div>
  )
}
