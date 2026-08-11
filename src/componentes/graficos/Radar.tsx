import type { CSSProperties } from 'react'
import type { DatosGrafico, SerieDatos } from './tipos'
import { colorDeSerie, formatearTick } from './tipos'
import estilos from './grafico.module.css'

/**
 * Radar: varias capacidades medidas con la MISMA vara, comparadas entre pocas
 * series.
 *
 * Es la forma correcta cuando lo que se compara no es una evolución sino un
 * PERFIL: siete capacidades de una UDN contra el promedio de su competencia,
 * todas puntuadas de 1 a 5. El polígono se lee de un vistazo —dónde sobresale,
 * dónde se hunde— y la distancia entre dos polígonos es la ventaja. En barras
 * eso mismo son catorce barras que hay que recorrer de arriba abajo comparando
 * de dos en dos.
 *
 * NO ES PARA SERIES TEMPORALES. Un radar cierra el polígono, así que une el
 * último periodo con el primero: en una tendencia mensual eso dibuja un salto
 * de diciembre a enero que no existe. Para eso está el gráfico de ejes.
 *
 * SIN NÚMERO EN CADA VÉRTICE, ni siquiera con `mostrarValores`. La escala ya
 * está escrita en los anillos; catorce números repartidos alrededor de una
 * rejilla rotulada se pisan entre ellos y tapan justo la forma que se venía a
 * ver. Quien necesita la cifra exacta la tiene en la tabla de al lado.
 *
 * EL COLOR NO ES LA ÚNICA SEÑAL. Cada serie lleva además su propio trazo
 * (continuo, discontinuo…) y su propio marcador (círculo, rombo, cuadrado…).
 * Dos series se distinguen impresas en blanco y negro, y con cualquier
 * daltonismo.
 *
 * LA LEYENDA VIVE FUERA, en `Grafico.tsx`, como en todos los demás: dentro del
 * SVG no se puede medir el ancho de una cadena.
 *
 * TODA LA GEOMETRÍA ESTÁ EN UNIDADES DEL `viewBox`, incluido el ancho estimado
 * de cada rótulo. Es lo que permite garantizar que nada se sale ni se pisa sin
 * medir texto — y también por qué el dibujo entero encoge, texto incluido, en
 * una columna estrecha: es el mismo comportamiento del resto del catálogo, no
 * una rejilla que se reordena. Subir aquí el tamaño de letra en un móvil sin
 * rehacer el reparto sacaría los nombres del lienzo.
 */

interface Props {
  datos: DatosGrafico
  alto: number
  ancho?: number
}

/** Anillos como mucho. Cinco es lo que una escala de 1 a 5 rotula sin apelmazarse. */
const MAX_ANILLOS = 5
/** Del vértice del anillo exterior al texto de su eje. */
const SEPARACION_ROTULO = 12
const ALTURA_LINEA = 14
/** De la caja de una línea a su línea de base. */
const ASCENSO_LINEA = 10.5
/** Un nombre que no cabe en dos líneas se recorta: tres ya es un párrafo. */
const MAX_LINEAS = 2
/**
 * Cuánto se aparta el rótulo del eje de arriba.
 *
 * La escala se escribe sobre el eje vertical, así que el número del anillo
 * exterior cae justo donde iría el nombre del primer eje. Sin este despeje se
 * tocaban: "5" pegado a la base de "Momento de compra".
 */
const DESPEJE_ESCALA = 14
/** El tamaño de `.rotuloCategoria`, que es con lo que se escriben los ejes. */
const FUENTE_ROTULO = 12
/** Ancho medio de carácter. Mismo criterio que `BarrasHorizontales`. */
const FACTOR_ANCHO_CARACTER = 0.62
/**
 * Tope de ancho de un rótulo antes de partirlo. No es el espacio disponible
 * —que suele ser mayor—: es hasta dónde puede crecer una etiqueta sin invadir
 * el sitio de la de al lado.
 */
