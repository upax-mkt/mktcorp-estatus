import type { DecisionSlide } from '@/decision/esquema'

/**
 * UN ICONO POR TIPO DE SECCIÓN, en el carril del documento.
 *
 * Franco: "faltan en general iconografía para hacerlo más dinámico".
 *
 * No es decoración: el documento tiene dieciocho secciones y todas se abren
 * igual —un título grande y una línea—, así que al hojearlo no hay forma de
 * saber si lo que viene es una tabla, un gráfico o una lista sin leer el
 * título entero. El icono lo dice antes de leer.
 *
 * Van en el CARRIL IZQUIERDO, que ya existe en la rejilla del documento
 * (`--rail`) y hasta ahora solo llevaba la franja de los divisores. Ahí no le
 * quitan sitio al texto ni compiten con el título.
 *
 * Dibujados a mano y con el mismo trazo que los de la sala (`IconoSeccion`):
 * una librería traería su propio peso, que no es el de esta tipografía.
 * `aria-hidden` en todos — el título dice lo mismo, con palabras.
 */

const COMUNES = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconoLayout({ layout, className }: { layout: DecisionSlide['layout']; className?: string }) {
  switch (layout) {
    // Cifras: tres alturas, la lectura de un vistazo.
    case 'kpis-fila-dos-columnas':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M5 19V14" /><path d="M12 19V6" /><path d="M19 19V10" />
        </svg>
      )

    // Semáforo: el estado de lo pendiente.
    case 'pendientes-semaforo':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="8.5" y="3.5" width="7" height="17" rx="3.5" />
          <circle cx="12" cy="8" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="16" r="1.4" />
        </svg>
      )

    // Dos periodos, uno contra otro.
    case 'comparativa-periodos':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="4.5" width="7" height="15" rx="1.5" />
          <rect x="13.5" y="8.5" width="7" height="11" rx="1.5" />
        </svg>
      )

    // Gráfico y tabla: la curva y la rejilla.
    case 'grafico-y-tabla':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M3.5 15.5l4-4.5 3.5 3 5.5-6.5" />
          <path d="M3.5 19.5h17" /><path d="M14.5 19.5v-4h6v4" />
        </svg>
      )

    // Meta contra real: la diana.
    case 'meta-real-porcentaje':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" />
        </svg>
      )

    // Bloques numerados: frentes de igual peso.
    case 'tarjetas-numeradas':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="4.5" width="17" height="6" rx="1.5" />
          <rect x="3.5" y="13.5" width="17" height="6" rx="1.5" />
        </svg>
      )

    // Matriz: la rejilla de estados.
    case 'matriz-estados':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          <path d="M9.5 3.5v17M15 3.5v17M3.5 9.5h17M3.5 15h17" />
        </svg>
      )

    // Columnas de texto: lo cualitativo.
    case 'texto-multicolumna':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 6h6M4 10h6M4 14h4" /><path d="M14 6h6M14 10h6M14 14h4" />
        </svg>
      )

    case 'imagen-a-sangre':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" /><path d="M4.5 17l4.5-4 4 3.5 3-2.5 4 3" />
        </svg>
      )

    // Portada, agenda, divisor y cierre son HITOS: su sitio en el documento ya
    // los distingue —abren, separan, cierran— y un icono ahí sería ruido.
    default:
      return null
  }
}
