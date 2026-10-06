import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import estilos from './rl.module.css'
import { Escena } from '../politico/Escena'
import { CifraAnimada } from '../politico/CifraAnimada'
import {
  CIERRE_PLAN,
  CORTE,
  CUOTA_EJECUTIVO,
  FACTURADO_EXTERNO_2025,
  META_PLAN_2027,
  PERDIDOS_2026,
  PROPUESTAS_2026,
  PROPUESTAS_ENE_JUL,
  TICKET_PLAN,
  capacidadDeLaMeta,
  porcentaje,
} from '@/rl-comercial/corte-2026-10-06'

/**
 * LA PROPUESTA DE MARKETING CORPORATIVO PARA EL ÁREA COMERCIAL DE RESEARCH LAND (6-oct-2026).
 *
 * Franco la presenta a Pablo Levy y Giovanni Sanabria. La primera versión era
 * una auditoría de su plan y Franco la rechazó: «solo crítica, no hay análisis
 * de los candidatos ni propuesta de estructura, journey, roles de sus áreas».
 * Esta es la propuesta: el diagnóstico cabe en una lámina y el resto es lo que
 * proponemos — principios, estructura, roles, journey, personas, capacidad,
 * precio y comisiones, y el plan de 90 días.
 *
 * Misma mecánica que `/politico`: cada `<section data-layout>` es una pantalla
 * que se lee con scroll y que `ModoPresentar` proyecta una a la vez.
 *
 * Cifras: todas de `src/rl-comercial/corte-2026-10-06.ts`, solo a nivel
 * Research Land. Personas: solo las que nombran el deck de RL, su correo del
 * 3-sep y las entrevistas de Franco; nada inferido. Sin citas de las
 * entrevistas, que fueron confidenciales.
 */

const orden = (i: number) => ({ '--i': i }) as CSSProperties