const TOPE_ANCHO_ROTULO = 190
const MINIMO_ANCHO_ROTULO = 56
/**
 * Cuándo un rótulo deja de estar "a un lado" y pasa a estar "arriba" o
 * "abajo". Es el coseno del eje: por encima de este valor el texto arranca en
 * el vértice y crece hacia fuera; por debajo se centra sobre él.
 */
const UMBRAL_CENTRADO = 0.2
const RADIO_MARCADOR = 4.5
const OPACIDAD_RELLENO = 0.15
const GROSOR_TRAZO = 2

/**
 * El trazo de cada serie, por su ranura de color. La primera va continua —es
 * la que el gráfico afirma— y las demás se diferencian por patrón.
 */
const PATRONES: Array<string | undefined> = [undefined, '7 5', '2 4', '11 4 2 4', '1 4', '14 6']

type FormaMarcador = 'circulo' | 'rombo' | 'cuadrado' | 'triangulo' | 'triangulo-invertido' | 'cruz'

/** El marcador de cada serie, por su ranura de color. */
const MARCADORES: FormaMarcador[] = [
  'circulo',
  'rombo',
  'cuadrado',
  'triangulo',
  'triangulo-invertido',
  'cruz',
]

/** Dos decimales: un SVG con quince decimales por vértice pesa el doble y no dibuja mejor. */
function r2(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * El techo de la escala radial: un número redondo del que salgan anillos
 * equidistantes y rotulables.
 *
 * Es el mismo escalón "bonito" (1, 2, 2.5, 5 × 10ⁿ) con el que el gráfico de
 * ejes coloca sus marcas, resolviendo un problema parecido pero no igual: allí
 * se busca una LISTA de marcas dentro de un dominio que ya existe; aquí, UN
 * techo que además define el radio. Con la escala 1-5 de un benchmark caen
 * cinco anillos en los enteros; con un máximo de 87, cinco anillos de 20.
 */
function escalaDeAnillos(maximo: number, anillos: number): { paso: number; techo: number } {
  if (!Number.isFinite(maximo) || maximo <= 0) return { paso: 1, techo: 1 }
  const crudo = maximo / anillos
  const magnitud = 10 ** Math.floor(Math.log10(crudo))
  const n = crudo / magnitud
  const escalon = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  const paso = escalon * magnitud
  return { paso, techo: Math.ceil(Number((maximo / paso).toFixed(10))) * paso }
}

/** Lo que ocupa un texto, estimado. Dentro de un SVG no hay forma de medirlo. */
function anchoEstimado(texto: string): number {
  return texto.length * FUENTE_ROTULO * FACTOR_ANCHO_CARACTER
}

/**
 * Parte un nombre de eje en las líneas que quepan, sin cortar palabras.
 *
 * ES EL DEFECTO QUE MOTIVÓ ESTE GRÁFICO. Con siete ejes y nombres como
 * "Madurez comercial digital", escribir cada uno de corrido los encabalgaba
 * con el vecino o los sacaba del lienzo. Se parte por palabras, y solo si una
 * sola palabra no cabe se recorta con puntos suspensivos —cortar "digital" a
 * media palabra es peor que no escribirla—.
 */
function partirEnLineas(texto: string, anchoDisponible: number): string[] {
  const maxCaracteres = Math.max(
    4,
    Math.floor(Math.max(anchoDisponible, 0) / (FUENTE_ROTULO * FACTOR_ANCHO_CARACTER)),
  )
  if (texto.length <= maxCaracteres) return [texto]

  const todas: string[] = []
  let actual = ''
  for (const palabra of texto.split(' ').filter(Boolean)) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra
    if (!actual || tentativa.length <= maxCaracteres) actual = tentativa
    else {
      todas.push(actual)
      actual = palabra
    }
  }
  if (actual) todas.push(actual)

  const lineas = todas.slice(0, MAX_LINEAS)
  const sobran = todas.length > lineas.length
  // Se recorta lo que de verdad no cabe: una palabra sola más larga que el
  // carril, y la última línea cuando por debajo quedaba texto sin escribir.
  return lineas.map((linea, i) => {
    const excede = linea.length > maxCaracteres
    const truncada = i === lineas.length - 1 && sobran
    if (!excede && !truncada) return linea
    return `${linea.slice(0, Math.max(1, maxCaracteres - 1)).trimEnd()}…`
  })
}

