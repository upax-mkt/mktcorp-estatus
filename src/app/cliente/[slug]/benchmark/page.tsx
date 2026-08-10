import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import estilos from '../../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { obtenerBenchmark } from '@/db/benchmark'
import { resumirBenchmark, type AmenazaBenchmark, type NivelBenchmark } from '@/dominio/benchmark'
import { puedeVerEstaSala } from '@/auth/sesion'
import { fechaCompleta } from '@/lib/fecha'

export const dynamic = 'force-dynamic'

/**
 * El benchmark competitivo de una sala, entero, en formato web.
 *
 * Mismo lenguaje que el documento de una reunión —encabezado de marca, la
 * conclusión arriba, la evidencia debajo— porque es lo mismo: material que se
 * enseña a un director. La diferencia es que no nace de una reunión: vive a
 * nivel de sala y se actualiza cuando llega un análisis nuevo.
 *
 * EL ORDEN ES EL ARGUMENTO, y por eso no es el del PDF de origen:
 *
 *   1. La TESIS. Una frase. Si el director solo lee esto, ya sabe la posición.
 *   2. La LECTURA de Mkt Corp: el párrafo que sostiene la tesis.
 *   3. QUIÉN APRIETA: los competidores, ordenados por amenaza, cada uno con su
 *      fortaleza real y —lo que de verdad se usa en una reunión— dónde se le
 *      gana. Antes esto era una fila de cinco nombres sueltos.
 *   4. La MATRIZ, dimensión por dimensión, con la nota que justifica el nivel.
 *      Va después: treinta etiquetas antes de la conclusión es un examen.
 *   5. QUÉ HACER. Un benchmark que no termina en acciones es un informe.
 *
 * Las brechas ya no van en una sección propia: eran las mismas dimensiones de
 * la matriz repetidas doce líneas antes, y repetir no es jerarquizar. Ahora se
 * resumen en la cabecera y se leen en su fila.
 */

const ETIQUETA_NIVEL: Record<NivelBenchmark, string> = {
  lider: 'Líder',
  a_la_par: 'A la par',
  rezagado: 'Rezagado',
}

const ETIQUETA_AMENAZA: Record<AmenazaBenchmark, string> = {
  alta: 'Amenaza alta',
  media: 'Amenaza media',
  baja: 'Amenaza baja',
}

