import type { DecisionSlide } from '@/decision/esquema'
import estilos from './editor.module.css'

/**
 * El esquema de un tipo de sección, dibujado.
 *
 * Elegir entre trece tipos leyendo trece nombres en un desplegable —"Meta
 * contra real", "Comparativa entre periodos", "Bloques numerados"— obliga a
 * traducir cada uno a una forma antes de decidir. El dibujo es la forma.
 *
 * NO son capturas: son esquemas. Una captura de la sección real cambiaría con
 * el contenido y habría que regenerarla; lo que aquí interesa es la
 * disposición —dónde va el título, si hay columnas, si hay tabla— que es
 * exactamente lo que el tipo decide.
 */

/** Un rectángulo del esquema, en el sistema de coordenadas del lienzo (60×40). */
type Pieza = [x: number, y: number, ancho: number, alto: number, papel?: 'marca' | 'suave' | 'fuerte']

const ANCHO = 60
const ALTO = 40

const ESQUEMAS: Record<DecisionSlide['layout'], Pieza[]> = {
  // Gradiente arriba y un título grande debajo: la portada real.
  'portada': [[0, 0, 60, 12, 'marca'], [4, 18, 42, 6, 'fuerte'], [4, 27, 26, 3]],
  // Título + lista numerada.
  'agenda': [
    [4, 4, 30, 4, 'fuerte'],
    [4, 13, 3, 3, 'marca'], [10, 13, 40, 3],
    [4, 20, 3, 3, 'marca'], [10, 20, 34, 3],
    [4, 27, 3, 3, 'marca'], [10, 27, 38, 3],
  ],
  // Barra de marca a la izquierda y el nombre del bloque.
  'divisor-seccion': [[0, 0, 4, 40, 'marca'], [10, 15, 34, 6, 'fuerte'], [10, 24, 22, 3]],
  // Tabla con semáforo en la primera columna.
  'pendientes-semaforo': [
    [4, 4, 52, 4, 'suave'],
    [4, 11, 3, 3, 'marca'], [10, 11, 46, 3],
    [4, 18, 3, 3, 'marca'], [10, 18, 46, 3],
    [4, 25, 3, 3, 'marca'], [10, 25, 46, 3],
    [4, 32, 3, 3, 'marca'], [10, 32, 46, 3],
  ],
  // Fila de cifras arriba, dos columnas de texto debajo.
  'kpis-fila-dos-columnas': [
    [4, 4, 15, 9, 'fuerte'], [22, 4, 15, 9, 'fuerte'], [40, 4, 16, 9, 'fuerte'],
    [4, 18, 24, 3, 'marca'], [4, 24, 24, 3], [4, 30, 20, 3],
    [32, 18, 24, 3, 'marca'], [32, 24, 24, 3], [32, 30, 22, 3],
  ],
  // Tres columnas de texto.
  'texto-multicolumna': [
    [4, 4, 15, 3, 'marca'], [4, 10, 15, 3], [4, 16, 15, 3], [4, 22, 12, 3],
    [22, 4, 15, 3, 'marca'], [22, 10, 15, 3], [22, 16, 15, 3], [22, 22, 14, 3],
    [40, 4, 16, 3, 'marca'], [40, 10, 16, 3], [40, 16, 16, 3], [40, 22, 11, 3],
  ],
  // Tabla comparando dos columnas de periodo.
  'comparativa-periodos': [
    [4, 4, 24, 3], [32, 4, 11, 3, 'marca'], [45, 4, 11, 3, 'marca'],
    [4, 12, 24, 3], [32, 12, 11, 3, 'suave'], [45, 12, 11, 3, 'suave'],
    [4, 20, 24, 3], [32, 20, 11, 3, 'suave'], [45, 20, 11, 3, 'suave'],
    [4, 28, 24, 3], [32, 28, 11, 3, 'suave'], [45, 28, 11, 3, 'suave'],
  ],
  // Barras a la izquierda, tabla a la derecha.
  'grafico-y-tabla': [
    [5, 22, 5, 12, 'marca'], [12, 15, 5, 19, 'marca'], [19, 10, 5, 24, 'marca'], [4, 35, 22, 1, 'suave'],
    [32, 6, 24, 3, 'suave'], [32, 13, 24, 3], [32, 20, 24, 3], [32, 27, 24, 3],
  ],
  // Barra de progreso ancha + cifras desglosadas debajo.
  'meta-real-porcentaje': [
    [4, 6, 52, 8, 'suave'], [4, 6, 36, 8, 'marca'],
    [4, 20, 15, 12, 'fuerte'], [22, 20, 15, 12, 'fuerte'], [40, 20, 16, 12, 'fuerte'],
  ],
  // Bloques con su número colgando.
  'tarjetas-numeradas': [
    [4, 5, 4, 4, 'marca'], [11, 5, 45, 3], [11, 10, 38, 3],
    [4, 17, 4, 4, 'marca'], [11, 17, 45, 3], [11, 22, 40, 3],
    [4, 29, 4, 4, 'marca'], [11, 29, 45, 3], [11, 34, 35, 3],
  ],
  // Rejilla de estados.
  'matriz-estados': [
    [16, 3, 12, 3, 'suave'], [30, 3, 12, 3, 'suave'], [44, 3, 12, 3, 'suave'],
    [4, 9, 10, 7], [16, 9, 12, 7, 'marca'], [30, 9, 12, 7, 'suave'], [44, 9, 12, 7, 'suave'],
    [4, 18, 10, 7], [16, 18, 12, 7, 'suave'], [30, 18, 12, 7, 'marca'], [44, 18, 12, 7, 'suave'],
    [4, 27, 10, 7], [16, 27, 12, 7, 'suave'], [30, 27, 12, 7, 'suave'], [44, 27, 12, 7, 'marca'],
  ],
  // Una imagen que ocupa todo.
  'imagen-a-sangre': [[0, 0, 60, 40, 'marca']],
  // El cuadro del vídeo con su barra de reproducción abajo.
  'video': [
    [4, 4, 52, 26, 'marca'],
    [4, 33, 52, 3, 'suave'],
    [4, 33, 18, 3, 'fuerte'],
  ],
  // Cierre: poco texto, centrado.
  'cierre': [[16, 14, 28, 6, 'fuerte'], [22, 24, 16, 3]],
}

const RELLENO: Record<NonNullable<Pieza[4]>, string> = {
  marca: 'var(--sala, #888)',
  fuerte: 'color-mix(in oklch, currentColor 55%, transparent)',
  suave: 'color-mix(in oklch, currentColor 16%, transparent)',
}

interface Props {
  layout: DecisionSlide['layout']
}

export function MiniaturaTipo({ layout }: Props) {
  const piezas = ESQUEMAS[layout] ?? []
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={estilos.miniatura}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={ANCHO} height={ALTO} rx="2" className={estilos.miniaturaFondo} />
      {piezas.map(([x, y, ancho, alto, papel], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={ancho}
          height={alto}
          rx="1"
          fill={papel ? RELLENO[papel] : 'color-mix(in oklch, currentColor 28%, transparent)'}
        />
      ))}
    </svg>
  )
}
