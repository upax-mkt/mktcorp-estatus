import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import estilos from './politico.module.css'
import { Escena } from './Escena'
import { CifraAnimada } from './CifraAnimada'
import {
  BLOG,
  CONVERSACIONES,
  CORTE,
  ETIQUETA_ETAPA,
  INSTITUTOS,
  LANDING,
  OPORTUNIDADES,
  RADAR,
  REUNIONES,
  SIGUIENTES,
  embudo,
  oportunidadesAbiertas,
  partidosEnConversacion,
  pipelineAbierto,
  pipelinePorUdn,
  totalDe,
  type UdnVertical,
} from '@/politico/estatus-ago-sep-2026'

/**
 * EL ESTATUS POLÍTICO-ELECTORAL COMO PRESENTACIÓN WEB.
 *
 * Cada `<section data-layout>` es una pantalla: se lee con scroll y, dentro de
 * `ModoPresentar`, se proyecta una a la vez a pantalla completa — la misma
 * mecánica que el documento de una sesión, sin exportar nada.
 *
 * LA RETÍCULA ES LA MISMA EN CADA PANTALLA: antetítulo y título anclados
 * arriba (`cabecera`), y el contenido centrado en el espacio que queda
 * (`cuerpo`). Así el título no brinca de altura al pasar de una lámina a otra,
 * que es lo primero que se nota al proyectar.
 *
 * Todas las cifras llegan calculadas de `src/politico/estatus-ago-sep-2026.ts`:
 * aquí no se escribe ningún número a mano. Lo animado (conteos, barras que
 * crecen, institutos que se encienden) arranca al llegar a cada pantalla y
 * nunca esconde nada sin JavaScript — ver `Escena` y `CifraAnimada`.
 */

const PESOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

/**
 * Logos de UDN en color (proporción real, alto 164 px en el archivo).
 *
 * `escala` es CORRECCIÓN ÓPTICA, no capricho: a la misma altura, el logo largo
 * de Research Land pesaba el triple que el escudo de Marketing United y la
 * columna se leía desbalanceada. Se ajusta la altura de cada uno para que
 * ocupen un área parecida.
 */
const LOGO_UDN: Partial<Record<UdnVertical, { src: string; ancho: number; escala: number }>> = {
  'Research Land': { src: '/logos/research-land-color.png', ancho: 1092, escala: 0.8 },
  'Promo Espacio': { src: '/logos/promo-espacio-color.png', ancho: 753, escala: 0.95 },
  'Marketing United': { src: '/logos/marketing-united-color.png', ancho: 393, escala: 1.3 },
  'Mexa Creativa': { src: '/logos/mexa-creativa-color.png', ancho: 426, escala: 1.15 },
}

/** Nombre corto de la UDN para las pastillas de la tabla. */
const CORTO: Record<UdnVertical, string> = {
  'Research Land': 'RL',
  'Promo Espacio': 'PE',
  'Marketing United': 'MU',
  'Mexa Creativa': 'MC',
  'House of Films': 'HoF',
  NeraCode: 'NC',
}

const orden = (i: number) => ({ '--i': i }) as CSSProperties

function Pie({ children }: { children: ReactNode }) {
  return <p className={estilos.pie}>{children}</p>
}

