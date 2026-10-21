import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Propuesta.module.css'
import { Escena } from '../../politico/Escena'
import { Dibujo } from '../Ejemplos'
import { Foto, LOGOS, Luz, orden, type Unidad } from '../comun'
import {
  DOLORES,
  PROPIEDADES,
  PROPUESTAS,
  QUE_ES,
  type Imagen,
  type Propuesta as DatosDePropuesta,
  type Visual as DatosDeVisual,
} from '../contenido'

/**
 * LO QUE PROPONEMOS, por parte de Fortaleza Mexicana (ronda 6, 21-oct-2026). Ceci aprobó en la sala el orden que propuso
 * Marketing United: «estos son los cuatro mandatos… para cada una, te proponemos esto».
 *
 * La misma forma en todas, para que se lean solas:
 * - A la izquierda: lo que buscamos para esa parte (el titular) y, debajo, lo que aporta cada unidad, con su logo y qué
 *   es, en las palabras de lo que mandó. Al pie, los problemas que atiende, por su número.
 * - A la derecha, en grande, cómo se verá: el antes y el después en el mismo encuadre, una imagen o un dibujo. Cada
 *   imagen dice lo que es en su esquina: foto real, simulación o ilustración.
 *
 * El estado solo aparece donde es cierto: «Listo para arrancar», «Ya empezó» o «Siguiente temporada». Nada va como
 * «ya conseguido»: Promo Espacio aclaró en la sala que lo de la ciudad es una oferta.
 */

const ESTADO = { listo: 'Listo para arrancar', curso: 'Ya empezó', siguiente: 'Siguiente temporada' } as const

function Quien({ unidad }: { unidad: Unidad }) {
  const logo = LOGOS[unidad]
  return (
    <span className={estilos.quien}>
      <Image
        src={logo.src}
        alt={logo.nombre}
        width={logo.ancho}
        height={164}
        unoptimized
        className={estilos.logo}
        style={{ '--logo-escala': 'escala' in logo ? logo.escala : 1 } as CSSProperties}
      />
      <span className={estilos.queEs}>{QUE_ES[unidad]}</span>
    </span>
  )
}

export function Propuesta({ propuesta }: { propuesta: DatosDePropuesta }) {
  const propiedad = PROPIEDADES.find((p) => p.id === propuesta.propiedad)!
  const hermanas = PROPUESTAS.filter((p) => p.propiedad === propuesta.propiedad)
  const lugar = hermanas.indexOf(propuesta) + 1
  const titulo = `propuesta-${propuesta.id}-titulo`
  return (
    <section
      id={`propuesta-${propuesta.id}`}
      data-layout={`propuesta-${propuesta.id}`}
      aria-labelledby={titulo}
      className={`${base.pantalla} ${estilos.pantalla}`}
    >
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.texto}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Lo que proponemos · {propiedad.nombre}
            {hermanas.length > 1 ? ` · ${lugar} de ${hermanas.length}` : ''}
          </p>
          <h2 id={titulo} className={`${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            {propuesta.titulo}
          </h2>
          <ul className={estilos.aportes}>
            {propuesta.aportes.map((a, i) => {
              const otraUnidad = i === 0 || propuesta.aportes[i - 1].unidad !== a.unidad
              return (
                <li
                  key={a.titulo}
                  className={`${estilos.aporte} ${base.aparece}`}
                  data-estado={a.estado}
                  data-otra-unidad={otraUnidad ? 'true' : undefined}
                  style={orden(2 + i * 0.5)}
                >
                  {otraUnidad ? <Quien unidad={a.unidad} /> : <span aria-hidden="true" />}
                  <span className={estilos.aporteTitulo}>
                    {a.titulo}
                    {a.estado ? (
                      <span className={estilos.estado} data-estado={a.estado}>
                        {ESTADO[a.estado]}
                      </span>
                    ) : null}
                  </span>
                  <span className={estilos.aporteTexto}>{a.texto}</span>
                </li>
              )
            })}
          </ul>
          <dl className={`${estilos.datos} ${base.aparece}`} style={orden(5)}>
            <div className={estilos.dato}>
              <dt>Resuelve</dt>
              <dd className={estilos.resuelve}>
                {propuesta.resuelve.map((n) => (
                  <span key={n} className={estilos.resuelveItem}>
                    <span className={estilos.resuelveNumero} aria-hidden="true">
                      {n}
                    </span>
                    {DOLORES[n - 1].corto}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          {propuesta.nota ? (
            <p className={`${estilos.nota} ${base.aparece}`} style={orden(5.5)}>
              {propuesta.nota}
            </p>
          ) : null}
        </div>

        <div className={estilos.visual} data-tipo={propuesta.visual.tipo}>
          <Visual v={propuesta.visual} />
        </div>
      </Escena>
    </section>
  )
}

function Cuadro({ imagen, className, i }: { imagen: Imagen; className?: string; i: number }) {
  const completa = imagen.proporcion ? estilos.completa : ''
  return (
    <Foto
      src={imagen.src}
      alt={imagen.alt}
      marca={imagen.marca}
      pie={imagen.pie}
      posicion={imagen.posicion}
      className={`${estilos.cuadro} ${completa} ${base.aparece} ${className ?? ''}`}
      style={{ ...orden(i), ...(imagen.proporcion ? { aspectRatio: imagen.proporcion } : null) }}
    />
  )
}

function Tira({ imagenes, desde }: { imagenes: readonly Imagen[]; desde: number }) {
  return (
    <div className={estilos.tira} style={{ '--n': imagenes.length } as CSSProperties}>
      {imagenes.map((im, k) => (
        <Cuadro key={im.src} imagen={im} i={desde + k * 0.5} />
      ))}
    </div>
  )
}

function Visual({ v }: { v: DatosDeVisual }) {
  if (v.tipo === 'antesDespues') {
    return (
      <>
        <div className={estilos.par}>
          <Cuadro imagen={v.hoy} i={2} className={estilos.hoy} />
          <span className={`${estilos.flecha} ${base.aparece}`} style={orden(3)} aria-hidden="true">
            →
          </span>
          <Cuadro imagen={v.con} i={3.5} className={estilos.con} />
        </div>
        <Tira imagenes={v.tira} desde={4.5} />
      </>
    )
  }
  if (v.tipo === 'foto') {
    return (
      <>
        <Cuadro imagen={v.principal} i={2} className={estilos.principal} />
        {v.tira ? <Tira imagenes={v.tira} desde={3} /> : null}
      </>
    )
  }
  if (v.tipo === 'maquetas') {
    return (
      <figure className={`${estilos.maquetas} ${base.aparece}`} style={orden(2)}>
        <span className={base.fotoMarca}>Simulación</span>
        <div className={estilos.maquetasEscena}>
          {/* Las simulaciones que mandó la unidad, a su tamaño: no se estiran. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.telefono.src} alt={v.telefono.alt} className={estilos.maquetaTelefono} />
          <div className={estilos.maquetasTarjetas}>
            {v.tarjetas.map((t) => (
              <div key={t.src} className={estilos.maquetaTarjeta}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.src} alt={t.alt} />
                <span>{t.pie}</span>
              </div>
            ))}
          </div>
        </div>
        <figcaption className={estilos.maquetasPie}>{v.pie}</figcaption>
      </figure>
    )
  }
  return (
    <div className={`${estilos.dibujoCaja} ${base.aparece}`} style={orden(2)}>
      <Dibujo tipo={v.dibujo} pie={v.pie} />
    </div>
  )
}
