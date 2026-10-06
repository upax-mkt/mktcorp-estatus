import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import estilos from './rl.module.css'
import { Escena } from '../politico/Escena'
import { CifraAnimada } from '../politico/CifraAnimada'
import {
  CORTE,
  CUOTA_EJECUTIVO,
  FACTURADO_EXTERNO_2025,
  META_PLAN_2027,
  PERDIDOS_2026,
  PROPUESTAS_2026,
  PROPUESTAS_ENE_JUL,
  REUNIONES_2026,
  porcentaje,
} from '@/rl-comercial/corte-2026-10-06'

/**
 * LA REVISIÓN DE LA PROPUESTA COMERCIAL 2027 DE RESEARCH LAND, como presentación web.
 *
 * Franco la proyecta el 6-oct-2026 con Pablo Levy y Giovanni Sanabria. Seis
 * láminas, una idea por lámina, en el orden que él eligió: su número, dónde
 * se pierde, PM, ejecutiva en piloto, ajustes al plan y lo que sigue.
 *
 * Misma mecánica que `/politico`: cada `<section data-layout>` es una pantalla
 * que se lee con scroll y que `ModoPresentar` proyecta una a la vez. La
 * retícula (cabecera arriba, cuerpo debajo) y la entrada en cascada vienen de
 * ahí; los colores son los de Research Land.
 *
 * Todas las cifras salen de `src/rl-comercial/corte-2026-10-06.ts`, solo a
 * nivel Research Land: ningún número por persona (Franco, 6-oct-2026). La
 * recomendación de PM va con nombre por decisión suya; sin citas de las
 * entrevistas, que fueron confidenciales.
 */

const orden = (i: number) => ({ '--i': i }) as CSSProperties

