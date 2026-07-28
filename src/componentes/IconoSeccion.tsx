/**
 * LOS ICONOS DE LAS SECCIONES DE UNA SALA.
 *
 * Franco: "faltan algunos iconos o elementos para hacerla más dinámica".
 *
 * Dibujados a mano y no traídos de una librería, por dos razones que no son
 * de gusto: una librería de iconos añade un paquete entero para usar seis, y
 * —lo que importa más— sus trazos vienen con su propio peso, que no es el de
 * la tipografía de esta app. Un icono que pesa distinto que el título al que
 * acompaña se lee como pegado.
 *
 * Todos comparten rejilla de 24, trazo de 1,6 y extremos redondeados, y toman
 * el color de su texto (`currentColor`). Así un icono es una letra más de su
 * encabezado, no una estampa al lado.
 *
 * `aria-hidden` en todos: el nombre de la sección ya está escrito justo al
 * lado. Un lector de pantalla que anuncie "imagen, acuerdos" antes de leer
 * "Acuerdos" está diciendo la misma palabra dos veces.
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

export type NombreIcono = 'acuerdos' | 'reuniones' | 'benchmark' | 'archivos' | 'clave' | 'minuta'

export function IconoSeccion({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  switch (nombre) {
    // Un compromiso cumplido: la casilla y su palomita.
    case 'acuerdos':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      )

    // Una reunión: gente alrededor de algo. Dos siluetas, no un calendario —
    // el calendario ya es la agenda, y significaría otra cosa.
    case 'reuniones':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="9" cy="8.5" r="2.75" />
          <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
          <circle cx="17" cy="9.5" r="2.25" />
          <path d="M15.5 14.9c3 .3 5 2.2 5 4.6" />
        </svg>
      )

    // Comparar contra otros: tres alturas distintas.
    case 'benchmark':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M5 19.5V13" />
          <path d="M12 19.5V6.5" />
          <path d="M19 19.5V10" />
        </svg>
      )

    case 'archivos':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 7.5A2.5 2.5 0 016.5 5h3l2 2.5h6A2.5 2.5 0 0120 10v6.5a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5z" />
        </svg>
      )

    case 'clave':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="8" cy="12" r="3.5" />
          <path d="M11.5 12H20" />
          <path d="M17 12v3" />
          <path d="M20 12v2" />
        </svg>
      )

    case 'minuta':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M6 4.5h8.5L18.5 8.5v11a1 1 0 01-1 1h-11a1 1 0 01-1-1v-14a1 1 0 011-1z" />
          <path d="M14 4.5v4.5h4.5" />
          <path d="M8.5 13h7M8.5 16.5h4.5" />
        </svg>
      )
  }
}
