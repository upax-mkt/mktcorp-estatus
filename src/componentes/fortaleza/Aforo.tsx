import type { CSSProperties } from 'react'
import estilos from './Aforo.module.css'

/**
 * EL AFORO: el hilo conductor de «Lo queremos lleno».
 *
 * El teatro visto desde arriba: el escenario abajo al centro y unas 380 butacas en doce filas en abanico. Las
 * butacas se ocupan de adelante hacia atrás y del centro hacia los lados. Hoy, la mitad (lo que dijeron ellos:
 * «están al 50 %»). Cada uno de los cinco frentes enciende su tramo (8 % cada uno) y la cumbre enciende el último
 * 10 %: «lo llenamos juntos».
 *
 * GEOMETRÍA FIJA: todo sale de constantes, sin azar (invariante de determinismo). Se calcula una sola vez al cargar
 * el módulo y cada butaca guarda su orden de ocupación.
 *
 * VISIBLE SIN JAVASCRIPT: las butacas encendidas están en el HTML. Solo el tramo que se enciende en esta escena
 * (`enciende`) arranca apagado, y únicamente bajo `[data-animar='true']:not([data-visible='true'])`, que pone
 * `Escena` ya montada. Impreso o con movimiento reducido, se ve el estado final.
 */

export const ANCHO = 600
export const ALTO = 344
export const CX = 300
export const CY = 322
const FILAS = 12
const R0 = 76
const DR = 19.4
const ANG_MIN = 14
const ANG_MAX = 166
const SEPARACION = 15.2
export const RADIO_BUTACA = 4.2

interface Butaca {
  x: number
  y: number
  fila: number
  orden: number
}

function calcular(): Butaca[] {
  const crudas: { x: number; y: number; fila: number; puntaje: number }[] = []
  const tramo = ((ANG_MAX - ANG_MIN) * Math.PI) / 180
  for (let f = 0; f < FILAS; f++) {
    const r = R0 + f * DR
    const n = Math.floor((r * tramo) / SEPARACION)
    for (let s = 0; s < n; s++) {
      const t = n === 1 ? 0.5 : s / (n - 1)
      const ang = ((ANG_MIN + t * (ANG_MAX - ANG_MIN)) * Math.PI) / 180
      const x = Math.round((CX + r * Math.cos(ang)) * 100) / 100
      const y = Math.round((CY - r * Math.sin(ang)) * 100) / 100
      const lado = Math.abs(t - 0.5) * 2
      crudas.push({
        x,
        y,
        fila: f,
        puntaje: (f / (FILAS - 1)) * 1 + lado * 0.85,
      })
    }
  }
  crudas.sort((a, b) => a.puntaje - b.puntaje || a.fila - b.fila || a.x - b.x)
  return crudas.map((c, orden) => ({ x: c.x, y: c.y, fila: c.fila, orden }))
}

export const BUTACAS: readonly Butaca[] = calcular()
export const TOTAL = BUTACAS.length
/** Las que hoy están ocupadas: la mitad. */
export const BASE = Math.ceil(TOTAL * 0.5)
/** Lo que enciende cada frente: 8 % del teatro. */
export const TRAMO = Math.round(TOTAL * 0.08)

/** Hasta qué butaca (exclusiva) llega cada estado. */
export function limite(frentes: number, lleno = false): number {
  return lleno ? TOTAL : Math.min(TOTAL, BASE + frentes * TRAMO)
}

/** El rango [desde, hasta) del tramo de un frente (1–5) o de la cumbre. */
export function rangoDe(tramo: number | 'cumbre'): [number, number] {
  return tramo === 'cumbre' ? [BASE + 5 * TRAMO, TOTAL] : [BASE + (tramo - 1) * TRAMO, BASE + tramo * TRAMO]
}

/**
 * Dónde poner el número de cada tramo en la escena 6: fuera del abanico, donde su franja toca la última fila, del
 * lado izquierdo. Cada tramo es una franja simétrica (del centro a los lados), así que su centro caía siempre en el
 * eje del escenario y los cinco números quedaban encimados sobre las butacas naranjas.
 */
function centroDe(tramo: number): { x: number; y: number } {
  const [desde, hasta] = rangoDe(tramo)
  const brazo = BUTACAS.filter((b) => b.orden >= desde && b.orden < hasta && b.x < CX)
  const fila = Math.max(...brazo.map((b) => b.fila))
  const borde = brazo.filter((b) => b.fila === fila)
  const a = borde.reduce((s, b) => s + Math.atan2(CY - b.y, b.x - CX), 0) / borde.length
  const r = R0 + (FILAS - 1) * DR + 24
  return {
    x: Math.round(CX + r * Math.cos(a)),
    y: Math.round(CY - r * Math.sin(a)),
  }
}

/** El tramo del último frente encendido (el que esta escena suma); en la cumbre, el último 10 %. */
function tramoActual(frentes: number, lleno: boolean): [number, number] {
  if (lleno) return rangoDe('cumbre')
  return frentes >= 1 ? rangoDe(frentes) : [-1, -1]
}

