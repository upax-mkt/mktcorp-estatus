import type { DecisionSlide } from '@/decision/esquema'
import type { BorradorSeccion } from '@/secciones/borrador'

/**
 * PLANTILLAS DE REUNIÓN.
 *
 * Hasta ahora la app daba por hecho que toda sesión era el estatus mensual de
 * una UDN: ocho secciones fijas, escritas en el código como si fueran una ley
 * del dominio. Y para el estatus lo son — es la estructura acordada de esa
 * reunión. Pero una junta de squad, un comité o un arranque de campaña no
 * tienen portada, ni RevOps, ni Outbound, y llegar a esa reunión con ocho
 * bloques que borrar es peor que llegar con la hoja en blanco.
 *
 * Así que las ocho dejan de ser ley y pasan a ser UNA plantilla. La
 * herramienta sirve para cualquier reunión; la plantilla dice de cuál.
 *
 * Lo que una plantilla NO hace: encerrar. Sus secciones se pueden reordenar,
 * renombrar, cambiar de tipo y —salvo en la de estatus, donde los ocho
 * bloques son el acuerdo con la UDN— borrar. Es un punto de partida, no un
 * formulario.
 */

/** Una entrada de la estructura: qué sección es y cómo se llama. */
export interface DefinicionItem {
  /** Identidad estable de la sección; sobrevive a reordenarla. */
  tipo: string
  /** Nombre de respaldo en la lista, mientras la sección no tenga título propio. */
  titulo: string
  /** Pista de qué poner aquí. */
  pregunta: string
  /** Tipo de sección con el que nace. El equipo puede cambiarlo en el editor. */
  layout?: DecisionSlide['layout']
  /** El `tipo` de la sección base que la contiene, si es una subsección. */
  padre?: string
  /**
   * CONTENIDO INICIAL de la sección — opcional, y nuevo (ronda 15, tarea 1).
   *
   * Hasta ahora una plantilla solo podía llevar ESTRUCTURA: `crearDocumentoConPlantilla`
   * (`src/db/documentos.ts`) sembraba cada item con `{ seccion: { layout: d.layout } }`
   * a secas, sin mirar nada más — el sitio ideal para meter contenido de ejemplo (una
   * plantilla-galería, "Plantilla completa" más abajo) no tenía dónde ponerlo.
   *
   * Cuando este campo está presente, el sembrador lo usa TAL CUAL como `contenido.seccion`
   * del item recién creado — es la misma forma que ya escribe el equipo a mano en el
   * editor (`BorradorSeccion`, `src/secciones/borrador.ts`), así que un item sembrado con
   * `contenido` nace exactamente como si alguien lo hubiera llenado un segundo antes de
   * guardar: `llenado: true` desde el minuto uno, listo para maquetar sin tocar nada.
   *
   * AUSENTE = comportamiento de siempre, byte a byte: el sembrador cae a
   * `{ layout: d.layout }`, la misma sección vacía que las cinco plantillas de antes de
   * esta ronda (`estatus-udn`, `sync-comercial`, `seguimiento`, `comite`, `arranque`,
   * `en-blanco`) siguen produciendo — ninguna de ellas declara `contenido`, y no tienen
   * por qué: sus secciones las llena el equipo, no la plantilla. Ver el test de
   * regresión en `src/db/plantillas.test.ts`.
   *
   * `layout` sigue siendo obligatorio de todos modos (arriba): aunque `contenido.layout`
   * ya lo trae —`BorradorSeccion.layout` es requerido—, `layout` es lo que exige el test
   * "toda sección de toda plantilla declara su layout" y lo que usa el resto del código
   * fuera del sembrador (por ejemplo, para decidir dónde entra una sección nueva). Los
   * dos valores deben coincidir; que no lo hagan es un error de quien escribe la
   * plantilla, no algo que este tipo valide por sí solo.
   */
  contenido?: BorradorSeccion
}

export interface Plantilla {
  id: string
  nombre: string
  /** Una línea: cuándo elegir esta y no otra. */
  paraQue: string
  /**
   * Si sus secciones son un acuerdo que no se rompe. Solo la de estatus: los
   * ocho bloques son lo que Marketing Corp le prometió a cada UDN, y borrar
   * "RevOps" de un estatus no es personalizar, es incumplir. En el resto,
   * todo se puede quitar.
   */
  seccionesFijas: boolean
  /**
   * Si esta entrada es una CLASE DE JUNTA de verdad —una de las que
   * responden "¿qué junta es?" (Estatus de UDN, Sync Comercial, Comité o
   * dirección, Arranque de campaña, Seguimiento de proyecto)— o la salida de
   * emergencia ("En blanco") para cuando ninguna clase encaja.
   *
   * Ronda 14.2, tarea 2: antes esto se adivinaba comparando el `id` contra
   * `'en-blanco'` a mano en cada `<select>` que ofrecía el catálogo. Frágil
   * por partida doble: `Plantilla` no distinguía una clase de junta de una
   * plantilla de deck, así que el compilador no protegía nada; y si ese id
   * cambiara de sentido, la entrada aparecería duplicada como clase real Y
   * como salida de emergencia, con la línea de ayuda mostrando el `paraQue`
   * de otra por el fallback de `obtenerPlantilla`. Filtrar por
   * `esClaseDeJunta` —no por `id !== 'en-blanco'`— es lo que cierra ese
   * hueco: el catálogo declara qué es cada cosa, en vez de que cada
   * consumidor la adivine.
   */
  esClaseDeJunta: boolean
  items: DefinicionItem[]
}

