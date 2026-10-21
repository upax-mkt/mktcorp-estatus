import base from '../base.module.css'
import estilos from './Usos.module.css'
import { Escena } from '../../politico/Escena'
import { Aforo } from '../Aforo'
import { Luz, Propuesta } from '../comun'

/**
 * 12 · USOS — Frente 3, «las empresas» · «Que lo usen toda la semana» (ronda 3, 20-oct-2026: cada unidad se cuenta con
 * su `Propuesta`; Pelota Mestiza pasó a su propia pantalla, la 13).
 *
 * UN PROGRAMA DE MANO, POR UNIDAD: tres entradas a lo ancho, separadas por filetes y sin cajas, en el orden del guion.
 * Primero, Marketing Corporativo: a quién invitamos (Nuestros clientes). Luego, Marketing United con sus dos acciones lado
 * a lado (Kit para empresas y Catálogo de sedes): es la entrada que más pesa. Al final, Promo Espacio con House of Films
 * (Media days y producciones), que deja libre la esquina del aforo. Cada entrada lleva arriba su logo; las demás escenas
 * de frente cuentan a sus unidades con la misma forma. Es la composición que no repiten sus vecinas: la 11 es la semana
 * en siete columnas; la 13, una propuesta con su imagen al lado.
 *
 * Sin foto: no queda una libre que muestre esto (las de la pieza ya están en otras escenas). La luz y el grano de la
 * base, más una luz cálida de sala detrás del programa.
 *
 * Único acento naranja: «más de 360 empresas», el mismo naranja de las butacas.
 *
 * MOVIMIENTO (escalón de la casa, 90 ms; quieta a los 680 ms). La cabecera no entra: es la de la 11, en el mismo
 * lugar, y en el corte se queda quieta. Las tres entradas suben en el orden en que se dicen: 0 · 90 · 180 (cada una,
 * 500 ms). El aforo no se mueve: su tramo se encendió en la 11. Solo `.aparece` de la base (la trae `Propuesta`); estado
 * final = estado por defecto.
 */
export function Usos() {
  return (
    <section data-layout="usos" className={base.pantalla}>
      <div className={estilos.sala} aria-hidden="true" />
      <Luz />
      <Escena className={`${base.escena} ${estilos.escena}`}>
        <header className={base.cabecera}>
          {/* Sin entrada: es la misma cabecera de la 11, en el mismo lugar. En el corte se queda quieta. */}
          <p className={base.antetitulo}>Frente 3</p>
          <h2 className={`${base.titulo} ${estilos.titulo}`}>Que lo usen toda la semana</h2>
        </header>

        <div className={estilos.programa}>
          <Propuesta
            i={0}
            unidades={['marketing-corporativo']}
            acciones={[
              {
                titulo: 'Nuestros clientes',
                texto: (
                  <>
                    Invitamos a <span className={base.acento}>más de 360 empresas</span>, con comunicación de UPAX y los
                    comerciales de cada unidad.
                  </>
                ),
              },
            ]}
            className={estilos.entrada}
          />
          <Propuesta
            i={1}
            unidades={['marketing-united']}
            acciones={[
              {
                titulo: 'Kit para empresas',
                texto:
                  'Boletos con descuento, rally, showcase y cenas; activaciones con taquilla móvil y Malinche en el Track Day del 8 de noviembre.',
              },
              {
                titulo: 'Catálogo de sedes',
                texto:
                  'El Frontón, espacio por espacio, en nuestro catálogo desde las fiestas de fin de año; también para embajadas, corporativos y casas de bolsa.',
              },
            ]}
            className={`${estilos.entrada} ${estilos.dos}`}
          />
          <Propuesta
            i={2}
            unidades={['promo-espacio', 'house-of-films']}
            acciones={[
              {
                titulo: 'Media days y producciones',
                texto: 'Media days con agencias y producciones de House of Films en el recinto.',
              },
            ]}
            className={`${estilos.entrada} ${estilos.ultima}`}
          />
        </div>

        <Aforo tam="chico" frentes={3} rotulo="Frente 3 de 5" className={base.aforoEsquina} />
      </Escena>
    </section>
  )
}
