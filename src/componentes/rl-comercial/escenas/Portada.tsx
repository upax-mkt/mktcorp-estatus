import Image from 'next/image'
import base from '../base.module.css'
import estilos from './Portada.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto, Luz } from '../comun'

/**
 * 1 · PORTADA. La respuesta, primero: un área comercial con el cliente al centro.
 *
 * El cliente (el punto amarillo, hilo conductor de la pieza) nace aquí, a la
 * derecha del título, como la fuente de luz de la escena: su halo es la única
 * luz cálida del cuadro y dos órbitas apenas visibles lo vuelven un centro.
 *
 * Movimiento (quieta en ≤ 1200 ms, entra con calma): logo, antetítulo, título y
 * nota suben con el escalón de la casa (0–770 ms); al final el punto brota
 * (495–1195 ms) y su halo se abre detrás (520–1200 ms). Sin JS, impresa o con
 * movimiento reducido, todo está en su sitio desde el HTML.
 */
export function Portada() {
  return (
    <section data-layout="portada" className={`${base.pantalla} ${base.noche}`}>
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <Image
          src="/logos/research-land-blanco.png"
          alt="Research Land"
          width={1121}
          height={164}
          preload
          className={`${estilos.logo} ${base.aparece}`}
          style={orden(0)}
        />
        <div className={estilos.composicion}>
          <header className={`${base.cabecera} ${estilos.cabecera}`}>
            <p className={`${base.antetitulo} ${base.aparece}`} style={orden(1)}>
              Estrategia comercial 2027 · Marketing Corporativo
            </p>
            <h1 className={`${base.titulo} ${estilos.titulo} ${base.aparece}`} style={orden(2)}>
              Proponemos un área comercial con el cliente al centro
            </h1>
            <p className={`${base.nota} ${estilos.nota} ${base.aparece}`} style={orden(3)}>
              Cuatro puestos, un journey con dueño en cada paso y las personas para ocuparlos.
            </p>
          </header>
          <div className={estilos.fuente} aria-hidden="true">
            <span className={estilos.halo} />
            <Punto tam={34} className={base.brota} style={orden(5.5)} />
          </div>
        </div>
      </Escena>
      <p className={base.pie}>Franco Cruzat · 6 de octubre de 2026</p>
    </section>
  )
}
