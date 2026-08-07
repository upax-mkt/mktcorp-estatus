import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { obtenerBenchmark } from '@/db/benchmark'
import { resumirBenchmark, type NivelBenchmark } from '@/dominio/benchmark'
import { puedeVerEstaSala } from '@/auth/sesion'
import { fechaCompleta } from '@/lib/fecha'

export const dynamic = 'force-dynamic'

/**
 * El benchmark competitivo de una sala, entero, en formato web.
 *
 * Mismo lenguaje que el documento de una sesión —encabezado de marca, la
 * conclusión arriba, la evidencia debajo— porque es lo mismo: material que se
 * enseña a un director. La diferencia es que no nace de una sesión: vive a
 * nivel de sala y se actualiza cuando llega un análisis nuevo.
 *
 * La conclusión va PRIMERO y la matriz después. Al revés, el director estudia
 * treinta etiquetas antes de saber qué se concluye de ellas.
 */

const ETIQUETA_NIVEL: Record<NivelBenchmark, string> = {
  lider: 'Líder',
  a_la_par: 'A la par',
  rezagado: 'Rezagado',
}

export default async function PagBenchmarkSala({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Misma guarda que /cliente/[slug]: contra las nueve salas reales, no
  // contra las diez filas de `salas` (grupo-upax tiene tema pero no es una
  // sala navegable). Ver slugsDeSalas(), src/db/temas.ts.
  const [slugsReales, registro] = await Promise.all([slugsDeSalas(), cargarTemas()])
  if (!slugsReales.includes(slug)) notFound()
  const tema = registro[slug]
  // La misma comprobación que la sala: pegada al dato, no en la puerta.
  if (!(await puedeVerEstaSala(slug))) notFound()

  const benchmark = await obtenerBenchmark(slug)
  if (!benchmark) notFound()

  const resumen = resumirBenchmark(benchmark)
  const estiloMarca = {
    '--marca': tema.primario,
    '--marca-texto': colorDeTextoDeMarca(tema.primario),
    '--gradiente': `linear-gradient(120deg, ${tema.gradiente.join(', ')})`,
    // El sólido validado del hero (auditoría UX/UI, hallazgo 4) — ver el
    // comentario de `.hero`/`.heroSolida` en cliente.module.css.
    '--hero-superficie': tema.superficieOscura,
    '--hero-texto': tema.textoSobreOscura,
  } as CSSProperties

  return (
    <div className={estilos.app} style={estiloMarca}>
      <header className={estilos.barra}>
        <Link href={`/cliente/${slug}`} className={estilos.volver}>← {tema.nombre}</Link>
        <div className={estilos.barraSala}>
          <span className={estilos.barraPunto} />
          Benchmark competitivo
        </div>
      </header>

      {/* El degradado de la marca, exacto y SIN texto encima —de verdad esta
          vez (auditoría UX/UI, hallazgo 4): este comentario ya lo decía, pero
          el kicker/nombre/cifras vivían dentro de `.hero`, heredando su
          `color:#fff` fijo pintado directo sobre el degradado — 3.9:1 contra
          el magenta de Zeus, por debajo del mínimo legible. Ahora son dos
          bandas: el degradado, vacío, y `.heroSolida` justo debajo con el
          texto sobre superficie validada (ver el comentario de
          `.hero`/`.heroSolida` en cliente.module.css). */}
      <div className={estilos.hero} aria-hidden="true" />
      <div className={estilos.heroSolida}>
        <div className={estilos.heroInner}>
          <div className={estilos.heroKicker}>Benchmark competitivo</div>
          <h1 className={estilos.heroNombre}>{tema.nombre}</h1>
          <div className={estilos.heroMeta}>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{benchmark.competidores.length}</span>
              <span className={estilos.heroMetaL}>competidores seguidos</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{resumen.lider} de {resumen.total}</span>
              <span className={estilos.heroMetaL}>dimensiones liderando</span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{fechaCompleta(benchmark.actualizado)}</span>
              <span className={estilos.heroMetaL}>última actualización</span>
            </div>
          </div>
        </div>
      </div>

      <main className={estilos.main}>
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>La lectura de Marketing Corp</h2>
          <p className={estilos.benchmarkLecturaGrande}>{benchmark.lectura}</p>
        </section>

        {resumen.brechas.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              Dónde hay brecha
              <span className={estilos.conteo}>{resumen.brechas.length}</span>
            </h2>
            <ul className={estilos.brechasLista}>
              {resumen.brechas.map((b) => (
                <li key={b} className={estilos.brechaItem}>{b}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Dimensión por dimensión
            <span className={estilos.conteo}>{tema.nombre} + {benchmark.competidores.length} competidores</span>
          </h2>
          <div className={estilos.benchmarkMatrizWrap}>
            <table className={estilos.benchmarkMatriz}>
              <thead>
                <tr>
                  <th className={estilos.benchmarkColDimension}>Dimensión</th>
                  <th className={`${estilos.benchmarkColUdn} ${estilos.benchmarkColUdnEtiqueta}`}>
                    {tema.nombre}
                  </th>
                  {benchmark.competidores.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benchmark.dimensiones.map((f) => (
                  <tr key={f.dimension}>
                    <td className={estilos.benchmarkFilaDimension}>{f.dimension}</td>
                    <td className={estilos.benchmarkColUdn}>
                      <span className={estilos.nivel} data-nivel={f.udn}>{ETIQUETA_NIVEL[f.udn]}</span>
                    </td>
                    {f.competidores.map((n, i) => (
                      <td key={i}>
                        <span className={estilos.nivel} data-nivel={n}>{ETIQUETA_NIVEL[n]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
