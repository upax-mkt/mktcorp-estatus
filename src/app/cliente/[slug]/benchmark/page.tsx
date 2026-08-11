import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import type { CSSProperties } from 'react'
import estilos from '../../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { obtenerBenchmark } from '@/db/benchmark'
import {
  agruparPorDisciplina,
  resumirBenchmark,
  DISCIPLINAS,
  type AmenazaBenchmark,
  type BloqueDisciplina,
  type Benchmark,
  type NivelBenchmark,
} from '@/dominio/benchmark'
import { evidenciaDeSala, evidenciaDelBloque } from '@/db/evidencia'
import { registrarArchivo, eliminarArchivo } from '@/db/archivos'
import { puedeVerEstaSala } from '@/auth/sesion'
import { esEditor, exigirEditor } from '@/auth/roles'
import { normalizarEnlace } from '@/lib/materiales'
import { fechaCompleta } from '@/lib/fecha'
import { Grafico } from '@/componentes/graficos/Grafico'
import { IconoBenchmark, type IconoBench } from '@/componentes/IconoBenchmark'
import { EvidenciaBenchmark } from '@/componentes/EvidenciaBenchmark'
import { ProveedorTema } from '@/componentes/ProveedorTema'

export const dynamic = 'force-dynamic'

/**
 * El benchmark competitivo de una sala, entero, en formato web.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTÁ ORDENADO POR DISCIPLINA Y NO POR TIPO DE CONTENIDO.
 *
 * Antes iba por tipo: todas las fichas juntas, todos los gráficos juntos,
 * todas las tablas juntas, toda la evidencia al final. Franco: *"la info no
 * está bien clusterizada — por ejemplo RRSS, Paid, PR, WEB, etc"*. El síntoma
 * era este: para contestar "¿cómo pauta la categoría?" había que leer un
 * frente abierto arriba, abrir cinco desplegables en cinco fichas distintas,
 * bajar a los gráficos a ver si alguno era de paid y llegar al final a mirar
 * las capturas. Cuatro sitios para una pregunta.
 *
 * Ahora el eje es la DISCIPLINA, y cada bloque contesta su pregunta entero:
 * el veredicto, los seis actores comparados, sus cifras, su gráfico y la
 * evidencia que lo sostiene. Se puede leer un bloque y cerrar la página.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EL ORDEN, que sale de quién lo abre: el director de la UDN y su equipo
 * comercial, muchas veces la víspera de una reunión.
 *
 *   1. CUATRO CIFRAS. Lo que se lee de pie.
 *   2. LA TESIS. Si solo se lee esto, ya se sabe la posición.
 *   3. LA VENTANA. Dónde la categoría entera está floja, con salto a su
 *      bloque. Es la lectura más rentable del análisis.
 *   4. CONTRA QUIÉN COMPETIMOS. La ficha que se mira antes de entrar.
 *   5. DISCIPLINA POR DISCIPLINA. El cuerpo: seis bloques autocontenidos.
 *   6. QUÉ HACER. Un benchmark que no termina en acciones es un informe.
 *   7. CÓMO SE MUEVE EL MERCADO: lo único que no sale del análisis propio,
 *      marcado con su fuente y al final para que nadie lo confunda.
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

/**
 * El bloque lo manda el cliente: tiene que ser uno de los que existen.
 *
 * A NIVEL DE MÓDULO, NO DENTRO DE LA PÁGINA, y esto no es estilo. Declarada
 * dentro del componente, las tres Server Actions que la llaman se la llevan en
 * su cierre, y React intenta serializarla al mandarlas al cliente: "Functions
 * cannot be passed directly to Client Components… [function bloqueValido]", y
 * la página entera cae con un 500. Aquí no forma parte de ningún cierre: es
 * una referencia de módulo que el servidor resuelve sola.
 */
function bloqueValido(bloque: string): boolean {
  return DISCIPLINAS.some((d) => d.id === bloque)
}

/**
 * Cuándo contestaron, sin el calificativo que lleva delante.
 *
 * El análisis escribe la velocidad de dos formas: "3 días después" a secas y
 * "Baja: 1 semana y 3 días después". Concatenar la segunda tal cual daba
 * "Contestaron baja: 1 semana y 3 días después". El calificativo ya se lee en
 * el bloque Comercial, que es donde se comparan los cinco.
 */
