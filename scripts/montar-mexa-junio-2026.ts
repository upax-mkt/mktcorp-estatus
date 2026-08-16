/**
 * MONTA EN EL EDITOR EL ESTATUS DE JUNIO 2026 DE MEXA CREATIVA, copiado del
 * Google Slides que armó el equipo (id 13ekWZYZCIdGyGGg6i0mVhRVrXmVZO686-Smf719Eh4g,
 * 15 láminas).
 *
 * Por qué un script y no el editor a mano: mismo motivo que `montar-nc-junio-2026.ts`.
 * Son quince láminas con tres gráficos, cinco tablas, una matriz y seis cifras
 * desglosadas; escribirlas en el formulario es donde se cuelan los errores de
 * transcripción, y este deck se presenta a un cliente.
 *
 * CÓMO SE LEYÓ EL ORIGINAL, que es lo que da confianza en las cifras:
 * - El TEXTO salió de la API de Slides (`getGoogleSlidesContent` +
 *   `read_file_content`), no de mirar la imagen. Todo lo entrecomillado aquí
 *   está copiado de esa extracción, ERRATAS INCLUIDAS (ver más abajo).
 * - Los GRÁFICOS son imágenes rasterizadas pegadas en las láminas: sus valores
 *   no están en la capa de texto. Se exportaron las láminas a PNG y se leyeron
 *   ahí, recortando y ampliando cada franja de etiquetas.
 * - Cada serie se validó CONTRA OTRA FUENTE de la misma lámina antes de darla
 *   por buena:
 *     · Tráfico website: mayo (3,591) y junio (2,519) de la serie "Total 2026"
 *       coinciden EXACTOS con la fila "Sesiones totales" de la tabla de la
 *       misma lámina.
 *     · Paid Media: mayo y junio de Coste ($28,235.46 / $29,472.73), Impr.
 *       (8,859 / 7,348) y Clics (635 / 571) coinciden EXACTOS con la tabla
 *       Mayo|Junio de la misma lámina.
 *
 * LO QUE NO SE COPIÓ, Y POR QUÉ (regla del repo: lo que no se lee con
 * seguridad NO se transcribe, y se dice):
 * - El gráfico de canales de la lámina 8 (Organic Search / Paid Search /
 *   Direct / Email / Organic Social, "El mes pasado" vs "Periodo personalizado
 *   comparado") NO trae ni un número rotulado: solo barras contra un eje
 *   0-2 mil. Cualquier cifra sería inventada. Queda dicho en la nota al pie.
 * - La serie "Conversiones" del gráfico de Paid Media: enero (67), febrero
 *   (68) y marzo (58) se leen, pero abril, mayo y junio quedan pisados por las
 *   etiquetas de "Clics" y son ilegibles incluso ampliando ×14. Se deja fuera
 *   la serie ENTERA en vez de media serie, y se dice en la nota al pie.
 * - "Impresiones" de abril: su etiqueta queda debajo de la de Coste
 *   ("$27,300.00") y no se puede separar. Ese único punto va sin dato. Como el
 *   catálogo exige un valor por periodo, ese gráfico va de cinco meses y EN
 *   BARRAS: una línea uniría marzo con mayo como si fueran contiguos, que es
 *   justo la lectura falsa que hay que evitar. Los CLICS de abril (924) sí se
 *   leen, así que van en el otro gráfico con los seis meses completos.
 *
 * DOS CIFRAS QUE NO CUADRAN EN EL ORIGINAL Y QUE AQUÍ SE COPIAN IGUAL:
 * - "Negocios vivos: $5.5 MDP" con partes de $191 K y $290 K, que suman $481 K.
 * - Perdidos + ganados + vivos suman más que el pipeline generado YTD.
 *   Las dos vienen así de HubSpot en el estatus original. Cuadrarlas exigiría
 *   decidir qué cifra está mal, y eso es una corrección de negocio que le toca
 *   a quien lleva el pipeline, no a este guion. Van al informe de preparación
 *   de la junta, no al documento.
 *
 * ERRATAS DEL ORIGINAL QUE SE CONSERVAN A PROPÓSITO (son del equipo, no del
 * script; corregirlas sería editar el contenido de otro):
 *   "Cómo cambio el consumidor Mexicano?" (sin tilde en cambió, sin ¿ inicial),
 *   "Viva Aerobus", "Johnny Walker", "méxico" en minúscula, "Momcozy".
 *
 * DÓNDE SE MEJORÓ LA DIAGRAMACIÓN (encargo explícito de Franco: replicar el
 * contenido al 100%, pero levantar el diseño donde el original estaba flojo):
 *   1. Focos Q3 — el original mete cuatro industrias en dos columnas de texto
 *      corrido a 9 pt, ilegibles. Aquí son cinco bloques numerados del
 *      catálogo, cada uno con su etiqueta de prioridad, su párrafo, sus
 *      viñetas y su "Oferta gancho" al pie. El sistema los numera.
 *   2. Herramientas comerciales — el original es una lista plana donde no se
 *      distingue qué cuelga de qué. Aquí la jerarquía real va en viñetas
 *      anidadas (one sheets → por servicio → cada servicio).
 *   3. Pipeline — el original es un bloque de texto de 18 renglones dentro de
 *      una caja. Aquí son las seis cifras desglosadas del catálogo, cada una
 *      con su reparto Mkt/Comercial.
 *   4. Brújula Q3 — el original la pega como captura de pantalla. Aquí es una
 *      matriz de estados de verdad, con sus tonos y su leyenda.
 *   5. Performance sitio web — las dos láminas del original se quedan como dos
 *      secciones, pero la segunda usa las cuatro cifras como KPIs con su delta
 *      (el original los tiene como texto dentro de tarjetas).
 *
 * Uso:  npx tsx scripts/montar-mexa-junio-2026.ts [--seco]
 *       npx tsx scripts/montar-mexa-junio-2026.ts --actualizar <reunionId>
 *   --seco  valida todo y no escribe nada.
 *
 * `tsx` no carga `.env.local` por su cuenta (mismo motivo que documenta
 * `drizzle.config.ts` y `scripts/poblar-marcas.ts`).
 */
