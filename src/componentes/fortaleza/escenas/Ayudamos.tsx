'use client'

import Image from 'next/image'
import { useEffect, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import base from '../base.module.css'
import estilos from './Ayudamos.module.css'
import { Escena } from '../../politico/Escena'
import { LOGOS, Luz, MARCAS, orden, type Unidad } from '../comun'
import { AYUDA, DOLORES } from '../contenido'
import { EjemploVista } from '../Ejemplos'

/**
 * 5 · CÓMO PODEMOS AYUDAR (ronda 4, 21-oct-2026). El dibujo que pidió Ceci: «Fortaleza Mexicana en el medio» y cada
 * unidad alrededor, «y le vamos apretando cada uno de los botones como unidad de negocio, que se desplieguen».
 *
 * Dos vistas en la misma pantalla:
 * - EL DIBUJO: Fortaleza al centro y las ocho unidades en un aro, cada una con lo que hace en dos palabras.
 * - LA UNIDAD: al tocar una, se despliega a todo lo ancho: qué hace, qué hallazgos resuelve (con el número de «Lo que
 *   descubrimos»), sus acciones y sus ejemplos. Arriba, para volver al dibujo o saltar a otra unidad.
 *
 * Al tocar, el logo de la unidad viaja del aro a la cabecera de su panel (transición de vista, `despliegue`). Sin
 * soporte o con movimiento reducido, cambia sin viaje.
 *
 * VISIBLE SIN JAVASCRIPT E IMPRESO: sin JS (y al imprimir) se ven el dibujo y, debajo, las ocho unidades, una tras
 * otra; impresas, cada una en su hoja. Las dos vistas solo existen con `data-interactivo`, que pone el componente ya
 * montado.
 */

const RADIO = 36

/**
 * EL VIAJE DEL LOGO, en una hoja global: los pseudo-elementos de una transición de vista viven en el documento, no en
 * el componente (igual que el corte de `ModoPresentar`). Solo actúan con `html[data-corte='despliegue']`, que se pone
 * durante el cambio de vista y se quita al terminar.
 */
const CSS_DESPLIEGUE = `
html[data-corte='despliegue']::view-transition-group(unidad) { animation-duration: 460ms; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
html[data-corte='despliegue']::view-transition-old(root) { animation: fm-vt-salir 160ms ease-out both; }
html[data-corte='despliegue']::view-transition-new(root) { animation: fm-vt-entrar 320ms cubic-bezier(0.16, 1, 0.3, 1) 60ms both; }
@keyframes fm-vt-salir { to { opacity: 0; } }
@keyframes fm-vt-entrar { from { opacity: 0; } }
`

/** Dónde va cada unidad en el aro (porcentajes del dibujo), en el sentido del reloj desde arriba. */
const POSICIONES = AYUDA.map((_, i) => {
  const angulo = ((-90 + (360 / AYUDA.length) * i) * Math.PI) / 180
  return {
    x: Math.round((50 + RADIO * Math.cos(angulo)) * 100) / 100,
    y: Math.round((50 + RADIO * Math.sin(angulo)) * 100) / 100,
  }
})

function puedeViajar(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function Logo({ unidad, className, style }: { unidad: Unidad; className?: string; style?: CSSProperties }) {
  const l = LOGOS[unidad]
  return (
    <Image
      src={l.src}
      alt={l.nombre}
      width={l.ancho}
      height={164}
      unoptimized
      className={className}
      style={{ '--logo-escala': 'escala' in l ? l.escala : 1, ...style } as CSSProperties}
    />
  )
}

export function Ayudamos() {
  /** `null`: el dibujo. Un número: la unidad desplegada. */
  const [elegida, setElegida] = useState<number | null>(null)
  /** La última unidad que se abrió: su logo es el que viaja, de ida y de vuelta. */
  const [viajera, setViajera] = useState<number | null>(null)
  const [vivo, setVivo] = useState(false)

  useEffect(() => setVivo(true), [])

  function ir(destino: number | null) {
    const cambiar = () => {
      if (destino !== null) setViajera(destino)
      setElegida(destino)
    }
    if (!puedeViajar()) {
      cambiar()
      return
    }
    // El nombre de transición tiene que estar puesto ANTES de la foto de salida: primero se marca quién viaja.
    if (destino !== null) flushSync(() => setViajera(destino))
    document.documentElement.dataset.corte = 'despliegue'
    const transicion = document.startViewTransition(() => flushSync(cambiar))
    transicion.finished.finally(() => {
      if (document.documentElement.dataset.corte === 'despliegue') delete document.documentElement.dataset.corte
    })
  }

  const nombreViaje = (i: number) => (vivo && viajera === i ? ({ viewTransitionName: 'unidad' } as CSSProperties) : undefined)

  return (
    <section
      data-layout="ayudamos"
      aria-labelledby="ayudamos-titulo"
      className={`${base.pantalla} ${estilos.pantalla}`}
      data-interactivo={vivo ? 'true' : undefined}
      data-vista={elegida === null ? 'dibujo' : 'unidad'}
    >
      <style>{CSS_DESPLIEGUE}</style>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <div className={estilos.vistaDibujo}>
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
              Cómo podemos ayudar
            </p>
            <h2 id="ayudamos-titulo" className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(1)}>
              Fortaleza Mexicana, al centro
            </h2>
            <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(2)}>
              Alrededor, cada unidad de Grupo UPAX con lo que mejor sabe hacer.{' '}
              <span className={estilos.indicacion}>Elija una para ver qué haría.</span>
            </p>
          </header>

          <div className={estilos.dibujo}>
            <svg className={estilos.lineas} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <circle cx="50" cy="50" r={RADIO} className={`${estilos.aro} ${base.trazo}`} pathLength={1} style={orden(3)} />
              {POSICIONES.map((p, i) => (
                <line
                  key={AYUDA[i].unidad}
                  x1="50"
                  y1="50"
                  x2={p.x}
                  y2={p.y}
                  pathLength={1}
                  className={`${estilos.rayo} ${base.trazo}`}
                  data-elegida={viajera === i ? 'true' : undefined}
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

            {AYUDA.map((a, i) => (
              <button
                key={a.unidad}
                type="button"
                className={`${estilos.nodo} ${base.brota}`}
                style={{ '--x': `${POSICIONES[i].x}%`, '--y': `${POSICIONES[i].y}%`, ...orden(5 + i * 0.6) } as CSSProperties}
                onClick={() => ir(i)}
                aria-label={`${LOGOS[a.unidad].nombre}: ${a.rotulo}. Ver qué haría.`}
              >
                <span className={estilos.nodoCirculo}>
                  <Logo unidad={a.unidad} className={estilos.nodoLogo} style={elegida === null ? nombreViaje(i) : undefined} />
                </span>
                <span className={estilos.nodoRotulo}>{a.rotulo}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={estilos.paneles}>
          {AYUDA.map((a, i) => (
            <article
              key={a.unidad}
              id={`ayuda-${a.unidad}`}
              className={estilos.panel}
              data-elegida={elegida === i ? 'true' : undefined}
              aria-labelledby={`ayuda-${a.unidad}-nombre`}
            >
              <nav className={estilos.barra} aria-label="Unidades">
                <button type="button" className={estilos.volver} onClick={() => ir(null)}>
                  <span aria-hidden="true">←</span> Volver al dibujo
                </button>
                <ul className={estilos.otras}>
                  {AYUDA.map((b, j) => (
                    <li key={b.unidad}>
                      <button
                        type="button"
                        className={estilos.otra}
                        aria-pressed={j === i}
                        aria-label={LOGOS[b.unidad].nombre}
                        onClick={() => (j === i ? undefined : ir(j))}
                      >
                        <Logo unidad={b.unidad} className={estilos.otraLogo} />
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className={estilos.panelCuerpo} data-muchas={a.acciones.length > 4 ? 'true' : undefined}>
                <div className={estilos.panelTexto}>
                  <h3 id={`ayuda-${a.unidad}-nombre`} className={estilos.panelUnidad}>
                    <Logo unidad={a.unidad} className={estilos.panelLogo} style={elegida === i ? nombreViaje(i) : undefined} />
                  </h3>
                  <p className={estilos.frase}>{a.frase}</p>
                  <p className={estilos.resuelve}>
                    <span className={estilos.resuelveRotulo}>Resuelve</span>
                    {a.resuelve.map((n) => (
                      <span key={n} className={estilos.chip}>
                        <span className={estilos.chipNumero}>{n}</span>
                        {DOLORES[n - 1].titulo}
                      </span>
                    ))}
                  </p>
                  <ul className={estilos.acciones} data-columnas={a.acciones.length > 3 ? 2 : 1}>
                    {a.acciones.map((ac) => (
                      <li key={ac.titulo} className={estilos.accion} data-hecho={ac.hecho ? 'true' : undefined}>
                        <span className={estilos.accionTitulo}>
                          {ac.hecho ? <span className={estilos.hecho}>Ya conseguido</span> : null}
                          {ac.titulo}
                        </span>
                        <span className={estilos.accionTexto}>{ac.texto}</span>
                      </li>
                    ))}
                  </ul>
                  {a.nota ? <p className={estilos.notaPanel}>{a.nota}</p> : null}
                </div>

                <div className={estilos.ejemplos} data-cuantos={a.ejemplos.length}>
                  {a.ejemplos.map((e, k) => (
                    <EjemploVista key={k} ejemplo={e} className={estilos.ejemplo} />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Escena>
    </section>
  )
}