export function Aforo({
  frentes = 0,
  lleno = false,
  enciende,
  marcarFrentes = false,
  contorno = false,
  destacar = true,
  tam = 'chico',
  rotulo,
  etiqueta,
  retardo = 300,
  pasoButaca = 5,
  className = '',
  style,
}: {
  /** Cuántos frentes ya encendieron su tramo (0 = la mitad de hoy). */
  frentes?: 0 | 1 | 2 | 3 | 4 | 5
  /** Todo encendido (la cumbre). */
  lleno?: boolean
  /** El tramo que se enciende al llegar a esta escena. */
  enciende?: 1 | 2 | 3 | 4 | 5 | 'cumbre'
  /** Escena 6: la mitad vacía en cinco tramos numerados. */
  marcarFrentes?: boolean
  /** Escena 4: las butacas vacías en contorno, el lugar que hay para sumar. */
  contorno?: boolean
  /** Si el tramo del último frente va con más luz (lo que suma esta escena). En la ruta, todo parejo: `false`. */
  destacar?: boolean
  tam?: 'chico' | 'medio' | 'grande'
  /** Texto corto bajo el dibujo: «Hoy, la mitad», «Frente 2 de 5». */
  rotulo?: string
  /** Lo que dice el lector de pantalla. Por omisión se describe el estado. */
  etiqueta?: string
  /** Cuándo empieza a encender el tramo, en ms desde que llega la escena: después de lo demás, para que se vea solo. */
  retardo?: number
  /** Milisegundos entre una butaca y la siguiente del tramo que se enciende (30 butacas × 5 ms = 150 ms). */
  pasoButaca?: number
  className?: string
  style?: CSSProperties
}) {
  const hasta = limite(frentes, lleno)
  const [nuevoDesde, nuevoHasta] = enciende ? rangoDe(enciende) : [-1, -1]
  const [actualDesde, actualHasta] = destacar ? tramoActual(frentes, lleno) : [-1, -1]
  const esActual = (orden: number) => orden >= actualDesde && orden < actualHasta
  const pct = Math.round((hasta / TOTAL) * 100)
  const descripcion = etiqueta ?? (lleno ? 'El teatro lleno.' : `El teatro, con ${pct} % de sus butacas ocupadas.`)

  return (
    <figure
      className={`${estilos.aforo} ${className}`}
      data-tam={tam}
      style={{ ...style, '--fm-aforo-retardo': `${retardo}ms` } as CSSProperties}
    >
      {/* `data-viajero`: al presentar, este dibujo viaja de una escena a la siguiente (ModoPresentar, `transiciones`). */}
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={descripcion}
        className={estilos.dibujo}
        data-viajero=""
      >
        <path className={estilos.escenario} d={`M ${CX - 54} ${CY} A 54 54 0 0 1 ${CX + 54} ${CY} Z`} />
        <text className={estilos.escenarioTexto} x={CX} y={CY - 12} textAnchor="middle">
          ESCENARIO
        </text>
        <g className={contorno ? `${estilos.vacias} ${estilos.contorno}` : estilos.vacias}>
          {BUTACAS.map((b) => {
            const tramo =
              marcarFrentes && b.orden >= BASE && b.orden < BASE + 5 * TRAMO
                ? Math.floor((b.orden - BASE) / TRAMO) + 1
                : 0
            return (
              <circle
                key={b.orden}
                cx={b.x}
                cy={b.y}
                r={RADIO_BUTACA}
                className={tramo ? `${estilos.marcada} ${tramo % 2 ? estilos.impar : estilos.par}` : undefined}
                data-tramo={tramo || undefined}
              />
            )
          })}
        </g>
        {/* OCUPADAS, en dos capas: la mitad de hoy (más tenue) y los tramos que ya sumaron los frentes; encima, con
            más luz, el tramo que suma esta escena. Así el cuadro fijo y el PDF dicen qué agregó cada frente. */}
        <g className={estilos.ocupadas}>
          {BUTACAS.filter((b) => b.orden < hasta && !esActual(b.orden)).map((b) => (
            <circle
              key={b.orden}
              cx={b.x}
              cy={b.y}
              r={RADIO_BUTACA + 0.2}
              className={b.orden < BASE ? estilos.hoy : undefined}
            />
          ))}
        </g>
        <g className={`${estilos.ocupadas} ${estilos.actuales}`}>
          {BUTACAS.filter((b) => b.orden < hasta && esActual(b.orden)).map((b) => {
            const nueva = b.orden >= nuevoDesde && b.orden < nuevoHasta
            return (
              <circle
                key={b.orden}
                cx={b.x}
                cy={b.y}
                r={RADIO_BUTACA + 0.4}
                className={nueva ? estilos.nueva : undefined}
                style={
                  nueva
                    ? ({
                        '--j': b.orden - nuevoDesde,
                        '--paso-butaca': `${pasoButaca}ms`,
                      } as CSSProperties)
                    : undefined
                }
              />
            )
          })}
        </g>
        {marcarFrentes ? (
          <g className={estilos.numeros}>
            {[1, 2, 3, 4, 5].flatMap((n) => {
              const c = centroDe(n)
              // Cada tramo son dos alas simétricas: el número va en las dos.
              return [c.x, ANCHO - c.x].map((x, lado) => (
                <g key={`${n}-${lado}`} transform={`translate(${x} ${c.y})`}>
                  <circle r="13" />
                  <text textAnchor="middle" dy="4.6">
                    {n}
                  </text>
                </g>
              ))
            })}
          </g>
        ) : null}
      </svg>
      {rotulo ? (
        <figcaption className={estilos.rotulo} data-aforo-rotulo="">
          {rotulo}
        </figcaption>
      ) : null}
    </figure>
  )
}
