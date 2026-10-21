import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Indice.module.css'
import { Escena } from '../../politico/Escena'
import { LOGOS, Luz, MARCAS, orden, type Unidad } from '../comun'
import { INDICE } from '../contenido'

/**
 * 5 · FORTALEZA MEXICANA, AL CENTRO (rondas 4 y 5, 21-oct-2026). El dibujo que pidió Ceci: «Fortaleza Mexicana en el
 * medio» y cada unidad alrededor, «como botones». En la ronda 5 cada botón lleva a la pantalla de su unidad, que viene
 * después en orden: lo que hará cada una ya no se esconde detrás de un clic (Franco: «debe ser autoexplicativa»).
 */

const RADIO = 36

/** Dónde va cada unidad en el aro (porcentajes del dibujo), en el sentido del reloj desde arriba. */
const POSICIONES = INDICE.map((_, i) => {
  const angulo = ((-90 + (360 / INDICE.length) * i) * Math.PI) / 180
  return {
    x: Math.round((50 + RADIO * Math.cos(angulo)) * 100) / 100,
    y: Math.round((50 + RADIO * Math.sin(angulo)) * 100) / 100,
  }
})

function Logo({ unidad, className }: { unidad: Unidad; className?: string }) {
  const l = LOGOS[unidad]
  return (
    <Image
      src={l.src}
      alt={l.nombre}
      width={l.ancho}
      height={164}
      unoptimized
      className={className}
      style={{ '--logo-escala': 'escala' in l ? l.escala : 1 } as CSSProperties}
    />
  )
}

export function Indice() {
  return (
    <section data-layout="indice" aria-labelledby="indice-titulo" className={`${base.pantalla} ${estilos.pantalla}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.vistaDibujo}>
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
              Cómo podemos ayudar
            </p>
            <h2 id="indice-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
              Fortaleza Mexicana, al centro
            </h2>
            <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
              Alrededor, siete unidades de Grupo UPAX y su Marketing Corporativo.{' '}
              <span className={estilos.indicacion}>En las páginas que siguen, qué hará cada una y cómo se verá.</span>
            </p>
          </header>

          <div className={estilos.dibujo}>
            <svg className={estilos.lineas} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <circle cx="50" cy="50" r={RADIO} className={`${estilos.aro} ${base.trazo}`} pathLength={1} style={orden(3)} />
              {POSICIONES.map((p, i) => (
                <line
                  key={INDICE[i].unidad}
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

            {INDICE.map((a, i) => (
              <a
                key={a.unidad}
                href={`#unidad-${a.pagina}`}
                className={`${estilos.nodo} ${base.brota}`}
                style={{ '--x': `${POSICIONES[i].x}%`, '--y': `${POSICIONES[i].y}%`, ...orden(5 + i * 0.6) } as CSSProperties}
                aria-label={`${LOGOS[a.unidad].nombre}: ${a.rotulo}`}
              >
                <span className={estilos.nodoCirculo}>
                  <Logo unidad={a.unidad} className={estilos.nodoLogo} />
                </span>
                <span className={estilos.nodoRotulo}>{a.rotulo}</span>
              </a>
            ))}
          </div>
        </div>
      </Escena>
    </section>
  )
}