function millones(n: number): string {
  return `$${(n / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
}

function miles(n: number): string {
  return `$${Math.round(n / 1000).toLocaleString('es-MX')}K`
}

function Pie({ children }: { children: ReactNode }) {
  return <p className={estilos.pie}>{children}</p>
}

function Cabecera({ antetitulo, titulo, nota }: { antetitulo: string; titulo: string; nota?: string }) {
  return (
    <header className={estilos.cabecera}>
      <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>
        {antetitulo}
      </p>
      <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
        {titulo}
      </h2>
      {nota ? (
        <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(2)}>
          {nota}
        </p>
      ) : null}
    </header>
  )
}

const COMPETIDOR = 'Contra un competidor'

const PRINCIPIOS = [
  { que: 'Se vende el problema del cliente.', detalle: 'La metodología viene después, y la explica quien la va a ejecutar.' },
  { que: 'Antes de cotizar, se califica.', detalle: 'Presupuesto, quién decide, necesidad y fecha. Sin eso no hay propuesta.' },
  { que: 'Toda propuesta se presenta en persona.', detalle: 'La PM, la ejecutiva y el gerente que la va a operar.' },
  { que: 'Un solo precio.', detalle: 'Tarifario por unidad y cotización en 48 horas.' },
  { que: 'Cada cliente tiene un dueño de principio a fin.', detalle: 'La ejecutiva lo abre, la PM lo entrega y el KAM lo hace crecer.' },
]

const ROLES_COMERCIALES = [
  {
    rol: 'SDR',
    quien: 'Implant de Marketing Corporativo',
    hace: ['Prospecta las cuentas objetivo.', 'Agenda reuniones de diagnóstico ya calificadas.'],
    mide: 'Reuniones que llegan a propuesta.',
  },
  {
    rol: 'Ejecutiva comercial',
    quien: 'Elizabeth Gómez, a prueba',
    hace: ['Abre la cuenta y califica antes de cotizar.', 'Conduce la venta hasta el cobro.'],
    mide: 'Venta cobrada y propuestas que llegan a decisión.',
  },
  {
    rol: 'Project Manager',
    quien: 'Rocío Cervantes',
    hace: [
      'Traduce el problema del cliente en el estudio.',
      'Presenta la propuesta y responde por la entrega.',
      'Detecta la Fase II y se la pasa al KAM.',
    ],
    mide: 'Entregas a tiempo, satisfacción y propuestas ganadas.',
  },
  {
    rol: 'Key Account Manager',
    quien: 'Juan Carlos Hesles',
    hace: ['Hace crecer a los clientes que ya compraron.', 'Recompra, renovación y venta cruzada.'],
    mide: 'Recompra y crecimiento de la cartera.',
  },
]

const ROLES_AREAS = [
  {
    rol: 'Operación',
    quien: 'Cualitativo · Cuantitativo · Campo · Panel',
    hace: ['Diseña la metodología y cotiza con tarifario.', 'Presenta lo que va a ejecutar.'],
    mide: 'Cotización en 48 horas y entregas sin retrabajo.',
  },
  {
    rol: 'Producto',
    quien: 'Inteligencia de Negocio · Nora Osorno',
    hace: ['Dueña del catálogo y del tarifario.', 'Mantiene la calculadora de precio.'],
    mide: 'Cotizaciones dentro de tarifario.',
  },
  {
    rol: 'Información ejecutiva',
    quien: 'Inteligencia de Negocio · Andrés Gutiérrez',
    hace: ['Tablero semanal del área, con datos de HubSpot.', 'Un mismo número para todos.'],
    mide: 'Tablero al día cada lunes.',
  },
  {
    rol: 'Administración',
    quien: 'Carolina González',
    hace: ['Alta del cliente y del proyecto.', 'Facturación y cobro.'],
    mide: 'Días para cobrar.',
  },
  {
    rol: 'Dirección General',
    quien: 'Pablo Levy',
    hace: ['Aprueba solo lo que sale del tarifario.', 'Revisa el tablero cada semana.'],
    mide: 'Tiempo de autorización.',
  },
]

const JOURNEY = [
  {
    fase: 'Abrir',
    pasos: [
      { que: 'Prospección', detalle: 'Cuentas objetivo, por sector donde ya ganamos.', duenos: ['SDR'] },
      { que: 'Reunión de diagnóstico', detalle: 'El problema del cliente, no el catálogo.', duenos: ['Ejecutiva', 'PM'] },
      {
        que: 'Calificación',
        detalle: 'Presupuesto, decisor, necesidad y fecha. Sin esto no se cotiza.',
        duenos: ['Ejecutiva'],
        puerta: true,
      },
    ],
  },
  {
    fase: 'Proponer',
    pasos: [
      { que: 'Diseño y cotización', detalle: 'Con tarifario, en 48 horas.', duenos: ['PM', 'Operación'] },
      { que: 'Autorización', detalle: 'Solo lo que sale del tarifario.', duenos: ['Dirección General'] },
      {
        que: 'Presentación en persona',
        detalle: 'Nunca por correo. Con quien va a ejecutar.',
        duenos: ['PM', 'Ejecutiva', 'Operación'],
        puerta: true,
      },
    ],
  },
  {
    fase: 'Cerrar y entregar',
    pasos: [
      { que: 'Seguimiento', detalle: 'Con fecha de decisión acordada con el cliente.', duenos: ['Ejecutiva'] },
      { que: 'Alta y arranque', detalle: 'Cliente, proyecto y equipo en una sola reunión.', duenos: ['Administración', 'PM'] },
      { que: 'Ejecución', detalle: 'Estatus al cliente cada semana.', duenos: ['PM', 'Operación'] },
    ],
  },
  {
    fase: 'Crecer',
    pasos: [
      { que: 'Entrega de resultados', detalle: 'En persona. Ahí se detecta la Fase II.', duenos: ['PM', 'Operación'] },
      { que: 'Facturación y cobro', detalle: 'La comisión se paga sobre lo cobrado.', duenos: ['Administración', 'Ejecutiva'] },
      { que: 'Recompra', detalle: 'La PM le pasa la cuenta al KAM.', duenos: ['KAM'] },
    ],
  },
]

const CANDIDATOS = [
  {
    nombre: 'Rocío Cervantes',
    dato: 'Cualitativo · casi 6 años en RL',
    fuertes: [
      'Arma la propuesta desde el problema del cliente.',
      'Coordina proyectos de varias áreas y reporta avance cada semana.',
      'Propuso tarifario y cotizar el mismo día.',
      'Tiene clientes que le vuelven a comprar.',
    ],
    desarrollar: 'Costeo y control de alcance, con contraparte en cuantitativo.',
    veredicto: 'Recomendada',
    recomendada: true,
  },
  {
    nombre: 'Violeta Hernández',
    dato: 'Cuantitativo · 18 años en RL',
    fuertes: [
      'La más sólida en metodología y viabilidad de campo.',
      'Conoce la regla de precio y la aplica.',
      'Organiza el arranque de cada proyecto con el cliente.',
    ],
    desarrollar: 'La venta y la negociación de alcance.',
    veredicto: 'Contraparte en cuantitativo',
    recomendada: false,
  },
  {
    nombre: 'Juan Carlos Gutiérrez',
    dato: 'Cuantitativo · 8 años en RL',
    fuertes: ['Pide estar con el cliente desde el arranque.', 'Conoce los tiempos de cotización y de campo.'],
    desarrollar: 'La conversación no alcanzó para evaluarlo a fondo.',
    veredicto: 'Evaluar con un caso',
    recomendada: false,
  },
]

export function PresentacionRl() {
  const maximo = Math.max(...PERDIDOS_2026.motivos.map((m) => m.negocios))
  const meta = capacidadDeLaMeta()

  return (
    <div className={estilos.documento}>
      {/* 1 · PORTADA */}
      <section data-layout="portada" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={`${estilos.escena} ${estilos.escenaPortada}`}>
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
            Estrategia comercial 2027 · Marketing Corporativo
          </p>
          <h1 className={`${estilos.titulo} ${estilos.tituloPortada} ${estilos.aparece}`} style={orden(2)}>
            Nuestra propuesta para el área comercial
          </h1>
          <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(3)}>
            Estructura, roles, journey y personas, sobre la base del plan de Research Land.
          </p>
        </Escena>
        <Pie>Franco Cruzat · {CORTE}</Pie>
      </section>

      {/* 2 · PUNTO DE PARTIDA. El diagnóstico entero, en una sola lámina. */}
      <section data-layout="partida" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera antetitulo="Punto de partida" titulo="Se cotiza mucho y se cierra poco" />
          <div className={`${estilos.cuerpo} ${estilos.partida}`}>
            <div className={estilos.aparece} style={orden(2)}>
              <p className={`${estilos.cifra} ${estilos.cifraClara}`}>
                <CifraAnimada valor={PROPUESTAS_ENE_JUL.ganadas} className={estilos.cifraValor} />
                <span className={estilos.cifraDe}>de {PROPUESTAS_ENE_JUL.total}</span>
              </p>
              <p className={estilos.cifraRotulo}>propuestas ganadas entre enero y julio</p>
              <p className={estilos.nota}>
                {PROPUESTAS_2026} propuestas en lo que va del año. {PROPUESTAS_ENE_JUL.perdidas} de las 95 se perdieron.
              </p>
            </div>
            <div>
              <p className={`${estilos.subtitulo} ${estilos.aparece}`} style={orden(3)}>
                Por qué se perdieron los {PERDIDOS_2026.total} negocios de 2026
              </p>
              <ul className={estilos.motivos}>
                {PERDIDOS_2026.motivos.map((m, i) => (
                  <li
                    key={m.motivo}
                    className={`${estilos.motivo} ${estilos.aparece}`}
                    style={orden(i + 4)}
                    data-competidor={m.motivo === COMPETIDOR ? 'true' : undefined}
                  >
                    <span className={estilos.motivoNombre}>{m.motivo}</span>
                    <span className={estilos.motivoCarril}>
                      <span
                        className={estilos.motivoBarra}
                        style={{ ...orden(i + 4), width: `${(m.negocios / maximo) * 100}%` }}
                      />
                    </span>
                    <span className={estilos.motivoValor}>{porcentaje(m.negocios)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Escena>
        <Pie>
          Fuente: HubSpot, pipeline de Research Land; el {porcentaje(PERDIDOS_2026.otros)}% restante de los perdidos dice
          otro, desconocido o cancelado. Corte al {CORTE}.
        </Pie>
      </section>

      {/* 3 · LOS PRINCIPIOS. La tesis de su plan, convertida en reglas de operación. */}
      <section data-layout="principios" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Escena className={estilos.escena}>
          <Cabecera
            antetitulo="La idea que guía todo"
            titulo="El cliente le compra a quien sabe"
            nota="Es la tesis de su plan. Estas son las cinco reglas que la vuelven operación."
          />
          <div className={estilos.cuerpo}>
            <ol className={`${estilos.ajustes} ${estilos.ajustesOscuros}`}>
              {PRINCIPIOS.map((p, i) => (
                <li key={p.que} className={`${estilos.ajuste} ${estilos.aparece}`} style={orden(i + 3)}>
                  <p className={estilos.ajusteQue}>{p.que}</p>
                  <p className={estilos.ajusteDetalle}>{p.detalle}</p>
                </li>
              ))}
            </ol>
          </div>
        </Escena>
      </section>

      {/* 4 · LA ESTRUCTURA. Solo personas que nombran su deck, su correo y las entrevistas. */}
      <section data-layout="estructura" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera
            antetitulo="Estructura propuesta"
            titulo="Así queda el área comercial"
            nota="Tres puestos nuevos alrededor del cliente y la operación al frente de la venta."
          />
          <div className={`${estilos.cuerpo} ${estilos.organigrama}`}>
            <div className={`${estilos.nodo} ${estilos.nodoCabeza} ${estilos.aparece}`} style={orden(3)}>
              <span className={estilos.nodoPuesto}>Dirección General</span>
              <span className={estilos.nodoPersona}>Pablo Levy</span>
            </div>

            <div className={`${estilos.nodo} ${estilos.aparece}`} style={orden(4)}>
              <span className={estilos.nodoPuesto}>Inteligencia de Negocio</span>
              <span className={estilos.nodoPersona}>Giovanni Sanabria</span>
              <span className={estilos.nodoNota}>Producto · Nora Osorno</span>
              <span className={estilos.nodoNota}>Información ejecutiva · Andrés Gutiérrez</span>
            </div>
            <div className={`${estilos.nodo} ${estilos.nodoNuevo} ${estilos.aparece}`} style={orden(5)}>
              <span className={estilos.nodoPuesto}>Ejecutiva comercial</span>
              <span className={estilos.nodoPersona}>Elizabeth Gómez</span>
              <span className={estilos.nodoNota}>A prueba 90 días</span>
            </div>
            <div className={`${estilos.nodo} ${estilos.nodoNuevo} ${estilos.aparece}`} style={orden(6)}>
              <span className={estilos.nodoPuesto}>Project Manager</span>
              <span className={estilos.nodoPersona}>Rocío Cervantes</span>
              <span className={estilos.nodoNota}>Puente entre cliente, comercial y operación</span>
            </div>
            <div className={`${estilos.nodo} ${estilos.nodoNuevo} ${estilos.aparece}`} style={orden(7)}>
              <span className={estilos.nodoPuesto}>Key Account Manager</span>
              <span className={estilos.nodoPersona}>Juan Carlos Hesles</span>
              <span className={estilos.nodoNota}>Recompra y crecimiento de cartera</span>
            </div>

            <div className={`${estilos.nodo} ${estilos.nodoApoyo} ${estilos.aparece}`} style={orden(8)}>
              <span className={estilos.nodoPuesto}>SDR</span>
              <span className={estilos.nodoPersona}>Implant de Marketing Corporativo</span>
              <span className={estilos.nodoNota}>Le llena la agenda a la ejecutiva</span>
            </div>
            <div className={`${estilos.nodo} ${estilos.nodoOperacion} ${estilos.aparece}`} style={orden(9)}>
              <span className={estilos.nodoPuesto}>Operación · la autoridad técnica</span>
              <ul className={estilos.operacion}>
                <li>Cualitativo · Cristina Nieto</li>
                <li>Cuantitativo · tres gerencias</li>
                <li>Campo · Landers</li>
                <li>Panel · Azteca y proveedores</li>
              </ul>
              <span className={estilos.nodoNota}>La PM los coordina. Cada gerente presenta lo que va a ejecutar.</span>
            </div>
            <div className={`${estilos.nodo} ${estilos.nodoApoyo} ${estilos.aparece}`} style={orden(10)}>
              <span className={estilos.nodoPuesto}>Administración</span>
              <span className={estilos.nodoPersona}>Carolina González</span>
              <span className={estilos.nodoNota}>Alta, facturación y cobro</span>
            </div>
          </div>
          <p className={`${estilos.leyenda} ${estilos.aparece}`} style={orden(11)}>
            <span className={estilos.marcaNuevo} aria-hidden="true" /> Puesto nuevo
            <span className={estilos.marcaApoyo} aria-hidden="true" /> Apoyo transversal
          </p>
        </Escena>
      </section>

      {/* 5 · ROLES COMERCIALES */}
      <section data-layout="roles-comerciales" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera antetitulo="Roles del área comercial" titulo="Quién hace qué con el cliente" />
          <div className={`${estilos.cuerpo} ${estilos.roles}`} style={{ '--columnas': 4 } as CSSProperties}>
            {ROLES_COMERCIALES.map((r, i) => (
              <article key={r.rol} className={`${estilos.rol} ${estilos.aparece}`} style={orden(i + 2)}>
                <p className={estilos.rolQuien}>{r.quien}</p>
                <h3 className={estilos.rolNombre}>{r.rol}</h3>
                <ul className={estilos.rolHace}>
                  {r.hace.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className={estilos.rolMide}>
                  <strong>Se mide por:</strong> {r.mide}
                </p>
              </article>
            ))}
          </div>
        </Escena>
      </section>

      {/* 6 · ROLES DE LAS ÁREAS */}
      <section data-layout="roles-areas" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera
            antetitulo="Roles de las áreas"
            titulo="Lo que le toca a cada área"
            nota="La venta no es solo de comercial: cada área tiene una parte y se mide por ella."
          />
          <div className={`${estilos.cuerpo} ${estilos.roles}`} style={{ '--columnas': 5 } as CSSProperties}>
            {ROLES_AREAS.map((r, i) => (
              <article key={r.rol} className={`${estilos.rol} ${estilos.aparece}`} style={orden(i + 3)}>
                <p className={estilos.rolQuien}>{r.quien}</p>
                <h3 className={estilos.rolNombre}>{r.rol}</h3>
                <ul className={estilos.rolHace}>
                  {r.hace.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className={estilos.rolMide}>
                  <strong>Se mide por:</strong> {r.mide}
                </p>
              </article>
            ))}
          </div>
        </Escena>
      </section>

      {/* 7 · EL JOURNEY. Su flujo de 13 pasos, con dos puertas que hoy no existen. */}
      <section data-layout="journey" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera
            antetitulo="Journey comercial"
            titulo="Del primer contacto a la recompra"
            nota="Doce pasos, cada uno con dueño. Las dos puertas marcadas son las que hoy no existen."
          />
          <div className={`${estilos.cuerpo} ${estilos.journey}`}>
            {JOURNEY.map((f, i) => (
              <div key={f.fase} className={`${estilos.fase} ${estilos.aparece}`} style={orden(i + 3)}>
                <p className={estilos.faseNombre}>{f.fase}</p>
                <ol className={estilos.pasosJ}>
                  {f.pasos.map((p) => (
                    <li key={p.que} className={estilos.pasoJ} data-puerta={p.puerta ? 'true' : undefined}>
                      <p className={estilos.pasoJQue}>{p.que}</p>
                      <p className={estilos.pasoJDetalle}>{p.detalle}</p>
                      <ul className={estilos.duenos}>
                        {p.duenos.map((d) => (
                          <li key={d} className={estilos.dueno}>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Escena>
      </section>

      {/* 8 · CANDIDATOS A PM. Conducta observada en las conversaciones, sin citas. */}
      <section data-layout="candidatos" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Escena className={estilos.escena}>
          <Cabecera antetitulo="Project Manager · tres candidatos" titulo="Recomendamos a Rocío Cervantes" />
          <div className={`${estilos.cuerpo} ${estilos.candidatos}`}>
            {CANDIDATOS.map((c, i) => (
              <article
                key={c.nombre}
                className={`${estilos.candidato} ${estilos.aparece}`}
                style={orden(i + 2)}
                data-recomendada={c.recomendada ? 'true' : undefined}
              >
                <p className={estilos.veredicto}>{c.veredicto}</p>
                <h3 className={estilos.candidatoNombre}>{c.nombre}</h3>
                <p className={estilos.candidatoDato}>{c.dato}</p>
                <ul className={estilos.lista}>
                  {c.fuertes.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className={estilos.candidatoDesarrollar}>
                  <strong>Por desarrollar:</strong> {c.desarrollar}
                </p>
              </article>
            ))}
          </div>
          <p className={`${estilos.condiciones} ${estilos.aparece}`} style={orden(5)}>
            <strong>Condiciones:</strong> definir qué decide la PM y qué decide cada dirección de área · Violeta como
            contraparte en cuantitativo · parte de su variable por propuestas ganadas · para confirmar, un caso real del
            brief a la propuesta presentada.
          </p>
        </Escena>
      </section>

      {/* 9 · LA EJECUTIVA, EN PILOTO */}
      <section data-layout="ejecutiva" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera
            antetitulo="Ejecutivo comercial"
            titulo="Elizabeth Gómez, a prueba 90 días"
            nota="Desde julio abrió las cuentas grandes que hoy están en propuesta. Todavía no cierra ninguna: por eso, piloto."
          />
          <div className={`${estilos.cuerpo} ${estilos.columnas}`}>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(3)}>
              <h3 className={estilos.columnaTitulo}>Cómo arranca</h3>
              <ul className={estilos.lista}>
                <li>En dupla con la PM: la PM presenta, Eli lleva la relación y el cierre.</li>
                <li>Se queda con los negocios que ella abrió.</li>
                <li>Sigue prospectando una parte de su semana hasta que llegue quien la reemplace.</li>
                <li>
                  Sin la cuota individual de {millones(CUOTA_EJECUTIVO)} durante el piloto. Cuota compartida con la PM y
                  comisión sobre lo cobrado.
                </li>
              </ul>
            </div>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(4)}>
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

      {/* 10 · LA META Y LA CAPACIDAD. Con los supuestos del propio plan. */}
      <section data-layout="meta" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Escena className={estilos.escena}>
          <Cabecera
            antetitulo="Lo que implica la meta"
            titulo={`La meta pide ${meta.alMes} presentaciones al mes`}
            nota="Con los supuestos de su propio plan."
          />
          <div className={estilos.cuerpo}>
            <ol className={estilos.ecuacion}>
              <li className={`${estilos.termino} ${estilos.aparece}`} style={orden(3)}>
                <span className={estilos.terminoValor}>{millones(META_PLAN_2027)}</span>
                <span className={estilos.terminoRotulo}>meta externa 2027</span>
              </li>
              <li className={`${estilos.termino} ${estilos.aparece}`} style={orden(4)}>
                <span className={estilos.terminoValor}>{meta.proyectos}</span>
                <span className={estilos.terminoRotulo}>proyectos, con ticket de {miles(TICKET_PLAN)}</span>
              </li>
              <li className={`${estilos.termino} ${estilos.aparece}`} style={orden(5)}>
                <span className={estilos.terminoValor}>{meta.propuestas}</span>
                <span className={estilos.terminoRotulo}>
                  propuestas presentadas, al {Math.round(CIERRE_PLAN * 100)}% de cierre
                </span>
              </li>
              <li className={`${estilos.termino} ${estilos.aparece}`} style={orden(6)}>
                <span className={estilos.terminoValor}>{meta.alMes}</span>
                <span className={estilos.terminoRotulo}>presentaciones en persona cada mes</span>
              </li>
            </ol>
            <ul className={`${estilos.lista} ${estilos.aparece}`} style={orden(7)}>
              <li>Una PM sola no presenta {meta.alMes} propuestas al mes: presentan también los gerentes de operación.</li>
              <li>
                Para medir el salto: en 2025 se facturaron {millones(FACTURADO_EXTERNO_2025)} a clientes externos. Las cuotas
                de cada puesto tienen que sumar la meta.
              </li>
            </ul>
          </div>
        </Escena>
        <Pie>Fuentes: plan de Research Land (meta, ticket y tasa de cierre) y Forecast 2026. Corte al {CORTE}.</Pie>
      </section>

      {/* 11 · PRECIO Y COMISIONES */}
      <section data-layout="precio" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera antetitulo="Oferta y reglas del juego" titulo="Un solo precio y comisiones sobre lo cobrado" />
          <div className={`${estilos.cuerpo} ${estilos.columnas}`}>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(2)}>
              <h3 className={estilos.columnaTitulo}>Precio</h3>
              <ul className={estilos.lista}>
                <li>Tarifario por unidad: entrevista, encuesta, visita de mystery, por plaza.</li>
                <li>Calculadora para cotizar en 48 horas.</li>
                <li>Proveedores con tarifas pactadas, sin esperar cotización en cada propuesta.</li>
                <li>Una sola regla de contribución para todas las áreas.</li>
                <li>Dirección General aprueba solo lo que sale del tarifario.</li>
              </ul>
            </div>
            <div className={`${estilos.columna} ${estilos.aparece}`} style={orden(3)}>
              <h3 className={estilos.columnaTitulo}>Comisiones</h3>
              <ul className={estilos.lista}>
                <li>Todas se pagan sobre lo cobrado.</li>
                <li>Negocio nuevo: cuota compartida entre la ejecutiva y la PM.</li>
                <li>Rampa para quien entra al puesto.</li>
                <li>KAM: recompra y crecimiento de su cartera.</li>
                <li>PM: satisfacción del cliente y propuestas ganadas.</li>
                <li>Las cuotas de los puestos suman un solo total.</li>
              </ul>
            </div>
          </div>
        </Escena>
      </section>

      {/* 12 · PLAN DE 90 DÍAS */}
      <section data-layout="plan" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={estilos.escena}>
          <Cabecera antetitulo="Siguientes pasos" titulo="Plan de 90 días" />
          <div className={estilos.cuerpo}>
            <ol className={estilos.pasos}>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(2)}>
                <p className={estilos.pasoCuando}>Semanas 1 y 2</p>
                <p className={estilos.pasoQue}>
                  Anunciar a la PM y a la ejecutiva. Pedir el SDR que reemplace a Eli. Cuotas y comisiones corregidas
                  antes de Capital Humano.
                </p>
              </li>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(3)}>
                <p className={estilos.pasoCuando}>Primer mes</p>
                <p className={estilos.pasoQue}>
                  Tarifario y calculadora. Toda propuesta presentada en persona. Tablero semanal arriba.
                </p>
              </li>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(4)}>
                <p className={estilos.pasoCuando}>Fin de noviembre</p>
                <p className={estilos.pasoQue}>Primera revisión: propuestas presentadas, decisiones y cierres.</p>
              </li>
              <li className={`${estilos.paso} ${estilos.aparece}`} style={orden(5)}>
                <p className={estilos.pasoCuando}>Mediados de enero</p>
                <p className={estilos.pasoQue}>Decisión sobre la estructura y la ejecutiva, con los datos del piloto.</p>
              </li>
            </ol>
          </div>
        </Escena>
      </section>
    </div>
  )
}