/** Los ocho bloques del estatus de una UDN. Era `ESTRUCTURA_POR_DEFECTO`. */
const ESTATUS_UDN: DefinicionItem[] = [
  {
    tipo: 'portada',
    titulo: 'Portada',
    pregunta: 'De qué estatus se trata y qué periodo cubre.',
    layout: 'portada',
  },
  {
    tipo: 'agenda',
    titulo: 'Agenda',
    pregunta: 'Los bloques de la sesión. En el documento se vuelven un índice navegable.',
    layout: 'agenda',
  },
  {
    tipo: 'acuerdos-pendientes',
    titulo: 'Acuerdos y Pendientes',
    // Sección ÚNICA, no un bloque: lo que se repasa aquí es la tabla de
    // pendientes de la sesión pasada. Abrirle una subsección llamada
    // "Pendientes" era decir dos veces lo mismo.
    pregunta: 'La tabla de lo que quedó de la sesión pasada, con su semáforo.',
    layout: 'pendientes-semaforo',
  },
  {
    tipo: 'portafolio-ecosistema',
    titulo: 'Portafolio & Ecosistema',
    pregunta: 'Servicios, herramientas comerciales y materiales.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'performance-conversion',
    titulo: 'Performance & Conversión',
    pregunta: 'Sitio web, paid media, conversión.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'campanas-360',
    titulo: 'Campañas 360',
    pregunta: 'Campañas en curso y su resultado.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'revops',
    titulo: 'RevOps',
    pregunta: 'Datos, procesos y herramientas de ingresos.',
    layout: 'divisor-seccion',
  },
  {
    tipo: 'outbound-pipeline',
    titulo: 'Outbound & Pipeline',
    pregunta: 'Prospección, cumplimiento y pipeline.',
    layout: 'divisor-seccion',
  },
]

/**
 * LAS 18 SECCIONES DE "PLANTILLA COMPLETA" (ronda 15, tarea 2).
 *
 * Mismo orden y mismos 12 layouts que el estatus mensual de Mexa Creativa —
 * Junio 2026 (documento `8c9c6082-7aa3-4fc6-a5ca-ba22d144e078`, sala
 * `mexa-creativa`, montado por `scripts/montar-mexa-junio-2026.ts`, que es
 * la fuente que se leyó para replicar la COMPOSICIÓN). Lo que viaja de ese
 * deck es la FORMA: qué tipo de sección sigue a cuál, y qué campos usa cada
 * una (una tabla aquí, dos gráficos allá, una matriz de estados más
 * adelante). Ni una cifra, ni un nombre, ni una fecha de ese deck viaja —
 * todo el contenido es lorem ipsum, a propósito (pidió Franco: "deja todo
 * en lorem ipsum mejor"), porque ese deck es de un cliente real y sus
 * números no pueden aparecer presentándose en la sala de otro.
 *
 * DOS FUENTES DE TEXTO DISTINTAS EN CADA ITEM, y no por descuido:
 * - `titulo` (arriba, en el `DefinicionItem`) es el nombre de respaldo en la
 *   lista de secciones del editor — el que usa `documentoCompletoDeFilas`
 *   SOLO si la sección se queda sin título propio. Aquí se deja en
 *   español y describe el ROL de la sección ("Divisor · Portafolio",
 *   "Pendientes", "Focos del trimestre"): es orientación de navegación,
 *   no contenido que se vaya a presentar, y es la misma clase de etiqueta
 *   que ya usa `montar-mexa-junio-2026.ts` en su campo `nombre` para las
 *   mismas 18 secciones.
 * - `contenido.titulo` es el TÍTULO QUE SE VE en la lámina — contenido de
 *   verdad, y por eso lorem ipsum, EXCEPTO en las etiquetas que son
 *   perennes (dicen lo mismo sin importar qué reemplace el resto de la
 *   sección): "Agenda", "El mes en una lectura", "Lo que sigue", "Cierre",
 *   y los cuatro divisores, que reusan el vocabulario que YA es compartido
 *   entre las ocho UDN en `ESTATUS_UDN` más arriba ("Acuerdos y
 *   Pendientes", "Portafolio & Ecosistema", "Performance & Conversión",
 *   "Outbound & Pipeline") — no es texto inventado para Mexa, es la misma
 *   taxonomía que el catálogo ya usaba antes de esta ronda. La portada SÍ
 *   va en lorem ipsum también: a diferencia de "Agenda", su titular es
 *   el nombre DE ESE documento en particular, no una etiqueta perenne, y
 *   dejaría de serlo en cuanto alguien lo reemplace.
 *
 * MARCADORES, NO CIFRAS ("00", "—", "0%"): un KPI o una meta-contra-real
 * sin nada en el campo que exige se pinta degradada ("con-problema" en
 * `estadoDeSeccion`, `src/secciones/borrador.ts`) — la plantilla completa
 * existe justo para que las 18 nazcan LISTAS, no a medio llenar. Pero un
 * marcador tiene que leerse como "reemplázame", nunca como un dato real: por
 * eso "00", "—" y "0%" y no un número plausible tipo "2,519". En las series
 * de gráfico (`SerieDatos.valores`), que el esquema exige `number` y no
 * admite texto, el marcador es CERO en todo el periodo — una línea plana en
 * cero no se puede confundir con una tendencia real.
 */
