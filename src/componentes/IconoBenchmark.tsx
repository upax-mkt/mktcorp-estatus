/**
 * LOS ICONOS DEL BENCHMARK COMPETITIVO.
 *
 * Franco, sobre la pantalla del benchmark: *"la info no está bien organizada
 * ni diseñada, falta iconografía"*. Tenía nueve secciones seguidas, todas
 * abiertas con un título de texto y nada más: al hojearla no había forma de
 * saber si lo que venía era una tesis, una tabla o una lista de acciones sin
 * leer el título entero.
 *
 * MISMA REJILLA Y MISMO TRAZO que `IconoSeccion` y `IconoLayout` (24, 1,6,
 * extremos redondeados, `currentColor`). No son de una librería y no lo serán:
 * una librería añade un paquete entero para usar ocho iconos y —lo que
 * importa más— sus trazos vienen con su propio peso, que no es el de esta
 * tipografía. Un icono que pesa distinto que el título al que acompaña se lee
 * como pegado.
 *
 * `aria-hidden` en todos: el nombre de la sección está escrito al lado, y un
 * lector de pantalla que anuncie "imagen, tesis" antes de leer "La tesis"
 * dice dos veces lo mismo.
 */

const COMUNES = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export type IconoBench =
  | 'tesis'
  | 'resumen'
  | 'competidores'
  | 'ventana'
  | 'graficos'
  | 'cifras'
  | 'matriz'
  | 'acciones'
  | 'evidencia'
  | 'mercado'
  // Uno por disciplina: son los que encabezan los seis bloques en que se
  // reparte el análisis, y sus nombres coinciden con los ids de `DISCIPLINAS`
  // para que el bloque pida su icono sin una tabla de traducción en medio.
  | 'portafolio'
  | 'web'
  | 'paid'
  | 'rrss'
  | 'pr'
  | 'comercial'

export function IconoBenchmark({ nombre, className }: { nombre: IconoBench; className?: string }) {
  switch (nombre) {
    // La tesis: dos caminos que se separan. Es la elección, no la bombilla.
    case 'tesis':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M12 20.5V13" />
          <path d="M12 13L5.5 6.5" /><path d="M12 13l6.5-6.5" />
          <circle cx="5" cy="5.5" r="1.6" /><circle cx="19" cy="5.5" r="1.6" />
        </svg>
      )

    // El resumen: un párrafo condensado a tres renglones, el último corto.
    case 'resumen':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h9" />
        </svg>
      )

    // Contra quién competimos: dos figuras enfrentadas.
    case 'competidores':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="8" cy="8" r="2.8" /><circle cx="16" cy="8" r="2.8" />
          <path d="M3.5 19.5c0-2.5 2-4.2 4.5-4.2s4.5 1.7 4.5 4.2" />
          <path d="M11.5 19.5c0-2.5 2-4.2 4.5-4.2s4.5 1.7 4.5 4.2" />
        </svg>
      )

    // La ventana abierta: un hueco en la pared por el que se puede pasar.
    case 'ventana':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
          <path d="M12 4.5v15" /><path d="M4.5 12h7.5" />
          <path d="M15.5 12h4" strokeDasharray="1.5 2" />
        </svg>
      )

    // Los gráficos: barras de distinta altura, que es lo que se compara.
    case 'graficos':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 20h16" />
          <rect x="5.5" y="12" width="3.5" height="8" rx="0.8" />
          <rect x="10.5" y="7" width="3.5" height="13" rx="0.8" />
          <rect x="15.5" y="14.5" width="3.5" height="5.5" rx="0.8" />
        </svg>
      )

    // Las cifras duras: una tabla con su columna destacada.
    case 'cifras':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="M3.5 9h17" /><path d="M9 9v10.5" />
          <path d="M14.5 9v10.5" />
        </svg>
      )

    // La matriz: una rejilla con una casilla marcada.
    case 'matriz':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          <path d="M9.2 3.5v17" /><path d="M14.8 3.5v17" />
          <path d="M3.5 9.2h17" /><path d="M3.5 14.8h17" />
          <rect x="9.2" y="3.5" width="5.6" height="5.7" fill="currentColor" stroke="none" opacity="0.25" />
        </svg>
      )

    // Qué hacer: una lista con la primera ya marcada.
    case 'acciones':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 6.5l1.8 1.8L9 5" />
          <path d="M12 7h8" /><path d="M4.5 12.5h15.5" /><path d="M4.5 18h15.5" />
        </svg>
      )

    // La evidencia: lo que se mira. Un ojo sobre un marco.
    case 'evidencia':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M6.2 12c1.6-2.4 3.6-3.6 5.8-3.6s4.2 1.2 5.8 3.6" />
        </svg>
      )

    // El mercado: la tendencia que no controlamos, con su flecha.
    case 'mercado':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 17.5l5-5 3.5 3L20 7" />
          <path d="M15.5 7H20v4.5" />
        </svg>
      )

    // ── Las seis disciplinas ────────────────────────────────────────────────

    // Portafolio: las pantallas del inventario, una grande y dos pequeñas.
    case 'portafolio':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="4.5" width="11" height="8" rx="1.4" />
          <path d="M9 12.5v3" /><path d="M6.5 15.5h5" />
          <rect x="16.5" y="7" width="4" height="5.5" rx="1" />
          <rect x="16.5" y="15" width="4" height="4.5" rx="1" />
        </svg>
      )

    // Web y SEO: el globo del buscador con su meridiano.
    case 'web':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M3.8 12h16.4" />
          <path d="M12 3.8c2.2 2.4 3.3 5.2 3.3 8.2s-1.1 5.8-3.3 8.2" />
          <path d="M12 3.8c-2.2 2.4-3.3 5.2-3.3 8.2s1.1 5.8 3.3 8.2" />
        </svg>
      )

    // Paid media: el clic que se paga. Un cursor sobre un anuncio.
    case 'paid':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="4.5" width="13" height="10" rx="1.6" />
          <path d="M6.5 8h7" /><path d="M6.5 11h4" />
          <path d="M13.5 13.2l6.5 3.2-2.9 1.1-1.1 2.9z" />
        </svg>
      )

    // Inbound y RRSS: el globo de conversación con su reacción.
    case 'rrss':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 6.6A2.1 2.1 0 016.1 4.5h9A2.1 2.1 0 0117.2 6.6v5.3a2.1 2.1 0 01-2.1 2.1H9l-5 3.4z" />
          <path d="M20 9.5v6.2a2.1 2.1 0 01-2.1 2.1h-1.2l.3 2.7-3.2-2.7" />
        </svg>
      )

    // PR: el micrófono de la vocería, con su base.
    case 'pr':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="9.2" y="3.2" width="5.6" height="10.4" rx="2.8" />
          <path d="M5.8 11.5a6.2 6.2 0 0012.4 0" />
          <path d="M12 17.7v3.1" /><path d="M8.8 20.8h6.4" />
        </svg>
      )

    // Comercial: el apretón de manos que cierra. Dos trazos que se encuentran.
    case 'comercial':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M3.5 9.5l3-2.5 4 3.2 2.2-1.6 4.4 3.6" />
          <path d="M13.5 8.6l3.4-2.1 3.6 3v6l-3 2-3.2-2.6" />
          <path d="M3.5 9.5v5.6l3.4 2.4 3.3-2.6" />
        </svg>
      )
  }
}
