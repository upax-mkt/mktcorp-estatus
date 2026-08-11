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
import { Grafico } from '@/componentes/graficos/Grafico'
import { ProveedorTema } from '@/componentes/ProveedorTema'

export const dynamic = 'force-dynamic'

/**
 * El benchmark competitivo de una sala, entero, en formato web.
 *
 * QUIÉN LO ABRE Y PARA QUÉ decide el orden. No lo lee un analista: lo lee el
 * director de la UDN y su equipo comercial, muchas veces la víspera de una
 * reunión con un prospecto. Así que el documento va de lo que se usa de pie a
 * lo que se estudia sentado:
 *
 *   1. CUATRO CIFRAS. Lo que se lee antes de entrar a nada.
 *   2. LA TESIS. Una frase. Si solo se lee esto, ya se sabe la posición.
 *   3. RESUMEN EJECUTIVO — breve. Se llamaba "La lectura de Marketing Corp",
 *      que decía quién escribe y no qué se lee.
 *   4. CONTRA QUIÉN COMPETIMOS. Cada competidor con su fortaleza, qué NO
 *      pelearle, dónde se le gana, sus cifras digitales y si contesta el
 *      teléfono. Es la ficha que se mira antes de entrar a la reunión.
 *   5. LA VENTANA. Dónde la categoría entera está floja, con evidencia.
 *   6. DÓNDE PROSPECTAR. El calendario por industria y mes, con su gancho.
 *      Es la pieza más operativa de todo esto.
 *   7. DIMENSIÓN POR DIMENSIÓN. La matriz: la evidencia, después de la
 *      conclusión. Treinta etiquetas antes de la tesis es un examen.
 *   8. QUÉ HACER. Un benchmark que no termina en acciones es un informe.
 *   9. CÓMO SE MUEVE EL MERCADO, con fuente externa: es lo único de esta
 *      página que no sale del análisis propio, y por eso va marcado y al
 *      final.
 */

const ETIQUETA_NIVEL: Record<NivelBenchmark, string> = {
  lider: 'Líder',
  solido: 'Sólido',
  basico: 'Básico',
  ausente: 'Ausente',
  sin_dato: 'Sin dato',
}

