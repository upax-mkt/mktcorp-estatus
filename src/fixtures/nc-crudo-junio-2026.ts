import type { EntradaCruda } from '@/motor/inventario'

/**
 * Contenido crudo (sin maquetar) del estatus mensual de NeraCode, junio 2026 —
 * lo que el equipo pegaría en el cuestionario. Es la entrada real que alimenta
 * al motor para producir `src/fixtures/nc-junio-2026.ts` (la versión maquetada
 * a mano, escrita como criterio de comparación).
 */
export const NC_CRUDO_JUNIO_2026: EntradaCruda[] = [
  {
    titulo: 'Estatus mensual',
    texto: 'Junio 2026',
  },
  {
    titulo: 'Performance · Sitio web',
    cifras: [
      { valor: '9.2', rotulo: 'Posición media', delta: '-0.3' },
      { valor: '29k', rotulo: 'Impresiones', delta: '-16%' },
      { valor: '264', rotulo: 'Clics', delta: '-35%' },
      { valor: '0.9%', rotulo: 'CTR', delta: '-0.3' },
    ],
    texto:
      'Principales hallazgos: No es un deterioro generalizado; las dos páginas con más tráfico ' +
      '(artículo sobre tipos de mantenimiento de software y roles del equipo de desarrollo) mejoraron ' +
      'ligeramente su posición pero perdieron impresiones. El mix de consultas está arrastrando el ' +
      'promedio hacia abajo. Sí hay un grupo de consultas que empeoró: mantenimiento de software, ' +
      'mantenimiento de sistemas, mantenimiento perfectivo y staff augmentation. ' +
      'Acciones prioritarias: Reforzar y actualizar el contenido de las consultas que retrocedieron en ' +
      'ranking real, ampliando profundidad y añadiendo FAQs y datos actualizados a 2026. Crear un clúster ' +
      'de contenido dedicado a staff augmentation con enlazado interno. Revisar enlaces internos y datos ' +
      'estructurados (schema) para mejorar la presentación en resultados.',
    nota:
      'El mensaje central es que la caída de tráfico no es deterioro de calidad sino mezcla de consultas.',
  },
]