process.loadEnvFile('.env.local')

import { crearReunionConDocumento, anadirSeccion, guardarSeccion } from '../src/db/documentos'
import { instanteEnCDMX } from '../src/lib/fecha'
import { aDecision, type BorradorSeccion } from '../src/secciones/borrador'

const SECO = process.argv.includes('--seco')

type Seccion = { nombre: string; borrador: BorradorSeccion }

const SEMAFORO = { verde: 'listo', amarillo: 'en-proceso', rojo: 'no-realizado' } as const

/**
 * Fila de la tabla de pendientes. El color es OPCIONAL a propósito: en el
 * original solo las dos tareas de Valentina Ochoa traen punto verde; las otras
 * cinco están sin estatus. Rellenarlas sería inventar el estado de un pendiente
 * ajeno, así que la celda va vacía y la fila sin semáforo — que es exactamente
 * lo que el esquema admite (`TextoPlanoOVacio` en `celdas`, `estado` opcional).
 */
function pendiente(responsable: string, tarea: string, color?: keyof typeof SEMAFORO) {
  if (!color) return { celdas: [responsable, tarea, ''] }
  const estado = SEMAFORO[color]
  const etiqueta = { listo: 'Listo', 'en-proceso': 'En proceso', 'no-realizado': 'No realizado' }[estado]
  return { celdas: [responsable, tarea, etiqueta], estado }
}