/**
 * El dibujo de un marcador, como ruta.
 *
 * Ruta y no `<circle>`+`transform`: la animación de entrada de un punto es un
 * `transform: scale(...)` desde CSS, y una `transform` de CSS pisa el atributo
 * `transform` del elemento. Un rombo hecho girando un cuadrado se enderezaba
 * al terminar de aparecer.
 */
function marcador(x: number, y: number, r: number, forma: FormaMarcador): string {
  const p = (dx: number, dy: number) => `${r2(x + dx)},${r2(y + dy)}`
  switch (forma) {
    case 'rombo':
      return `M ${p(0, -r * 1.15)} L ${p(r * 1.15, 0)} L ${p(0, r * 1.15)} L ${p(-r * 1.15, 0)} Z`
    case 'cuadrado': {
      const l = r * 0.88
      return `M ${p(-l, -l)} L ${p(l, -l)} L ${p(l, l)} L ${p(-l, l)} Z`
    }
    case 'triangulo':
      return `M ${p(0, -r * 1.15)} L ${p(r, r * 0.72)} L ${p(-r, r * 0.72)} Z`
    case 'triangulo-invertido':
      return `M ${p(0, r * 1.15)} L ${p(r, -r * 0.72)} L ${p(-r, -r * 0.72)} Z`
    case 'cruz': {
      const b = r * 0.42
      return [
        `M ${p(-b, -r)}`,
        `L ${p(b, -r)} L ${p(b, -b)} L ${p(r, -b)} L ${p(r, b)} L ${p(b, b)}`,
        `L ${p(b, r)} L ${p(-b, r)} L ${p(-b, b)} L ${p(-r, b)} L ${p(-r, -b)} L ${p(-b, -b)} Z`,
      ].join(' ')
    }
    default:
      return `M ${p(-r, 0)} a ${r},${r} 0 1 0 ${r2(r * 2)},0 a ${r},${r} 0 1 0 ${r2(-r * 2)},0 Z`
  }
}

