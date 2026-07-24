import type { DecisionSlide } from '@/decision/esquema'

/**
 * Extracto del estatus mensual de NeraCode, junio 2026 — la sesión real
 * que sirve de criterio de aceptación del sistema.
 * Escrito a mano: en la Fase 2 lo producirá el motor a partir del contenido crudo.
 */
export const NC_JUNIO_2026: DecisionSlide[] = [
  {
    layout: 'portada',
    titulo: 'Estatus mensual',
    subtitulo: 'Junio 2026',
    razon: 'Apertura de la sesión: mes y sala, sin más ruido.',
  },
  {
    layout: 'kpis-fila-dos-columnas',
    titulo: 'Performance · Sitio web',
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
          'No es un deterioro generalizado: las dos páginas con más tráfico mejoraron posición pero perdieron impresiones.',
          'El mix de consultas arrastra el promedio hacia abajo.',
          'Empeoraron las consultas de mantenimiento de software y staff augmentation.',
        ],
      },
      {
        titulo: 'Acciones prioritarias',
        puntos: [
          'Reforzar el contenido de las consultas que retrocedieron en ranking real.',
          'Crear un clúster dedicado a staff augmentation.',
          'Revisar enlazado interno y datos estructurados.',
        ],
      },
    ],
    razon: '4 cifras con delta y 2 bloques de análisis → fila de KPIs arriba, análisis a dos columnas.',
  },
  {
    layout: 'divisor-seccion',
    titulo: 'Pipeline y demanda',
    subtitulo: 'Segundo bloque de la sesión',
    razon: 'Cierra el bloque de performance del sitio y abre el de pipeline: separador para que el equipo cambie de tema.',
  },
  {
    layout: 'agenda',
    titulo: 'Agenda',
    cuerpo: [
      'Performance del sitio web',
      'Pipeline y demanda',
      'Staff augmentation: foco del trimestre',
      'Acuerdos y próximos pasos',
    ],
    razon: 'Cuatro bloques temporizados: agenda numerada para que el equipo ubique en qué punto va la sesión.',
  },
  {
    layout: 'texto-multicolumna',
    titulo: 'Foco por frente',
    columnas: [
      {
        titulo: 'Software factory',
        puntos: [
          'Dos cuentas nuevas en propuesta.',
          'El ciclo de decisión se está alargando.',
        ],
      },
      {
        titulo: 'Staff augmentation',
        puntos: [
          'Demanda sostenida en perfiles senior.',
          'Falta pipeline de mid-level.',
        ],
      },
      {
        titulo: 'Modernización',
        puntos: [
          'Primer caso de éxito listo para credencial.',
        ],
      },
    ],
    razon: 'Tres frentes sin cifras que comparar entre sí: columnas paralelas, sin fila de KPIs que no aplica aquí.',
  },
  {
    // Sin `imagen`: el inventario de este mes no trajo una foto real, así
    // que el layout cae en su placeholder de marca. El componente también
    // se prueba con `imagen` presente en ImagenASangre.test.tsx.
    layout: 'imagen-a-sangre',
    titulo: 'Staff augmentation',
    subtitulo: 'El foco del trimestre',
    razon: 'El inventario no trae una foto para esta pieza: se usa el placeholder de marca en vez de inventar una ruta.',
  },
  {
    layout: 'cierre',
    titulo: 'Gracias',
    subtitulo: 'Dudas y comentarios, por Slack #nc-marketing',
    razon: 'Cierre institucional de la sesión, con el canal de seguimiento como único dato de apoyo.',
  },
]