function millones(n: number): string {
  return `$${(n / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
}

function Pie({ children }: { children: ReactNode }) {
  return <p className={estilos.pie}>{children}</p>
}

const COMPETIDOR = 'Contra un competidor'

export function PresentacionRl() {
  const maximo = Math.max(...PERDIDOS_2026.motivos.map((m) => m.negocios))
  const competidor = PERDIDOS_2026.motivos.find((m) => m.motivo === COMPETIDOR)?.negocios ?? 0

  return (
    <div className={estilos.documento}>
      {/* 1 · SU NÚMERO. Es de ellos: las 95 propuestas son las de su propio deck. */}
      <section data-layout="numero" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <Image
              src="/logos/research-land-blanco.png"
              alt="Research Land"
              width={1121}
              height={164}
              className={`${estilos.logo} ${estilos.aparece}`}
              style={orden(0)}
              priority
            />
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(1)}>
              Revisión de la propuesta comercial 2027 · Marketing Corporativo
            </p>
            <h1 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(2)}>
              Casi ninguna propuesta se cierra
            </h1>
          </header>
          <div className={`${estilos.cuerpo} ${estilos.cuerpoCifra}`}>
            <p className={`${estilos.cifra} ${estilos.aparece}`} style={orden(3)}>
              <CifraAnimada valor={PROPUESTAS_ENE_JUL.ganadas} className={estilos.cifraValor} />
              <span className={estilos.cifraDe}>de {PROPUESTAS_ENE_JUL.total}</span>
            </p>
            <p className={`${estilos.cifraRotulo} ${estilos.aparece}`} style={orden(4)}>
              propuestas ganadas entre enero y julio de 2026
            </p>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(5)}>
              {PROPUESTAS_ENE_JUL.perdidas} se perdieron. {PROPUESTAS_ENE_JUL.abiertas} siguen abiertas.
            </p>
          </div>
        </Escena>
        <Pie>Fuente: HubSpot, pipeline de Research Land, propuestas por fecha de entrada a la etapa. Corte al {CORTE}.</Pie>
      </section>

      {/* 2 · DÓNDE SE PIERDE. El contraste que importa es la última barra. */}
      <section data-layout="perdidas" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>
              Los {PERDIDOS_2026.total} negocios perdidos en 2026
            </p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              Se pierde por silencio y por precio
            </h2>
          </header>
          <div className={estilos.cuerpo}>
            <ul className={estilos.motivos}>
              {PERDIDOS_2026.motivos.map((m, i) => (
                <li
                  key={m.motivo}
                  className={`${estilos.motivo} ${estilos.aparece}`}
                  style={orden(i + 2)}
                  data-competidor={m.motivo === COMPETIDOR ? 'true' : undefined}
                >
                  <span className={estilos.motivoNombre}>{m.motivo}</span>
                  <span className={estilos.motivoCarril}>
                    <span
                      className={estilos.motivoBarra}
                      style={{ ...orden(i + 2), width: `${(m.negocios / maximo) * 100}%` }}
                    />
                  </span>
                  <span className={estilos.motivoValor}>{porcentaje(m.negocios)}%</span>
                </li>
              ))}
            </ul>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(7)}>
              Contra un competidor, solo el {porcentaje(competidor)}%.
            </p>
          </div>
        </Escena>
        <Pie>
          Fuente: HubSpot, motivo de pérdida. El {porcentaje(PERDIDOS_2026.otros)}% restante dice otro, desconocido o
          cancelado. Corte al {CORTE}.
        </Pie>
      </section>

      {/* 3 · PM. Con nombre, por decisión de Franco; los porqués son de
          conducta observada, sin citas. */}
      <section data-layout="pm" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Project Manager</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              Recomendamos a Rocío Cervantes
            </h2>
          </header>
          <div className={`${estilos.cuerpo} ${estilos.columnas}`}>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(2)}>
              <h3 className={estilos.columnaTitulo}>Por qué ella</h3>
              <ul className={estilos.lista}>
                <li>Arma la propuesta desde el problema del cliente.</li>
                <li>Ya coordina proyectos de varias áreas y reporta avance cada semana.</li>
                <li>Propuso un tarifario para cotizar el mismo día.</li>
                <li>Tiene clientes que le vuelven a comprar.</li>
              </ul>
            </div>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(3)}>
              <h3 className={estilos.columnaTitulo}>Con tres condiciones</h3>
              <ul className={estilos.lista}>
                <li>Definir qué decide la PM y qué decide cada dirección de área, en metodología y en precio.</li>
                <li>Violeta Hernández como su contraparte en cuantitativo.</li>
                <li>Una parte de su variable se paga por propuestas ganadas.</li>
              </ul>
            </div>
          </div>
        </Escena>
      </section>

      {/* 4 · LA EJECUTIVA, EN PILOTO. Los criterios se fijan antes de empezar. */}
      <section data-layout="ejecutiva" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Ejecutivo comercial</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              Elizabeth Gómez, a prueba 90 días
            </h2>
          </header>
          <div className={`${estilos.cuerpo} ${estilos.columnas}`}>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(2)}>
              <h3 className={estilos.columnaTitulo}>Cómo arranca</h3>
              <ul className={estilos.lista}>
                <li>En dupla con la PM: la PM presenta, Eli lleva la relación.</li>
                <li>Se queda con los negocios que ella abrió.</li>
                <li>Sigue prospectando una parte de su semana hasta que llegue quien la reemplace.</li>
                <li>
                  Sin la cuota individual de {millones(CUOTA_EJECUTIVO)} durante el piloto. Cuota compartida con la PM y
                  comisión sobre lo cobrado.
                </li>
              </ul>
            </div>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(3)}>
              <h3 className={estilos.columnaTitulo}>Cómo sabremos si funciona</h3>
              <ul className={estilos.lista}>
                <li>Revisión a fin de noviembre.</li>
                <li>
                  Sigue si a mediados de enero ganó al menos dos de sus negocios y presentó en persona todas sus
                  propuestas.
                </li>
                <li>Se para si no ganó ninguno y más de la mitad se perdió sin respuesta.</li>
              </ul>
            </div>
          </div>
        </Escena>
      </section>

      {/* 5 · AJUSTES AL PLAN, antes de que Capital Humano lo formalice. */}
      <section data-layout="ajustes" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>
              Antes de llevarlo a Capital Humano
            </p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Cuatro ajustes al plan</h2>
          </header>
          <div className={estilos.cuerpo}>
            <ol className={estilos.ajustes}>
              <li className={`${estilos.ajuste} ${estilos.aparece}`} style={orden(2)}>
                <p className={estilos.ajusteQue}>Calificar antes de cotizar.</p>
                <p className={estilos.ajusteDetalle}>
                  Hoy casi todo se cotiza: {REUNIONES_2026} reuniones y {PROPUESTAS_2026} propuestas en el año.
                </p>
              </li>
              <li className={`${estilos.ajuste} ${estilos.aparece}`} style={orden(3)}>
                <p className={estilos.ajusteQue}>Toda propuesta se presenta en persona.</p>
                <p className={estilos.ajusteDetalle}>La PM y el ejecutivo, juntos frente al cliente.</p>
              </li>
              <li className={`${estilos.ajuste} ${estilos.aparece}`} style={orden(4)}>
                <p className={estilos.ajusteQue}>Un solo precio.</p>
                <p className={estilos.ajusteDetalle}>Tarifario por unidad, calculadora y cotización en 48 horas.</p>
              </li>
              <li className={`${estilos.ajuste} ${estilos.aparece}`} style={orden(5)}>
                <p className={estilos.ajusteQue}>Una meta que salga de la capacidad.</p>
                <p className={estilos.ajusteDetalle}>
                  En 2025 se facturaron {millones(FACTURADO_EXTERNO_2025)} a externos y el plan pide{' '}
                  {millones(META_PLAN_2027)}. Las cuotas de cada puesto tienen que cuadrar con ese total.
                </p>
              </li>
            </ol>
          </div>
        </Escena>
        <Pie>Fuentes: Forecast 2026 y HubSpot. Corte al {CORTE}.</Pie>
      </section>

      {/* 6 · LO QUE SIGUE */}
      <section data-layout="siguientes" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Siguientes pasos</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Lo que sigue a partir de hoy</h2>
          </header>
          <div className={estilos.cuerpo}>
            <ol className={estilos.pasos}>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(2)}>
                <p className={estilos.pasoCuando}>Esta semana</p>
                <p className={estilos.pasoQue}>Anunciar a la PM, arrancar el tarifario y pedir quien reemplace a Eli como SDR.</p>
              </li>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(3)}>
                <p className={estilos.pasoCuando}>Antes de Capital Humano</p>
                <p className={estilos.pasoQue}>Cuotas y comisiones corregidas.</p>
              </li>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(4)}>
                <p className={estilos.pasoCuando}>Fin de noviembre</p>
                <p className={estilos.pasoQue}>Primera revisión del piloto.</p>
              </li>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(5)}>
                <p className={estilos.pasoCuando}>Mediados de enero</p>
                <p className={estilos.pasoQue}>Decisión sobre la ejecutiva, con los datos del piloto.</p>
              </li>
            </ol>
          </div>
        </Escena>
      </section>
    </div>
  )
}
