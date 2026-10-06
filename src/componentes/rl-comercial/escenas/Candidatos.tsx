import base from '../base.module.css'
import estilos from './Candidatos.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto, Luz } from '../comun'

/**
 * CANDIDATOS A PM (escena 7, energía 6): comparar → destacar.
 *
 * Tres retratos editoriales (monograma en Anton en lugar de foto) con las filas
 * alineadas entre columnas: veredicto, nombre, dato, fortalezas y «Por
 * desarrollar». Las tres entran iguales y a la vez, en escalón corto; después
 * el cliente brota sobre la columna de Rocío y, en el mismo gesto, Violeta y
 * Juan Carlos bajan al 55 % y Rocío se eleva con el contorno encendido. Quieta
 * a los 1160 ms (ver la hoja).
 *
 * El estado destacado ES el estado por defecto: sin JS, impresa o con
 * movimiento reducido se ve ya resuelta. Conducta observada, sin citas de las
 * entrevistas.
 */

type Candidatura = {
  iniciales: string
  nombre: string
  dato: string
  veredicto: string
  fortalezas: readonly string[]
  desarrollar: string
  recomendada: boolean
}

const CANDIDATURAS: readonly Candidatura[] = [
  {
    iniciales: 'RC',
    nombre: 'Rocío Cervantes',
    dato: 'Cualitativo · casi 6 años en RL',
    veredicto: 'Recomendada',
    fortalezas: [
      'Arma la propuesta desde el problema del cliente',
      'Coordina proyectos de varias áreas y reporta avance cada semana',
      'Propuso tarifario y cotizar el mismo día',
      'Tiene clientes que le vuelven a comprar',
    ],
    desarrollar: 'Costeo y control de alcance, con contraparte en cuantitativo',
    recomendada: true,
  },
  {
    iniciales: 'VH',
    nombre: 'Violeta Hernández',
    dato: 'Cuantitativo · 18 años en RL',
    veredicto: 'Contraparte en cuantitativo',
    fortalezas: [
      'La más sólida en metodología y viabilidad de campo',
      'Conoce la regla de precio y la aplica',
      'Organiza el arranque de cada proyecto con el cliente',
    ],
    desarrollar: 'La venta y la negociación de alcance',
    recomendada: false,
  },
  {
    iniciales: 'JCG',
    nombre: 'Juan Carlos Gutiérrez',
    dato: 'Cuantitativo · 8 años en RL',
    veredicto: 'Evaluar con un caso',
    fortalezas: ['Pide estar con el cliente desde el arranque', 'Conoce los tiempos de cotización y de campo'],
    desarrollar: 'La conversación no alcanzó para evaluarlo a fondo',
    recomendada: false,
  },
]

export function Candidatos() {
  return (
    <section data-layout="candidatos" className={`${base.pantalla} ${base.noche}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Project Manager · tres candidaturas
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Rocío Cervantes, la PM que el journey necesita
          </h2>
        </header>

        <div className={base.cuerpo}>
          <ul className={estilos.terna}>
            {CANDIDATURAS.map((c, i) => (
              // Entran iguales, en escalón corto de 45 ms (orden 2, 2.5, 3).
              <li key={c.nombre} className={`${base.aparece} ${estilos.candidatura}`} style={orden(2 + i * 0.5)}>
                <article className={`${estilos.retrato} ${c.recomendada ? estilos.destacada : estilos.atenuada}`}>
                  <div className={estilos.encabezado}>
                    <span className={estilos.monograma} aria-hidden="true">
                      {c.iniciales}
                    </span>
                    <p className={estilos.veredicto}>{c.veredicto}</p>
                  </div>
                  <h3 className={estilos.nombre}>{c.nombre}</h3>
                  <p className={estilos.dato}>{c.dato}</p>
                  <ul className={estilos.fortalezas}>
                    {c.fortalezas.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className={estilos.desarrollar}>
                    <p className={estilos.desarrollarEtiqueta}>Por desarrollar</p>
                    <p className={estilos.desarrollarTexto}>{c.desarrollar}</p>
                  </div>
                  {/* A ella se le entrega el cliente: el punto se posa en lo alto de su columna. */}
                  {c.recomendada ? <Punto tam={20} className={`${base.brota} ${estilos.punto}`} /> : null}
                </article>
              </li>
            ))}
          </ul>

          <p className={`${base.aparece} ${estilos.condiciones}`} style={orden(4)}>
            <span className={estilos.condicionesEtiqueta}>Condiciones:</span> definir qué decide la PM y qué decide
            cada dirección de área · Violeta como contraparte en cuantitativo · parte de su variable por propuestas
            ganadas · para confirmar, un caso real del brief a la propuesta presentada.
          </p>
        </div>
      </Escena>
    </section>
  )
}
