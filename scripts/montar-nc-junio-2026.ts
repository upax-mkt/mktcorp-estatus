/**
 * MONTA EN EL EDITOR EL ESTATUS DE JUNIO 2026 DE NERACODE, copiado del PDF que
 * armó el equipo ("Neracode Resultados Mensuales 0626.pdf", 20 páginas).
 *
 * Por qué un script y no el editor a mano: son veinte secciones con cuatro
 * gráficos, cinco tablas, una matriz y seis cifras desglosadas. Escribirlas a
 * mano en el formulario es donde se cuelan los errores de transcripción, que
 * es justo lo que aquí NO puede pasar: este deck se presenta a un cliente.
 *
 * CÓMO SE LEYÓ EL PDF, que es lo que da confianza en las cifras:
 * - El TEXTO salió de `pdftotext -layout`, no de mirar la imagen. Todo lo que
 *   aquí aparece entrecomillado está copiado de esa extracción.
 * - Los GRÁFICOS del PDF son imágenes rasterizadas: sus valores no están en la
 *   capa de texto. Se renderizaron las páginas a 220 dpi y se leyeron ahí.
 *   Cada serie se validó CONTRA OTRA FUENTE del mismo PDF antes de darla por
 *   buena:
 *     · Prensa: las barras suman 22 y la lámina dice "22 publicaciones"; la
 *       dona suma 22 también.
 *     · Tráfico: las barras son el eje DERECHO, y mayo (1,366) y junio (968)
 *       coinciden exactos con la tabla de "Sesiones totales" de la misma
 *       lámina. La geometría cuadra: 1,348/2,500 × 800 px = 431 px, que es la
 *       altura de la barra de enero.
 *     · Paid Media: mayo y junio de las cuatro series coinciden exactos con la
 *       tabla Mayo/Junio de la misma lámina.
 *
 * LO QUE NO SE COPIÓ, Y POR QUÉ (regla del repo: lo que no se lee con
 * seguridad NO se transcribe, y se dice):
 * - El gráfico de canales de la lámina 12 (Organic Search / Paid Social / Paid
 *   Search / Direct / Referral, "El mes pasado" vs "Periodo personalizado")
 *   NO trae ni un número: solo barras contra un eje 0-600. Cualquier cifra
 *   sería inventada. Queda dicho en la nota al pie de esa sección.
 * - "Orgánico 2025" del gráfico de tráfico: sus valores de enero a marzo no
 *   están rotulados. Se deja fuera la serie entera en vez de media serie.
 *
 * Uso:  npx tsx scripts/montar-nc-junio-2026.ts [--seco]
 *   --seco  valida todo y no escribe nada.
 *
 * `tsx` no carga `.env.local` por su cuenta (mismo motivo que documenta
 * `drizzle.config.ts` y `scripts/poblar-marcas.ts`).
 */
process.loadEnvFile('.env.local')

import { readFileSync } from 'node:fs'
import { put } from '@vercel/blob'
import { db } from '../src/db/cliente'
import * as esquema from '../src/db/esquema'
import { crearReunionConDocumento, anadirSeccion, guardarSeccion } from '../src/db/documentos'
import { instanteEnCDMX } from '../src/lib/fecha'
import { aDecision, type BorradorSeccion } from '../src/secciones/borrador'

const SECO = process.argv.includes('--seco')

// ── La lámina del organigrama es un DIAGRAMA, no datos: se sube tal cual ────
// Renderizada del propio PDF a 220 dpi. Es la única de las veinte que no se
// puede reconstruir con el catálogo de secciones, y forzarla a una tabla la
// destruiría.
const ORGANIGRAMA_PNG = `${process.env.CLAUDE_JOB_DIR}/tmp/pag/p-04.png`

// ── Las veinte secciones ───────────────────────────────────────────────────
// El orden es el del PDF. `layout` decide con qué pieza del catálogo se dibuja
// cada una (src/secciones/catalogo.ts).

type Seccion = { nombre: string; borrador: BorradorSeccion }

const SEMAFORO = { verde: 'listo', amarillo: 'en-proceso', rojo: 'no-realizado' } as const

/** Fila de la tabla de pendientes: el estado va escrito Y en el semáforo. */
function pendiente(
  responsable: string,
  tarea: string,
  color: keyof typeof SEMAFORO,
) {
  const estado = SEMAFORO[color]
  const etiqueta = { listo: 'Listo', 'en-proceso': 'En proceso', 'no-realizado': 'No realizado' }[estado]
  return { celdas: [responsable, tarea, etiqueta], estado }
}

