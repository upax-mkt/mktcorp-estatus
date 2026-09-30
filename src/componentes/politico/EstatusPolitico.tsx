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
  REUNIONES,
  SIGUIENTES,
  embudo,
  ganado,
  oportunidadesAbiertas,
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
 * Todas las cifras llegan calculadas de `src/politico/estatus-ago-sep-2026.ts`:
 * aquí no se escribe ningún número a mano. Lo animado (conteos, barras que
 * crecen, institutos que se encienden) arranca al llegar a cada pantalla y
 * nunca esconde nada sin JavaScript — ver `Escena` y `CifraAnimada`.
 */

const PESOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

/** Logos de UDN en color (proporción real, alto 164 px en el archivo). */
const LOGO_UDN: Partial<Record<UdnVertical, { src: string; ancho: number }>> = {
  'Research Land': { src: '/logos/research-land-color.png', ancho: 1092 },
  'Promo Espacio': { src: '/logos/promo-espacio-color.png', ancho: 753 },
  'Marketing United': { src: '/logos/marketing-united-color.png', ancho: 393 },
  'Mexa Creativa': { src: '/logos/mexa-creativa-color.png', ancho: 426 },
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
  const primerGanado = OPORTUNIDADES.find((o) => o.etapa === 'ganado')
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
          <Image
            src="/logos/grupo-upax-blanco.png"
            alt="Grupo UPAX"
            width={639}
            height={164}
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

      {/* 2 · EL BIMESTRE EN CUATRO CIFRAS */}
      <section data-layout="cifras" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>El bimestre</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Cuatro cifras</h2>
          <div className={estilos.cifras}>
            <article className={`${estilos.cifra} ${estilos.aparece}`} style={orden(2)}>
              <CifraAnimada valor={ganado() / 1000} prefijo="$" sufijo=" mil" className={estilos.cifraValor} />
              <p className={estilos.cifraRotulo}>primer negocio ganado, por facturar</p>
            </article>
            <article className={`${estilos.cifra} ${estilos.aparece}`} style={orden(3)}>
              <CifraAnimada valor={abierto / 1_000_000} decimales={1} prefijo="$" sufijo=" M" className={estilos.cifraValor} />
              <p className={estilos.cifraRotulo}>en {abiertas} oportunidades abiertas</p>
            </article>
            <article className={`${estilos.cifra} ${estilos.aparece}`} style={orden(4)}>
              <CifraAnimada valor={REUNIONES.realizadas} className={estilos.cifraValor} />
              <p className={estilos.cifraRotulo}>reuniones realizadas, de {REUNIONES.periodo}</p>
            </article>
            <article className={`${estilos.cifra} ${estilos.aparece}`} style={orden(5)}>
              <CifraAnimada valor={INSTITUTOS.length} className={estilos.cifraValor} />
              <p className={estilos.cifraRotulo}>institutos electorales estatales ya nos conocen</p>
            </article>
          </div>
        </Escena>
        <Pie>HubSpot y equipo de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 3 · EL PRIMER NEGOCIO GANADO */}
      <section data-layout="ganado" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.foco}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Primer cierre de la vertical</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Ya tenemos el primer negocio ganado</h2>
          <CifraAnimada
            valor={ganado() / 1000}
            prefijo="$"
            sufijo=" mil"
            className={`${estilos.cifraGigante} ${estilos.degradado} ${estilos.aparece}`}
          />
          {primerGanado && (
            <div className={`${estilos.fichaGanado} ${estilos.aparece}`} style={orden(3)}>
              <p className={estilos.fichaCliente}>{primerGanado.cliente}</p>
              <p className={estilos.fichaDetalle}>{primerGanado.detalle}</p>
              <p className={estilos.fichaDetalle}>
                {ETIQUETA_ETAPA[primerGanado.etapa]} · lo ejecuta {Object.keys(primerGanado.montos).join(', ')}
              </p>
            </div>
          )}
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 4 · EL EMBUDO */}
      <section data-layout="embudo" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Embudo</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
            De {pasos[0].valor} reuniones salieron {pasos[1].valor} oportunidades
          </h2>
          <ol className={estilos.embudo}>
            {pasos.map((paso, i) => (
              <li key={paso.etapa} className={estilos.pasoEmbudo} style={orden(i + 2)}>
                <span className={estilos.pasoNombre}>{paso.etapa}</span>
                <span className={estilos.pasoCarril}>
                  <span
                    className={estilos.pasoBarra}
                    style={{ ...orden(i + 2), '--ancho': `${Math.max(12, (paso.valor / maximoPaso) * 100)}%` } as CSSProperties}
                  />
                </span>
                <CifraAnimada valor={paso.valor} className={estilos.pasoValor} />
              </li>
            ))}
          </ol>
          <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(7)}>
            Las reuniones: {REUNIONES.credenciales} de credenciales y {REUNIONES.acercamiento} de acercamiento, de {REUNIONES.periodo}.
          </p>
        </Escena>
        <Pie>Reuniones: HubSpot, realizadas por BD Político · oportunidades: deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 5 · EL PIPELINE POR UDN */}
      <section data-layout="pipeline" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Pipeline abierto</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
            <CifraAnimada valor={abierto / 1_000_000} decimales={1} prefijo="$" sufijo=" M" /> en propuestas, repartidos en {porUdn.length} UDN
          </h2>
          <ul className={estilos.udns}>
            {porUdn.map((fila, i) => {
              const logo = LOGO_UDN[fila.udn]
              return (
                <li key={fila.udn} className={estilos.udn} style={orden(i + 2)}>
                  <span className={estilos.udnMarca}>
                    {logo ? (
                      <Image src={logo.src} alt={fila.udn} width={logo.ancho} height={164} className={estilos.udnLogo} />
                    ) : (
                      fila.udn
                    )}
                  </span>
                  <span className={estilos.udnCarril}>
                    <span
                      className={estilos.udnBarra}
                      style={{ ...orden(i + 2), '--ancho': `${(fila.monto / maximoUdn) * 100}%` } as CSSProperties}
                    />
                  </span>
                  <span className={estilos.udnMonto}>{PESOS.format(fila.monto)}</span>
                </li>
              )
            })}
          </ul>
          <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(7)}>
            House of Films y NeraCode ya participan en oportunidades que todavía no tienen monto.
          </p>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 6 · LAS OPORTUNIDADES */}
      <section data-layout="oportunidades" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Tabla de oportunidades</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
            Las {OPORTUNIDADES.length} oportunidades, una por una
          </h2>
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
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 7 · LOS INSTITUTOS ELECTORALES */}
      <section data-layout="institutos" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Organismos electorales</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
            {INSTITUTOS.length} institutos electorales ya nos conocen
          </h2>
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
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 8 · PARTIDOS Y CANDIDATOS */}
      <section data-layout="partidos" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Partidos y candidatos</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Lo que está en conversación</h2>
          <div className={estilos.conversaciones}>
            {CONVERSACIONES.map((c, i) => (
              <article key={`${c.quien}-${c.titulo}`} className={`${estilos.conversacion} ${estilos.aparece}`} style={orden(i + 2)}>
                <span className={estilos.partido}>{c.quien}</span>
                <h3 className={estilos.conversacionTitulo}>{c.titulo}</h3>
                <p className={estilos.conversacionDetalle}>{c.detalle}</p>
              </article>
            ))}
          </div>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>

      {/* 9 · INBOUND */}
      <section data-layout="inbound" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Inbound</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
            La landing multiplicó por {multiplo} sus visitas en agosto
          </h2>
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
        </Escena>
        <Pie>GA4, sesiones en politico.upax.com.mx y lecturas del blog · *septiembre al día 28</Pie>
      </section>

      {/* 10 · LO QUE SIGUE */}
      <section data-layout="siguientes" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <div className={estilos.orbes} aria-hidden="true">
          <span className={estilos.orbe} />
          <span className={estilos.orbe} />
        </div>
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Próximos pasos</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>Lo que sigue</h2>
          <ol className={estilos.linea}>
            {SIGUIENTES.map((s, i) => (
              <li key={`${s.cuando}-${i}`} className={`${estilos.hito} ${estilos.aparece}`} style={orden(i + 2)}>
                <span className={estilos.hitoCuando}>{s.cuando}</span>
                <span className={estilos.hitoQue}>{s.que}</span>
              </li>
            ))}
          </ol>
        </Escena>
        <Pie>Deck de BD Político · corte al {CORTE}</Pie>
      </section>
    </div>
  )
}