function cuandoContestaron(velocidad: string): string {
  const dosPuntos = velocidad.indexOf(':')
  return (dosPuntos >= 0 ? velocidad.slice(dosPuntos + 1) : velocidad).trim()
}

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

  const [evidencia, equipo] = await Promise.all([evidenciaDeSala(slug), esEditor()])

  const resumen = resumirBenchmark(benchmark)
  const bloques = agruparPorDisciplina(benchmark)
  const ventanas = bloques.filter((b) => b.ventana)
  // Copia antes de ordenar: `benchmark.competidores` marca el orden de las
  // COLUMNAS de la matriz, y reordenarlo en sitio desalinearía cada fila con
  // su competidor — el error que el tipo de cinco posiciones evita.
  const porAmenaza = [...benchmark.competidores].sort(
    (a, b) => PESO_AMENAZA[a.amenaza] - PESO_AMENAZA[b.amenaza],
  )

  // ---- Server actions: la evidencia que carga el equipo ----
  //
  // Cada una repite su comprobación de permiso. Esconder el formulario no
  // protege nada: una Server Action es un endpoint, y quien conozca su id
  // puede llamarla sin pasar por esta pantalla.
  //
  // Y ninguna es una flecha inline en el JSX aunque las seis instancias del
  // módulo necesiten un `bloque` distinto: un closure creado aquí no
  // atraviesa la frontera hacia un componente cliente ("Functions cannot be
  // passed directly to Client Components") y tumba la página entera con un
  // 500. El `bloque` viaja como argumento y lo valida `bloqueValido`, que por
  // ese mismo motivo vive a nivel de módulo — ver su comentario.

  async function subirEvidenciaAction(datos: {
    bloque: string
    titulo: string
    lectura: string
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    if (!bloqueValido(datos.bloque)) {
      // El binario ya subió (navegador → Blob directo): sin fila que lo
      // registre es basura invisible que se sigue pagando.
      await del(datos.ruta).catch(() => {})
      return { error: 'Esa disciplina no existe en el benchmark.' }
    }
    if (datos.lectura.trim().length === 0) {
      await del(datos.ruta).catch(() => {})
      return { error: 'Escribe qué hay que mirar en esta pieza.' }
    }
    try {
      await registrarArchivo({
        salaSlug: slug,
        categoria: 'evidencia',
        titulo: datos.titulo,
        fecha: null,
        ruta: datos.ruta,
        nombreOriginal: datos.nombreOriginal,
        bloque: datos.bloque,
        lectura: datos.lectura.trim(),
        tipoContenido: datos.tipoContenido,
        tamanoBytes: datos.tamanoBytes,
      })
    } catch (error) {
      await del(datos.ruta).catch(() => {})
      return { error: error instanceof Error ? error.message : 'No se pudo guardar la evidencia.' }
    }
    revalidatePath(`/cliente/${slug}/benchmark`)
    return {}
  }

  async function enlazarEvidenciaAction(datos: {
    bloque: string
    titulo: string
    lectura: string
    enlace: string
  }): Promise<{ error?: string }> {
    'use server'
    await exigirEditor()
    if (!bloqueValido(datos.bloque)) return { error: 'Esa disciplina no existe en el benchmark.' }
    if (datos.lectura.trim().length === 0) {
      return { error: 'Escribe qué hay que mirar en esta pieza.' }
    }
    // Se vuelve a normalizar EN EL SERVIDOR aunque el cliente ya lo hizo: lo
    // del navegador es comodidad, esto es la comprobación. Sin ella un
    // `javascript:` llega a la base y de ahí a un href que ve la UDN.
    const normalizado = normalizarEnlace(datos.enlace)
    if ('error' in normalizado) return { error: normalizado.error }
    try {
      await registrarArchivo({
        salaSlug: slug,
        categoria: 'evidencia',
        titulo: datos.titulo,
        fecha: null,
        enlace: normalizado.url,
        bloque: datos.bloque,
        lectura: datos.lectura.trim(),
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo guardar el enlace.' }
    }
    revalidatePath(`/cliente/${slug}/benchmark`)
    return {}
  }

  async function quitarEvidenciaAction(id: string): Promise<void> {
    'use server'
    await exigirEditor()
    // Franco: "si algo se elimina también se elimina del almacenamiento".
    // Primero la fila, luego el binario: al revés, un fallo al borrar el
    // archivo dejaría una fila apuntando a la nada. `ruta` es nula si la
    // pieza era un enlace, y `del(null)` sería un error donde no hay nada
    // que limpiar.
    const quitado = await eliminarArchivo(id)
    if (quitado?.ruta) await del(quitado.ruta).catch(() => {})
    revalidatePath(`/cliente/${slug}/benchmark`)
  }

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
              <p className={estilos.bmTesisTitular}>
                <IconoBenchmark nombre="tesis" className={estilos.bmTesisIcono} />
                {benchmark.tesis.titular}
              </p>
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
              {/* EL RESUMEN, DENTRO DE LA TESIS Y NO EN SU PROPIA TARJETA.
                  Eran dos bloques de prosa seguidos, cada uno con su título,
                  antes de llegar al primer competidor: parecían dos resúmenes
                  que había que reconciliar. La tesis es la declaración; esto
                  es su desarrollo, así que va debajo, sin encabezado. */}
              <p className={estilos.bmTesisResumen}>{benchmark.lectura}</p>
            </div>
          </section>
        )}

        {/* 3. LA VENTANA — y a la vez el índice del cuerpo de la página.
            No repite el veredicto (ese vive en su bloque): dice DÓNDE está la
            puerta abierta y lleva hasta ella de un clic. */}
        {ventanas.length > 0 && (
          <section className={estilos.seccion}>
            <h2 className={estilos.seccionTitulo}>
              <IconoBenchmark nombre="ventana" />
              Dónde la categoría entera está floja
              <span className={estilos.conteo}>{ventanas.length} de {bloques.length} disciplinas · es temporal</span>
            </h2>
            <ul className={estilos.bmVentanas}>
              {ventanas.map((b) => (
                <li key={b.id}>
                  <a href={`#d-${b.id}`} className={estilos.bmVentana}>
                    <IconoBenchmark nombre={b.id as IconoBench} />
                    <span className={estilos.bmVentanaNombre}>{b.nombre}</span>
                    <span className={estilos.bmVentanaPregunta}>{b.pregunta}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 4. CONTRA QUIÉN COMPETIMOS — la ficha de reunión. */}
        {/* `data-peso="alto"`: es la sección que de verdad se abre la víspera
            de una reunión. Sin una señal visual, el orden solo se nota si se
            lee todo — y quien tiene cinco minutos no lee todo. */}
        <section className={estilos.seccion} data-peso="alto">
          <h2 className={estilos.seccionTitulo}>
            <IconoBenchmark nombre="competidores" />
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

                {/* SOLO EL VEREDICTO DE LA PROSPECCIÓN, no la ficha entera.
                    Los tiempos, la calidad y qué mandaron viven en el bloque
                    Comercial, comparados con los otros cuatro — que es como se
                    leen. Aquí queda el dato que cambia cómo entras a la
                    reunión: si contesta o no. */}
                {c.contactabilidad && (
                  <p
                    className={estilos.bmCompetidorLinea}
                    data-tono={c.contactabilidad.velocidad === 'Sin respuesta' ? 'gana' : undefined}
                  >
                    <span className={estilos.bmCompetidorEtiqueta}>Al prospectarlos</span>
                    {c.contactabilidad.velocidad === 'Sin respuesta'
                      ? 'No contestaron'
                      : `Contestaron ${cuandoContestaron(c.contactabilidad.velocidad)}`}
                    {' · '}
                    <a href="#d-comercial" className={estilos.bmVerBloque}>ver el detalle</a>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 5. EL CUERPO: DISCIPLINA POR DISCIPLINA. */}
        {bloques.map((b) => (
          <Disciplina
            key={b.id}
            bloque={b}
            benchmark={benchmark}
            nombreUdn={tema.nombre}
            tema={tema}
            salaSlug={slug}
            equipo={equipo}
            piezas={evidenciaDelBloque(evidencia, b.id)}
            resumen={resumen}
            subirAction={subirEvidenciaAction}
            enlazarAction={enlazarEvidenciaAction}
            quitarAction={quitarEvidenciaAction}
          />
        ))}

        {/* 6. QUÉ HACER. */}
        {benchmark.recomendaciones && benchmark.recomendaciones.length > 0 && (
          <section className={estilos.seccion} data-peso="alto">
            <h2 className={estilos.seccionTitulo}>
              <IconoBenchmark nombre="acciones" />
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

        {/* 7. EL MERCADO. Lo único que NO sale del análisis propio: va
            marcado con su fuente, al final, para que nadie lo confunda con
            una medición nuestra. */}
        {benchmark.mercado && benchmark.mercado.length > 0 && (
          <section className={estilos.seccion} data-peso="referencia">
            <h2 className={estilos.seccionTitulo}>
              <IconoBenchmark nombre="mercado" />
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

/**
 * UN BLOQUE DE DISCIPLINA: la pregunta, el veredicto, los datos y la prueba.
 *
 * Todo lo que el análisis sabe de una disciplina, en el orden en que se
 * necesita: primero qué se concluye, después con qué se sostiene. Las tablas
 * que solo existen en una disciplina —la matriz en portafolio, la
 * contactabilidad en comercial— se dibujan aquí con un condicional en vez de
 * en su propia sección: sacarlas de su bloque es volver al problema de
 * origen, tener que buscar en otro sitio lo que responde a esta pregunta.
 */
function Disciplina({
  bloque,
  benchmark,
  nombreUdn,
  tema,
  salaSlug,
  equipo,
  piezas,
  resumen,
  subirAction,
  enlazarAction,
  quitarAction,
}: {
  bloque: BloqueDisciplina
  benchmark: Benchmark
  nombreUdn: string
  tema: Parameters<typeof ProveedorTema>[0]['tema']
  salaSlug: string
  equipo: boolean
  piezas: Awaited<ReturnType<typeof evidenciaDeSala>>
  resumen: ReturnType<typeof resumirBenchmark>
  subirAction: React.ComponentProps<typeof EvidenciaBenchmark>['subirAction']
  enlazarAction: React.ComponentProps<typeof EvidenciaBenchmark>['enlazarAction']
  quitarAction: React.ComponentProps<typeof EvidenciaBenchmark>['quitarAction']
}) {
  const esPortafolio = bloque.id === 'portafolio'
  const esComercial = bloque.id === 'comercial'
  // Un bloque sin nada que decir ni nada que enseñar no se dibuja: un
  // encabezado con un hueco debajo es peor que no estar.
  if (!bloque.veredicto && !bloque.tieneDatos && !esPortafolio && !esComercial && piezas.length === 0) {
    return null
  }

  return (
    <section className={estilos.bmDisciplina} id={`d-${bloque.id}`} data-bloque={bloque.id}>
      <div className={estilos.bmDisciplinaCabeza}>
        <span className={estilos.bmDisciplinaIcono}>
          <IconoBenchmark nombre={bloque.id as IconoBench} />
        </span>
        <div>
          <h2 className={estilos.bmDisciplinaNombre}>
            {bloque.nombre}
            {bloque.ventana && <span className={estilos.bmChipVentana}>Ventana abierta</span>}
          </h2>
          <p className={estilos.bmDisciplinaPregunta}>{bloque.pregunta}</p>
        </div>
      </div>

      {bloque.veredicto && <p className={estilos.bmVeredicto}>{bloque.veredicto}</p>}

      {/* LA MATRIZ vive dentro de portafolio: sus diez variables SON el
          portafolio —qué inventario y qué capacidades tiene cada uno—, y
          fuera de aquí era una tabla de treinta etiquetas sin pregunta. */}
      {esPortafolio && (
        <>
          <div className={estilos.bmSubtituloFila}>
            <IconoBenchmark nombre="matriz" />
            <h3 className={estilos.bmSubtitulo}>Matriz de posicionamiento</h3>
            <span className={estilos.conteo}>
              {resumen.lider} líder · {resumen.solido} sólido · {resumen.basico + resumen.ausente} por detrás
            </span>
          </div>
          <div className={estilos.benchmarkMatrizWrap}>
            <table className={estilos.benchmarkMatriz}>
              <thead>
                <tr>
                  <th className={estilos.benchmarkColDimension}>Variable</th>
                  <th className={`${estilos.benchmarkColUdn} ${estilos.benchmarkColUdnEtiqueta}`}>
                    {nombreUdn}
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
        </>
      )}

      {/* LAS CIFRAS de esta disciplina. Una forma se lee de un vistazo y una
          tabla se estudia, así que el gráfico va antes. */}
      {bloque.graficos.length > 0 && (
        <ProveedorTema tema={tema} superficie="clara">
          <div className={estilos.bmGraficos}>
            {bloque.graficos.map((g) => (
              <figure key={g.grafico.titulo ?? g.grafico.periodos.join()} className={estilos.bmGrafico}>
                <Grafico grafico={g.grafico} alto={300} />
                {g.lectura && <figcaption>{g.lectura}</figcaption>}
              </figure>
            ))}
          </div>
        </ProveedorTema>
      )}

      {bloque.filas.length > 0 && (
        <>
          <div className={estilos.bmSubtituloFila}>
            <IconoBenchmark nombre="cifras" />
            <h3 className={estilos.bmSubtitulo}>Criterio por criterio</h3>
            <span className={estilos.conteo}>{bloque.filas.length} criterios</span>
          </div>
          <div className={estilos.benchmarkMatrizWrap}>
            <table className={estilos.benchmarkMatriz}>
              <thead>
                <tr>
                  <th className={estilos.benchmarkColDimension}>Criterio</th>
                  <th className={`${estilos.benchmarkColUdn} ${estilos.benchmarkColUdnEtiqueta}`}>
                    {nombreUdn}
                  </th>
                  {benchmark.competidores.map((c) => <th key={c.nombre}>{c.nombre}</th>)}
                </tr>
              </thead>
              <tbody>
                {bloque.filas.map((f) => (
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
          {esComercial && benchmark.comparativa?.notaPie && (
            <p className={estilos.bmNotaTabla}>{benchmark.comparativa.notaPie}</p>
          )}
          {benchmark.comparativa?.fuente && (
            <p className={estilos.bmFuente}>Fuente: {benchmark.comparativa.fuente}</p>
          )}
        </>
      )}

      {/* LA PROSPECCIÓN REAL, los cinco juntos. En la ficha de cada competidor
          solo queda si contestó o no; el tiempo, el tono y qué mandaron se
          leen comparados, que es donde se ve que tres de cinco no contestan. */}
      {esComercial && (
        <>
          <div className={estilos.bmSubtituloFila}>
            <IconoBenchmark nombre="comercial" />
            <h3 className={estilos.bmSubtitulo}>Qué pasó al prospectarlos</h3>
            <span className={estilos.conteo}>prospección real del análisis</span>
          </div>
          <ul className={estilos.bmContactos}>
            {benchmark.competidores.map((c) =>
              c.contactabilidad ? (
                <li
                  key={c.nombre}
                  className={estilos.bmContactoFicha}
                  data-respondio={c.contactabilidad.velocidad === 'Sin respuesta' ? 'no' : 'si'}
                >
                  <div className={estilos.bmContactoCabeza}>
                    <span className={estilos.bmContactoNombre}>{c.nombre}</span>
                    <span className={estilos.bmContactoVelocidad}>{c.contactabilidad.velocidad}</span>
                  </div>
                  {c.contactabilidad.velocidad !== 'Sin respuesta' && (
                    <p className={estilos.bmContactoDetalle}>
                      Tono {c.contactabilidad.calidad.toLowerCase()} · {c.contactabilidad.informacion.toLowerCase()}
                    </p>
                  )}
                  <p className={estilos.bmContactoImplicacion}>{c.contactabilidad.implicacion}</p>
                </li>
              ) : null,
            )}
          </ul>
        </>
      )}

      {/* QUÉ HACE CADA UNO en esta disciplina. Es el bloque que antes había
          que reconstruir abriendo cinco desplegables. */}
      {bloque.porCompetidor.length > 0 && bloque.rotulo && (
        <>
          <div className={estilos.bmSubtituloFila}>
            <IconoBenchmark nombre="competidores" />
            <h3 className={estilos.bmSubtitulo}>{bloque.rotulo}</h3>
            <span className={estilos.conteo}>{bloque.porCompetidor.length} competidores</span>
          </div>
          <ul className={estilos.bmPorCompetidor}>
            {bloque.porCompetidor.map((x) => (
              <li key={x.nombre} data-amenaza={x.amenaza}>
                <span className={estilos.bmPorCompetidorNombre}>{x.nombre}</span>
                <p>{x.que}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <EvidenciaBenchmark
        salaSlug={salaSlug}
        bloque={bloque.id}
        piezas={piezas}
        equipo={equipo}
        subirAction={subirAction}
        enlazarAction={enlazarAction}
        quitarAction={quitarAction}
      />
    </section>
  )
}