const SECCIONES: Seccion[] = [
  // ── 1. Portada ──────────────────────────────────────────────────────────
  {
    nombre: 'Portada',
    borrador: { layout: 'portada', titulo: 'Estatus mensual', subtitulo: 'Junio 2026' },
  },

  // ── 2. Agenda ───────────────────────────────────────────────────────────
  {
    nombre: 'Agenda',
    borrador: {
      layout: 'agenda',
      titulo: 'Agenda',
      // Sin "1." ni "2)": el layout las numera solo.
      //
      // Los cuatro puntos van LITERALES del original, y por eso el primero
      // dice "Pendientes del mes pasado" aunque su divisor se llame "Acuerdos
      // y pendientes sesión pasada": esa discrepancia es del deck original,
      // que titula distinto la agenda y el divisor. Una línea de agenda se
      // convierte en enlace solo si coincide EXACTA con el título de una
      // sección (SeccionDocumento.tsx), así que este punto no enlazará y los
      // otros tres sí. Se prefiere copiar lo que el equipo escribió antes que
      // reescribirle la agenda para ganar un enlace.
      // Los cuatro puntos del original, con las dos secciones que esta réplica
      // añade en su sitio: la lectura del mes abre y los siguientes pasos
      // cierran. Sin ellas, la agenda mentiría sobre el recorrido.
      cuerpo: [
        'Junio en una lectura',
        'Pendientes del mes pasado',
        'Portafolio & ecosistema',
        'Performance & conversión',
        'Outbound & pipeline',
        'Lo que sigue en julio',
      ],
    },
  },

  // ── 3. El mes, de una lectura ───────────────────────────────────────────
  // NO ESTÁ EN EL ORIGINAL, y es la mayor adición de esta réplica. El estatus
  // del equipo arranca en pendientes administrativos: un director llega al
  // final del documento sin que nadie le haya dicho cómo le fue el mes, y lo
  // arma él con cifras repartidas en cinco secciones. Esta sección hace ese
  // trabajo antes, que es lo que pide el producto ("cada pantalla comunica una
  // lectura, no un volcado de datos").
  //
  // No hay un solo dato nuevo: las cuatro cifras y los ocho puntos salen de
  // secciones posteriores de este mismo deck. Lo único calculado son las
  // sumas y variaciones, y cada una se puede rehacer con las tablas de más
  // abajo: sesiones 3,591 → 2,519 (−29.9%); orgánico 1,000 contra meta 807
  // (+23.9%); MQLs 6+6 → 4+3; SQLs 1 contra meta 7.
  {
    nombre: 'Junio en una lectura',
    borrador: {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Junio en una lectura',
      subtitulo: 'El mes cierra con menos volumen y mejor orgánico, y con la conversión a SQL como el problema',
      kpis: [
        { valor: '1 de 7', delta: '-6', rotulo: 'SQLs contra meta' },
        { valor: '7', delta: '-5', rotulo: 'MQLs del mes' },
        { valor: '2,519', delta: '-30%', rotulo: 'Sesiones del sitio' },
        { valor: '1,000', delta: '+24%', rotulo: 'Orgánicas sobre meta' },
      ],
      columnas: [
        {
          titulo: 'Lo que sostiene',
          puntos: [
            { texto: 'La caída del tráfico no viene del orgánico: ese canal superó su meta y creció 46% contra junio del año pasado.' },
            { texto: 'El kit comercial quedó cerrado y listo para producción, así que outbound entra a Q3 con material.' },
            { texto: 'Q3 abre con cuatro industrias en ventana de venta y el ciclo de Mexa alcanza para cerrar dentro del trimestre.' },
          ],
        },
        {
          titulo: 'Lo que preocupa',
          puntos: [
            { texto: 'El problema no es el volumen sino la calidad: de los cuatro MQLs del sitio ninguno resultó aprovechable, y 13 de los 25 de paid siguen sin calificar.' },
            { texto: 'Paid sostuvo la inversión y entregó la mitad de MQLs y ningún SQL: cada MQL costó el doble que en mayo.' },
            { texto: 'Momcozy, que estaba en cierre por $5,000,000, se detuvo hasta que definan su operación en México.' },
          ],
        },
      ],
    },
  },

  // ── 4-5. Acuerdos y pendientes de la sesión pasada ──────────────────────
  {
    nombre: 'Divisor · Acuerdos',
    borrador: { layout: 'divisor-seccion', titulo: 'Acuerdos y pendientes sesión pasada' },
  },
  {
    nombre: 'Pendientes',
    borrador: {
      layout: 'pendientes-semaforo',
      titulo: 'Pendientes',
      subtitulo: 'Sesión del 12 de mayo · 2 de 7 cerradas',
      tablas: [
        {
          columnas: ['Responsable', 'Tarea', 'Estatus'],
          // Valentina e Ileana llevan dos tareas cada una: agrupadas, su nombre
          // aparece una vez, como en el original.
          agruparPrimeraColumna: true,
          filas: [
            pendiente('Valentina Ochoa | Mexa', 'El estudio "Soledad" ya nos lo pueden mandar esta semana y las "ideas" nos las pueden pasar la siguiente semana.', 'verde'),
            pendiente('Valentina Ochoa | Mexa', 'Compartir a mkt corp los Notimexa, tendencias de "La Roja"', 'verde'),
            pendiente('Jose Luis | Mexa', 'Incluir a Mkt (David Porchini) en reuniones de venta'),
            pendiente('César Mejía | RevOps', 'Pedir a Fer Torres info de inversión de industrias para la Brújula'),
            pendiente('Ileana Cruz | Outbound', 'Comercial pide entender cómo está prospectando mkt para no llegar tan en frío con potenciales clientes. (José Luis menciona que ha pasado que hay leads que a la reunión con comercial ya están esperando una propuesta.)'),
            pendiente('Ileana Cruz | Outbound', 'MC menciona que tenemos que revisar qué hicimos con El Portón y Chiq para ver qué hicimos bien para cerrarlos y replicar con otros grandes.'),
            pendiente('Fernando Borges | Paid', 'Identificar buenas prácticas de paid para replicar mejorar la calidad de lo que llega, que aunque es bueno necesitamos "pegarle" a 3-4 cuentas grandes.'),
          ],
        },
      ],
      // La nota habla del DATO, no de cómo se montó el documento: quien lee
      // esto es el director de la UDN, y la plomería de la transcripción no es
      // asunto suyo. Lo que sí le importa es que cinco pendientes siguen sin
      // estado — eso es materia de la junta.
      notaPie: 'Cinco de las siete tareas no tienen estatus reportado desde la sesión del 12 de mayo.',
    },
  },

  // ── 5-6. Portafolio & ecosistema ────────────────────────────────────────
  {
    nombre: 'Divisor · Portafolio',
    borrador: { layout: 'divisor-seccion', titulo: 'Portafolio & ecosistema' },
  },
  {
    nombre: 'Herramientas comerciales',
    borrador: {
      layout: 'texto-multicolumna',
      titulo: 'Herramientas comerciales',
      subtitulo: 'Kit entregado el 29 de mayo · 5 piezas aprobadas para producción el 16 de junio',
      // TRES COLUMNAS Y NO DOS. Con dos, la izquierda corría dieciséis líneas
      // a tres niveles de anidación y la derecha se acababa en cinco: media
      // sección en blanco y una lista que había que recorrer entera para
      // encontrar nada. Los one sheets son un bloque propio —son el grueso del
      // kit y se leen como catálogo, no como continuación de los contactos— y
      // separarlos equilibra la sección y la vuelve escaneable. Ni una pieza
      // cambia de sitio en el inventario: solo se agrupan como ya estaban.
      columnas: [
        {
          titulo: 'Entregado',
          etiqueta: '29 de mayo',
          puntos: [
            { texto: 'Credenciales Ejecutivas (para envío 5 slides)' },
            { texto: 'Thought Leadership Deck: "Cómo cambio el consumidor Mexicano?"' },
            { texto: '1er contacto' },
            { texto: '2do contacto' },
            { texto: 'Invitación a presentación de credenciales' },
            // En el original, "2 versiones de cada uno: Short y Long versión"
            // va suelto entre las piezas y no se entiende a qué aplica. Aquí
            // cierra la lista, que es lo que dice: cada pieza va en dos
            // versiones.
            { texto: 'Cada pieza en dos versiones: short y long' },
          ],
        },
        {
          titulo: 'One sheets',
          etiqueta: 'Entregados el 29 de mayo',
          puntos: [
            { texto: 'De agencia: One sheet de Mexa Creativa' },
            {
              texto: 'Por servicio',
              hijos: [
                { texto: 'Social content' },
                { texto: 'Producción' },
                { texto: 'Performance' },
                { texto: 'Creatividad y Branding.' },
              ],
            },
            {
              texto: 'Por industria',
              hijos: [
                { texto: 'Automotriz' },
                { texto: 'Belleza y cuidado personal' },
                { texto: 'Consumo masivo' },
                { texto: 'Retail' },
              ],
            },
          ],
        },
        {
          titulo: 'Aprobado para producción',
          etiqueta: '16 de junio',
          puntos: [
            { texto: 'One sheet de agencia' },
            { texto: 'Invitación presentación' },
            { texto: 'Credenciales ejecutivas (5 slides)' },
            { texto: 'Primer contacto short' },
            { texto: 'Segundo contacto short' },
          ],
        },
      ],
    },
  },

  // ── 7-10. Performance & conversión ──────────────────────────────────────
  {
    nombre: 'Divisor · Performance',
    borrador: { layout: 'divisor-seccion', titulo: 'Performance & conversión' },
  },
  {
    nombre: 'Performance sitio web',
    borrador: {
      layout: 'comparativa-periodos',
      titulo: 'Performance sitio web | Tráfico',
      subtitulo: 'El tráfico total cae 30%, pero el orgánico cierra 24% por encima de meta',
      tablas: [
        {
          // La columna de etiquetas no se titula: por eso el primer encabezado
          // va vacío.
          columnas: ['', 'Mayo', 'Junio'],
          filas: [
            { celdas: ['Sesiones totales', '3,591', '2,519'] },
            { celdas: ['Páginas por sesión', '1.33', '1.29'] },
            { celdas: ['Posición media', '9.6', '9.8'] },
            { celdas: ['MQLs', '6', '4'] },
            { celdas: ['SQLs', '1', '1'] },
          ],
        },
      ],
      graficos: [
        {
          tipo: 'combo-barras-lineas',
          titulo: 'Tráfico website',
          periodos: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio'],
          series: [
            // Las barras son el eje DERECHO en el original (0-8,000) y las
            // líneas el izquierdo (0-1,500). Se respeta: sin eso, "Total 2026"
            // (4,393) aplastaría a "Orgánico" (1,007) contra el suelo.
            { etiqueta: 'Total 2026', valores: [4393, 7244, 4997, 2924, 3591, 2519], forma: 'barra', eje: 'derecho' },
            { etiqueta: 'Orgánico 2026', valores: [1007, 1292, 1297, 1087, 1170, 1000], forma: 'linea', eje: 'izquierdo' },
            { etiqueta: 'Meta Orgánico 2026', valores: [704, 723, 744, 764, 785, 807], forma: 'linea-punteada', eje: 'izquierdo' },
            // Sólida, no punteada, aunque en el original se dibuje con trazo
            // discontinuo: aquí el punteado significa "meta" (convención del
            // catálogo, ver SerieDatos.forma). Un dato medido del año pasado
            // con el mismo trazo que un objetivo se lee como si fuera otro
            // objetivo.
            { etiqueta: 'Orgánico 2025', valores: [499, 520, 684, 636, 443, 685], forma: 'linea', eje: 'izquierdo' },
          ],
          mostrarValores: true,
        },
      ],
      // Los "Insights" del original son una sola lista donde conviven dos cosas
      // distintas: QUÉ entró (pipeline, leads y su estado) y POR DÓNDE entró
      // (las páginas). Juntas eran media pantalla de viñetas planas y el dato
      // que importa —ninguno de los cuatro MQLs resultó aprovechable— quedaba
      // enterrado a media lista. Separadas, cada columna sostiene una idea.
      columnas: [
        {
          titulo: 'Lo que entró',
          etiqueta: 'Pipeline 2026 con fuente website: $1.1M',
          puntos: [
            {
              texto: '4 MQLs, ninguno aprovechable',
              hijos: [
                { texto: 'CreatorPlace (Descalificado | Ofreció servicios de "influencer marketing")' },
                { texto: 'LizBetSoft (Pendiente de calificar)' },
                { texto: 'robot (Dejó datos pero falsos)' },
                { texto: 'Carpentier BET (Descalificado | Teléfono equivocado)' },
              ],
            },
            { texto: 'SQL: Mutuus (Reunión de acercamiento, 12 jun.)' },
          ],
        },
        {
          titulo: 'Por dónde entró',
          etiqueta: 'Páginas más visitadas',
          puntos: [
            { texto: 'Home (30%)' },
            { texto: 'LP Paid media "Desarrollo de campaña" (19%)' },
            { texto: 'Guía "Verano sin clichés" (5%)' },
            { texto: 'Blog "Tendencias redes sociales 2026" (4%)' },
            { texto: 'Blog "Libros cultura mexicana" (3%)' },
          ],
        },
      ],
      notaPie: 'El estatus original abre además el tráfico por canal de adquisición (Organic Search, Paid Search, Direct, Email, Organic Social); ese gráfico no trae cifras rotuladas y queda pendiente de reexportar. Las series de 2026 llegan hasta junio; la meta y el orgánico del año pasado se muestran sobre el mismo tramo para compararlos mes a mes.',
    },
  },
  {
    nombre: 'Performance sitio web · SEO',
    borrador: {
      layout: 'kpis-fila-dos-columnas',
      titulo: 'Performance sitio web | Búsqueda orgánica',
      subtitulo: 'La caída se concentra en el contenido educativo que absorbió AI Overviews',
      kpis: [
        { valor: '9.8', delta: '-0.2', rotulo: 'Posición media' },
        { valor: '79.8k', delta: '-10%', rotulo: 'Impresiones' },
        { valor: '763', delta: '-12%', rotulo: 'Clics' },
        { valor: '1.1%', delta: 'estable', rotulo: 'CTR' },
      ],
      columnas: [
        {
          titulo: 'Principales hallazgos',
          puntos: [
            { texto: 'La caída se concentra en contenido educativo tipo "qué es / importancia de" (identidad de marca, comunicaciones integradas, marketing omnicanal), afectado por AI Overviews de Google.' },
            { texto: 'El artículo "Identidad de marca: qué es y su importancia" es el que tuvo la mayor caída (posición 25.5 → 36).' },
            { texto: 'Home, "Consultoría de marca" e "Isotipo/Imagotipo/Isologo" mejoraron y amortiguaron la caída.' },
            { texto: 'Móvil se deteriora (7.6 → 8.0) mientras Desktop se mantiene estable; ahí está concentrada la pérdida.' },
          ],
        },
        {
          titulo: 'Acciones prioritarias',
          puntos: [
            { texto: 'Actualizar contenido del artículo de "Identidad de marca". Conviene refrescar el contenido con información y ejemplos de 2026. Reforzar enlaces internos hacia ese artículo desde las páginas que sí están funcionando bien (home, consultoria-marca, logotipo-isotipo-imagotipo-isologo).' },
            { texto: 'Replicar en blog educativo lo que funcionó en páginas ganadoras (actualizar contenido, añadir FAQs, reforzar E-E-A-T*, en caso de ser posible añadir ejemplos reales de marcas mexicanas).' },
            { texto: 'Dado que presta-prenda y consultoria-marca están funcionando muy bien, capitalizarlos con contenido adicional similar (casos de éxito, páginas de servicio).' },
            { texto: 'Auditar Core Web Vitals y usabilidad móvil. (Ya está tomado y se están resolviendo estos problemas).' },
          ],
        },
      ],
      notaPie: '*E-E-A-T son las siglas de Experience, Expertise, Authoritativeness y Trustworthiness (Experiencia, Especialización/Pericia, Autoridad y Confiabilidad).',
    },
  },
  {
    nombre: 'Performance Paid Media',
    borrador: {
      // `grafico-y-tabla` y no `comparativa-periodos`: es el único layout que
      // admite `kpis` junto a tablas y gráficos, y la cifra de venta
      // ($6,785,920) es LA noticia de la sección. Como etiqueta de columna
      // salía en tipo de nota al pie, que es donde nadie la busca.
      layout: 'grafico-y-tabla',
      titulo: 'Performance paid media',
      subtitulo: 'Misma inversión, la mitad de MQLs: el costo por MQL pasa de $4,706 a $9,824',
      kpis: [
        { valor: '0', delta: '-1', rotulo: 'SQLs de paid' },
        { valor: '3', delta: '-3', rotulo: 'MQLs de paid' },
        { valor: '$9,824', delta: 'x2.1', rotulo: 'Costo por MQL' },
      ],
      tablas: [
        {
          columnas: ['', 'Mayo', 'Junio'],
          filas: [
            { celdas: ['Inversión', '$28,235.46', '$29,472.73'] },
            { celdas: ['Impresiones', '8,859', '7,348'] },
            { celdas: ['Clics', '635', '571'] },
            { celdas: ['MQLs', '6', '3'] },
            { celdas: ['SQLs', '1', '0'] },
          ],
        },
        {
          titulo: 'Estado de MQLs',
          columnas: ['Estado', 'Total', '%'],
          filas: [
            { celdas: ['Descalificado', '8', '32%'] },
            { celdas: ['Sin calificar', '1', '4%'] },
            { celdas: ['Pendiente calificar', '13', '52%'] },
            { celdas: ['Calificado', '3', '12%'] },
            { celdas: ['Total', '25', '100%'], destacada: true },
          ],
        },
      ],
      graficos: [
        // DOS GRÁFICOS DONDE EL ORIGINAL TRAE UNO, y es a propósito — mismo
        // motivo que documenta `montar-nc-junio-2026.ts`. El original mete las
        // cuatro series en un dibujo con escala LOGARÍTMICA, que es lo que deja
        // ver a la vez un coste de $38,013 y 58 conversiones. Este catálogo no
        // tiene escala logarítmica: juntas y en lineal, "Clics" (571 a 1,356)
        // se aplasta contra "Impresiones" (7,348 a 15,938). Partido en dos,
        // cada par comparte magnitud y las tres series legibles se leen. Ni un
        // valor cambia.
        {
          tipo: 'lineas-multiples',
          titulo: 'Coste y clics',
          // Los seis meses completos: tanto el coste como los clics se leen sin
          // ambigüedad en el original. Doble eje porque $38,013 y 1,356 clics
          // no comparten escala.
          periodos: ['enero 2026', 'febrero 2026', 'marzo 2026', 'abril 2026', 'mayo 2026', 'junio 2026'],
          series: [
            { etiqueta: 'Coste', valores: [29819.29, 37749.27, 38013.56, 27300, 28235.46, 29472.73], forma: 'linea', eje: 'izquierdo', prefijo: '$' },
            { etiqueta: 'Clics', valores: [1152, 1356, 1101, 924, 635, 571], forma: 'linea', eje: 'derecho' },
          ],
          mostrarValores: true,
        },
        {
          // BARRAS Y NO LÍNEA, a propósito: a este gráfico le falta abril —su
          // etiqueta queda pisada en el original y no se puede leer— y una
          // línea uniría marzo con mayo como si fueran meses contiguos, que es
          // exactamente la lectura falsa que hay que evitar. Las barras no
          // sugieren continuidad: el mes que falta se nota.
          tipo: 'barras',
          titulo: 'Impresiones (sin dato de abril)',
          periodos: ['enero 2026', 'febrero 2026', 'marzo 2026', 'mayo 2026', 'junio 2026'],
          series: [
            { etiqueta: 'Impresiones', valores: [13499, 15938, 14708, 8859, 7348], forma: 'barra' },
          ],
          mostrarValores: true,
        },
      ],
      columnas: [
        {
          titulo: 'Venta',
          etiqueta: 'Facturado, Ganado por facturar y cierre: $6,785,920 acumulados',
          puntos: [
            { texto: 'Momcozy que estuvo en cierre por $5,000,000 se detuvo' },
            { texto: 'El proyecto está postergado para más adelante ya que hoy en día solo tienen una pop store en México y están viendo si funciona o no. En cuanto tengan el proyecto más avanzado en méxico nos vuelven a contactar.' },
          ],
        },
      ],
      notaPie: 'La venta atribuida a paid media es acumulada e incluye lo facturado, lo ganado por facturar y lo que estaba en cierre; los $5,000,000 de Momcozy que se detuvieron estaban dentro de ese corte. No se incluye la serie de conversiones: en el gráfico original solo son legibles enero (67), febrero (68) y marzo (58), porque de abril a junio sus etiquetas quedan pisadas por las de clics. Las impresiones de abril faltan por la misma razón.',
    },
  },

  // ── 11-14. Outbound & pipeline ──────────────────────────────────────────
  {
    nombre: 'Divisor · Outbound',
    borrador: { layout: 'divisor-seccion', titulo: 'Outbound & pipeline' },
  },
  {
    nombre: 'Outbound & Pipeline · Junio',
    borrador: {
      layout: 'meta-real-porcentaje',
      titulo: 'Outbound & Pipeline | Junio 2026',
      subtitulo: 'De los $39.4 MDP de pipeline generados en el año se perdieron $37.2, y junio cerró con 1 SQL de 7',
      metaReal: {
        titulo: 'SQLs',
        filas: [
          { rotulo: 'Total', meta: '7', real: '1', porcentaje: '14%' },
          { rotulo: 'Mkt', meta: '4', real: '1', porcentaje: '25%' },
          { rotulo: 'Ventas', meta: '3', real: '0', porcentaje: '0%' },
        ],
      },
      cifrasDesglosadas: [
        { rotulo: 'Pipeline ideal', valor: '$15.6 MDP' },
        {
          rotulo: 'Pipeline generado YTD', valor: '$39.4 MDP',
          partes: [{ rotulo: 'Mkt', valor: '$36.1 MDP' }, { rotulo: 'Comercial', valor: '$3.4 MDP' }],
        },
        {
          rotulo: 'Negocios perdidos YTD', valor: '$37.2 MDP', destacada: true,
          partes: [{ rotulo: 'Mkt', valor: '$34.08 MDP' }, { rotulo: 'Comercial', valor: '$3.1 MDP' }],
        },
        {
          rotulo: 'Negocios ganados por facturar YTD', valor: '$8.3 MDP',
          partes: [{ rotulo: 'Mkt', valor: '$3.01 MDP' }, { rotulo: 'Comercial', valor: '$5.3 MDP' }],
        },
        {
          rotulo: 'Negocios ganados facturados YTD', valor: '$3.8 MDP',
          partes: [{ rotulo: 'Mkt', valor: '$3.8 MDP' }, { rotulo: 'Comercial', valor: '$0' }],
        },
        {
          rotulo: 'Negocios vivos', valor: '$5.5 MDP',
          partes: [{ rotulo: 'Mkt', valor: '$191 K' }, { rotulo: 'Comercial', valor: '$290 K' }],
        },
      ],
      columnas: [
        // DOS COLUMNAS Y NO UNA: en el original, las ocho cuentas calientes y
        // el universo de prospección (Target 253 / ICP 395) son dos bloques
        // separados. Metido como `etiqueta` de la primera columna, 253/395 se
        // leía pegado al encabezado, como si describiera a las ocho cuentas
        // warm. Además, ocho nombres en una sola columna dejaban media sección
        // en blanco.
        {
          titulo: 'Cuentas en warm',
          puntos: [
            { texto: 'Viva Aerobus' },
            { texto: 'Xiaomi' },
            { texto: 'Johnny Walker' },
            { texto: 'Grupo IUSA' },
            { texto: 'Barcel' },
            { texto: 'Chanel' },
            { texto: 'Hershey Company' },
            { texto: 'Chirey' },
          ],
        },
        {
          titulo: 'Cuentas en prospección',
          puntos: [
            { texto: 'Target: 253' },
            { texto: 'ICP: 395' },
          ],
        },
      ],
      notaPie: 'Datos extraídos de Hubspot: venta externa gestionada por Marketing Corp, sin la venta al grupo. Dos cifras vienen sin reconciliar del corte original y se reproducen tal cual: las partes de "Negocios vivos" ($191 K y $290 K) no suman su total de $5.5 MDP, y perdidos, ganados y vivos suman por encima del pipeline generado YTD.',
    },
  },
  {
    nombre: 'Focos Q3 · calendario',
    borrador: {
      layout: 'matriz-estados',
      // "Brújula Q3" y no "Focos Q3": el original titula IGUAL las dos láminas
      // de focos, y al hojear el documento parecían contenido duplicado. El
      // subtítulo dice el trimestre que la matriz cubre de verdad — el
      // "jul–dic" del original es el encabezado de la leyenda del calendario
      // completo, no el rango de esta rejilla, que es Q3.
      titulo: 'Outbound & Pipeline | Brújula Q3',
      subtitulo: '¿En qué industrias prospectar de julio a septiembre?',
      matriz: {
        columnas: ['JUL', 'AGO', 'SEP'],
        // El orden es el de los CINCO FOCOS numerados de la sección anterior
        // (menor, mayor, manufactureras, profesionales, alojamiento), no el del
        // original, que en la brújula intercambia mayor y manufactureras. Son
        // las mismas cinco industrias a una pantalla de distancia: cruzarlas
        // con dos órdenes distintos hace tropezar. No cambia ni un estado.
        filas: [
          {
            encabezado: 'Comercio al por menor',
            celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Prepara', tono: 'medio' }, { texto: 'Vende', tono: 'alto' }],
            // La barra del original marca un TRAMO (prospección → cierre), no
            // una fecha de cierre: se redacta como tramo. Y corta, porque el
            // carril de encabezados de la matriz es estrecho y una nota larga
            // estira la fila y descuadra la rejilla; la fuente va una sola vez,
            // en la nota al pie.
            nota: 'Mexa · Campañas de marca — ciclo de prospección a cierre: agosto.',
          },
          {
            encabezado: 'Comercio al por mayor',
            celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Prepara', tono: 'medio' }, { texto: 'Vende', tono: 'alto' }],
          },
          {
            encabezado: 'Industrias manufactureras',
            celdas: [{ texto: 'Espera', tono: 'neutro' }, { texto: 'Vende', tono: 'alto' }, { texto: 'Prepara', tono: 'medio' }],
          },
          {
            encabezado: 'Servicios profesionales, científicos y técnicos',
            celdas: [{ texto: 'Espera', tono: 'neutro' }, { texto: 'Vende', tono: 'alto' }, { texto: 'Explora', tono: 'bajo' }],
            nota: 'Mexa · Consultoría de marca — ciclo de prospección a cierre: agosto y septiembre.',
          },
          {
            encabezado: 'Servicios de alojamiento temporal y de preparación de alimentos y bebidas',
            celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Prepara', tono: 'medio' }, { texto: 'Espera', tono: 'neutro' }],
          },
        ],
        leyenda: [
          'Explora · Sector despertando · primeros contactos',
          'Prepara · Actividad subiendo · califica y agenda propuestas',
          'Vende · Pico de actividad · máxima disposición de compra',
          'Espera · Actividad baja · monitorear, no priorizar',
          'CICLO: Explora → Prepara → Vende → Espera. El sector repite este ciclo cada temporada según su comportamiento económico.',
        ],
      },
      notaPie: '¿En qué industrias deberías prospectar este mes? La brújula responde por trimestre; el ciclo estimado de prospección a cierre de Mexa se anota bajo la industria a la que aplica. Fuente de los ciclos: HubSpot 2024, 6Sense 2025 y datos de UiX y Marketing United.',
    },
  },
  {
    nombre: 'Focos Q3',
    borrador: {
      layout: 'tarjetas-numeradas',
      titulo: 'Outbound & Pipeline | Focos Q3',
      subtitulo: 'Cuatro industrias con ventana abierta en Q3 y una táctica, por orden de prioridad',
      bloques: [
        {
          titulo: 'Comercio al por menor',
          etiqueta: 'Prioridad alta',
          parrafo: 'Es una de las mejores industrias para Mexa porque combina dos ventanas verdes en Q3. Con ciclo de 1–1.5 meses, lo que abramos hoy puede llegar a cierre en agosto o estar listo para septiembre.',
          puntos: [
            { texto: 'Campañas de marca.' },
            { texto: 'Estrategia creativa.' },
            { texto: 'Posicionamiento.' },
            { texto: 'Campañas de temporada.' },
            { texto: 'Lanzamientos.' },
            { texto: 'Conceptualización de campañas 360.' },
          ],
          pie: { rotulo: 'Oferta gancho', texto: 'Ayudamos a marcas de retail a convertir temporada, promociones o lanzamientos en campañas con narrativa clara, presencia consistente y mejor recordación en el mercado mexicano.' },
        },
        {
          titulo: 'Comercio al por mayor',
          etiqueta: 'Prioridad alta',
          parrafo: 'También tiene doble verde en Q3 y puede tener mucha necesidad de marca, campañas comerciales y comunicación para canales.',
          puntos: [
            { texto: 'Campañas de marca.' },
            { texto: 'Estrategia de comunicación B2B/B2B2C.' },
            { texto: 'Materiales para canal.' },
            { texto: 'Campañas para distribuidores.' },
            { texto: 'Branding comercial.' },
            { texto: 'Comunicación para empujar sell-out.' },
          ],
          pie: { rotulo: 'Oferta gancho', texto: 'Fortalecemos la presencia de marca frente a canales, distribuidores y clientes finales para apoyar objetivos comerciales y acelerar demanda.' },
        },
        {
          titulo: 'Industrias manufactureras',
          etiqueta: 'Prioridad alta para agosto',
          parrafo: 'Agosto está en verde, entonces julio es justo el mes para abrir conversación. Para Mexa, esta industria puede ser potente si abordamos desde marca, producto, lanzamiento, comunicación institucional o campañas comerciales.',
          puntos: [
            { texto: 'Campañas de producto.' },
            { texto: 'Branding o reposicionamiento.' },
            { texto: 'Lanzamientos.' },
            { texto: 'Comunicación de innovación.' },
            { texto: 'Estrategia para entrada a nuevos mercados.' },
            { texto: 'Campañas B2B / trade.' },
          ],
          pie: { rotulo: 'Oferta gancho', texto: 'Ayudamos a transformar productos, capacidades industriales o propuestas técnicas en campañas claras, relevantes y comercialmente accionables.' },
        },
        {
          titulo: 'Servicios profesionales',
          etiqueta: 'Prioridad alta para agosto',
          parrafo: 'Agosto está en verde, y además en la brújula aparece directamente relacionado con Consultoría de marca.',
          puntos: [
            { texto: 'Consultoría de marca.' },
            { texto: 'Estrategia de posicionamiento.' },
            { texto: 'Narrativa comercial.' },
            { texto: 'Rebranding.' },
            { texto: 'Arquitectura de marca.' },
            { texto: 'Campañas de autoridad / thought leadership.' },
            { texto: 'Comunicación para servicios complejos.' },
          ],
          pie: { rotulo: 'Oferta gancho', texto: 'Convertimos servicios complejos en una propuesta de marca clara, diferenciada y fácil de entender para el mercado mexicano.' },
        },
        {
          titulo: 'Servicios de alojamiento temporal y preparación de alimentos y bebidas',
          etiqueta: 'Prioridad media / táctica',
          parrafo: 'Julio está en verde, pero el ciclo de Mexa es de 1–1.5 meses. Solo foco si son oportunidades rápidas, cuentas calientes o campañas muy tácticas.',
          puntos: [
            { texto: 'Campañas de marca.' },
            { texto: 'Campañas promocionales.' },
            { texto: 'Lanzamientos de temporada.' },
            { texto: 'Comunicación para restaurantes, hoteles, grupos gastronómicos o turismo.' },
            { texto: 'Campañas para tráfico, awareness o experiencia.' },
          ],
          pie: { rotulo: 'Oferta gancho', texto: '"Diseñamos campañas que conectan y son ágiles para aumentar visibilidad, tráfico y recordación en momentos clave de consumo."' },
        },
      ],
    },
  },

  // ── Lo que sigue ────────────────────────────────────────────────────────
  // TAMPOCO ESTÁ EN EL ORIGINAL. El estatus del equipo termina en el
  // calendario de prospección: en un mes con un SQL de siete y un negocio de
  // $5 MDP caído, la última idea que se lleva el director es en qué mes
  // conviene prospectar. Esta sección recoge lo que el propio deck ya propone
  // y lo pone junto, que es lo que se acuerda en la junta.
  //
  // SIN DUEÑO NI FECHA a propósito: el deck no los trae y ponerlos sería
  // repartir trabajo ajeno. Se dejan para acordarse en la sesión, y así lo
  // dice la nota al pie.
  {
    nombre: 'Lo que sigue en julio',
    borrador: {
      layout: 'texto-multicolumna',
      titulo: 'Lo que sigue en julio',
      subtitulo: 'Lo que este estatus deja sobre la mesa, para cerrar con dueño y fecha',
      columnas: [
        {
          titulo: 'Recuperar búsqueda',
          puntos: [
            { texto: 'Actualizar "Identidad de marca" con información y ejemplos de 2026, y reforzar los enlaces internos desde las páginas que sí funcionan.' },
            { texto: 'Replicar en el blog educativo lo que funcionó en las páginas ganadoras: FAQs, E-E-A-T y ejemplos de marcas mexicanas.' },
            { texto: 'Capitalizar presta-prenda y consultoria-marca con casos de éxito y páginas de servicio.' },
            { texto: 'Cerrar la auditoría de Core Web Vitals y usabilidad móvil, que ya está en curso.' },
          ],
        },
        {
          titulo: 'Arreglar la conversión',
          puntos: [
            { texto: 'Calificar los 13 MQLs de paid que siguen pendientes y devolver el criterio de descalificación a la pauta.' },
            { texto: 'Revisar la segmentación de paid: la inversión se sostuvo y los MQLs se partieron a la mitad.' },
            { texto: 'Cerrar los cinco pendientes de la sesión del 12 de mayo que siguen sin estatus.' },
            { texto: 'Confirmar en HubSpot si Momcozy sigue contando dentro de los negocios vivos.' },
          ],
        },
        {
          titulo: 'Abrir Q3',
          puntos: [
            { texto: 'Prospectar comercio al por menor y al por mayor, que están en venta en julio y repiten en septiembre.' },
            { texto: 'Abrir conversación en manufactura y servicios profesionales durante julio, para llegar a la ventana de agosto.' },
            { texto: 'Tomar alojamiento y alimentos solo como táctico: cuentas calientes o campañas de temporada.' },
            { texto: 'Poner a trabajar el kit comercial aprobado en las cuentas en warm.' },
          ],
        },
      ],
    },
  },

  // ── Cierre ──────────────────────────────────────────────────────────────
  {
    // El cierre del original es la lámina de Grupo UPAX con las ocho marcas.
    // Aquí no se copia como imagen: el documento se viste solo con la identidad
    // de la sala que lo recibe, que es justo lo que esta herramienta hace.
    nombre: 'Cierre',
    borrador: {
      layout: 'cierre',
      titulo: 'Grupo UPAX',
      // Las ocho marcas van escritas porque en el original son la barra de
      // logos del cierre, y sin ellas la sección quedaba en un título suelto.
      // Escritas y no como imagen: el documento se viste con la identidad de
      // la sala que lo recibe, y una tira de logos rasterizada pelearía con
      // ella.
      subtitulo: 'Research Land · Promo Espacio · Mexa Creativa · Marketing United · House of Films · UiX · Zeus · NeraCode',
    },
  },
]