export function EstatusPolitico() {
  const abierto = pipelineAbierto()
  const porUdn = pipelinePorUdn()
  const maximoUdn = Math.max(...porUdn.map((f) => f.monto))
  const pasos = embudo()
  const maximoPaso = Math.max(...pasos.map((p) => p.valor))
  const abiertas = oportunidadesAbiertas().length
  const maximoLanding = Math.max(...LANDING.map((m) => m.visitas))
  const agosto = LANDING.find((m) => m.mes === 'Agosto')?.visitas ?? 0
  const julio = LANDING.find((m) => m.mes === 'Julio')?.visitas ?? 1
  const multiplo = Math.round(agosto / julio)

  return (
    <div className={estilos.documento}>
      {/* 1 · PORTADA */}
      <section data-layout="portada" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.portada}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={estilos.escena}>
          {/* Grupo UPAX con Marketing Corp (Franco, 30-sep-2026): el mismo logo
              combinado del concurso, recortado de su margen transparente para
              que en la portada mida lo que se ve. */}
          <Image
            src="/logos/mkt-corp-grupo-upax-blanco-recortado.png"
            alt="Grupo UPAX y Marketing Corp"
            width={1600}
            height={244}
            className={`${estilos.logoPortada} ${estilos.aparece}`}
            style={orden(0)}
            priority
          />
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(1)}>Vertical político-electoral</p>
          <h1 className={`${estilos.tituloPortada} ${estilos.aparece}`} style={orden(2)}>
            Oportunidades <span className={estilos.degradado}>político-electorales</span>
          </h1>
          <p className={`${estilos.subtituloPortada} ${estilos.aparece}`} style={orden(3)}>
            Estatus de agosto y septiembre 2026
          </p>
          <p className={`${estilos.firma} ${estilos.aparece}`} style={orden(4)}>
            Ángel Toledano · Desarrollo de negocio político · Corte al {CORTE}
          </p>
        </Escena>
      </section>

      {/* 2 · EL BIMESTRE: EL PIPELINE QUE ESTAMOS GENERANDO
          Eran dos láminas (las cuatro cifras en claro y el primer ganado en
          oscuro); Franco las fusionó el 30-sep-2026 con el look de la oscura.
          La cifra grande es el PIPELINE ABIERTO, no el ganado: el mensaje es
          que la vertical ya genera pipeline (Franco, 30-sep-2026). */}
      <section data-layout="bimestre" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.foco}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Agosto y septiembre</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Estamos generando pipeline</h2>
          </header>
          <div className={estilos.cuerpo}>
            <CifraAnimada
              valor={abierto / 1_000_000}
              decimales={1}
              prefijo="$"
              sufijo=" M"
              className={`${estilos.cifraGigante} ${estilos.degradado} ${estilos.aparece}`}
            />
            <p className={`${estilos.leyendaGigante} ${estilos.aparece}`} style={orden(3)}>
              de pipeline abierto, en {abiertas} oportunidades
            </p>
            <div className={estilos.bimestre}>
              <article className={`${estilos.cifraOscura} ${estilos.aparece}`} style={orden(4)}>
                <CifraAnimada valor={REUNIONES.realizadas} className={estilos.cifraValor} />
                <p className={estilos.cifraRotulo}>reuniones realizadas, de {REUNIONES.periodo}</p>
              </article>
              <article className={`${estilos.cifraOscura} ${estilos.aparece}`} style={orden(5)}>
                <CifraAnimada valor={INSTITUTOS.length} className={estilos.cifraValor} />
                <p className={estilos.cifraRotulo}>institutos electorales estatales ya nos conocen</p>
              </article>
              {/* Era el primer ganado ($200 mil). Al 30-sep-2026 HubSpot no tiene
                  ganado (quedó en Evaluando): la tercera cifra son los partidos
                  con los que ya hay conversación. Si vuelve a haber un ganado,
                  va en la tabla y en el embudo, no aquí. */}
              <article className={`${estilos.cifraOscura} ${estilos.aparece}`} style={orden(6)}>
                <CifraAnimada valor={partidosEnConversacion()} className={estilos.cifraValor} />
                <p className={estilos.cifraRotulo}>partidos con los que ya estamos en conversación</p>
              </article>
            </div>
          </div>
        </Escena>
        <Pie>HubSpot y deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 3 · EL EMBUDO */}
      <section data-layout="embudo" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Embudo</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              De {pasos[0].valor} reuniones salieron {pasos[1].valor} oportunidades
            </h2>
          </header>
          <div className={estilos.cuerpo}>
            <ol className={estilos.embudo}>
              {pasos.map((paso, i) => (
                <li key={paso.etapa} className={estilos.pasoEmbudo} style={orden(i + 2)}>
                  <span className={estilos.pasoNombre}>{paso.etapa}</span>
                  {/* La cifra va PEGADA al final de su barra, no en una columna
                      al fondo: con barras cortas quedaba a media pantalla de
                      distancia y había que cruzar la vista para leerla. */}
                  <span className={estilos.pasoCarril}>
                    <span
                      className={estilos.pasoBarra}
                      style={{ ...orden(i + 2), '--ancho': `${Math.max(4, (paso.valor / maximoPaso) * 100)}%` } as CSSProperties}
                    />
                    <CifraAnimada valor={paso.valor} className={estilos.pasoValor} />
                  </span>
                </li>
              ))}
            </ol>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(7)}>
              Las reuniones: {REUNIONES.credenciales} de credenciales y {REUNIONES.acercamiento} de acercamiento, de {REUNIONES.periodo}.
            </p>
          </div>
        </Escena>
        <Pie>Reuniones: HubSpot, realizadas por BD Político · oportunidades: deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 4 · EL PIPELINE POR UDN */}
      <section data-layout="pipeline" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Pipeline abierto</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              <CifraAnimada valor={abierto / 1_000_000} decimales={1} prefijo="$" sufijo=" M" /> en propuestas, repartidos en {porUdn.length} UDN
            </h2>
          </header>
          <div className={estilos.cuerpo}>
            <ul className={estilos.udns}>
              {porUdn.map((fila, i) => {
                const logo = LOGO_UDN[fila.udn]
                return (
                  <li key={fila.udn} className={estilos.udn} style={orden(i + 2)}>
                    <span className={estilos.udnMarca}>
                      {logo ? (
                        <Image
                          src={logo.src}
                          alt={fila.udn}
                          width={logo.ancho}
                          height={164}
                          className={estilos.udnLogo}
                          style={{ '--escala-logo': logo.escala } as CSSProperties}
                        />
                      ) : (
                        fila.udn
                      )}
                    </span>
                    <span className={estilos.udnCarril}>
                      <span
                        className={estilos.udnBarra}
                        style={{ ...orden(i + 2), '--ancho': `${Math.max(3, (fila.monto / maximoUdn) * 100)}%` } as CSSProperties}
                      />
                      <span className={estilos.udnMonto}>{PESOS.format(fila.monto)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(7)}>
              House of Films y NeraCode ya participan en oportunidades que todavía no tienen monto.
            </p>
          </div>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 5 · LAS OPORTUNIDADES */}
      <section data-layout="oportunidades" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Tabla de oportunidades</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              Las {OPORTUNIDADES.length} oportunidades, una por una
            </h2>
          </header>
          <div className={estilos.cuerpo}>
            <div className={estilos.tabla} role="table" aria-label="Oportunidades político-electorales">
              <div className={`${estilos.filaTabla} ${estilos.cabeceraTabla}`} role="row">
                <span role="columnheader">Cliente</span>
                <span role="columnheader">Etapa</span>
                <span role="columnheader">UDN</span>
                <span role="columnheader" className={estilos.derecha}>Total</span>
              </div>
              {OPORTUNIDADES.map((o, i) => (
                <div key={`${o.cliente}-${i}`} className={`${estilos.filaTabla} ${estilos.aparece}`} style={orden(i + 2)} role="row">
                  <span role="cell" className={estilos.celdaCliente}>
                    {o.cliente}
                    {o.detalle && <small>{o.detalle}</small>}
                  </span>
                  <span role="cell">
                    <span className={estilos.etapa} data-etapa={o.etapa}>{ETIQUETA_ETAPA[o.etapa]}</span>
                  </span>
                  <span role="cell" className={estilos.pastillas}>
                    {(Object.keys(o.montos) as UdnVertical[]).map((u) => (
                      <span key={u} className={estilos.pastilla} title={u}>{CORTO[u]}</span>
                    ))}
                    {o.sinMonto?.map((u) => (
                      <span key={u} className={`${estilos.pastilla} ${estilos.pastillaVacia}`} title={`${u}, por cotizar`}>{CORTO[u]}</span>
                    ))}
                  </span>
                  <span role="cell" className={estilos.derecha}>{totalDe(o) > 0 ? PESOS.format(totalDe(o)) : '—'}</span>
                </div>
              ))}
              <div className={`${estilos.filaTabla} ${estilos.totalTabla}`} role="row">
                <span role="cell">Pipeline abierto</span>
                <span role="cell" />
                <span role="cell" />
                <span role="cell" className={estilos.derecha}>{PESOS.format(abierto)}</span>
              </div>
            </div>
          </div>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 6 · LOS INSTITUTOS ELECTORALES */}
      <section data-layout="institutos" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Organismos electorales</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              {INSTITUTOS.length} institutos electorales ya nos conocen
            </h2>
          </header>
          <div className={estilos.cuerpo}>
            <ul className={estilos.institutos}>
              {INSTITUTOS.map((inst, i) => (
                <li key={inst.estado} className={estilos.instituto} data-paso={inst.paso} style={orden(i + 2)}>
                  <span className={estilos.institutoEstado}>{inst.estado}</span>
                  <span className={estilos.institutoPaso}>{inst.paso === 'credenciales' ? 'Credenciales' : 'Acercamiento'}</span>
                </li>
              ))}
            </ul>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(12)}>
              {INSTITUTOS.filter((i) => i.paso === 'credenciales').length} con credenciales presentadas y{' '}
              {INSTITUTOS.filter((i) => i.paso === 'acercamiento').length} con reunión de acercamiento.
            </p>
          </div>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 7 · PARTIDOS Y CANDIDATOS */}
      <section data-layout="partidos" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Partidos y candidatos</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Lo que está en conversación</h2>
          </header>
          <div className={estilos.cuerpo}>
            <div className={estilos.conversaciones}>
              {CONVERSACIONES.map((c, i) => (
                <article key={`${c.quien}-${c.titulo}`} className={`${estilos.conversacion} ${estilos.aparece}`} style={orden(i + 2)}>
                  <span className={estilos.partido}>{c.quien}</span>
                  <h3 className={estilos.conversacionTitulo}>{c.titulo}</h3>
                  <p className={estilos.conversacionDetalle}>{c.detalle}</p>
                </article>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 8 · INBOUND */}
      <section data-layout="inbound" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Inbound</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
              La landing multiplicó por {multiplo} sus visitas en agosto
            </h2>
          </header>
          <div className={estilos.cuerpo}>
            <div className={estilos.inbound}>
              <div className={estilos.columnas} role="img" aria-label={LANDING.map((m) => `${m.mes}: ${m.visitas} visitas`).join(', ')}>
                {LANDING.map((m, i) => (
                  <div key={m.mes} className={estilos.columna} style={orden(i + 2)}>
                    <span className={estilos.columnaCarril}>
                      <span className={estilos.columnaValor}>
                        <CifraAnimada valor={m.visitas} />
                      </span>
                      <span
                        className={estilos.columnaBarra}
                        data-parcial={m.parcial ? 'true' : undefined}
                        style={{ ...orden(i + 2), '--alto': `${(m.visitas / maximoLanding) * 100}%` } as CSSProperties}
                      />
                    </span>
                    <span className={estilos.columnaMes}>{m.mes}{m.parcial ? '*' : ''}</span>
                  </div>
                ))}
              </div>
              <aside className={`${estilos.blog} ${estilos.aparece}`} style={orden(6)}>
                <p className={estilos.blogCifra}>
                  <CifraAnimada valor={BLOG.lecturas} />
                </p>
                <p className={estilos.blogRotulo}>lecturas del blog político, de {BLOG.periodo}, en {BLOG.articulos} artículos</p>
                <p className={estilos.blogDestacado}>
                  El más leído: «{BLOG.masLeido.titulo}», {BLOG.masLeido.lecturas} lecturas
                </p>
              </aside>
            </div>
          </div>
        </Escena>
        <Pie>GA4, sesiones en politico.upax.com.mx y lecturas del blog · *septiembre al día 28</Pie>
      </section>

      {/* 9 · LO QUE SIGUE */}
      <section data-layout="siguientes" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={estilos.escena}>
          <header className={estilos.cabecera}>
            <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Próximos pasos</p>
            <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Lo que sigue</h2>
          </header>
          <div className={estilos.cuerpo}>
            {/* LA DECISIÓN QUE SE LE PIDE A CECI, antes que la lista: es lo único
                de esta lámina que no depende del equipo (Franco, 30-sep-2026). */}
            <article className={`${estilos.decision} ${estilos.aparece}`} style={orden(2)}>
              <p className={estilos.decisionPedido}>{RADAR.pedido}</p>
              <h3 className={estilos.decisionTitulo}>{RADAR.titulo}</h3>
              <ul className={estilos.decisionPuntos}>
                {RADAR.puntos.map((punto) => (
                  <li key={punto}>{punto}</li>
                ))}
              </ul>
            </article>
            <ol className={`${estilos.linea} ${estilos.lineaCompacta}`}>
              {SIGUIENTES.map((s, i) => (
                <li key={`${s.cuando}-${i}`} className={`${estilos.hito} ${estilos.aparece}`} style={orden(i + 3)}>
                  <span className={estilos.hitoCuando}>{s.cuando}</span>
                  <span className={estilos.hitoQue}>{s.que}</span>
                </li>
              ))}
            </ol>
          </div>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>
    </div>
  )
}
