import base from '../base.module.css'
import estilos from './Kpis.module.css'
import { Escena } from '../../politico/Escena'
import { orden, Punto } from '../comun'

/**
 * KPIS Y VARIABLE (escena 6, energía 3): la calma después de la cumbre.
 *
 * Ficha técnica editorial: un riel con las dos franjas («Se mide por», «Se paga
 * por») y cuatro columnas, una por puesto, separadas por filetes finos. Las
 * franjas quedan alineadas entre columnas (subgrid). Debajo, más baja y
 * discreta, la franja de las áreas.
 *
 * Movimiento: solo la entrada de la casa, un fundido para la ficha y otro para
 * las áreas; quieta a los 770 ms. EL CLIENTE DESCANSA: el punto no se anima,
 * se pinta desde el primer cuadro al final del filete de pie y la ficha llega
 * a él.
 */

const PUESTOS = [
  {
    rol: 'SDR',
    mide: ['Reuniones de diagnóstico que llegan a propuesta', 'Cuentas objetivo trabajadas'],
    paga: 'Lo define Marketing Corporativo',
  },
  {
    rol: 'Ejecutiva comercial',
    mide: ['Venta cobrada', 'Propuestas que llegan a decisión con fecha'],
    paga: 'Comisión sobre lo cobrado, cuota compartida con la PM y rampa de entrada',
  },
  {
    rol: 'Project Manager',
    mide: ['Entregas a tiempo y sin retrabajo', 'Satisfacción del cliente', 'Propuestas presentadas que se ganan'],
    paga: 'Satisfacción del cliente y propuestas ganadas',
  },
  {
    rol: 'Key Account Manager',
    mide: ['Recompra y renovaciones', 'Crecimiento de la cartera'],
    paga: 'Comisión sobre la recompra cobrada',
  },
] as const

const AREAS = [
  { area: 'Operación', mide: 'cotización en 48 horas y entregas sin retrabajo' },
  { area: 'Producto', mide: 'cotizaciones dentro de tarifario' },
  { area: 'Información ejecutiva', mide: 'tablero al día cada lunes' },
  { area: 'Administración', mide: 'días para cobrar' },
  { area: 'Dirección General', mide: 'tiempo de autorización' },
] as const

export function Kpis() {
  return (
    <section data-layout="kpis" className={`${base.pantalla} ${base.clara}`}>
      <Escena className={base.escena}>
        <header className={base.cabecera}>
          <p className={`${base.antetitulo} ${base.aparece}`} style={orden(0)}>
            KPIs y variable
          </p>
          <h2 className={`${base.titulo} ${base.aparece}`} style={orden(1)}>
            Cada puesto se mide y se paga por lo que mueve
          </h2>
        </header>

        <div className={`${base.cuerpo} ${estilos.cuerpo}`}>
          <div className={estilos.marco}>
            <div className={`${estilos.tabla} ${base.aparece}`} style={orden(2)}>
              {/* El riel solo rotula las franjas a la vista; cada columna lleva sus propios rótulos para el lector de pantalla. */}
              <div className={estilos.rail} aria-hidden="true">
                <span className={estilos.railCabeza} />
                <span className={estilos.railMide}>Se mide por</span>
                <span className={estilos.railPaga}>Se paga por</span>
              </div>

              {PUESTOS.map((p) => (
                <div key={p.rol} className={estilos.puesto}>
                  <h3 className={estilos.rol}>{p.rol}</h3>
                  <div className={estilos.mide}>
                    <p className={estilos.etiqueta}>Se mide por</p>
                    <ul className={estilos.lista}>
                      {p.mide.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={estilos.paga}>
                    <p className={estilos.etiqueta}>Se paga por</p>
                    <p className={estilos.pago}>{p.paga}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* El cliente, quieto: fuera de lo que se anima, al final del filete de pie. */}
            <Punto tam={14} className={estilos.puntoPie} />
          </div>

          <div className={`${estilos.areas} ${base.aparece}`} style={orden(3)}>
            <h3 className={estilos.areasTitulo}>Las áreas también se miden</h3>
            <ul className={estilos.areasLista}>
              {AREAS.map((a) => (
                <li key={a.area}>
                  <span className={estilos.area}>{a.area}:</span> {a.mide}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Escena>
    </section>
  )
}