/** La definición de cada nivel, del propio análisis. Va en la leyenda. */
const QUE_SIGNIFICA: Record<NivelBenchmark, string> = {
  lider: 'Referente: marca el estándar que los demás deben superar',
  solido: 'Bien resuelto y competitivo; cumple el estándar de la categoría',
  basico: 'Existe, pero mínimo o incompleto; todavía no compite',
  ausente: 'Sin presencia detectable de esta capacidad',
  sin_dato: 'Aún no se ha cargado información para esa casilla',
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
  // Misma guarda que /cliente/[slug]: contra las nueve salas reales.
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
  // su competidor — el error que el tipo de cinco posiciones evita.
  const porAmenaza = [...benchmark.competidores].sort(
    (a, b) => PESO_AMENAZA[a.amenaza] - PESO_AMENAZA[b.amenaza],
  )

  const estiloMarca = {
    '--marca': tema.primario,
    '--marca-texto': colorDeTextoDeMarca(tema.primario),
    '--gradiente': `linear-gradient(120deg, ${tema.gradiente.join(', ')})`,
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

      {/* El degradado de marca, exacto y SIN texto encima (regla dura del
          brandbook): dos bandas, el degradado vacío y la sólida debajo. */}
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
              <span className={estilos.heroMetaV}>{fechaCompleta(benchmark.actualizado)}</span>
              <span className={estilos.heroMetaL}>última actualización</span>
            </div>
          </div>
        </div>
      </div>

      <main className={estilos.main}>
        {/* 1. LAS CIFRAS. Lo primero, porque es lo único que se lee de pie. */}
        {benchmark.indicadores && benchmark.indicadores.length > 0 && (
          <ul className={estilos.bmIndicadores}>
            {benchmark.indicadores.map((ind) => (
              <li key={ind.rotulo} className={estilos.bmIndicador} data-tono={ind.tono}>
                <span className={estilos.bmIndicadorValor}>{ind.valor}</span>
                <span className={estilos.bmIndicadorRotulo}>{ind.rotulo}</span>
                <span className={estilos.bmIndicadorLectura}>{ind.lectura}</span>
              </li>
            ))}
          </ul>
        )}

        {/* 2. LA TESIS. */}
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

        {/* 3. RESUMEN EJECUTIVO — breve. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Resumen ejecutivo</h2>
          <p className={estilos.benchmarkLecturaGrande}>{benchmark.lectura}</p>
        </section>

        {/* 4. CONTRA QUIÉN COMPETIMOS — la ficha de reunión. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Contra quién competimos
            {resumen.amenazasAltas.length > 0 && (
              <span className={estilos.conteo}>{resumen.amenazasAltas.length} de amenaza alta</span>
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
                <p className={estilos.bmCompetidorLinea} data-tono="cuidado">
                  <span className={estilos.bmCompetidorEtiqueta}>No pelear aquí</span>
                  {c.nosGanaEn}
                </p>
                {c.fortalezaInvisible && (
                  <p className={estilos.bmCompetidorLinea} data-tono="invisible">
                    <span className={estilos.bmCompetidorEtiqueta}>Su fortaleza invisible</span>
                    {c.fortalezaInvisible}
                  </p>
                )}
                <p className={estilos.bmCompetidorLinea} data-tono="gana">
                  <span className={estilos.bmCompetidorEtiqueta}>Dónde se le gana</span>
                  {c.dondeSeLeGana}
                </p>

                {c.digital && c.digital.length > 0 && (
                  <dl className={estilos.bmCifrasCompetidor}>
                    {c.digital.map((d) => (
                      <div key={d.rotulo}>
                        <dt>{d.rotulo}</dt>
                        <dd>{d.valor}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {c.contactabilidad && (
                  <div className={estilos.bmContacto} data-respondio={c.contactabilidad.velocidad === 'Sin respuesta' ? 'no' : 'si'}>
                    <span className={estilos.bmCompetidorEtiqueta}>Al contactarlos</span>
                    <p>
                      <strong>{c.contactabilidad.velocidad}</strong>
                      {c.contactabilidad.velocidad !== 'Sin respuesta' && <> · {c.contactabilidad.calidad} · {c.contactabilidad.informacion}</>}
                    </p>
                    <p className={estilos.bmContactoImplicacion}>{c.contactabilidad.implicacion}</p>
                  </div>
                )}

                <div className={estilos.bmCompetidorPie}>
                  {c.medicion && <span><strong>Mide con:</strong> {c.medicion}</span>}
                  {c.paid && <span><strong>Paid media:</strong> {c.paid}</span>}
                  {c.inbound && <span><strong>Inbound:</strong> {c.inbound}</span>}
                  {c.institucional && <span><strong>Institucional:</strong> {c.institucional}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. LA VENTANA. */}
        {benchmark.frentesAbiertos && benchmark.frentesAbiertos.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              Dónde la categoría entera está floja
              <span className={estilos.conteo}>la ventana, y es temporal</span>
            </h2>
            <ul className={estilos.bmFrentes}>
              {benchmark.frentesAbiertos.map((f) => (
                <li key={f.frente} className={estilos.bmFrente}>
                  <span className={estilos.bmFrenteNombre}>{f.frente}</span>
                  <span className={estilos.bmFrenteEvidencia}>{f.evidencia}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* LOS GRÁFICOS del análisis, reconstruidos como datos. Van antes de
            las tablas: una forma se lee de un vistazo y una tabla se estudia. */}
        {benchmark.graficos && benchmark.graficos.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              Dónde está cada uno
              <span className={estilos.conteo}>los dos ejes de la pelea digital</span>
            </h2>
            {/* El MISMO proveedor de tema que el documento: sin él los gráficos
                salen sin los tokens `--dato-N` y las series pierden color. */}
            <ProveedorTema tema={tema} superficie="clara">
              <div className={estilos.bmGraficos}>
                {benchmark.graficos.map((g) => (
                  <figure key={g.grafico.titulo ?? g.grafico.periodos.join()} className={estilos.bmGrafico}>
                    <Grafico grafico={g.grafico} alto={280} />
                    {g.lectura && <figcaption>{g.lectura}</figcaption>}
                  </figure>
                ))}
              </div>
            </ProveedorTema>
          </section>
        )}

        {/* 7. LAS CIFRAS DURAS. Antes de la matriz: un número se cita en una
            reunión, una etiqueta no. */}
        {benchmark.comparativa && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              {benchmark.comparativa.titulo}
              <span className={estilos.conteo}>{benchmark.comparativa.filas.length} criterios</span>
            </h2>
            <div className={estilos.benchmarkMatrizWrap}>
              <table className={estilos.benchmarkMatriz}>
                <thead>
                  <tr>
                    <th className={estilos.benchmarkColDimension}>Criterio</th>
                    <th className={`${estilos.benchmarkColUdn} ${estilos.benchmarkColUdnEtiqueta}`}>
                      {tema.nombre}
                    </th>
                    {benchmark.competidores.map((c) => <th key={c.nombre}>{c.nombre}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {benchmark.comparativa.filas.map((f) => (
                    <tr key={f.criterio}>
                      <td className={estilos.benchmarkFilaDimension}>{f.criterio}</td>
                      <td className={estilos.benchmarkColUdn} data-gana={f.ganaLaUdn ? 'true' : undefined}>
                        <span className={estilos.bmCifraTabla}>{f.udn}</span>
                      </td>
                      {f.valores.map((v, i) => (
                        <td key={benchmark.competidores[i].nombre}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {benchmark.comparativa.notaPie && (
              <p className={estilos.bmNotaTabla}>{benchmark.comparativa.notaPie}</p>
            )}
            {benchmark.comparativa.fuente && (
              <p className={estilos.bmFuente}>Fuente: {benchmark.comparativa.fuente}</p>
            )}
          </section>
        )}

        {/* 8. LA MATRIZ DE POSICIONAMIENTO, en la escala de cuatro niveles del
            propio análisis. */}
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>
            Matriz de posicionamiento
            <span className={estilos.conteo}>
              {resumen.lider} líder · {resumen.solido} sólido · {resumen.basico + resumen.ausente} por detrás
            </span>
          </h2>
          <div className={estilos.benchmarkMatrizWrap}>
            <table className={estilos.benchmarkMatriz}>
              <thead>
                <tr>
                  <th className={estilos.benchmarkColDimension}>Variable</th>
                  <th className={`${estilos.benchmarkColUdn} ${estilos.benchmarkColUdnEtiqueta}`}>
                    {tema.nombre}
                  </th>
                  {benchmark.competidores.map((c) => <th key={c.nombre}>{c.nombre}</th>)}
                </tr>
              </thead>
              <tbody>
                {benchmark.matriz.map((f) => (
                  <tr key={f.variable}>
                    <td className={estilos.benchmarkFilaDimension}>
                      {f.variable}
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
          {/* La leyenda con la definición de cada nivel: sin ella, "Sólido" y
              "Básico" son dos palabras cualquiera. Sale del propio análisis. */}
          <ul className={estilos.bmLeyendaNiveles}>
            {(['lider', 'solido', 'basico', 'ausente'] as const).map((n) => (
              <li key={n}>
                <span className={estilos.nivel} data-nivel={n}>{ETIQUETA_NIVEL[n]}</span>
                {QUE_SIGNIFICA[n]}
              </li>
            ))}
          </ul>
        </section>

        {/* 8. QUÉ HACER. */}
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

        {/* LOS TESTIGOS: las láminas que valen porque se ven. */}
        {benchmark.testigos && benchmark.testigos.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              La evidencia
              <span className={estilos.conteo}>láminas del análisis</span>
            </h2>
            <ul className={estilos.bmTestigos}>
              {benchmark.testigos.map((t) => (
                <li key={t.url} className={estilos.bmTestigo}>
                  <a href={t.url} target="_blank" rel="noopener" className={estilos.bmTestigoImagen}>
                    {/* `img` a pelo y no `next/image`: sale de /api/archivo/[id],
                        que es dinámica y privada — optimizarla en el servidor
                        obligaría a descargarla en cada render. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.url} alt={t.titulo} loading="lazy" />
                  </a>
                  <div className={estilos.bmTestigoTexto}>
                    <span className={estilos.bmTestigoTitulo}>{t.titulo}</span>
                    {t.bloque && <span className={estilos.bmTestigoBloque}>{t.bloque}</span>}
                    <p>{t.lectura}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 9. EL MERCADO. Lo único que NO sale del análisis propio: va
            marcado con su fuente, al final, para que nadie lo confunda con
            una medición nuestra. */}
        {benchmark.mercado && benchmark.mercado.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              Cómo se mueve el mercado
              <span className={estilos.conteo}>fuentes externas</span>
            </h2>
            <ul className={estilos.bmMercado}>
              {benchmark.mercado.map((m) => (
                <li key={m.fuente + m.dato.slice(0, 20)}>
                  {m.dato} <span className={estilos.bmFuenteDato}>{m.fuente}</span>
                </li>
              ))}
            </ul>
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