function secciones(urlOrganigrama: string | null): Seccion[] {
  return [
    // ── 1. Portada ────────────────────────────────────────────────────────
    {
      nombre: 'Portada',
      borrador: { layout: 'portada', titulo: 'Estatus mensual', subtitulo: 'Junio 2026' },
    },

    // ── 2. Agenda ─────────────────────────────────────────────────────────
    {
      nombre: 'Agenda',
      borrador: {
        layout: 'agenda',
        titulo: 'Agenda',
        // Sin "1." ni "2)": el layout las numera solo.
        cuerpo: [
          'Estructura Marketing Corp.',
          'Acuerdos del mes pasado',
          'Portafolio & ecosistema',
          'Performance & conversión',
          'Outbound & pipeline',
        ],
      },
    },

    // ── 3-4. Estructura Marketing Corp. ───────────────────────────────────
    {
      nombre: 'Divisor · Estructura',
      borrador: { layout: 'divisor-seccion', titulo: 'Estructura Marketing Corp.' },
    },
    {
      nombre: 'Nueva Estructura',
      borrador: urlOrganigrama
        ? {
            layout: 'imagen-a-sangre',
            titulo: 'Nueva Estructura',
            subtitulo: 'Propuesta',
            imagen: { url: urlOrganigrama },
          }
        : // Sin imagen subida, la sección no se puede componer: se deja el
          // hueco marcado en vez de inventar un organigrama en texto.
          { layout: 'imagen-a-sangre', titulo: 'Nueva Estructura', subtitulo: 'Propuesta' },
    },

    // ── 5-7. Acuerdos y pendientes de la sesión pasada ────────────────────
    {
      nombre: 'Divisor · Acuerdos',
      borrador: { layout: 'divisor-seccion', titulo: 'Acuerdos y pendientes sesión pasada' },
    },
    {
      // Las DOS láminas de pendientes del PDF van en UNA sección con dos
      // tablas. El PDF las partió porque diez filas no caben en una
      // diapositiva; este documento se lee con scroll y no tiene esa
      // restricción. No se pierde ni una fila ni un estatus.
      nombre: 'Pendientes',
      borrador: {
        layout: 'pendientes-semaforo',
        titulo: 'Pendientes',
        subtitulo: 'De la sesión del 14 de mayo',
        tablas: [
          {
            titulo: 'Neracode',
            columnas: ['Responsable', 'Tarea', 'Estatus'],
            agruparPrimeraColumna: true,
            filas: [
              pendiente('Laura & Buga | Neracode', 'Cerrar negocios en pipeline que no cuentan con presupuesto activo y crear tareas de seguimiento para reactivarlos en fechas futuras apropiadas.', 'amarillo'),
              pendiente('Laura & Buga | Neracode', 'Limpiar el pipeline eliminando negocios en etapa de reunión calificada que tengan más de tres semanas de vida o que contengan montos asignados incorrectamente.', 'amarillo'),
              pendiente('Laura & Buga | Neracode', 'Incrementar la actividad de seguimiento post-propuesta, utilizando materiales de marketing como guías blogs para mantener el contacto y nutrir a los prospectos.', 'amarillo'),
              pendiente('Laura & Buga | Neracode', 'Mantener una meta de cerrar o dar de baja negocios en un máximo de 90 días para evitar estancamientos en el pipeline.', 'amarillo'),
              pendiente('Laura & Buga | Neracode', 'Adaptar las propuestas comerciales según el cliente, simplificando documentos para hacerlos más ágiles y comerciales, buscando acelerar el cierre.', 'verde'),
              pendiente('Laura & Buga | Neracode', 'Coordinar con Mike Flores (UiX) para mejorar las presentaciones comerciales, haciéndolas comprensibles, ágiles y atractivas para acelerar el cierre de negocios.', 'verde'),
              pendiente('Laura & Buga | Neracode', 'Revisar presupuesto y definir estrategia para contacto con clientes clave que están en etapa de toma de decisión para maximizar cierres.', 'verde'),
            ],
          },
          {
            titulo: 'Marketing Corp.',
            columnas: ['Responsable', 'Tarea', 'Estatus'],
            filas: [
              pendiente('Ileana Cruz | Outbound', 'Compartir reporte de reuniones calificadas al equipo comercial.', 'verde'),
              pendiente('Fernando Borges | Paid Media', 'Evaluar y proponer nuevas palabras clave y segmentos de mercado para ampliar el alcance y evitar saturación en las campañas actuales.', 'rojo'),
              pendiente('César Mejía | RevOps', 'Compartir accesos de la Brújula comercial.', 'verde'),
            ],
          },
        ],
      },
    },

    // ── 8-10. Portafolio & ecosistema ─────────────────────────────────────
    {
      nombre: 'Divisor · Portafolio',
      borrador: { layout: 'divisor-seccion', titulo: 'Portafolio & ecosistema' },
    },
    {
      nombre: 'Portafolio y Ecosistema',
      borrador: {
        layout: 'tarjetas-numeradas',
        titulo: 'Portafolio y Ecosistema',
        bloques: [
          {
            titulo: 'Credenciales',
            parrafo: 'Traducción de credenciales al idioma inglés',
            pie: { rotulo: 'Estatus', texto: 'En diseño' },
          },
          {
            titulo: 'Materiales comerciales',
            parrafo: 'Necesitamos aprobación de los contenidos para producir materiales comerciales',
            pie: { rotulo: 'Estatus', texto: 'Sin aprobación de la UDN' },
          },
          {
            titulo: 'Relaciones públicas',
            etiqueta: 'Vinculación',
            parrafo: 'Mónica Mistretta',
            puntos: [
              { texto: '22 o 23 julio' },
              { texto: 'Entre 9:00 y 11:00 hrs' },
              { texto: 'Vía Zoom' },
            ],
            pie: { rotulo: 'Estatus', texto: 'Por definir con la UDN' },
          },
          {
            titulo: 'Casos de éxito',
            parrafo: 'Requerimos definir y documentar los casos de éxito que servirán como apoyo comercial',
            pie: { rotulo: 'Estatus', texto: 'Por definir con UDN' },
          },
        ],
      },
    },
    {
      nombre: 'Prensa',
      borrador: {
        layout: 'grafico-y-tabla',
        titulo: 'Portafolio y Ecosistema | Prensa',
        subtitulo: 'Panorama primer semestre 2026',
        kpis: [
          { valor: '22', rotulo: 'Publicaciones de enero a junio' },
          { valor: '$331,000', rotulo: 'Valor publicitario equivalente' },
        ],
        graficos: [
          {
            tipo: 'barras',
            titulo: 'Publicaciones por mes',
            periodos: ['ene 2026', 'feb 2026', 'mar 2026', 'abr 2026', 'may 2026', 'jun 2026'],
            series: [{ etiqueta: 'Neracode', valores: [6, 5, 1, 6, 1, 3], forma: 'barra' }],
            mostrarValores: true,
          },
          {
            tipo: 'dona',
            titulo: 'Distribución de TIER',
            periodos: ['TIER 2', 'TIER 1', 'TIER 3'],
            series: [{ etiqueta: 'Publicaciones', valores: [12, 8, 2] }],
            mostrarValores: true,
          },
        ],
        notaPie: 'Las 22 notas de prensa de Neracode están enlazadas desde la versión original del estatus.',
      },
    },

    // ── 11-14. Performance & conversión ───────────────────────────────────
    {
      nombre: 'Divisor · Performance',
      borrador: { layout: 'divisor-seccion', titulo: 'Performance & conversión' },
    },
    {
      nombre: 'Performance sitio web',
      borrador: {
        layout: 'comparativa-periodos',
        titulo: 'Performance sitio web',
        tablas: [
          {
            // La columna de etiquetas no se titula: por eso el primer
            // encabezado va vacío.
            columnas: ['', 'Mayo', 'Junio'],
            filas: [
              { celdas: ['Sesiones totales', '1,366', '968'] },
              { celdas: ['Páginas por sesión', '1.28', '1.22'] },
              { celdas: ['Posición media', '8.9', '9.2'] },
              { celdas: ['MQLs', '3', '1'] },
              // El PDF deja los SQLs con guion: no hay dato, no se rellena.
              { celdas: ['SQLs', '–', '–'] },
            ],
          },
        ],
        graficos: [
          {
            tipo: 'combo-barras-lineas',
            titulo: 'Tráfico website',
            periodos: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio'],
            series: [
              { etiqueta: 'Total 2026', valores: [1348, 1682, 2420, 1387, 1366, 968], forma: 'barra', eje: 'derecho' },
              { etiqueta: 'Orgánico 2026', valores: [299, 534, 577, 559, 541, 320], forma: 'linea', eje: 'izquierdo' },
              { etiqueta: 'Meta Orgánico 2026', valores: [144, 148, 152, 156, 161, 165], forma: 'linea-punteada', eje: 'izquierdo' },
            ],
            mostrarValores: true,
          },
        ],
        columnas: [
          {
            titulo: 'Insights',
            puntos: [
              {
                texto: 'Pipeline: $4.6M, en 2 negocios',
                hijos: [
                  { texto: 'Banjercito (Evaluando $2.3M) – Módulo de conciliación contable fiscal' },
                  { texto: 'Cesantoni (Evaluando $2.3M) – Plataforma y herramienta de ventas' },
                ],
              },
              { texto: 'MQLs: Robot (Scouting)' },
              {
                texto: 'Las páginas más visitadas fueron',
                hijos: [
                  { texto: 'Home (32%)' },
                  { texto: 'Campaña: “Talento especializado IT Staffing” (23%)' },
                  { texto: 'Blog “Roles equipo desarrollo software” (19%)' },
                  { texto: 'Blog “Tipos de mantenimiento de software…” (12%)' },
                  { texto: 'Contacto (5%)' },
                ],
              },
            ],
          },
        ],
        notaPie:
          'Falta por cargar el gráfico de adquisición por canal (Organic Search, Paid Social, Paid Search, Direct, Referral) que el estatus original trae a la derecha: en el PDF no lleva ni una cifra rotulada, solo barras, así que hay que reexportarlo de GA4. Del gráfico de tráfico se omite la serie “Orgánico 2025” por la misma razón: sus valores de enero a marzo no están rotulados.',
      },
    },
    {
      nombre: 'Performance sitio web · SEO',
      borrador: {
        layout: 'kpis-fila-dos-columnas',
        titulo: 'Performance sitio web',
        kpis: [
          { valor: '9.2', delta: '-0.3', rotulo: 'Posición media' },
          { valor: '29k', delta: '-16%', rotulo: 'Impresiones' },
          { valor: '264', delta: '-35%', rotulo: 'Clics' },
          { valor: '0.9%', delta: '-0.3', rotulo: 'CTR' },
        ],
        columnas: [
          {
            titulo: 'Principales hallazgos',
            puntos: [
              { texto: 'No es un deterioro generalizado, las dos páginas que concentran la mayoría del tráfico, artículo sobre “tipos de mantenimiento de software” (7.4 → 6.9) y “roles del equipo de desarrollo” (5.9 → 5.7) mejoraron ligeramente su posición pero perdieron impresiones.' },
              { texto: 'El mix de consultas está arrastrando el promedio hacia abajo. Perdimos visitas en páginas y búsquedas que funcionaban, al perder ese tráfico, ahora pesan más en el promedio otras búsquedas menos relevantes en donde rankeamos más abajo.' },
              { texto: 'Sí hay un grupo de consultas que empeoró: "mantenimiento de software" (4,0→4,4), "mantenimiento del software" (4,6→5,2), "mantenimiento de sistemas" (12,5→13,5), "mantenimiento perfectivo" (4,7→7,0) y "staff augmentation" (8,8→9,4).' },
            ],
          },
          {
            titulo: 'Acciones prioritarias',
            puntos: [
              { texto: 'Reforzar y actualizar contenido de las consultas que sí retrocedieron en ranking real ("mantenimiento de software", "mantenimiento del software", "mantenimiento de sistemas", "mantenimiento perfectivo", "staff augmentation"): ampliar profundidad, añadir FAQs, casos de uso, datos actualizados a 2026 y revisar competencia.' },
              { texto: 'Crear un clúster de contenido dedicado a "staff augmentation" / "it staff augmentation" (pilar + subpáginas con enlazado interno), dado que hay volumen de búsqueda pero la posición es inconsistente.' },
              { texto: 'Revisar enlaces internos y comprobar si tienen datos estructurados (schema) que puedan mejorar la presentación en resultados.' },
            ],
          },
        ],
      },
    },
    {
      nombre: 'Performance Paid Media',
      borrador: {
        layout: 'comparativa-periodos',
        titulo: 'Performance Paid Media',
        tablas: [
          {
            columnas: ['', 'Mayo', 'Junio'],
            filas: [
              { celdas: ['Inversión', '$11,002.57', '$6,843.17'] },
              { celdas: ['Impresiones', '6,318', '3,904'] },
              { celdas: ['Clics', '325', '185'] },
              { celdas: ['MQLs', '11', '6'] },
              { celdas: ['SQLs', '4', '2'] },
            ],
          },
        ],
        graficos: [
          // DOS GRÁFICOS DONDE EL PDF TRAE UNO, y es a propósito. El original
          // mete las cuatro series en un solo dibujo con escala LOGARÍTMICA,
          // que es lo que permite ver a la vez un coste de $26,795 y 3
          // conversiones. Este catálogo no tiene escala logarítmica: con las
          // cuatro juntas y dos ejes lineales, "Conversiones" (3 a 26) se
          // aplasta contra "Clics" (185 a 653) y queda una línea plana en
          // cero — o sea, se PIERDE una de las cuatro series. Partido en dos,
          // cada par comparte magnitud y las cuatro se leen. Ni un valor
          // cambia.
          {
            tipo: 'lineas-multiples',
            titulo: 'Coste e impresiones',
            periodos: ['Enero 26', 'Febrero 26', 'Marzo 26', 'abril de 2026', 'mayo de 2026', 'junio de 2026'],
            series: [
              { etiqueta: 'Coste', valores: [10783.55, 26795.95, 20595.33, 8397.49, 11002.57, 6843.17], forma: 'linea', eje: 'izquierdo', prefijo: '$' },
              { etiqueta: 'Impr.', valores: [6787, 11922, 8646, 5566, 6318, 3904], forma: 'linea', eje: 'derecho' },
            ],
            mostrarValores: true,
          },
          {
            tipo: 'lineas-multiples',
            titulo: 'Clics y conversiones',
            periodos: ['Enero 26', 'Febrero 26', 'Marzo 26', 'abril de 2026', 'mayo de 2026', 'junio de 2026'],
            series: [
              { etiqueta: 'Clics', valores: [360, 653, 477, 293, 325, 185], forma: 'linea', eje: 'izquierdo' },
              { etiqueta: 'Conversiones', valores: [18, 26, 14, 3, 11, 6], forma: 'linea', eje: 'derecho' },
            ],
            mostrarValores: true,
          },
        ],
        columnas: [
          {
            titulo: 'Resumen oportunidades Paid media',
            etiqueta: 'SQL: ITT Cannon de México',
            puntos: [
              { texto: '7 oportunidades abiertas' },
              { texto: '$15,666,846 de pipeline registrado' },
              { texto: '3 negocios ganados por facturar por $7,448,876' },
            ],
          },
          {
            titulo: 'Insights',
            puntos: [
              { texto: 'Neracode recibió un volumen bajo de MQLs durante junio, con 6 registros, pero alcanzó una tasa de calificación aceptable de 33.3%. La oportunidad de mayor valor cualitativo es ITT Cannon de México, clasificada como empresa AAA.' },
              { texto: 'El principal foco de mejora se encuentra en la generación de leads con mejor ajuste al servicio, ya que el 50% de las descalificaciones fue por falta de fit o alcance.' },
            ],
          },
        ],
      },
    },

    // ── 15-18. Outbound & pipeline ────────────────────────────────────────
    {
      nombre: 'Divisor · Outbound',
      borrador: { layout: 'divisor-seccion', titulo: 'Outbound & pipeline' },
    },
    {
      nombre: 'Outbound & Pipeline · Junio',
      borrador: {
        layout: 'meta-real-porcentaje',
        titulo: 'Outbound & Pipeline | Junio 2026',
        metaReal: {
          titulo: 'SQLs',
          filas: [
            // El 85% del total viene así del PDF: no cuadra con 2 sobre 7,
            // y se copia tal cual porque corregirlo sería inventar otro dato.
            { rotulo: 'Total', meta: '7', real: '2', porcentaje: '85%' },
            { rotulo: 'Mkt', meta: '4', real: '2', porcentaje: '150%' },
            { rotulo: 'Ventas', meta: '3', real: '0', porcentaje: '0%' },
          ],
        },
        cifrasDesglosadas: [
          { rotulo: 'Pipeline ideal', valor: '$4.2 MDP' },
          {
            rotulo: 'Pipeline generado YTD', valor: '$87.2 MDP', destacada: true,
            partes: [{ rotulo: 'Mkt', valor: '$72.1 MDP' }, { rotulo: 'Comercial', valor: '$15.7 MDP' }],
          },
          {
            rotulo: 'Negocios perdidos YTD', valor: '$60.1 MDP',
            partes: [{ rotulo: 'Mkt', valor: '$60.1 MDP' }, { rotulo: 'Comercial', valor: '$0' }],
          },
          {
            rotulo: 'Negocios ganados por facturar YTD', valor: '$21.01 MDP',
            partes: [{ rotulo: 'Mkt', valor: '$7.4 MDP' }, { rotulo: 'Comercial', valor: '$13.5 MDP' }],
          },
          {
            rotulo: 'Negocios ganados facturados YTD', valor: '$940.5 k',
            partes: [{ rotulo: 'Mkt', valor: '$0' }, { rotulo: 'Comercial', valor: '$940.5 k' }],
          },
          {
            rotulo: 'Negocios vivos', valor: '$24.8 MDP',
            partes: [{ rotulo: 'Mkt', valor: '$22.6 MDP' }, { rotulo: 'Comercial', valor: '$2.2 MDP' }],
          },
        ],
        columnas: [
          {
            titulo: 'Fuentes SQLs',
            puntos: [{ texto: 'Prospección: 1' }, { texto: 'Paid: 1' }],
          },
          {
            titulo: 'Destacados',
            puntos: [{ texto: 'ULTRA' }, { texto: 'dkt LATAM NORTE' }],
          },
          {
            titulo: 'Cuentas en warm',
            etiqueta: 'Cuentas en prospección · Target: 110 · ICP: 170',
            puntos: [
              { texto: 'Huawei' },
              { texto: 'Zafari Consulting' },
              { texto: 'Fandeli México' },
              { texto: 'Monndelez International' },
            ],
          },
        ],
        notaPie: 'Datos extraídos de HubSpot.',
      },
    },
    {
      nombre: 'Focos Q3 – Q4',
      borrador: {
        layout: 'tarjetas-numeradas',
        titulo: 'Outbound & Pipeline | Focos Q3 – Q4',
        bloques: [
          {
            titulo: 'Comercio al por menor (Retail)',
            etiqueta: 'Prioridad alta para cuentas vivas',
            parrafo: 'Tiene dos ventanas verdes en Q3, pero por ciclo de 3–6 meses, la prioridad debe ser acelerar oportunidades existentes y abrir conversaciones estratégicas de transformación digital para Q4.',
            puntos: [
              { texto: 'Desarrollo de plataformas e-commerce.' },
              { texto: 'Integraciones entre sistemas.' },
              { texto: 'Apps o portales para clientes.' },
              { texto: 'Automatización de procesos comerciales.' },
              { texto: 'Desarrollo de soluciones internas para operación, inventario, logística o ventas.' },
              { texto: 'Software a la medida para experiencia digital.' },
            ],
            pie: { rotulo: 'Oferta gancho', texto: 'Ayudamos a retailers a convertir fricciones operativas y digitales en soluciones tecnológicas escalables que mejoran eficiencia, experiencia y conversión.' },
          },
          {
            titulo: 'Comercio al por mayor (Retail)',
            etiqueta: 'Prioridad alta para cuentas vivas',
            parrafo: 'Picos en Julio y Septiembre vende. Muy buena vertical para Nera porque suele tener dolores fuertes en catálogos, inventarios, pedidos, portales B2B, logística, CRM/ERP e integraciones. Igual que retail, no es quick win; es pipeline estratégico.',
            puntos: [
              { texto: 'Portales B2B.' },
              { texto: 'Integraciones con ERP/CRM.' },
              { texto: 'Software para logística y operación.' },
            ],
            pie: { rotulo: 'Oferta gancho', texto: 'Optimizamos la transformación digital en procesos comerciales B2B con desarrollos y refactorización para reducir fricción operativa, acelerar pedidos y dar mayor visibilidad al negocio.' },
          },
          {
            titulo: 'Servicios financieros y de seguros',
            etiqueta: 'Prioridad alta para pipeline Q4/Q1',
            parrafo: 'Aparece verde en julio, pero por ciclo de venta no alcanza para cierre Q3. Aun así, es una vertical muy poderosa para Nera por necesidad de desarrollo, automatización, plataformas digitales, onboarding, compliance y experiencia transaccional.',
            puntos: [
              { texto: 'Desarrollo de apps o portales financieros.' },
              { texto: 'Onboarding digital.' },
              { texto: 'Automatización de procesos.' },
              { texto: 'Integraciones con sistemas legacy.' },
              { texto: 'Plataformas transaccionales.' },
              { texto: 'Soluciones para seguros, cotización, autoservicio o atención digital.' },
            ],
            pie: { rotulo: 'Oferta gancho', texto: 'Construimos soluciones digitales seguras y escalables para mejorar onboarding, operación, autoservicio y experiencia de usuario en servicios financieros.' },
          },
          {
            titulo: 'Industrias manufactureras',
            etiqueta: 'Prioridad media-alta para pipeline Q4',
            parrafo: 'Agosto está en verde y septiembre prepara, pero el ciclo de Nera obliga a iniciar desde ya. Puede ser una vertical muy buena si se enfoca en operación, automatización, trazabilidad, portales, logística o dashboards.',
            puntos: [
              { texto: 'Software para operación interna.' },
              { texto: 'Sistemas de trazabilidad.' },
              { texto: 'Portales para proveedores/clientes.' },
              { texto: 'Automatización de procesos.' },
              { texto: 'Integraciones ERP/MRP/CRM.' },
              { texto: 'Aplicaciones internas.' },
            ],
            pie: { rotulo: 'Oferta gancho', texto: 'Ayudamos a empresas manufactureras a digitalizar procesos críticos para ganar visibilidad, eficiencia y control operativo.' },
          },
        ],
      },
    },
    {
      nombre: 'Focos Q3 · calendario',
      borrador: {
        layout: 'matriz-estados',
        titulo: 'Outbound & Pipeline | Focos Q3',
        subtitulo: 'Calendario de prospección · jul–dic 2026',
        matriz: {
          columnas: ['JUL', 'AGO', 'SEP'],
          filas: [
            { encabezado: 'Industrias manufactureras', celdas: [{ texto: 'Espera', tono: 'neutro' }, { texto: 'Vende', tono: 'alto' }, { texto: 'Prepara', tono: 'medio' }] },
            { encabezado: 'Comercio al por menor', celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Explora', tono: 'bajo' }, { texto: 'Vende', tono: 'alto' }] },
            { encabezado: 'Comercio al por mayor', celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Explora', tono: 'bajo' }, { texto: 'Vende', tono: 'alto' }] },
            { encabezado: 'Servicios financieros y de seguros', celdas: [{ texto: 'Vende', tono: 'alto' }, { texto: 'Explora', tono: 'bajo' }, { texto: 'Prepara', tono: 'medio' }] },
            { encabezado: 'Servicios profesionales, científicos y técnicos', celdas: [{ texto: 'Espera', tono: 'neutro' }, { texto: 'Vende', tono: 'alto' }, { texto: 'Explora', tono: 'bajo' }] },
          ],
          leyenda: [
            'Explora · Sector despertando · primeros contactos',
            'Prepara · Actividad subiendo · califica y agenda propuestas',
            'Vende · Pico de actividad · máxima disposición de compra',
            'Espera · Actividad baja · monitorear, no priorizar',
            'CICLO: Explora → Prepara → Vende → Espera. El sector repite este ciclo cada temporada según su comportamiento económico.',
          ],
        },
        bloques: [
          {
            titulo: 'Servicios profesionales, científicos y técnicos',
            etiqueta: 'Prioridad media / selectiva',
            parrafo: 'Picos en agosto y octubre. Puede tener fit, sobre todo servicios especializados o B2B complejos. Pero no lo pondría por encima de retail, mayoreo, financiero o manufactura.',
            puntos: [
              { texto: 'Plataformas SaaS.' },
              { texto: 'Herramientas internas.' },
              { texto: 'Automatización de procesos.' },
              { texto: 'Portales de clientes.' },
              { texto: 'Desarrollo de producto digital.' },
            ],
            pie: { rotulo: 'Oferta gancho', texto: 'Convertimos procesos complejos de servicios B2B en plataformas digitales simples, escalables y medibles.' },
          },
        ],
      },
    },

    // ── 19-20. Acuerdos y cierre ──────────────────────────────────────────
    {
      nombre: 'Divisor · Acuerdos de hoy',
      borrador: { layout: 'divisor-seccion', titulo: 'Acuerdos' },
    },
    {
      // El cierre del PDF es la lámina de Grupo UPAX con las ocho marcas. Aquí
      // no se copia como imagen: el documento se viste solo con la identidad
      // de la UDN que recibe, que es justamente lo que esta herramienta hace.
      nombre: 'Cierre',
      borrador: { layout: 'cierre', titulo: 'Grupo UPAX' },
    },
  ]
}

// ── Ejecución ───────────────────────────────────────────────────────────────

async function subirOrganigrama(reunionId: string): Promise<string | null> {
  let bytes: Buffer
  try {
    bytes = readFileSync(ORGANIGRAMA_PNG)
  } catch {
    console.warn(`  ⚠ organigrama no encontrado en ${ORGANIGRAMA_PNG} — la sección queda sin imagen`)
    return null
  }
  const archivoId = crypto.randomUUID()
  const ruta = `salas/neracode/imagen/${archivoId}-organigrama-mkt-corp-junio-2026.png`
  // `private` y no `public`: el store lo es a propósito (ver src/lib/blob.ts)
  // y esta imagen lleva los nombres y las fotos del equipo. Sale solo por
  // /api/archivo/[id], que comprueba permiso contra la sala de la reunión —
  // mismo acceso que usa `CampoImagen.tsx` al subir desde el editor.
  const { url } = await put(ruta, bytes, { access: 'private', contentType: 'image/png', addRandomSuffix: false })
  await db().insert(esquema.archivos).values({
    id: archivoId,
    salaSlug: 'neracode',
    categoria: 'imagen',
    titulo: 'Propuesta Nueva Estructura · Marketing Corp.',
    fecha: instanteEnCDMX('2026-06-30', '12:00'),
    ruta,
    nombreOriginal: 'organigrama-mkt-corp-junio-2026.png',
    tipoContenido: 'image/png',
    tamanoBytes: bytes.byteLength,
    reunionId,
  })
  console.log(`  · organigrama subido (${Math.round(bytes.byteLength / 1024)} KB) → /api/archivo/${archivoId}`)
  // Se sirve por la ruta de la app, que comprueba permiso contra la sala de la
  // reunión — no por la URL de Blob a pelo.
  void url
  return `/api/archivo/${archivoId}`
}

async function main() {
  // 1. Validar TODAS las secciones antes de escribir nada. `aDecision` es el
  //    mismo validador que corre al maquetar: si algo no pasa aquí, tampoco
  //    pasaría en la app, y es mejor enterarse sin haber creado la reunión.
  const prueba = secciones('/api/archivo/prueba')
  const malas = prueba
    .map((s) => ({ nombre: s.nombre, r: aDecision(s.borrador, s.nombre) }))
    .filter((x) => !x.r.ok)
  if (malas.length > 0) {
    console.error('Secciones que no validan:')
    for (const m of malas) console.error(`  ✗ ${m.nombre}: ${(m.r as { motivo: string }).motivo}`)
    process.exit(1)
  }
  console.log(`✓ las ${prueba.length} secciones validan contra el esquema`)
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

    // La imagen ya está subida: se reutiliza la que tenga la sección, no se
    // sube otra copia a Blob cada vez que se corrige un texto.
    const urlYaSubida = doc.items
      .map((i) => (i.contenido.seccion as BorradorSeccion | undefined)?.imagen?.url)
      .find((u): u is string => typeof u === 'string')
    const lista = secciones(urlYaSubida ?? null)

    if (doc.items.length !== lista.length) {
      console.error(`La estructura no coincide: el documento tiene ${doc.items.length} secciones y el guion ${lista.length}. No se toca nada.`)
      process.exit(1)
    }
    for (let i = 0; i < lista.length; i++) {
      await guardarSeccion(doc.id, doc.items[i].id, lista[i].borrador)
    }
    console.log(`✓ ${lista.length} secciones reescritas en ${reunionId}`)
    console.log('  (falta volver a maquetar: npx tsx scripts/maquetar-reunion.ts ' + reunionId + ')')
    return
  }

  // 2. La reunión de mañana, con documento en blanco.
  const { reunionId, documentoId } = await crearReunionConDocumento({
    salaSlug: 'neracode',
    tipo: 'mensual',
    alcance: 'todos',
    titulo: 'Estatus mensual · Junio 2026',
    fecha: instanteEnCDMX('2026-08-11', '12:00'),
    plantilla: 'en-blanco',
  })
  console.log(`✓ reunión creada  ${reunionId}`)
  console.log(`  documento       ${documentoId}`)

  // 3. La imagen del organigrama, colgada de esta reunión.
  const urlOrganigrama = await subirOrganigrama(reunionId)

  // 4. Las secciones. La plantilla "en-blanco" ya trajo la portada: se rellena
  //    en vez de añadir una segunda.
  const lista = secciones(urlOrganigrama)
  const documento = await import('../src/db/documentos').then((m) => m.documentoDeReunion(reunionId))
  const portada = documento?.items[0]
  if (!portada) throw new Error('El documento nació sin portada')

  await guardarSeccion(documentoId, portada.id, lista[0].borrador)
  console.log(`  1/${lista.length} ${lista[0].nombre}`)

  for (let i = 1; i < lista.length; i++) {
    const s = lista[i]
    const { itemId } = await anadirSeccion(documentoId, s.borrador.layout, s.nombre)
    await guardarSeccion(documentoId, itemId, s.borrador)
    console.log(`  ${i + 1}/${lista.length} ${s.nombre}`)
  }

  console.log(`\n✓ montado.  /deck/${reunionId}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
