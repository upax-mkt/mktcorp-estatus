import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Indice.module.css'
import { Escena } from '../../politico/Escena'
import { Luz, MARCAS, orden } from '../comun'
import { PROPIEDADES, PROPUESTAS } from '../contenido'

/**
 * FORTALEZA MEXICANA, AL CENTRO (ronda 6, 21-oct-2026). El dibujo que pidió Ceci el 20-oct («Fortaleza Mexicana en el
 * medio» y lo demás alrededor, «como botones»), ahora con las cuatro partes que Marketing United propuso impulsar y que
 * Ceci aprobó el 21-oct: Malinche, el Frontón, Pelota Mestiza y las experiencias gastronómicas. Cada botón lleva a lo
 * que proponemos para esa parte, que viene después en orden.
 */

const RADIO = 35

/** Dónde va cada parte en el aro (porcentajes del dibujo), en el sentido del reloj desde arriba. */
const POSICIONES = PROPIEDADES.map((_, i) => {
  const angulo = ((-90 + (360 / PROPIEDADES.length) * i) * Math.PI) / 180
  return {
    x: Math.round((50 + RADIO * Math.cos(angulo)) * 100) / 100,
    y: Math.round((50 + RADIO * Math.sin(angulo)) * 100) / 100,
  }
})

/** La primera pantalla de propuestas de cada parte. */
const destino = (id: string) => PROPUESTAS.find((p) => p.propiedad === id)?.id ?? ''

export function Indice() {
  return (
    <section data-layout="indice" aria-labelledby="indice-titulo" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.vistaDibujo}>
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
              Lo que proponemos
            </p>
            <h2 id="indice-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
              Fortaleza Mexicana, al centro
            </h2>
            <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
              Siete unidades de Grupo UPAX y su Marketing Corporativo, trabajando en cuatro partes.{' '}
              <span className={estilos.indicacion}>En las páginas que siguen, qué proponemos para cada una y cómo se verá.</span>
            </p>
          </header>

          <div className={estilos.dibujo}>
            <svg className={estilos.lineas} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <circle cx="50" cy="50" r={RADIO} className={`${estilos.aro} ${base.trazo}`} pathLength={1} style={orden(3)} />
              {POSICIONES.map((p, i) => (
                <line
                  key={PROPIEDADES[i].id}
                  x1="50"
                  y1="50"
                  x2={p.x}
                  y2={p.y}
                  pathLength={1}
                  className={`${estilos.rayo} ${base.trazo}`}
                  style={orden(4 + i * 0.5)}
                />
              ))}
            </svg>

            <div className={`${estilos.centro} ${base.brota}`} style={orden(2)}>
              <span className={estilos.centroNombre}>
                Fortaleza <span>Mexicana</span>
              </span>
              <Image
                src={MARCAS.malinche.src}
                alt="Malinche"
                width={MARCAS.malinche.ancho}
                height={MARCAS.malinche.alto}
                unoptimized
                className={estilos.centroMalinche}
              />
              <span className={estilos.centroMarcas}>
                <Image src={MARCAS.fronton.src} alt="Frontón México" width={MARCAS.fronton.ancho} height={MARCAS.fronton.alto} unoptimized className={estilos.centroFronton} />
                <Image src={MARCAS.pelota.src} alt="Pelota Mestiza" width={MARCAS.pelota.ancho} height={MARCAS.pelota.alto} unoptimized className={estilos.centroPelota} />
              </span>
            </div>

            {PROPIEDADES.map((p, i) => (
              <a
                key={p.id}
                href={`#propuesta-${destino(p.id)}`}
                className={`${estilos.nodo} ${base.brota}`}
                style={{ '--x': `${POSICIONES[i].x}%`, '--y': `${POSICIONES[i].y}%`, ...orden(5 + i * 0.6) } as CSSProperties}
                aria-label={`${p.nombre}: ${p.promesa}`}
              >
                <span className={estilos.nodoCaja}>
                  <span className={estilos.nodoQue}>{p.que}</span>
                  <span className={estilos.nodoNombre}>{p.nombre}</span>
                  <span className={estilos.nodoPromesa}>{p.promesa}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </Escena>
    </section>
  )
}
