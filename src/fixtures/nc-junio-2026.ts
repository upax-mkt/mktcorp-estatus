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
]
