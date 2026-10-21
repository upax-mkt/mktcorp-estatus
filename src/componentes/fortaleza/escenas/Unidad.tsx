import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from '../base.module.css'
import estilos from './Unidad.module.css'
import { Escena } from '../../politico/Escena'
import { Dibujo } from '../Ejemplos'
import { Foto, LOGOS, Luz, orden } from '../comun'
import { DOLORES, type Imagen, type PaginaDeUnidad } from '../contenido'

/**
 * UNA PANTALLA POR UNIDAD (ronda 5, 21-oct-2026). Franco: «no es claro lo que harán las UDNs, debe ser una
 * presentación autoexplicativa»; Ceci: «que ponga lo que produce… así se ve Malinche montada».
 *
 * La misma forma en las nueve, para que se lean solas:
 * - A la izquierda: el logo, lo que hará en una frase (el titular), lo que produce y, abajo, qué resuelve y cuándo.
 * - A la derecha, en grande, cómo se verá: el antes y el después en el mismo encuadre (Promo Espacio), una imagen
 *   principal o un dibujo. Cada imagen dice lo que es en su esquina: foto real, simulación o ilustración.
 *
 * El titular es el h2 de la pantalla: así la nombra el navegador del modo presentar.
 */
export function Unidad({ pagina, numero, total }: { pagina: PaginaDeUnidad; numero: number; total: number }) {
  const logo = LOGOS[pagina.unidad]
  const titulo = `unidad-${pagina.id}-titulo`
  return (
    <section
      id={`unidad-${pagina.id}`}
      data-layout={`unidad-${pagina.id}`}
      aria-labelledby={titulo}
      className={`${base.pantalla} ${estilos.pantalla}`}
    >
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.texto}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            Cómo ayuda · {numero} de {total}
          </p>
          <div className={`${estilos.marca} ${base.aparece}`} style={orden(0.5)}>
            <Image
              src={logo.src}
              alt={logo.nombre}
              width={logo.ancho}
              height={164}
              unoptimized
              className={estilos.logo}
              style={{ '--logo-escala': 'escala' in logo ? logo.escala : 1 } as CSSProperties}
            />
            <span className={estilos.queEs}>{pagina.queEs}</span>
          </div>
          <h2 id={titulo} className={`${estilos.titulo} ${base.aparece}`} style={orden(1)}>
            {pagina.titulo}
          </h2>
          <ul className={estilos.produce}>
            {pagina.produce.map((a, i) => (
              <li
                key={a.titulo}
                className={`${estilos.item} ${base.aparece}`}
                data-estado={a.estado}
                style={orden(2 + i * 0.6)}
              >
                <span className={estilos.itemTitulo}>
                  {a.estado ? (
                    <span className={estilos.hecho} data-estado={a.estado}>
                      {a.estado === 'conseguido' ? 'Ya conseguido' : 'Listo para arrancar'}
                    </span>
                  ) : null}
                  {a.titulo}
                </span>
                <span className={estilos.itemTexto}>{a.texto}</span>
              </li>
            ))}
          </ul>
          <dl className={`${estilos.datos} ${base.aparece}`} style={orden(5)}>
            <div className={estilos.dato}>
              <dt>Resuelve</dt>
              <dd className={estilos.resuelve}>
                {pagina.resuelve.map((n) => (
                  <span key={n} className={estilos.resuelveItem}>
                    <span className={estilos.resuelveNumero} aria-hidden="true">
                      {n}
                    </span>
                    {DOLORES[n - 1].corto}
                  </span>
                ))}
              </dd>
            </div>
            <div className={estilos.dato}>
              <dt>Cuándo</dt>
              <dd>{pagina.cuando}</dd>
            </div>
          </dl>
          {pagina.nota ? (
            <p className={`${estilos.nota} ${base.aparece}`} style={orden(5.5)}>
              {pagina.nota}
            </p>
          ) : null}
        </div>

        <div className={estilos.visual} data-tipo={pagina.visual.tipo}>
          <Visual pagina={pagina} />
        </div>
      </Escena>
    </section>
  )
}

function Cuadro({ imagen, className, i }: { imagen: Imagen; className?: string; i: number }) {
  return (
    <Foto
      src={imagen.src}
      alt={imagen.alt}
      marca={imagen.marca}
      pie={imagen.pie}
      posicion={imagen.posicion}
      className={`${estilos.cuadro} ${base.aparece} ${className ?? ''}`}
      style={orden(i)}
    />
  )
}

function Visual({ pagina }: { pagina: PaginaDeUnidad }) {
  const v = pagina.visual
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
        <div className={estilos.tira}>
          {v.tira.map((im, k) => (
            <Cuadro key={im.src} imagen={im} i={4.5 + k * 0.5} />
          ))}
        </div>
      </>
    )
  }
  if (v.tipo === 'foto') {
    return (
      <>
        <Cuadro imagen={v.principal} i={2} className={estilos.principal} />
        {v.tira ? (
          <div className={estilos.tira}>
            {v.tira.map((im, k) => (
              <Cuadro key={im.src} imagen={im} i={3 + k * 0.5} />
            ))}
          </div>
        ) : null}
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