export function Radar({ datos, alto, ancho = 640 }: Props) {
  const { categorias, series } = datos
  const ejes = Math.max(1, categorias.length)

  // El centro es el CERO del radar, no el mínimo del dato: un radar se lee por
  // el área que encierra, y arrancar la escala en el mínimo infla la diferencia
  // entre dos perfiles hasta donde uno quiera. Un negativo —que en un perfil de
  // capacidades no existe— se apoya en el centro en vez de dibujarse hacia
  // dentro, que sería un polígono cruzado consigo mismo.
  const maximo = Math.max(0, ...series.flatMap((s) => s.valores))
  const { paso, techo } = escalaDeAnillos(maximo, MAX_ANILLOS)
  const anillos = Math.max(1, Math.round(techo / paso))

  // El carril lateral lo pide el rótulo más largo, con un tope: un nombre
  // kilométrico no puede comerse el dibujo, se parte en dos líneas.
  const reservaLateral = Math.min(
    ancho * 0.3,
    Math.min(TOPE_ANCHO_ROTULO, Math.max(MINIMO_ANCHO_ROTULO, ...categorias.map(anchoEstimado))) +
      SEPARACION_ROTULO +
      4,
  )
  // ARRIBA la reserva es siempre la misma: el primer eje apunta a las 12, así
  // que ahí hay un rótulo entero, su separación y el despeje de la escala.
  // ABAJO depende de cuánto baje el eje más bajo —con siete ejes ninguno
  // apunta al suelo, el más bajo se queda a 0.9— y eso es papel que el dibujo
  // aprovecha en vez de dejarlo en blanco. Con reservas simétricas el radar
  // salía pequeño y descentrado hacia arriba dentro de su propio lienzo.
  const bajadaMaxima = Math.max(
    0,
    ...categorias.map((_, i) => Math.sin((i * 2 * Math.PI) / ejes - Math.PI / 2)),
  )
  const reservaArriba = SEPARACION_ROTULO + DESPEJE_ESCALA + MAX_LINEAS * ALTURA_LINEA
  const reservaAbajo =
    bajadaMaxima * SEPARACION_ROTULO + (MAX_LINEAS * ALTURA_LINEA * (bajadaMaxima + 1)) / 2
  const radio = Math.max(
    0,
    Math.min((ancho - 2 * reservaLateral) / 2, (alto - reservaArriba - reservaAbajo) / 2),
  )
  const cx = ancho / 2
  // Si el ancho fue el que mandó, el papel que sobra se reparte entre arriba y
  // abajo: el dibujo se centra en su lienzo en vez de colgar del techo.
  const cy =
    reservaArriba + radio + Math.max(0, alto - reservaArriba - reservaAbajo - 2 * radio) / 2

  /** Un punto del radar: qué eje y a qué distancia del centro. */
  const punto = (eje: number, distancia: number) => {
    const angulo = (eje * 2 * Math.PI) / ejes - Math.PI / 2
    return { x: cx + distancia * Math.cos(angulo), y: cy + distancia * Math.sin(angulo) }
  }
  const radioDe = (valor: number) => Math.max(0, Math.min(1, valor / techo)) * radio
  const poligono = (distancias: number[]) =>
    distancias
      .map((d, i) => {
        const { x, y } = punto(i, d)
        return `${r2(x)},${r2(y)}`
      })
      .join(' ')

  // El eje escribe la misma unidad que las series.
  const serieDeReferencia: Pick<SerieDatos, 'prefijo' | 'sufijo'> = series[0] ?? {}

  const rotulos = categorias.map((categoria, i) => {
    const angulo = (i * 2 * Math.PI) / ejes - Math.PI / 2
    const ux = Math.cos(angulo)
    const uy = Math.sin(angulo)
    // Un rótulo que cae encima de la columna de la escala —los de arriba— se
    // aparta un poco más: si no, se toca con el número del anillo exterior.
    const separacion =
      SEPARACION_ROTULO +
      (uy < 0 && Math.abs(ux) <= UMBRAL_CENTRADO ? DESPEJE_ESCALA : 0)
    const x = cx + (radio + separacion) * ux
    const y = cy + (radio + separacion) * uy

    // El ancla depende del CUADRANTE: a la derecha el texto crece hacia fuera,
    // a la izquierda hacia dentro, y arriba y abajo se centra sobre su eje. Sin
    // esto, los rótulos de la izquierda se metían dentro del polígono.
    const ancla: 'start' | 'middle' | 'end' =
      ux > UMBRAL_CENTRADO ? 'start' : ux < -UMBRAL_CENTRADO ? 'end' : 'middle'
    // Lo que le queda al texto hasta el borde del lienzo, según por dónde
    // crece. Es el límite duro: un rótulo cortado por el borde es el otro
    // defecto que este gráfico venía a arreglar.
    const hastaElBorde =
      ancla === 'start' ? ancho - x - 4 : ancla === 'end' ? x - 4 : 2 * Math.min(x, ancho - x) - 8
    const lineas = partirEnLineas(categoria, Math.min(hastaElBorde, TOPE_ANCHO_ROTULO))

    // El bloque de texto se coloca en la dirección del eje: entero por encima
    // del vértice si el eje mira arriba, entero por debajo si mira abajo, y
    // centrado sobre él en los lados.
    const altoBloque = lineas.length * ALTURA_LINEA
    const centro = y + uy * (altoBloque / 2)
    const primeraLinea = centro - altoBloque / 2 + ASCENSO_LINEA
    return { categoria, x, y: primeraLinea, ancla, lineas }
  })

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label={`Gráfico radial de ${series.map((s) => s.etiqueta).join(', ')} en ${categorias.join(', ')}`}
      className={estilos.lienzo}
    >
      {/* LA REJILLA: anillos concéntricos rotulados con su valor y un radio por
          eje. Sin ella un polígono no dice cuánto, solo qué forma tiene. */}
      {Array.from({ length: anillos }, (_, k) => {
        const valor = paso * (k + 1)
        const distancia = (radio * (k + 1)) / anillos
        return (
          <polygon
            key={`anillo-${valor}`}
            points={poligono(categorias.map(() => distancia))}
            fill="none"
            className={estilos.rejilla}
          />
        )
      })}

      {categorias.map((categoria, i) => {
        const extremo = punto(i, radio)
        return (
          <line
            key={`radio-${categoria}`}
            x1={cx}
            y1={cy}
            x2={r2(extremo.x)}
            y2={r2(extremo.y)}
            className={estilos.rejilla}
          />
        )
      })}

      {/* LOS DATOS. Cada serie es un polígono cerrado: relleno translúcido para
          que se vean las dos, trazo propio y marcador propio en cada vértice
          —el color nunca es la única señal—. */}
      {series.map((serie, si) => {
        const ranura = (serie.ranuraColor ?? si) % 6
        const color = colorDeSerie(serie, si)
        const distancias = categorias.map((_, ci) => radioDe(serie.valores[ci] ?? 0))
        return (
          <g key={serie.etiqueta}>
            <polygon
              data-testid="area"
              data-serie={serie.etiqueta}
              points={poligono(distancias)}
              fill={color}
              fillOpacity={OPACIDAD_RELLENO}
              stroke={color}
              strokeWidth={GROSOR_TRAZO}
              strokeLinejoin="round"
              strokeDasharray={PATRONES[ranura]}
            />
            {distancias.map((distancia, ci) => {
              const { x, y } = punto(ci, distancia)
              return (
                <path
                  key={`marca-${ci}`}
                  data-testid="punto"
                  data-serie={serie.etiqueta}
                  style={{ '--i': ci } as CSSProperties}
                  d={marcador(x, y, RADIO_MARCADOR, MARCADORES[ranura])}
                  fill={color}
                  stroke="var(--superficie)"
                  strokeWidth={1.5}
                />
              )
            })}
          </g>
        )
      })}

      {/* LA ESCALA, ENCIMA DE LOS DATOS. Se escribe sobre el eje vertical, cada
          número sobre su anillo —igual que el gráfico de ejes escribe sus
          marcas sobre su línea de rejilla—, y el cero en el centro: sin él, una
          escala de 1 a 5 se lee como si el centro valiera 1 y todas las
          distancias quedan infladas.

          VAN DESPUÉS DE LAS SERIES, con un halo del color de la superficie:
          debajo, los rellenos translúcidos de dos o tres polígonos los dejaban
          ilegibles justo en el centro, que es donde más se necesitan. */}
      {Array.from({ length: anillos + 1 }, (_, k) => {
        const valor = paso * k
        const distancia = (radio * k) / anillos
        return (
          <text
            key={`escala-${valor}`}
            data-testid={k === 0 ? 'centro-rotulo' : 'anillo-rotulo'}
            x={r2(cx + 6)}
            y={r2(cy - distancia - 4)}
            textAnchor="start"
            className={estilos.rotuloEje}
            stroke="var(--superficie)"
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {formatearTick(Number(valor.toFixed(10)), serieDeReferencia, techo)}
          </text>
        )
      })}

      {/* LOS NOMBRES DE LOS EJES, los últimos: van encima de todo. */}
      {rotulos.map(({ categoria, x, y, ancla, lineas }) => (
        <text
          key={`rotulo-${categoria}`}
          data-testid="eje-rotulo"
          x={r2(x)}
          y={r2(y)}
          textAnchor={ancla}
          className={estilos.rotuloCategoria}
        >
          {lineas.length === 1
            ? lineas[0]
            : lineas.map((linea, li) => (
                <tspan key={li} x={r2(x)} y={r2(y + li * ALTURA_LINEA)}>
                  {linea}
                </tspan>
              ))}
        </text>
      ))}
    </svg>
  )
}