const PLANTILLA_COMPLETA_ITEMS: DefinicionItem[] = [
  {
    tipo: 'portada',
    titulo: 'Portada',
    pregunta: 'De qué trata esta presentación y qué periodo cubre.',
    layout: 'portada',
    contenido: {
      layout: 'portada',
      titulo: 'Lorem ipsum dolor sit amet',
      subtitulo: 'Consectetur adipiscing elit, sed do eiusmod tempor',
    },
  },
  {
    tipo: 'agenda',
    titulo: 'Agenda',
    pregunta: 'Los bloques de la sesión. En el documento se vuelven un índice navegable.',
    layout: 'agenda',
    contenido: {
      layout: 'agenda',
      titulo: 'Agenda',
      cuerpo: [
        'Lorem ipsum dolor sit amet',
        'Consectetur adipiscing elit',
        'Sed do eiusmod tempor incididunt',
        'Ut labore et dolore magna',
        'Aliqua ut enim ad minim',
        'Veniam quis nostrud exercitation',
      ],
    },
  },
  {
    tipo: 'mes-en-lectura',
    titulo: 'El mes en una lectura',
    pregunta: 'Las cifras que más importan y qué sostiene y qué preocupa, antes de entrar al detalle.',
    layout: 'kpis-fila-dos-columnas',
    contenido: {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'El mes en una lectura',
      subtitulo: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
      kpis: [
        { valor: '00', delta: '—', rotulo: 'Lorem ipsum' },
        { valor: '00', delta: '—', rotulo: 'Dolor sit amet' },
        { valor: '0%', delta: '—', rotulo: 'Consectetur adipiscing' },
        { valor: '—', delta: '—', rotulo: 'Sed do eiusmod' },
      ],
      columnas: [
        {
          titulo: 'Lo que sostiene',
          puntos: [
            { texto: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.' },
            { texto: 'Duis aute irure dolor in reprehenderit in voluptate velit esse.' },
            { texto: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui.' },
          ],
        },
        {
          titulo: 'Lo que preocupa',
          puntos: [
            { texto: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem.' },
            { texto: 'Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.' },
            { texto: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit.' },
          ],
        },
      ],
    },
  },
  {
    tipo: 'divisor-acuerdos-pendientes',
    titulo: 'Divisor · Acuerdos y Pendientes',
    pregunta: 'Separa el bloque de la sesión del siguiente. Sin contenido: solo el nombre.',
    layout: 'divisor-seccion',
    contenido: { layout: 'divisor-seccion', titulo: 'Acuerdos y Pendientes' },
  },
  {
    // 'acuerdos-pendientes', el mismo `tipo` que usa `ESTATUS_UDN`: es el que
    // reconoce `itemDeAcuerdosPendientes` (src/db/documentos.ts) para
    // aterrizar ahí los acuerdos retomados de la sesión pasada.
    tipo: 'acuerdos-pendientes',
    titulo: 'Pendientes',
    pregunta: 'La tabla de lo que quedó de la sesión pasada, con su semáforo.',
    layout: 'pendientes-semaforo',
    contenido: {
      layout: 'pendientes-semaforo',
      titulo: 'Lorem Ipsum Dolor Sit Amet',
      subtitulo: 'Consectetur adipiscing elit sed do eiusmod tempor',
      tablas: [
        {
          columnas: ['Responsable', 'Tarea', 'Estatus'],
          agruparPrimeraColumna: true,
          filas: [
            { celdas: ['Lorem Ipsum', 'Dolor sit amet consectetur adipiscing elit sed do eiusmod.', 'Listo'], estado: 'listo' },
            { celdas: ['Lorem Ipsum', 'Tempor incididunt ut labore et dolore magna aliqua ut enim.', 'Listo'], estado: 'listo' },
            { celdas: ['Dolor Sit Amet', 'Ad minim veniam quis nostrud exercitation ullamco laboris nisi.', ''] },
            { celdas: ['Consectetur Adipiscing', 'Ut aliquip ex ea commodo consequat duis aute irure dolor.', 'En proceso'], estado: 'en-proceso' },
            { celdas: ['Sed Do Eiusmod', 'In reprehenderit in voluptate velit esse cillum dolore eu fugiat.', ''] },
            { celdas: ['Ut Labore Et', 'Nulla pariatur excepteur sint occaecat cupidatat non proident sunt.', ''] },
            { celdas: ['Dolore Magna Aliqua', 'In culpa qui officia deserunt mollit anim id est laborum.', 'No realizado'], estado: 'no-realizado' },
          ],
        },
      ],
      notaPie: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.',
    },
  },
  {
    tipo: 'divisor-portafolio-ecosistema',
    titulo: 'Divisor · Portafolio & Ecosistema',
    pregunta: 'Separa el bloque de la sesión del siguiente. Sin contenido: solo el nombre.',
    layout: 'divisor-seccion',
    contenido: { layout: 'divisor-seccion', titulo: 'Portafolio & Ecosistema' },
  },
  {
    tipo: 'herramientas-comerciales',
    titulo: 'Herramientas comerciales',
    pregunta: 'Contenido cualitativo repartido en columnas paralelas. Admite listas anidadas.',
    layout: 'texto-multicolumna',
    contenido: {
      layout: 'texto-multicolumna',
      titulo: 'Consectetur Adipiscing Elit',
      subtitulo: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
      columnas: [
        {
          titulo: 'Lorem ipsum',
          etiqueta: 'Dolor sit amet',
          puntos: [
            { texto: 'Ut enim ad minim veniam.' },
            { texto: 'Quis nostrud exercitation ullamco.' },
            { texto: 'Laboris nisi ut aliquip ex ea.' },
            { texto: 'Commodo consequat duis aute irure.' },
          ],
        },
        {
          titulo: 'Dolor sit amet',
          etiqueta: 'Consectetur adipiscing',
          puntos: [
            { texto: 'Reprehenderit in voluptate velit esse.' },
            {
              texto: 'Cillum dolore eu fugiat nulla pariatur',
              hijos: [
                { texto: 'Excepteur sint occaecat' },
                { texto: 'Cupidatat non proident' },
                { texto: 'Sunt in culpa qui' },
                { texto: 'Officia deserunt mollit' },
              ],
            },
            {
              texto: 'Anim id est laborum et dolorum',
              hijos: [
                { texto: 'Neque porro quisquam' },
                { texto: 'Est qui dolorem ipsum' },
                { texto: 'Quia dolor sit amet' },
                { texto: 'Consectetur adipisci velit' },
              ],
            },
          ],
        },
        {
          titulo: 'Consectetur adipiscing',
          etiqueta: 'Sed do eiusmod',
          puntos: [
            { texto: 'Sed quia non numquam eius modi.' },
            { texto: 'Tempora incidunt ut labore et dolore.' },
            { texto: 'Magnam aliquam quaerat voluptatem ut enim.' },
          ],
        },
      ],
    },
  },
  {
    tipo: 'divisor-performance-conversion',
    titulo: 'Divisor · Performance & Conversión',
    pregunta: 'Separa el bloque de la sesión del siguiente. Sin contenido: solo el nombre.',
    layout: 'divisor-seccion',
    contenido: { layout: 'divisor-seccion', titulo: 'Performance & Conversión' },
  },
  {
    tipo: 'performance-trafico',
    titulo: 'Performance del sitio web · Tráfico',
    pregunta: 'Una tabla de un periodo contra otro, con la lectura de qué subió y qué bajó.',
    layout: 'comparativa-periodos',
    contenido: {
      layout: 'comparativa-periodos',
      titulo: 'Sed Do Eiusmod Tempor',
      subtitulo: 'Incididunt ut labore et dolore magna aliqua ut enim ad minim',
      tablas: [
        {
          columnas: ['', 'Periodo 1', 'Periodo 2'],
          filas: [
            { celdas: ['Lorem ipsum dolor', '00', '00'] },
            { celdas: ['Sit amet consectetur', '0.00', '0.00'] },
            { celdas: ['Adipiscing elit sed', '0.0', '0.0'] },
            { celdas: ['Do eiusmod tempor', '00', '00'] },
            { celdas: ['Incididunt ut labore', '00', '00'] },
          ],
        },
      ],
      graficos: [
        {
          tipo: 'combo-barras-lineas',
          titulo: 'Lorem ipsum',
          periodos: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4', 'Periodo 5', 'Periodo 6'],
          series: [
            { etiqueta: 'Lorem ipsum', valores: [0, 0, 0, 0, 0, 0], forma: 'barra', eje: 'derecho' },
            { etiqueta: 'Dolor sit amet', valores: [0, 0, 0, 0, 0, 0], forma: 'linea', eje: 'izquierdo' },
            { etiqueta: 'Consectetur adipiscing', valores: [0, 0, 0, 0, 0, 0], forma: 'linea-punteada', eje: 'izquierdo' },
            { etiqueta: 'Sed do eiusmod', valores: [0, 0, 0, 0, 0, 0], forma: 'linea', eje: 'izquierdo' },
          ],
          mostrarValores: true,
        },
      ],
      columnas: [
        {
          titulo: 'Lo que entró',
          etiqueta: 'Lorem ipsum dolor sit amet',
          puntos: [
            {
              texto: 'Ut enim ad minim veniam quis nostrud',
              hijos: [
                { texto: 'Exercitation ullamco laboris' },
                { texto: 'Nisi ut aliquip ex' },
                { texto: 'Ea commodo consequat' },
              ],
            },
            { texto: 'Duis aute irure dolor in reprehenderit.' },
          ],
        },
        {
          titulo: 'Por dónde entró',
          etiqueta: 'Consectetur adipiscing elit',
          puntos: [
            { texto: 'Voluptate velit esse cillum.' },
            { texto: 'Dolore eu fugiat nulla.' },
            { texto: 'Pariatur excepteur sint occaecat.' },
            { texto: 'Cupidatat non proident sunt.' },
          ],
        },
      ],
      notaPie: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
    },
  },
  {
    tipo: 'performance-busqueda-organica',
    titulo: 'Performance del sitio web · Búsqueda orgánica',
    pregunta: 'Hasta 4 cifras con su variación, y el análisis en columnas debajo.',
    layout: 'kpis-fila-dos-columnas',
    contenido: {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Incididunt Ut Labore Et Dolore',
      subtitulo: 'Ut enim ad minim veniam quis nostrud exercitation ullamco laboris',
      kpis: [
        { valor: '0.0', delta: '—', rotulo: 'Lorem ipsum' },
        { valor: '00.0k', delta: '0%', rotulo: 'Dolor sit amet' },
        { valor: '000', delta: '0%', rotulo: 'Consectetur adipiscing' },
        { valor: '0.0%', delta: '—', rotulo: 'Sed do eiusmod' },
      ],
      columnas: [
        {
          titulo: 'Principales hallazgos',
          puntos: [
            { texto: 'Nisi ut aliquip ex ea commodo consequat duis aute irure.' },
            { texto: 'Dolor in reprehenderit in voluptate velit esse cillum dolore.' },
            { texto: 'Eu fugiat nulla pariatur excepteur sint occaecat cupidatat non.' },
            { texto: 'Proident sunt in culpa qui officia deserunt mollit anim.' },
          ],
        },
        {
          titulo: 'Acciones prioritarias',
          puntos: [
            { texto: 'Id est laborum et dolorum fuga et harum quidem rerum.' },
            { texto: 'Facilis est et expedita distinctio nam libero tempore cum.' },
            { texto: 'Soluta nobis est eligendi optio cumque nihil impedit quo.' },
            { texto: 'Minus id quod maxime placeat facere possimus omnis voluptas.' },
          ],
        },
      ],
      notaPie: 'Lorem ipsum dolor sit amet consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
    },
  },
  {
    tipo: 'performance-paid-media',
    titulo: 'Performance de paid media',
    pregunta: 'Cuando el dato exacto y la tendencia importan por igual. Hasta 2 gráficos y 3 tablas.',
    layout: 'grafico-y-tabla',
    contenido: {
      layout: 'grafico-y-tabla',
      titulo: 'Ut Enim Ad Minim Veniam',
      subtitulo: 'Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea',
      kpis: [
        { valor: '0', delta: '—', rotulo: 'Lorem ipsum' },
        { valor: '0', delta: '—', rotulo: 'Dolor sit amet' },
        { valor: '$0', delta: '—', rotulo: 'Consectetur adipiscing' },
      ],
      tablas: [
        {
          columnas: ['', 'Periodo 1', 'Periodo 2'],
          filas: [
            { celdas: ['Lorem ipsum', '$0.00', '$0.00'] },
            { celdas: ['Dolor sit amet', '0', '0'] },
            { celdas: ['Consectetur adipiscing', '0', '0'] },
            { celdas: ['Sed do eiusmod', '0', '0'] },
            { celdas: ['Tempor incididunt', '0', '0'] },
          ],
        },
        {
          titulo: 'Lorem ipsum dolor',
          columnas: ['Estado', 'Total', '%'],
          filas: [
            { celdas: ['Lorem ipsum', '0', '0%'] },
            { celdas: ['Dolor sit amet', '0', '0%'] },
            { celdas: ['Consectetur adipiscing', '0', '0%'] },
            { celdas: ['Sed do eiusmod', '0', '0%'] },
            { celdas: ['Total', '0', '0%'], destacada: true },
          ],
        },
      ],
      graficos: [
        {
          tipo: 'lineas-multiples',
          titulo: 'Lorem ipsum',
          periodos: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4', 'Periodo 5', 'Periodo 6'],
          series: [
            { etiqueta: 'Lorem ipsum', valores: [0, 0, 0, 0, 0, 0], forma: 'linea', eje: 'izquierdo', prefijo: '$' },
            { etiqueta: 'Dolor sit amet', valores: [0, 0, 0, 0, 0, 0], forma: 'linea', eje: 'derecho' },
          ],
          mostrarValores: true,
        },
        {
          tipo: 'barras',
          titulo: 'Consectetur adipiscing',
          periodos: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4', 'Periodo 5'],
          series: [{ etiqueta: 'Lorem ipsum', valores: [0, 0, 0, 0, 0], forma: 'barra' }],
          mostrarValores: true,
        },
      ],
      columnas: [
        {
          titulo: 'Lorem ipsum',
          etiqueta: 'Dolor sit amet consectetur',
          puntos: [
            { texto: 'Adipiscing elit sed do eiusmod tempor incididunt ut labore.' },
            { texto: 'Et dolore magna aliqua ut enim ad minim veniam.' },
          ],
        },
      ],
      notaPie: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore.',
    },
  },
  {
    tipo: 'divisor-outbound-pipeline',
    titulo: 'Divisor · Outbound & Pipeline',
    pregunta: 'Separa el bloque de la sesión del siguiente. Sin contenido: solo el nombre.',
    layout: 'divisor-seccion',
    contenido: { layout: 'divisor-seccion', titulo: 'Outbound & Pipeline' },
  },
  {
    tipo: 'outbound-pipeline-cumplimiento',
    titulo: 'Outbound & Pipeline · Cumplimiento',
    pregunta: 'Cumplimiento por equipo y, si aplica, cifras grandes abiertas en sus partes.',
    layout: 'meta-real-porcentaje',
    contenido: {
      layout: 'meta-real-porcentaje',
      titulo: 'Quis Nostrud Exercitation Ullamco',
      subtitulo: 'Laboris nisi ut aliquip ex ea commodo consequat duis aute irure',
      metaReal: {
        titulo: 'Lorem ipsum',
        filas: [
          { rotulo: 'Total', meta: '00', real: '00', porcentaje: '0%' },
          { rotulo: 'Dolor sit amet', meta: '00', real: '00', porcentaje: '0%' },
          { rotulo: 'Consectetur adipiscing', meta: '00', real: '00', porcentaje: '0%' },
        ],
      },
      cifrasDesglosadas: [
        { rotulo: 'Lorem ipsum', valor: '—' },
        { rotulo: 'Dolor sit amet', valor: '—', partes: [{ rotulo: 'Lorem', valor: '—' }, { rotulo: 'Ipsum', valor: '—' }] },
        { rotulo: 'Consectetur adipiscing', valor: '—', destacada: true, partes: [{ rotulo: 'Lorem', valor: '—' }, { rotulo: 'Ipsum', valor: '—' }] },
        { rotulo: 'Sed do eiusmod', valor: '—', partes: [{ rotulo: 'Lorem', valor: '—' }, { rotulo: 'Ipsum', valor: '—' }] },
        { rotulo: 'Tempor incididunt', valor: '—', partes: [{ rotulo: 'Lorem', valor: '—' }, { rotulo: 'Ipsum', valor: '—' }] },
        { rotulo: 'Ut labore et dolore', valor: '—', partes: [{ rotulo: 'Lorem', valor: '—' }, { rotulo: 'Ipsum', valor: '—' }] },
      ],
      columnas: [
        {
          titulo: 'Lorem ipsum',
          puntos: [
            { texto: 'Dolor sit amet' },
            { texto: 'Consectetur adipiscing' },
            { texto: 'Elit sed do eiusmod' },
          ],
        },
        {
          titulo: 'Dolor sit amet',
          puntos: [
            { texto: 'Lorem: 000' },
            { texto: 'Ipsum: 000' },
          ],
        },
      ],
      notaPie: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
  },
  {
    tipo: 'brujula-trimestre',
    titulo: 'Brújula del trimestre',
    pregunta: 'Una rejilla de conceptos por periodos: en cada cruce, qué toca hacer.',
    layout: 'matriz-estados',
    contenido: {
      layout: 'matriz-estados',
      titulo: 'Duis Aute Irure Dolor',
      subtitulo: 'In reprehenderit in voluptate velit esse cillum dolore eu fugiat',
      matriz: {
        columnas: ['Periodo 1', 'Periodo 2', 'Periodo 3'],
        filas: [
          {
            encabezado: 'Lorem ipsum dolor',
            celdas: [{ texto: 'Lorem', tono: 'alto' }, { texto: 'Ipsum', tono: 'medio' }, { texto: 'Dolor', tono: 'alto' }],
            nota: 'Sit amet consectetur adipiscing elit sed do eiusmod.',
          },
          {
            encabezado: 'Sit amet consectetur',
            celdas: [{ texto: 'Lorem', tono: 'alto' }, { texto: 'Ipsum', tono: 'medio' }, { texto: 'Dolor', tono: 'alto' }],
          },
          {
            encabezado: 'Adipiscing elit sed',
            celdas: [{ texto: 'Sit', tono: 'neutro' }, { texto: 'Amet', tono: 'alto' }, { texto: 'Consectetur', tono: 'medio' }],
          },
          {
            encabezado: 'Do eiusmod tempor',
            celdas: [{ texto: 'Sit', tono: 'neutro' }, { texto: 'Amet', tono: 'alto' }, { texto: 'Consectetur', tono: 'bajo' }],
            nota: 'Incididunt ut labore et dolore magna aliqua ut enim.',
          },
          {
            encabezado: 'Incididunt ut labore',
            celdas: [{ texto: 'Lorem', tono: 'alto' }, { texto: 'Ipsum', tono: 'medio' }, { texto: 'Dolor', tono: 'neutro' }],
          },
        ],
        leyenda: [
          'Lorem · ipsum dolor sit amet',
          'Ipsum · dolor sit amet consectetur',
          'Dolor · sit amet consectetur adipiscing',
          'Sit · amet consectetur adipiscing elit',
          'CICLO: Lorem → Ipsum → Dolor → Sit.',
        ],
      },
      notaPie: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
    },
  },
  {
    tipo: 'focos-trimestre',
    titulo: 'Focos del trimestre',
    pregunta: 'Frentes de igual peso, cada uno con su detalle. El sistema los numera.',
    layout: 'tarjetas-numeradas',
    contenido: {
      layout: 'tarjetas-numeradas',
      titulo: 'Reprehenderit In Voluptate Velit',
      subtitulo: 'Esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat',
      bloques: [
        {
          titulo: 'Lorem ipsum dolor',
          etiqueta: 'Sit amet',
          parrafo: 'Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
          pie: { rotulo: 'Lorem ipsum', texto: 'Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi.' },
        },
        {
          titulo: 'Sit amet consectetur',
          etiqueta: 'Adipiscing elit',
          parrafo: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.',
          pie: { rotulo: 'Lorem ipsum', texto: 'Veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea.' },
        },
        {
          titulo: 'Dolor sit amet',
          etiqueta: 'Consectetur elit',
          parrafo: 'Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip.',
          pie: { rotulo: 'Lorem ipsum', texto: 'Ex ea commodo consequat duis aute irure dolor in reprehenderit.' },
        },
        {
          titulo: 'Adipiscing elit sed',
          etiqueta: 'Do eiusmod',
          parrafo: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat.',
          pie: { rotulo: 'Lorem ipsum', texto: 'Nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa.' },
        },
        {
          titulo: 'Tempor incididunt ut',
          etiqueta: 'Labore et',
          parrafo: 'Qui officia deserunt mollit anim id est laborum et dolorum fuga et harum quidem.',
          pie: { rotulo: 'Lorem ipsum', texto: 'Rerum facilis est et expedita distinctio nam libero tempore cum soluta.' },
        },
      ],
    },
  },
  {
    tipo: 'servicios-por-industria',
    titulo: 'Servicios por industria',
    pregunta: 'Cuando el dato exacto y la tendencia importan por igual. Hasta 2 gráficos y 3 tablas.',
    layout: 'grafico-y-tabla',
    contenido: {
      layout: 'grafico-y-tabla',
      titulo: 'Esse Cillum Dolore Eu Fugiat',
      subtitulo: 'Nulla pariatur excepteur sint occaecat cupidatat non proident sunt',
      tablas: [
        {
          columnas: ['Lorem ipsum', 'Dolor sit amet'],
          filas: [
            { celdas: ['Consectetur adipiscing', 'Elit sed do eiusmod · Tempor incididunt · Ut labore et dolore · Magna aliqua'] },
            { celdas: ['Ut enim ad minim', 'Veniam quis nostrud · Exercitation ullamco · Laboris nisi ut · Aliquip ex ea'] },
            { celdas: ['Commodo consequat', 'Duis aute irure · Dolor in reprehenderit · In voluptate velit · Esse cillum'] },
            { celdas: ['Dolore eu fugiat', 'Nulla pariatur · Excepteur sint occaecat · Cupidatat non · Proident sunt'] },
            { celdas: ['In culpa qui', 'Officia deserunt · Mollit anim id · Est laborum · Et dolorum fuga'] },
          ],
        },
      ],
    },
  },
  {
    tipo: 'lo-que-sigue',
    titulo: 'Lo que sigue',
    pregunta: 'Los próximos pasos, para cerrar con dueño y fecha en la sesión.',
    layout: 'texto-multicolumna',
    contenido: {
      layout: 'texto-multicolumna',
      titulo: 'Lo que sigue',
      subtitulo: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod',
      columnas: [
        {
          titulo: 'Lorem ipsum',
          puntos: [
            { texto: 'Tempor incididunt ut labore et dolore magna aliqua.' },
            { texto: 'Ut enim ad minim veniam quis nostrud exercitation.' },
            { texto: 'Ullamco laboris nisi ut aliquip ex ea commodo.' },
            { texto: 'Consequat duis aute irure dolor in reprehenderit.' },
          ],
        },
        {
          titulo: 'Dolor sit amet',
          puntos: [
            { texto: 'In voluptate velit esse cillum dolore eu fugiat.' },
            { texto: 'Nulla pariatur excepteur sint occaecat cupidatat non.' },
            { texto: 'Proident sunt in culpa qui officia deserunt.' },
            { texto: 'Mollit anim id est laborum et dolorum fuga.' },
          ],
        },
        {
          titulo: 'Consectetur adipiscing',
          puntos: [
            { texto: 'Et harum quidem rerum facilis est et expedita.' },
            { texto: 'Distinctio nam libero tempore cum soluta nobis.' },
            { texto: 'Est eligendi optio cumque nihil impedit quo minus.' },
            { texto: 'Id quod maxime placeat facere possimus omnis.' },
          ],
        },
      ],
    },
  },
  {
    tipo: 'cierre',
    titulo: 'Cierre',
    pregunta: 'Con qué se cierra la sesión.',
    layout: 'cierre',
    contenido: {
      layout: 'cierre',
      titulo: 'Cierre',
      subtitulo: 'Lorem ipsum · Dolor sit amet · Consectetur adipiscing · Elit sed · Eiusmod tempor · Incididunt ut · Labore et · Dolore magna',
    },
  },
]

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'estatus-udn',
    nombre: 'Estatus de UDN',
    paraQue: 'La reunión mensual con una unidad de negocio. Los ocho bloques acordados.',
    seccionesFijas: true,
    esClaseDeJunta: true,
    items: ESTATUS_UDN,
  },
  {
    id: 'sync-comercial',
    nombre: 'Sync Comercial',
    paraQue: 'La junta semanal de seguimiento comercial con una unidad de negocio.',
    seccionesFijas: false,
    esClaseDeJunta: true,
    /**
     * ⚠️ NACE CORTA A PROPÓSITO, y no es pereza: es la regla de la ronda 9.
     * Qué bloques lleva un Sync Comercial lo sabe quien lo da, no quien
     * construye la herramienta — escribir aquí ocho secciones inventadas
     * sería comprometer al equipo con una estructura que nadie acordó, que es
     * exactamente lo que se evitó con las plantillas por sala.
     *
     * Van solo las dos que la app SABE que toda junta tiene: su portada, y
     * los acuerdos, que son entidad propia en este producto y se arrastran
     * solos. El resto lo añade en el editor quien la prepare, y el día que
     * la forma se estabilice se escribe aquí.
     */
    items: [
      {
        tipo: 'portada',
        titulo: 'Portada',
        pregunta: 'De qué sync se trata y qué semana cubre.',
        layout: 'portada',
      },
      {
        // 'acuerdos-pendientes', NO 'acuerdos': es el mismo `tipo` que usa
        // ESTATUS_UDN arriba. Es el que reconoce `itemDeAcuerdosPendientes`
        // (src/db/documentos.ts) para aterrizar los acuerdos retomados de la
        // sesión pasada — un `tipo` distinto crea una sección que el render
        // no sabe pintar y que ese lookup nunca encuentra.
        tipo: 'acuerdos-pendientes',
        titulo: 'Acuerdos y Pendientes',
        pregunta: 'Qué quedó comprometido y quién lo lleva.',
        // Mismo layout que ESTATUS_UDN le da a este mismo `tipo` (arriba,
        // línea ~72): sin él, `crearDocumentoConPlantilla`
        // (src/db/documentos.ts:586) siembra la sección con
        // `layout: undefined`, y `tipoDeSeccion(undefined)` en
        // `src/secciones/borrador.ts` la deja en "falta un tipo de sección
        // válido" desde que nace la junta, no lista como promete el
        // comentario de arriba.
        layout: 'pendientes-semaforo',
      },
    ],
  },
  {
    id: 'seguimiento',
    nombre: 'Seguimiento de proyecto',
    paraQue: 'Avance, lo que bloquea y qué sigue. Sirve para un squad o un proyecto.',
    seccionesFijas: false,
    esClaseDeJunta: true,
    items: [
      { tipo: 'portada', titulo: 'Portada', pregunta: 'Qué proyecto y qué periodo.', layout: 'portada' },
      { tipo: 'agenda', titulo: 'Agenda', pregunta: 'Los puntos de la reunión.', layout: 'agenda' },
      {
        tipo: 'avance',
        titulo: 'Dónde vamos',
        pregunta: 'El avance contra lo planeado. Cifras si las hay.',
        layout: 'kpis-fila-dos-columnas',
      },
      {
        tipo: 'bloqueos',
        titulo: 'Qué está bloqueando',
        pregunta: 'Lo que impide avanzar, con responsable.',
        layout: 'pendientes-semaforo',
      },
      {
        tipo: 'siguiente',
        titulo: 'Qué sigue',
        pregunta: 'Los próximos pasos, en orden.',
        layout: 'tarjetas-numeradas',
      },
    ],
  },
  {
    id: 'comite',
    nombre: 'Comité o dirección',
    paraQue: 'Pocas cifras, una decisión que tomar y lo que se pide aprobar.',
    seccionesFijas: false,
    esClaseDeJunta: true,
    items: [
      { tipo: 'portada', titulo: 'Portada', pregunta: 'De qué se decide hoy.', layout: 'portada' },
      {
        tipo: 'situacion',
        titulo: 'La situación',
        pregunta: 'Dónde estamos, en cifras.',
        layout: 'kpis-fila-dos-columnas',
      },
      {
        tipo: 'opciones',
        titulo: 'Las opciones',
        pregunta: 'Los caminos posibles, uno por bloque.',
        layout: 'tarjetas-numeradas',
      },
      {
        tipo: 'pide',
        titulo: 'Lo que se pide',
        pregunta: 'Qué decisión se necesita y de quién.',
        layout: 'texto-multicolumna',
      },
      { tipo: 'cierre', titulo: 'Cierre', pregunta: 'Con qué se cierra.', layout: 'cierre' },
    ],
  },
  {
    id: 'arranque',
    nombre: 'Arranque de campaña',
    paraQue: 'Kickoff: objetivo, territorio, plan y quién hace qué.',
    seccionesFijas: false,
    esClaseDeJunta: true,
    items: [
      { tipo: 'portada', titulo: 'Portada', pregunta: 'Qué campaña y para quién.', layout: 'portada' },
      {
        tipo: 'objetivo',
        titulo: 'El objetivo',
        pregunta: 'Qué tiene que pasar para que esto haya funcionado.',
        layout: 'meta-real-porcentaje',
      },
      {
        tipo: 'territorio',
        titulo: 'El territorio',
        pregunta: 'La idea y por qué esta y no otra.',
        layout: 'texto-multicolumna',
      },
      {
        tipo: 'plan',
        titulo: 'El plan',
        pregunta: 'Canales, calendario y presupuesto.',
        layout: 'grafico-y-tabla',
      },
      {
        tipo: 'equipo',
        titulo: 'Quién hace qué',
        pregunta: 'Responsables y fechas.',
        layout: 'pendientes-semaforo',
      },
    ],
  },
  {
    id: 'plantilla-completa',
    nombre: 'Plantilla completa',
    paraQue:
      'Las 18 secciones y los 12 tipos de contenido, ya armadas en lorem ipsum — para partir de un documento lleno y solo reemplazar texto, cifras e imágenes.',
    seccionesFijas: false,
    // NO es una clase de junta: es una GALERÍA de plantilla de presentación,
    // la otra cosa (además de "En blanco") que el catálogo hace doble papel
    // de clase-de-junta-y-plantilla-de-deck y que en realidad no es ninguna
    // clase real — ver `esClaseDeJunta` en la interfaz `Plantilla`, arriba, y
    // el comentario de `SelectorClaseDeJunta.tsx` sobre por qué su `<optgroup>`
    // dejó de llamarse "Otra" al tener dos entradas distintas que agrupar.
    esClaseDeJunta: false,
    items: PLANTILLA_COMPLETA_ITEMS,
  },
  {
    id: 'en-blanco',
    nombre: 'En blanco',
    paraQue: 'Una portada y nada más. Para armar la reunión desde cero.',
    seccionesFijas: false,
    // NO es una clase de junta: es la salida de emergencia para cuando
    // ninguna clase real encaja. Ver el comentario de `esClaseDeJunta` en la
    // interfaz `Plantilla`, arriba.
    esClaseDeJunta: false,
    items: [
      {
        tipo: 'portada',
        titulo: 'Portada',
        pregunta: 'De qué trata esta reunión.',
        layout: 'portada',
      },
    ],
  },
]

/**
 * La clase con la que arranca un desplegable "¿Qué junta es?" cuando la junta
 * nace (no un id escrito a mano, ver el hallazgo I2 de la revisión final de
 * la ronda 14.2): `PLANTILLAS[0].id`, no la cadena `'estatus-udn'` suelta.
 *
 * Antes esta constante SÍ era la cadena a mano, y `NuevaSesionSala.tsx` leía
 * `PLANTILLAS[0].id` por su cuenta con un comentario que argumentaba en
 * contra de exactamente eso ("un id escrito a mano... se desincroniza del
 * catálogo el día que alguien reordene"). Las dos formas coincidían solo
 * porque nadie había reordenado el catálogo todavía — un reordenamiento las
 * habría separado en silencio, cada una apuntando a una plantilla distinta.
 * Ahora `PLANTILLA_POR_DEFECTO` ES `PLANTILLAS[0].id`: una sola fuente, y los
 * dos consumidores (`NuevaSesionSala.tsx`, `FormularioSesion.tsx`) importan
 * ESTA constante, nunca el índice del catálogo directamente.
 */
export const PLANTILLA_POR_DEFECTO = PLANTILLAS[0].id

export function obtenerPlantilla(id: string | null | undefined): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0]
}

/**
 * Los `tipo` que no se pueden borrar en una sesión.
 *
 * Depende de la plantilla: en un estatus de UDN los ocho bloques son el
 * acuerdo con la unidad y no se tocan; en una reunión libre no hay nada
 * sagrado. Antes esto era un `Set` global — con una sola plantilla daba
 * igual, con cinco convertía cada sección de cada plantilla en indeleble.
 */
export function tiposFijosDe(plantillaId: string | null | undefined): Set<string> {
  const p = obtenerPlantilla(plantillaId)
  return p.seccionesFijas ? new Set(p.items.map((i) => i.tipo)) : new Set()
}

/**
 * LA CLAVE DE CLASE de una reunión — no siempre `plantilla` tal cual.
 *
 * MOVIDA AQUÍ (ronda 14.4, tarea 1) desde `ReunionesSala.tsx`, que la definía
 * módulo-scope sin exportarla: `/reuniones` necesitaba EXACTAMENTE la misma
 * regla para pintar la clase de cada tarjeta del ciclo, y este repo ya se
 * comió una lección por copiar un patrón en dos sitios en vez de compartirlo
 * (ver el comentario de `claveDeAgrupacion` original, ronda 14.3). Firma
 * generalizada de `(r: Reunion)` a `(plantillaId: string | null)`: lo único
 * que la función mira es ese campo, y así también sirve para `ReunionEnCiclo`
 * (`src/app/reuniones/page.tsx`) y `SesionAgendada`
 * (`src/componentes/agenda/PanelAgenda.tsx`), que no son `Reunion` pero sí
 * traen `plantilla: string | null`.
 *
 * 'en-blanco' NO es una clase de junta —es la salida de emergencia del
 * catálogo para cuando ninguna clase real encaja, ver `esClaseDeJunta` en la
 * interfaz `Plantilla`, arriba—, así que agruparla en su propia clase "En
 * blanco" inventaría una clase que el catálogo mismo dice que no existe. Se
 * trata IGUAL que `null`: sin clase real, es "sin clasificar". Consultar
 * `esClaseDeJunta` aquí —y no solo comparar contra `'en-blanco'` a mano— es
 * lo que el catálogo pide: una entrada futura con `esClaseDeJunta: false` cae
 * en el mismo sitio sin tocar este archivo.
 */
export function claveDeClase(plantillaId: string | null): string | null {
  if (plantillaId === null) return null
  const plantilla = PLANTILLAS.find((p) => p.id === plantillaId)
  return plantilla?.esClaseDeJunta ? plantillaId : null
}

/**
 * LA ETIQUETA DE UNA CLASE YA NORMALIZADA (la que devuelve `claveDeClase`,
 * NUNCA `plantilla` crudo sin tratar) — para pintarla, jamás para
 * preguntarle al catálogo sin resolver `null` ANTES.
 *
 * ⚠️ `obtenerPlantilla(null)` cae a la PRIMERA entrada del catálogo POR
 * DISEÑO (es lo que necesita un `<select>` que nunca puede quedar vacío, ver
 * `SelectorClaseDeJunta.tsx`) — usarla a secas aquí pintaría "Estatus de
 * UDN" sobre una junta sin clasificar: un dato inventado, en una pantalla
 * que puede ver el director de la UDN. Por eso el `null` se resuelve ANTES
 * de tocar el catálogo, no con su fallback. Mismo motivo que
 * `claveDeClase`, arriba: movida aquí desde `ReunionesSala.tsx` para no
 * repetir esta misma trampa en cada consumidor nuevo.
 *
 * Un id que el catálogo no reconoce —no debería pasar nunca:
 * `crearReunion`/`editarReunion` ya lo rechazan— se pinta TAL CUAL: ni la
 * primera del catálogo (fingiría una clase real) ni "Sin clasificar"
 * (fingiría que no tiene ninguna, cuando sí trae un valor, solo que uno raro).
 */
export function etiquetaDeClase(clave: string | null): string {
  if (clave === null) return 'Sin clasificar'
  const plantilla = PLANTILLAS.find((p) => p.id === clave)
  return plantilla ? plantilla.nombre : clave
}
