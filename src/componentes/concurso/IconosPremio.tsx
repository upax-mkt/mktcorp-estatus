/**
 * LOS DOS ICONOS DEL PREMIO: una persona y una dupla.
 *
 * Dibujados a mano y no traídos de una librería, por la misma razón por la que
 * el cartel es un collage: un icono de línea fina y esquinas redondeadas —el
 * repertorio de cualquier set genérico— aquí se leería como lo que es, un
 * pegote de otra estética encima de un fanzine.
 *
 * Lo que los hace punk no es un adorno: es el trazo GRUESO y desigual (dos
 * anchos distintos en la misma figura), los remates cuadrados, la línea de
 * subrayado rota como una tachadura de rotulador, y la inclinación de un grado
 * y medio, que es la misma que llevan las tarjetas y los botones de esta
 * página. Nada de eso es aleatorio: son las reglas que ya sigue el resto.
 *
 * `stroke: currentColor` para que hereden el color de su tarjeta, y
 * `aria-hidden` porque el texto que acompañan —«INDIVIDUAL», «DUPLA · CADA
 * PERSONA»— ya dice lo mismo: anunciarlo dos veces a un lector de pantalla es
 * ruido, no accesibilidad.
 */

const COMUN = {
  viewBox: '0 0 48 48',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
}

/** Una persona: participación individual. */
export function IconoSolo({ className }: { className?: string }) {
  return (
    <svg {...COMUN} className={className} width="48" height="48">
      {/* Cabeza: un círculo trazado con dos arcos, no uno — el corte se ve y
          es lo que le quita el acabado de plantilla. */}
      <path d="M24 6.5a7.5 7.5 0 0 1 7.4 7.5 7.5 7.5 0 0 1-7.4 7.5" strokeWidth="3.4" />
      <path d="M24 21.5a7.5 7.5 0 0 1-7.5-7.5A7.5 7.5 0 0 1 24 6.5" strokeWidth="2.4" />
      {/* Hombros, en trazo más grueso: el peso cae abajo, como en un sello. */}
      <path d="M10.5 40.5c0-7.2 6-11.5 13.5-11.5s13.5 4.3 13.5 11.5" strokeWidth="3.8" />
      {/* Tachadura de rotulador bajo la figura, cortada a propósito. */}
      <path d="M13 45.5h9m4 0h10" strokeWidth="2.6" />
    </svg>
  )
}

/** Dos personas: dupla de squads distintos. */
export function IconoDupla({ className }: { className?: string }) {
  return (
    <svg {...COMUN} className={className} width="48" height="48">
      {/* La de atrás, más fina y desplazada: profundidad sin sombra. */}
      <circle cx="32.5" cy="14.5" r="6" strokeWidth="2.2" />
      <path d="M23 40.5c0-6.4 5-10.2 11.5-10.2 5.2 0 9.5 2.4 11 6.6" strokeWidth="2.2" />
      {/* La de delante, con el trazo pesado. */}
      <path d="M17 8.5a7 7 0 0 1 6.9 7 7 7 0 0 1-6.9 7" strokeWidth="3.4" />
      <path d="M17 22.5a7 7 0 0 1-7-7 7 7 0 0 1 7-7" strokeWidth="2.4" />
      <path d="M4.5 40.5c0-6.8 5.6-10.8 12.5-10.8s12.5 4 12.5 10.8" strokeWidth="3.8" />
      <path d="M6 45.5h8m4 0h9" strokeWidth="2.6" />
    </svg>
  )
}
