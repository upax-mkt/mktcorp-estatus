import type { ReactNode } from 'react'
import base from '../base.module.css'
import estilos from './Usos.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Firma, Luz, orden } from '../comun'

/**
 * 11 · USOS — Frente 3, segunda pantalla · «Que lo usen toda la semana»: las cinco acciones (ronda 2, 20-oct-2026: la
 * vieja escena 9 no cabía a tamaño de proyección y se partió en dos; el texto es el del guion, palabra por palabra).
 *
 * UN PROGRAMA DE MANO: las cinco acciones como las entradas de un programa de teatro, a dos columnas y separadas por
 * filetes, sin cajas. Es la composición que no repiten sus vecinas (la 10 es la semana en siete columnas; la 12, un
 * recorrido con tres tarjetas en fila) y la única en la que las cinco caben a tamaño de proyección: como tarjetas de
 * vidrio piden más alto del que hay. A la izquierda, a quién invitamos y con qué (clientes, kit, sedes); a la derecha,
 * lo que pasa en el recinto (Pelota Mestiza, media days) y, debajo, el aforo, con el tramo de este frente ya encendido.
 * Los logos van con la cabecera, lejos del aforo.
 *
 * Sin foto: las que quedan libres son de pantallas o del súper. La luz y el grano de la base, más una luz cálida de
 * sala detrás del programa.
 *
 * Único acento naranja: «más de 360 empresas», el mismo naranja de las butacas.
 *
 * Movimiento (escalón de la casa, 90 ms; quieta a los 1040 ms): antetítulo 0 · título y logos 90 · las cinco acciones
 * en el orden en que se dicen, 180, 270, 360, 450 y 540. El aforo no se mueve: su tramo se encendió en la pantalla
 * anterior. Solo `.aparece` de la base; estado final = estado por defecto.
 */

/** Una entrada del programa: qué, cómo y quién. Mismas clases de texto que una tarjeta de la base, sin la caja. */
function Accion({ titulo, quien, i, children }: { titulo: string; quien: string; i: number; children: ReactNode }) {
  return (
    <article className={`${estilos.accion} ${base.aparece}`} style={orden(i)}>
      <h3 className={base.tarjetaTitulo}>{titulo}</h3>
      <p className={base.tarjetaTexto}>{children}</p>
      <p className={`${base.quien} ${estilos.quien}`}>{quien}</p>
    </article>
  )
}

export function Usos() {
  return (
    <section data-layout="usos" className={base.pantalla}>
      <div className={estilos.sala} aria-hidden="true" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          {/* Sin entrada: es la misma cabecera de la 10, en el mismo lugar. En el corte se queda quieta (como 7 → 8). */}
          <p className={base.antetitulo}>Frente 3</p>
          <h2 className={`${base.titulo} ${estilos.titulo}`}>Que lo usen toda la semana</h2>
          <Firma
            unidades={['marketing-corporativo', 'marketing-united', 'promo-espacio', 'house-of-films']}
            className={`${estilos.firma} ${base.aparece}`}
            style={orden(1)}
          />
        </header>

        <div className={estilos.programa}>
          <div className={estilos.columna}>
            <Accion i={2} titulo="Nuestros clientes" quien="Marketing Corporativo">
              Invitamos a <span className={base.acento}>más de 360 empresas</span>, con comunicación de UPAX y los
              comerciales de cada unidad.
            </Accion>
            <Accion i={3} titulo="Kit para empresas" quien="Marketing United">
              Boletos con descuento, rally, showcase y cenas; activaciones con taquilla móvil y Malinche en el Track Day
              del 8 de noviembre.
            </Accion>
            <Accion i={4} titulo="Catálogo de sedes" quien="Marketing United">
              El Frontón, espacio por espacio, en el catálogo de Marketing United desde las fiestas de fin de año; también
              para embajadas, corporativos y casas de bolsa.
            </Accion>
          </div>
          <div className={estilos.columna}>
            <Accion i={5} titulo="Pelota Mestiza" quien="Marketing United">
              Menús de temporada, escuelas de gastronomía con la chef Lula, celebraciones de empresas y una cena con la
              historia de Malinche proyectada sobre la mesa.
            </Accion>
            <Accion i={6} titulo="Media days y producciones" quien="Promo Espacio, House of Films">
              Media days con agencias y producciones de House of Films en el recinto.
            </Accion>
          </div>
        </div>

        <Aforo tam="chico" frentes={3} rotulo="Frente 3 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