/** Alta primero: es el orden en que se prepara una reunión comercial. */
const PESO_AMENAZA: Record<AmenazaBenchmark, number> = { alta: 0, media: 1, baja: 2 }

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
  // Copia antes de ordenar: `benchmark.competidores` marca el orden de las
  // COLUMNAS de la matriz, y reordenarlo en sitio desalinearía cada fila con
  // su competidor — el error que el tipo de cinco posiciones existe para
  // evitar.
  const porAmenaza = [...benchmark.competidores].sort(
    (a, b) => PESO_AMENAZA[a.amenaza] - PESO_AMENAZA[b.amenaza],
  )

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

      {/* El degradado de la marca, exacto y SIN texto encima (regla dura del
          brandbook): dos bandas, el degradado vacío y `.heroSolida` justo
          debajo con el texto sobre superficie validada. */}
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
              <span className={estilos.heroMetaV}>{resumen.rezagado}</span>
              <span className={estilos.heroMetaL}>
                {resumen.rezagado === 1 ? 'brecha por cerrar' : 'brechas por cerrar'}
              </span>
            </div>
            <div className={estilos.heroMetaItem}>
              <span className={estilos.heroMetaV}>{fechaCompleta(benchmark.actualizado)}</span>
              <span className={estilos.heroMetaL}>última actualización</span>
            </div>
          </div>
        </div>
      </div>

      <main className={estilos.main}>
        {/* 1. LA TESIS. Lo primero y lo más grande: es la única línea que un
            director tiene que poder repetir de memoria después de leer esto. */}
        {benchmark.tesis && (
          <section className={estilos.seccion}>
            <div className={estilos.bmTesis}>
              <p className={estilos.bmTesisTitular}>{benchmark.tesis.titular}</p>
              <div className={estilos.bmTesisCaras}>
                <div className={estilos.bmTesisCara} data-lado="ellos">
                  <span className={estilos.bmTesisEtiqueta}>La competencia vende</span>
                  <p>{benchmark.tesis.ellosVenden}</p>
                </div>
                <div className={estilos.bmTesisCara} data-lado="nosotros">
                  <span className={estilos.bmTesisEtiqueta}>{tema.nombre} vende</span>
                  <p>{benchmark.tesis.nosotrosVendemos}</p>
                </div>
              </div>
              <p className={estilos.bmTesisSustento}>{benchmark.tesis.sustento}</p>
            </div>
          </section>
        )}

        {/* 2. La lectura de Mkt Corp. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>La lectura de Marketing Corp</h2>
          <p className={estilos.benchmarkLecturaGrande}>{benchmark.lectura}</p>
        </section>

        {/* 3. Quién aprieta y por dónde se le gana. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Quién aprieta
            {resumen.amenazasAltas.length > 0 && (
              <span className={estilos.conteo}>
                {resumen.amenazasAltas.length} de amenaza alta
              </span>
            )}
          </h2>
          <ul className={estilos.bmCompetidores}>
            {porAmenaza.map((c) => (
              <li key={c.nombre} className={estilos.bmCompetidor} data-amenaza={c.amenaza}>
                <div className={estilos.bmCompetidorCabeza}>
                  <span className={estilos.bmCompetidorNombre}>{c.nombre}</span>
                  <span className={estilos.bmAmenaza} data-amenaza={c.amenaza}>
                    {ETIQUETA_AMENAZA[c.amenaza]}
                  </span>
                </div>
                <p className={estilos.bmCompetidorLinea}>
                  <span className={estilos.bmCompetidorEtiqueta}>Su fortaleza</span>
                  {c.fortaleza}
                </p>
                <p className={estilos.bmCompetidorLinea} data-tono="gana">
                  <span className={estilos.bmCompetidorEtiqueta}>Dónde se le gana</span>
                  {c.dondeSeLeGana}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. La matriz. La evidencia, después de la conclusión. */}
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
                    <th key={c.nombre}>{c.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benchmark.dimensiones.map((f) => (
                  <tr key={f.dimension}>
                    <td className={estilos.benchmarkFilaDimension}>
                      {f.dimension}
                      {/* La nota justifica el nivel EN SU FILA. Fuera de aquí
                          obliga a recordar qué decía la casilla de arriba. */}
                      {f.nota && <span className={estilos.bmNotaFila}>{f.nota}</span>}
                    </td>
                    <td className={estilos.benchmarkColUdn}>
                      <span className={estilos.nivel} data-nivel={f.udn}>{ETIQUETA_NIVEL[f.udn]}</span>
                    </td>
                    {f.competidores.map((n, i) => (
                      <td key={benchmark.competidores[i].nombre}>
                        <span className={estilos.nivel} data-nivel={n}>{ETIQUETA_NIVEL[n]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Qué hacer. Un benchmark que no termina en acciones es un informe. */}
        {benchmark.recomendaciones && benchmark.recomendaciones.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              Qué hacer
              <span className={estilos.conteo}>en orden de impacto</span>
            </h2>
            <ol className={estilos.bmRecomendaciones}>
              {benchmark.recomendaciones.map((r) => (
                <li key={r.que} className={estilos.bmRecomendacion}>
                  <span className={estilos.bmRecomendacionQue}>{r.que}</span>
                  <span className={estilos.bmRecomendacionPorque}>{r.porque}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {benchmark.fuente && (
          <p className={estilos.bmFuente}>
            {benchmark.fuente} · actualizado el {fechaCompleta(benchmark.actualizado)}
          </p>
        )}
      </main>
    </div>
  )
}
