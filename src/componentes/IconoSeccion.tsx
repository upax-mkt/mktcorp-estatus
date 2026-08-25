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

export type NombreIcono =
  | 'acuerdos'
  | 'reuniones'
  | 'benchmark'
  | 'archivos'
  | 'prensa'
  | 'clave'
  | 'minuta'
  // Los tres del Home, cuando adoptó esta misma cabecera (ver `Seccion.tsx`).
  | 'clientes'
  | 'calendario'
  | 'pausa'
  | 'marca'
  | 'enlaces'
  | 'tipografia'
  // El del Home: cuánto lleva una sala sin sesión (ver `page.tsx`).
  | 'reloj'

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

    // Un periódico: la hoja, su titular y las dos columnas de texto. Es lo
    // que distingue de un vistazo el módulo de prensa del de material, cuya
    // carpeta está justo encima.
    case 'prensa':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M4 6.5A1.5 1.5 0 015.5 5h11A1.5 1.5 0 0118 6.5V17a2 2 0 002 2H6a2 2 0 01-2-2z" />
          <path d="M7.5 8.5h7" />
          <path d="M7.5 12h3" />
          <path d="M7.5 15h3" />
          <path d="M13 12h1.5" />
          <path d="M13 15h1.5" />
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

    // Los clientes: tres marcas, una junto a otra. No siluetas de personas —
    // eso ya es 'reuniones', y un cliente aquí es una marca, no una persona.
    case 'clientes':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="6" width="5" height="12" rx="1.5" />
          <rect x="10.5" y="9" width="5" height="9" rx="1.5" />
          <rect x="17.5" y="4" width="3" height="14" rx="1.5" />
        </svg>
      )

    // ⚠️ RADIO 8, Y LOS DOS VALORES QUE SE PROBARON ANTES ESTÁN MEDIDOS.
    // Se dibujó primero con 8,5: el trazo ocupaba 17x17 de la rejilla de 24
    // mientras 'acuerdos' ocupa 17x15, así que a la misma caja CSS de 15px el
    // reloj se veía un 13% más alto que el check de al lado. Franco:
    // *"algunos se ven más grandes que otros"*. Bajarlo a 7,5 igualaba el
    // alto (15) pero lo dejaba en 15 de ANCHO contra los 17 de los otros dos,
    // y un círculo más estrecho que un rectángulo se lee todavía más pequeño:
    // la compensación óptica va al revés, un círculo necesita algo MÁS de
    // caja que un cuadrado para pesar igual. Con 8 queda en 16x16 — un punto
    // por debajo en ancho y entre los dos en alto.
    //
    // Cuánto tiempo pasó: un reloj. Va con "última sesión" en la tarjeta de
    // cliente, donde el dato NO es una fecha sino un transcurso ("hace 47
    // días"), así que un calendario mentiría — ese acompaña a "próxima", que
    // sí es una fecha en el almanaque.
    case 'reloj':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8V12l2.7 1.7" />
        </svg>
      )

    case 'calendario':
      return (
        <svg {...COMUNES} className={className}>
          <rect x="3.5" y="5.5" width="17" height="14" rx="2.5" />
          <path d="M3.5 10h17" />
          <path d="M8 3.5v4M16 3.5v4" />
        </svg>
      )

    // En pausa: las dos barras de siempre. Se entiende sin leer el título, que
    // es justo lo que hace falta en una sección que se salta la mayoría.
    //
    // ⚠️ AHORA DENTRO DE UN CÍRCULO, y no las dos barras sueltas de antes.
    // Medido en el DOM: sueltas ocupaban 5x13 de la rejilla de 24 mientras
    // sus hermanos ocupan 17x15 o 16x16 — un tercio del ancho. Rompía la
    // regla que este mismo archivo declara arriba ("todos comparten rejilla
    // de 24... así un icono es una letra más de su encabezado"), y se veía:
    // junto a un rótulo, en la tarjeta de una sala en pausa, el dibujo pesaba
    // visiblemente menos que el reloj de la fila de encima. Con el círculo
    // pasa a 16x16, la misma mancha que 'reloj', y de paso es el pictograma
    // de pausa que cualquiera reconoce sin leer.
    //
    // Toca también la cabecera "Estado" de los ajustes de una sala (el otro
    // sitio donde vive este icono), y ahí gana lo mismo: deja de ser el único
    // encabezado cuyo icono pesa menos que su título.
    case 'pausa':
      return (
        <svg {...COMUNES} className={className}>
          <circle cx="12" cy="12" r="8" />
          <path d="M10.2 9v6M13.8 9v6" />
        </svg>
      )

    // ---- Los tres del editor de una sala (20-ago-2026) ----

    // La marca: una gota de color sobre su muestra. No un bote de pintura ni
    // una paleta de pintor con su pulgar — a este tamaño los dos se leen como
    // una mancha, y lo que se edita aquí son colores planos.
    case 'marca':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M12 3.5c3 3.6 5 6.2 5 8.4a5 5 0 0 1-10 0c0-2.2 2-4.8 5-8.4Z" />
          <path d="M9.6 12.4a2.6 2.6 0 0 0 2.6 2.6" />
        </svg>
      )

    // Los enlaces: los dos eslabones de siempre. Es el icono que todo el
    // mundo ya sabe leer, y esta sección no es sitio para enseñar uno nuevo.
    case 'enlaces':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M10 13.8a3.6 3.6 0 0 0 5.3.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
          <path d="M14 10.2a3.6 3.6 0 0 0-5.3-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
        </svg>
      )

    // La tipografía: una "A" con su línea de base. La letra ES el asunto de la
    // sección, así que el icono la enseña en vez de aludir a ella.
    case 'tipografia':
      return (
        <svg {...COMUNES} className={className}>
          <path d="M5.5 16.5 10.4 5.5h1.2l4.9 11" />
          <path d="M7.6 12.8h6.8" />
          <path d="M4 20h16" />
        </svg>
      )
  }
}