// ── Ejecución ───────────────────────────────────────────────────────────────

async function main() {
  // 1. Validar TODAS las secciones antes de escribir nada. `aDecision` es el
  //    mismo validador que corre al maquetar: si algo no pasa aquí, tampoco
  //    pasaría en la app, y es mejor enterarse sin haber creado la reunión.
  const malas = SECCIONES
    .map((s) => ({ nombre: s.nombre, r: aDecision(s.borrador, s.nombre) }))
    .filter((x) => !x.r.ok)
  if (malas.length > 0) {
    console.error('Secciones que no validan:')
    for (const m of malas) console.error(`  ✗ ${m.nombre}: ${(m.r as { motivo: string }).motivo}`)
    process.exit(1)
  }
  console.log(`✓ las ${SECCIONES.length} secciones validan contra el esquema`)
  if (SECO) { console.log('(--seco: no se escribió nada)'); return }

  // Modo actualizar: reescribe el contenido de una reunión YA montada, sin
  // crear otra. El id no cambia, así que un enlace ya compartido sigue
  // sirviendo. Exige que la estructura coincida —mismo número de secciones,
  // mismo orden— porque eso es lo que hace segura la correspondencia por
  // posición; si alguien añadió o quitó secciones a mano, se para.
  const iActualizar = process.argv.indexOf('--actualizar')
  if (iActualizar >= 0) {
    const reunionId = process.argv[iActualizar + 1]
    if (!reunionId) { console.error('Falta el id tras --actualizar'); process.exit(1) }
    const { documentoDeReunion } = await import('../src/db/documentos')
    const doc = await documentoDeReunion(reunionId)
    if (!doc) { console.error(`La reunión ${reunionId} no tiene documento`); process.exit(1) }

    if (doc.items.length !== SECCIONES.length) {
      console.error(`La estructura no coincide: el documento tiene ${doc.items.length} secciones y el guion ${SECCIONES.length}. No se toca nada.`)
      process.exit(1)
    }
    for (let i = 0; i < SECCIONES.length; i++) {
      await guardarSeccion(doc.id, doc.items[i].id, SECCIONES[i].borrador)
    }
    console.log(`✓ ${SECCIONES.length} secciones reescritas en ${reunionId}`)
    console.log(`  (falta volver a maquetar: npx tsx scripts/maquetar-reunion.ts ${reunionId})`)
    return
  }

  // 2. La reunión, con documento en blanco.
  const { reunionId, documentoId } = await crearReunionConDocumento({
    salaSlug: 'mexa-creativa',
    tipo: 'mensual',
    alcance: 'todos',
    titulo: 'Estatus mensual · Junio 2026',
    fecha: instanteEnCDMX('2026-06-30', '12:00'),
    plantilla: 'en-blanco',
  })
  console.log(`✓ reunión creada  ${reunionId}`)
  console.log(`  documento       ${documentoId}`)

  // 3. Las secciones. La plantilla "en-blanco" ya trajo la portada: se rellena
  //    en vez de añadir una segunda.
  const documento = await import('../src/db/documentos').then((m) => m.documentoDeReunion(reunionId))
  const portada = documento?.items[0]
  if (!portada) throw new Error('El documento nació sin portada')

  await guardarSeccion(documentoId, portada.id, SECCIONES[0].borrador)
  console.log(`  1/${SECCIONES.length} ${SECCIONES[0].nombre}`)

  for (let i = 1; i < SECCIONES.length; i++) {
    const s = SECCIONES[i]
    const { itemId } = await anadirSeccion(documentoId, s.borrador.layout, s.nombre)
    await guardarSeccion(documentoId, itemId, s.borrador)
    console.log(`  ${i + 1}/${SECCIONES.length} ${s.nombre}`)
  }

  console.log(`\n✓ montado.  /deck/${reunionId}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
