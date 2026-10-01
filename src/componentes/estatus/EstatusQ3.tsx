import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import estilos from './estatus.module.css'
import { Escena } from '@/componentes/politico/Escena'
import { CifraAnimada } from '@/componentes/politico/CifraAnimada'
import {
  ARTEFACTOS,
  CONVERSIONES,
  CORTE,
  CORTO,
  COLUMNAS_MATERIALES,
  DESTACADAS,
  EQUIPO,
  ESTADO_MATERIAL,
  ETAPAS,
  EVENTOS,
  FACTURADO_POR_UDN,
  FACTURADO_Q3,
  FUNNEL,
  GANADAS,
  INNER_CIRCLE,
  INSIGHTS_PAID,
  INSIGHTS_REDES,
  INSIGHTS_WEB,
  KAITAI_OTRAS_EMPRESAS,
  KAITAI_SECTORES,
  LANZAMIENTO_RL_IA,
  MATERIALES,
  META_FACTURADO_Q3,
  PAID,
  PIPELINE,
  PIPELINE_ETAPAS,
  PIPELINE_UDN,
  PR,
  REDES,
  REFERENCIA,
  ROADMAP,
  UDNS_FUNNEL,
  UPAX_ONE,
  WEB,
  cuentaMateriales,
  cumplimientoFacturacion,
  ejecutivosConfirmados,
  empresasGanadas,
  marcasDestacadas,
  notasEnMedios,
  personasDe,
  suma,
  tasa,
  totalEtapa,
  totalGanado,
  type EstadoMaterial,
  type Evento,
} from '@/estatus/q3-2026'

/**
 * EL ESTATUS DE MARKETING CORPORATIVO, Q3 2026, COMO PRESENTACIÓN WEB.
 *
 * La agenda y el contenido los definió el equipo (pizarrón del 29-sep y su
 * borrador del 1-oct); esta pestaña los produce. Cada `<section data-layout>`
 * es una pantalla: se lee con scroll y, dentro de `ModoPresentar`, se proyecta
 * una a la vez a pantalla completa, igual que /politico.
 *
 * Ningún número se escribe aquí: todo sale de `src/estatus/q3-2026.ts`, donde
 * lo derivado (totales, conversiones) se calcula y se prueba.
 */

const PESOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const ENTERO = new Intl.NumberFormat('es-MX')
const PCT = (n: number, d = 1) => `${(n * 100).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
const MILLONES = (n: number, d = 2) => `$${(n / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })} M`
/** Montos de tabla: millones con dos decimales; abajo del millón, en miles. */
const MONTO = (n: number) => (n === 0 ? '$0' : n >= 1_000_000 ? MILLONES(n) : `$${Math.round(n / 1000).toLocaleString('es-MX')} mil`)

const orden = (i: number) => ({ '--i': i }) as CSSProperties

function Pie({ children }: { children: ReactNode }) {
  return <p className={estilos.pie}>{children}</p>
}

function Orbes({ n = 3 }: { n?: number }) {
  return (
    <div className={estilos.orbes} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={estilos.orbe} />
      ))}
    </div>
  )
}

function Cabecera({ ante, children }: { ante: string; children: ReactNode }) {
  return (
    <header className={estilos.cabecera}>
      <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>{ante}</p>
      <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>{children}</h2>
    </header>
  )
}

/** Una pantalla de evento: key visual, datos, sede y los testigos materiales. */
function PantallaEvento({ evento }: { evento: Evento }) {
  return (
    <section data-layout={`evento-${evento.id}`} className={`${estilos.pantalla} ${estilos.oscura}`}>
      <Orbes n={2} />
      <Escena className={estilos.escena}>
        <Cabecera ante={`Upax Fire Experience · ${evento.presentan.join(' + ')}`}>{evento.nombre}</Cabecera>
        <div className={`${estilos.cuerpo} ${estilos.evento}`}>
          <div className={estilos.eventoVisual}>
            {evento.keyVisual ? (
              <Image
                src={evento.keyVisual.src}
                alt={evento.keyVisual.alt}
                width={evento.keyVisual.ancho}
                height={evento.keyVisual.alto}
                className={`${estilos.kv} ${estilos.aparece}`}
                style={orden(2)}
                unoptimized loading="eager"
              />
            ) : (
              <div className={`${estilos.kvTexto} ${estilos.aparece}`} style={orden(2)}>
                <span className={estilos.degradado}>{evento.nombre}</span>
              </div>
            )}
            <div className={estilos.fotos}>
              {evento.fotos.map((f, i) => (
                <Image
                  key={f.src}
                  src={f.src}
                  alt={f.alt}
                  width={f.ancho}
                  height={f.alto}
                  className={`${estilos.foto} ${estilos.aparece}`}
                  style={orden(i + 3)}
                  unoptimized loading="eager"
                />
              ))}
            </div>
          </div>
          <div className={estilos.eventoDatos}>
            <dl className={`${estilos.ficha} ${estilos.aparece}`} style={orden(3)}>
              <div>
                <dt>Cuándo</dt>
                <dd>{evento.fecha} · {evento.hora}</dd>
              </div>
              <div>
                <dt>Dónde</dt>
                <dd>{evento.sede} · {evento.direccion}</dd>
              </div>
            </dl>
            <p className={`${estilos.resumen} ${estilos.aparece}`} style={orden(4)}>{evento.resumen}</p>
            <p className={`${estilos.rotuloMateriales} ${estilos.aparece}`} style={orden(5)}>Testigos materiales</p>
            <div className={estilos.materiales}>
              {evento.materiales.map((mat, i) => (
                <Image
                  key={mat.src}
                  src={mat.src}
                  alt={mat.alt}
                  width={mat.ancho}
                  height={mat.alto}
                  className={`${estilos.material} ${estilos.aparece}`}
                  style={orden(i + 6)}
                  unoptimized loading="eager"
                />
              ))}
            </div>
          </div>
        </div>
      </Escena>
      <Pie>Resumen: David Porchini · testigos materiales: Iris Mugica y David Porchini</Pie>
    </section>
  )
}

const ETIQUETA_ETAPA_FUNNEL: Record<(typeof ETAPAS)[number], string> = {
  Contactos: 'Contactos',
  MQL: 'MQL',
  SQL: 'SQL',
  Propuestas: 'Propuestas',
  Ganados: 'Ganados',
}

export function EstatusQ3() {
  const maximoEtapa = totalEtapa('Contactos')
  const maximoUdn = Math.max(...PIPELINE_UDN.map((f) => f.monto))
  const maximoNotas = Math.max(...PR.porUdn.map((f) => f.notas))
  const cumplimiento = cumplimientoFacturacion()
  const sectoresKaitai = KAITAI_SECTORES

  return (
    <div className={estilos.documento}>
      {/* 1 · PORTADA */}
      <section data-layout="portada" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.portada}`}>
        <Orbes />
        <Escena className={estilos.escena}>
          <Image
            src="/logos/mkt-corp-grupo-upax-blanco-recortado.png"
            alt="Grupo UPAX y Marketing Corp"
            width={1600}
            height={244}
            className={`${estilos.logoPortada} ${estilos.aparece}`}
            style={orden(0)}
            priority
          />
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(1)}>Revisión Q3 2026</p>
          <h1 className={`${estilos.tituloPortada} ${estilos.aparece}`} style={orden(2)}>
            Estatus <span className={estilos.degradado}>Marketing Corporativo</span>
          </h1>
          <p className={`${estilos.subtituloPortada} ${estilos.aparece}`} style={orden(3)}>
            Julio, agosto y septiembre · Octubre 2026
          </p>
        </Escena>
      </section>

      {/* 2 · LOS TRES IGNITES */}
      <section data-layout="eventos" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Orbes n={2} />
        <Escena className={estilos.escena}>
          <Cabecera ante="Eventos · Upax Fire Experience">Tres experiencias, una por cada par de empresas</Cabecera>
          <div className={estilos.cuerpo}>
            <ol className={estilos.ignites}>
              {EVENTOS.map((ev, i) => (
                <li key={ev.id} className={`${estilos.ignite} ${estilos.aparece}`} style={orden(i + 2)}>
                  {ev.keyVisual ? (
                    <Image src={ev.keyVisual.src} alt="" width={ev.keyVisual.ancho} height={ev.keyVisual.alto} className={estilos.igniteImagen} unoptimized loading="eager" />
                  ) : (
                    <Image src={ev.fotos[0].src} alt="" width={ev.fotos[0].ancho} height={ev.fotos[0].alto} className={estilos.igniteImagen} unoptimized loading="eager" />
                  )}
                  <div className={estilos.igniteTexto}>
                    <span className={estilos.igniteFecha}>{ev.fecha.replace('Jueves ', '')}</span>
                    <h3 className={estilos.igniteNombre}>{ev.nombre}</h3>
                    <p className={estilos.igniteQuien}>{ev.presentan.join(' + ')}</p>
                    <p className={estilos.igniteSede}>{ev.sede}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Escena>
        <Pie>Upax Fire Experience · fechas y sedes confirmadas al {CORTE}</Pie>
      </section>

      {/* 3 · KAITAI */}
      <PantallaEvento evento={EVENTOS[0]} />

      {/* 4 · KAITAI: QUIÉNES YA DIJERON SÍ (diseño del equipo, en vivo) */}
      <section data-layout="kaitai-confirmados" className={`${estilos.pantalla} ${estilos.noche}`}>
        <Escena className={estilos.escena}>
          <header className={estilos.cabeceraConfirmados}>
            <div>
              <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Kaitai · asistentes confirmados</p>
              <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>
                Quiénes ya dijeron <span className={estilos.si}>sí</span>
              </h2>
            </div>
            <div className={estilos.tresCifras}>
              <p className={estilos.aparece} style={orden(2)}>
                <CifraAnimada valor={ejecutivosConfirmados()} className={estilos.cifraTreemap} />
                <span>Ejecutivos</span>
              </p>
              <p className={estilos.aparece} style={orden(3)}>
                <CifraAnimada valor={marcasDestacadas()} className={estilos.cifraTreemap} />
                <span>Marcas destacadas</span>
              </p>
              <p className={estilos.aparece} style={orden(4)}>
                <CifraAnimada valor={KAITAI_OTRAS_EMPRESAS} prefijo="+" className={estilos.cifraTreemap} />
                <span>De otras empresas</span>
              </p>
            </div>
          </header>
          <div className={estilos.treemap}>
            {sectoresKaitai.map((sector, s) => (
              <section
                key={sector.nombre}
                className={`${estilos.sector} ${estilos.aparece}`}
                data-color={sector.color}
                data-sector={sector.nombre}
                style={orden(s + 5)}
                aria-label={`${sector.nombre}: ${personasDe(sector)} confirmados`}
              >
                <h3 className={estilos.sectorNombre}>
                  {sector.nombre} <span>· {personasDe(sector)}</span>
                </h3>
                <ul className={estilos.sectorEmpresas}>
                  {sector.empresas.map((e, i) => (
                    <li key={e.empresa} className={estilos.tarjetaEmpresa} data-tono={i % 2 === 0 ? 'a' : 'b'} data-personas={e.cargos.length}>
                      <span className={estilos.tarjetaLogo}>
                        <Image src={e.logo} alt={e.empresa} width={260} height={120} className={estilos.logoEmpresa} unoptimized loading="eager" />
                      </span>
                      <ul className={estilos.cargos}>
                        {e.cargos.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Escena>
        <Pie>Lista de confirmados de Kaitai · David Porchini</Pie>
      </section>

      {/* 5 · MIRACLE SIGNAL */}
      <PantallaEvento evento={EVENTOS[1]} />

      {/* 6 · SOLEDAD */}
      <PantallaEvento evento={EVENTOS[2]} />

      {/* 7 · EL FUNNEL */}
      <section data-layout="funnel" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Funnel de generación de demanda · julio a septiembre">
            {ENTERO.format(totalEtapa('MQL'))} MQL, {totalEtapa('SQL')} SQL y {totalEtapa('Ganados')} negocios ganados
          </Cabecera>
          <div className={estilos.cuerpo}>
            <ol className={estilos.funnel}>
              {ETAPAS.map((etapa, i) => {
                const conversion = CONVERSIONES.find((c) => c.a === etapa)
                return (
                  <li key={etapa} className={`${estilos.etapaFunnel} ${estilos.aparece}`} style={orden(i + 2)}>
                    <span className={estilos.etapaNombre}>{ETIQUETA_ETAPA_FUNNEL[etapa]}</span>
                    {/* La conversión va PEGADA a su barra, no en una columna al fondo:
                        con barras cortas quedaba a media pantalla de distancia. */}
                    <span className={estilos.etapaCarril}>
                      <span
                        className={estilos.etapaBarra}
                        style={{ ...orden(i + 2), '--ancho': `${Math.max(9, Math.sqrt(totalEtapa(etapa) / maximoEtapa) * 100)}%` } as CSSProperties}
                      >
                        <CifraAnimada valor={totalEtapa(etapa)} className={estilos.etapaValor} />
                      </span>
                      {conversion && (
                        <span className={estilos.etapaConversion}>
                          {`${PCT(tasa(conversion.de, conversion.a))} desde ${conversion.de === 'Contactos' ? 'contactos' : conversion.de === 'MQL' ? 'MQL' : 'propuestas'}`}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
            <div className={`${estilos.tablaFunnel} ${estilos.aparece}`} style={orden(8)} role="table" aria-label="Funnel por empresa">
              <div className={`${estilos.filaFunnel} ${estilos.cabeceraTabla}`} role="row">
                <span role="columnheader" />
                {UDNS_FUNNEL.map((u) => (
                  <span key={u} role="columnheader" className={estilos.derecha} title={u}>{CORTO[u]}</span>
                ))}
                <span role="columnheader" className={estilos.derecha}>Total</span>
              </div>
              {ETAPAS.map((etapa) => (
                <div key={etapa} className={estilos.filaFunnel} role="row">
                  <span role="rowheader" className={estilos.celdaEtapa}>{etapa}</span>
                  {UDNS_FUNNEL.map((u) => (
                    <span key={u} role="cell" className={estilos.derecha}>{ENTERO.format(FUNNEL[u][etapa])}</span>
                  ))}
                  <span role="cell" className={`${estilos.derecha} ${estilos.totalCelda}`}>{ENTERO.format(totalEtapa(etapa))}</span>
                </div>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>HubSpot, por empresa · César Mejía · corte al {CORTE}</Pie>
      </section>

      {/* 8 · LO QUE DICE EL FUNNEL (insights de Ileana) */}
      <section data-layout="funnel-insights" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Orbes n={2} />
        <Escena className={estilos.escena}>
          <Cabecera ante="Funnel · lo que dice el trimestre">Facturamos {MILLONES(FACTURADO_Q3)} de negocios del funnel</Cabecera>
          <div className={estilos.cuerpo}>
            <div className={estilos.insights}>
              <article className={`${estilos.insight} ${estilos.aparece}`} style={orden(2)}>
                <CifraAnimada valor={cumplimiento * 100} decimales={1} sufijo="%" className={estilos.insightCifra} />
                <p className={estilos.insightTexto}>
                  de la meta de venta externa de las siete empresas en el trimestre ({MILLONES(META_FACTURADO_Q3, 1)}, Forecast 2026).
                  La meta es toda la venta, no solo la que nace en Marketing: la brecha está entre el pipeline que generamos y lo que se monetiza.
                </p>
              </article>
              <article className={`${estilos.insight} ${estilos.aparece}`} style={orden(3)}>
                <CifraAnimada valor={tasa('MQL', 'SQL') * 100} decimales={1} sufijo="%" className={estilos.insightCifra} />
                <p className={estilos.insightTexto}>
                  de MQL a SQL, cerca del {PCT(REFERENCIA.mqlASql, 0)} proyectado. La oportunidad está en las etapas comerciales: de propuesta a negocio ganado,{' '}
                  {PCT(tasa('Propuestas', 'Ganados'))} contra {PCT(REFERENCIA.oportunidadACliente, 0)} objetivo.
                </p>
              </article>
              <article className={`${estilos.insight} ${estilos.aparece}`} style={orden(4)}>
                <CifraAnimada valor={(FACTURADO_POR_UDN.reduce((n, f) => n + f.monto, 0) / FACTURADO_Q3) * 100} sufijo="%" className={estilos.insightCifra} />
                <p className={estilos.insightTexto}>
                  de lo facturado vino de {FACTURADO_POR_UDN.map((f) => `${f.udn} (${MILLONES(f.monto)})`).join(' y ')}.
                </p>
              </article>
            </div>
          </div>
        </Escena>
        <Pie>Insights: Ileana Cruz · meta: Forecast 2026, venta externa de julio a septiembre de las siete empresas</Pie>
      </section>

      {/* 9 · EMPRESAS DESTACADAS */}
      <section data-layout="destacadas" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Funnel · empresas destacadas">Con quién estamos hablando</Cabecera>
          <div className={estilos.cuerpo}>
            <ul className={estilos.muroLogos}>
              {DESTACADAS.map((d, i) => (
                <li key={d.empresa} className={`${estilos.celdaLogo} ${estilos.aparece}`} style={orden(i % 8 + 2)}>
                  <Image src={d.logo} alt={d.empresa} width={260} height={150} className={estilos.logoMuro} unoptimized loading="eager" />
                </li>
              ))}
            </ul>
          </div>
        </Escena>
        <Pie>Empresas destacadas del funnel del trimestre · Ileana Cruz</Pie>
      </section>

      {/* 10 · PROPUESTAS GANADAS */}
      <section data-layout="ganadas" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Venta · propuestas ganadas en el trimestre">
            {GANADAS.length} negocios ganados con {empresasGanadas()} empresas, por {MILLONES(totalGanado())}
          </Cabecera>
          <div className={estilos.cuerpo}>
            <div className={estilos.tablaGanadas} role="table" aria-label="Propuestas ganadas en el trimestre">
              {GANADAS.map((g, i) => (
                <div key={`${g.empresa}-${i}`} className={`${estilos.filaGanada} ${estilos.aparece}`} style={orden(Math.min(i, 12) + 2)} role="row">
                  <span role="cell" className={estilos.ganadaEmpresa}>{g.empresa}</span>
                  <span role="cell"><span className={estilos.pastilla} title={g.udn}>{CORTO[g.udn]}</span></span>
                  <span role="cell"><span className={estilos.etapaNegocio} data-etapa={g.etapa === 'Facturado' ? 'facturado' : 'ganado'}>{g.etapa}</span></span>
                  <span role="cell" className={estilos.derecha}>{PESOS.format(g.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>Orbit · negocios en Ganado (por facturar) y Facturado del trimestre · César Mejía</Pie>
      </section>

      {/* 11 · PIPELINE ACTIVO */}
      <section data-layout="pipeline" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Orbes n={2} />
        <Escena className={estilos.escena}>
          <Cabecera ante="Pipeline activo · negocios abiertos">
            <CifraAnimada valor={PIPELINE.total / 1_000_000} decimales={2} prefijo="$" sufijo=" M" className={estilos.degradado} /> en {PIPELINE.negocios} negocios abiertos
          </Cabecera>
          <div className={`${estilos.cuerpo} ${estilos.pipeline}`}>
            <div>
              <p className={`${estilos.rotuloBloque} ${estilos.aparece}`} style={orden(2)}>Por etapa</p>
              <ul className={estilos.barras}>
                {PIPELINE_ETAPAS.map((e, i) => (
                  <li key={e.etapa} className={`${estilos.barraFila} ${estilos.aparece}`} style={orden(i + 3)}>
                    <span className={estilos.barraNombre}>{e.etapa} <small>{e.negocios} negocios</small></span>
                    <span className={estilos.barraCarril}>
                      <span className={estilos.barra} style={{ ...orden(i + 3), '--ancho': `${Math.max(1.5, (e.monto / PIPELINE.total) * 100)}%` } as CSSProperties} />
                    </span>
                    <span className={estilos.barraMonto}>{MONTO(e.monto)}</span>
                  </li>
                ))}
              </ul>
              <p className={`${estilos.notaClara} ${estilos.aparece}`} style={orden(7)}>
                Ticket promedio: {PESOS.format(PIPELINE.ticketPromedio)}
              </p>
            </div>
            <div>
              <p className={`${estilos.rotuloBloque} ${estilos.aparece}`} style={orden(2)}>Por empresa</p>
              <ul className={estilos.barras}>
                {PIPELINE_UDN.map((f, i) => (
                  <li key={f.udn} className={`${estilos.barraFila} ${estilos.aparece}`} style={orden(i + 3)}>
                    <span className={estilos.barraNombre}>{f.udn} <small>{f.negocios}</small></span>
                    <span className={estilos.barraCarril}>
                      <span className={estilos.barra} style={{ ...orden(i + 3), '--ancho': `${Math.max(1.5, (f.monto / maximoUdn) * 100)}%` } as CSSProperties} />
                    </span>
                    <span className={estilos.barraMonto}>{MONTO(f.monto)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Escena>
        <Pie>Orbit, vista MBR · negocios abiertos al {CORTE} · César Mejía</Pie>
      </section>

      {/* 12 · PR */}
      <section data-layout="pr" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="PR · general y por empresa">
            {notasEnMedios()} notas en medios de comunicación
          </Cabecera>
          <div className={`${estilos.cuerpo} ${estilos.pr}`}>
            <div className={estilos.prCifras}>
              <article className={`${estilos.cifraClara} ${estilos.aparece}`} style={orden(2)}>
                <CifraAnimada valor={notasEnMedios()} className={estilos.cifraValor} />
                <p className={estilos.cifraRotulo}>notas en medios</p>
              </article>
              <article className={`${estilos.cifraClara} ${estilos.aparece}`} style={orden(3)}>
                <CifraAnimada valor={PR.alcance / 1_000_000} sufijo=" M" className={estilos.cifraValor} />
                <p className={estilos.cifraRotulo}>de alcance estimado</p>
              </article>
              <article className={`${estilos.cifraClara} ${estilos.aparece}`} style={orden(4)}>
                <CifraAnimada valor={PR.valorPublicitario / 1_000_000} decimales={1} prefijo="+$" sufijo=" MDP" className={estilos.cifraValor} />
                <p className={estilos.cifraRotulo}>de valor publicitario equivalente</p>
              </article>
            </div>
            <div className={estilos.prDetalle}>
              <ul className={estilos.barrasClaras} aria-label="Notas por empresa">
                {PR.porUdn.map((f, i) => (
                  <li key={f.udn} className={`${estilos.barraFila} ${estilos.aparece}`} style={orden(i + 5)}>
                    <span className={estilos.barraNombre}>{f.udn}</span>
                    <span className={estilos.barraCarril}>
                      <span className={estilos.barra} style={{ ...orden(i + 5), '--ancho': `${Math.max(1.5, (f.notas / maximoNotas) * 100)}%` } as CSSProperties} />
                    </span>
                    <span className={estilos.barraMonto}>{f.notas}</span>
                  </li>
                ))}
              </ul>
              <ul className={estilos.medios} aria-label="Medios donde salimos">
                {PR.medios.map((m, i) => (
                  <li key={m.medio} className={estilos.aparece} style={orden(i + 5)}>
                    <Image src={m.logo} alt={m.medio} width={220} height={60} className={estilos.logoMedio} unoptimized loading="eager" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Escena>
        <Pie>Monitoreo de medios del trimestre · Carolina Rojas</Pie>
      </section>

      {/* 13 · ARTEFACTOS */}
      <section data-layout="artefactos" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Orbes n={2} />
        <Escena className={estilos.escena}>
          <Cabecera ante="Artefactos">Herramientas que hicimos para vender mejor</Cabecera>
          <div className={estilos.cuerpo}>
            <div className={estilos.artefactos}>
              {ARTEFACTOS.map((a, i) => (
                <article key={a.nombre} className={`${estilos.artefacto} ${estilos.aparece}`} style={orden(i + 2)}>
                  <span className={estilos.artefactoDe}>{a.de}</span>
                  <h3 className={estilos.artefactoNombre}>{a.nombre}</h3>
                  <p className={estilos.artefactoTexto}>{a.descripcion}</p>
                </article>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>César Mejía e Iris Mugica</Pie>
      </section>

      {/* 14 · Q4: INNER CIRCLE */}
      <section data-layout="inner-circle" className={`${estilos.pantalla} ${estilos.oscura}`}>
        <Orbes n={2} />
        <Escena className={estilos.escena}>
          <Cabecera ante="Qué haremos en Q4">UPAX Inner Circle</Cabecera>
          <div className={`${estilos.cuerpo} ${estilos.dosColumnas}`}>
            <div className={estilos.textoLargo}>
              <p className={`${estilos.destacado} ${estilos.aparece}`} style={orden(2)}>{INNER_CIRCLE.definicion}</p>
              <p className={estilos.aparece} style={orden(3)}>{INNER_CIRCLE.beneficio}</p>
              <p className={estilos.aparece} style={orden(4)}>{INNER_CIRCLE.noEs}</p>
              <p className={`${estilos.remate} ${estilos.aparece}`} style={orden(5)}>{INNER_CIRCLE.remate}</p>
            </div>
            <figure className={`${estilos.figura} ${estilos.aparece}`} style={orden(3)}>
              <Image src="/estatus-q3/inner-invitacion.webp" alt="Invitación a UPAX Inner Circle" width={1600} height={900} className={estilos.imagenRedonda} unoptimized loading="eager" />
              <figcaption>La invitación a Inner Circle</figcaption>
            </figure>
          </div>
        </Escena>
        <Pie>David Porchini</Pie>
      </section>

      {/* 15 · Q4: QUÉ RECIBEN LOS MIEMBROS */}
      <section data-layout="inner-circle-contenidos" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Inner Circle · contenido de valor para miembros">Lo que pone cada empresa sobre la mesa</Cabecera>
          <div className={estilos.cuerpo}>
            <div className={estilos.contenidos}>
              {INNER_CIRCLE.contenidos.map((c, i) => (
                <article key={c.udn} className={`${estilos.contenido} ${estilos.aparece}`} style={orden(i + 2)}>
                  <h3 className={estilos.contenidoUdn}>{c.udn}</h3>
                  <ol className={estilos.contenidoIdeas}>
                    {c.ideas.map((idea) => (
                      <li key={idea}>{idea}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>David Porchini</Pie>
      </section>

      {/* 16 · Q4: UPAX ONE */}
      <section data-layout="upax-one" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.upaxOne}`}>
        {/* De fondo, el salón desenfocado; el túnel va al frente porque trae su propio
            texto (el render del equipo describe la experiencia) y de fondo se leía a medias. */}
        <Image src="/estatus-q3/upax-one-salon.webp" alt="" fill sizes="100vw" className={estilos.fondoRender} unoptimized loading="eager" />
        <Escena className={estilos.escena}>
          <Cabecera ante="Qué haremos en Q4">UPAX ONE: la convergencia de lo construido</Cabecera>
          <div className={`${estilos.cuerpo} ${estilos.dosColumnas}`}>
            <div className={estilos.textoLargo}>
              <p className={`${estilos.destacado} ${estilos.aparece}`} style={orden(2)}>{UPAX_ONE.nace}</p>
              <p className={estilos.aparece} style={orden(3)}>{UPAX_ONE.convergencia}</p>
            </div>
            <figure className={`${estilos.figura} ${estilos.aparece}`} style={orden(4)}>
              <Image src="/estatus-q3/upax-one-tunel.webp" alt="Render de UPAX ONE: el túnel inmersivo" width={1920} height={1089} className={estilos.imagenRedonda} unoptimized loading="eager" />
              <figcaption>Render del encuentro: el túnel inmersivo</figcaption>
            </figure>
          </div>
        </Escena>
        <Pie>David Porchini</Pie>
      </section>

      {/* 17 · Q4: LANZAMIENTO RL + IA */}
      <section data-layout="lanzamiento-rl-ia" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Qué haremos en Q4">Lanzamiento de Research Land + IA</Cabecera>
          <div className={estilos.cuerpo}>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(2)}>Producción de materiales y estrategia de comunicación</p>
            <ol className={estilos.entregables}>
              {LANZAMIENTO_RL_IA.map((e, i) => (
                <li key={e} className={`${estilos.entregable} ${estilos.aparece}`} style={orden(i + 3)}>
                  <span className={estilos.entregableNumero}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{e}</span>
                </li>
              ))}
            </ol>
          </div>
        </Escena>
        <Pie>David Porchini</Pie>
      </section>

      {/* 18 · Q4: ROADMAP ALWAYS ON */}
      <section data-layout="roadmap" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Qué haremos en Q4 · always on">Roadmap de octubre a diciembre</Cabecera>
          <div className={estilos.cuerpo}>
            <div className={`${estilos.roadmap} ${estilos.aparece}`} style={orden(2)}>
              <span />
              {['Octubre', 'Noviembre', 'Diciembre'].map((mes) => (
                <span key={mes} className={estilos.mes}>{mes}</span>
              ))}
              {ROADMAP.map((carril) => (
                <div key={carril.carril} className={estilos.carril} data-carril={carril.carril === 'PR y medios' ? 'pr' : 'contenidos'}>
                  <span className={estilos.carrilNombre}>{carril.carril}</span>
                  <div className={estilos.carrilAcciones}>
                    {carril.acciones.map((a) => (
                      <span
                        key={`${a.tema}-${a.quien}`}
                        className={estilos.accion}
                        style={{ gridColumn: `${a.desde} / ${a.hasta + 1}` }}
                      >
                        <strong>{a.tema}</strong>
                        <small>{a.quien}</small>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>Iris Mugica y Carolina Rojas</Pie>
      </section>

      {/* 19 · ANEXOS */}
      <section data-layout="anexos" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.portada}`}>
        <Orbes n={2} />
        <Escena className={estilos.escena}>
          <p className={`${estilos.antetitulo} ${estilos.aparece}`} style={orden(0)}>Para consulta</p>
          <h2 className={`${estilos.tituloPortada} ${estilos.aparece}`} style={orden(1)}>
            <span className={estilos.degradado}>Anexos</span>
          </h2>
          <p className={`${estilos.subtituloPortada} ${estilos.aparece}`} style={orden(2)}>
            Materiales de venta · presencia digital · equipo
          </p>
        </Escena>
      </section>

      {/* 20 · ANEXO: MATERIALES DE VENTA */}
      <section data-layout="materiales" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Anexo · estatus de materiales de venta">
            {cuentaMateriales('hecho')} de {MATERIALES.length * COLUMNAS_MATERIALES.length} materiales, hechos y aprobados
          </Cabecera>
          <div className={estilos.cuerpo}>
            <div className={`${estilos.matriz} ${estilos.aparece}`} style={orden(2)} role="table" aria-label="Estatus de materiales de venta por empresa">
              <div className={estilos.filaMatriz} role="row">
                <span role="columnheader" />
                {COLUMNAS_MATERIALES.map((u) => (
                  <span key={u} role="columnheader" className={estilos.columnaMatriz} title={u}>{CORTO[u]}</span>
                ))}
              </div>
              {MATERIALES.map((f) => (
                <div key={f.material} className={estilos.filaMatriz} role="row">
                  <span role="rowheader" className={estilos.nombreMaterial}>{f.material}</span>
                  {f.estados.map((e, i) => (
                    <span
                      key={COLUMNAS_MATERIALES[i]}
                      role="cell"
                      className={estilos.celdaMatriz}
                      data-estado={e}
                      title={`${COLUMNAS_MATERIALES[i]}: ${ESTADO_MATERIAL[e]}`}
                      aria-label={`${COLUMNAS_MATERIALES[i]}: ${ESTADO_MATERIAL[e]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <ul className={`${estilos.leyenda} ${estilos.aparece}`} style={orden(3)}>
              {(['hecho', 'aprobacion', 'modificacion', 'elaborar', 'noAplica'] as EstadoMaterial[]).map((e) => (
                <li key={e}>
                  <span className={estilos.celdaMatriz} data-estado={e} aria-hidden="true" />
                  {ESTADO_MATERIAL[e]} · {cuentaMateriales(e)}
                </li>
              ))}
            </ul>
          </div>
        </Escena>
        <Pie>Portafolio y Ecosistema · David Porchini</Pie>
      </section>

      {/* 21 · ANEXO: REDES Y PAID */}
      <section data-layout="digital-redes-paid" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Anexo · presencia digital Q3">Redes sociales y paid media</Cabecera>
          <div className={`${estilos.cuerpo} ${estilos.digital}`}>
            <div className={estilos.tablas}>
              <div className={`${estilos.tabla} ${estilos.aparece}`} style={orden(2)} role="table" aria-label="Redes sociales de Grupo UPAX">
                <div className={`${estilos.fila5} ${estilos.cabeceraTabla}`} role="row">
                  <span role="columnheader">Redes UPAX</span>
                  <span role="columnheader" className={estilos.derecha}>Seguidores</span>
                  <span role="columnheader" className={estilos.derecha}>Impresiones</span>
                  <span role="columnheader" className={estilos.derecha}>Interacciones</span>
                  <span role="columnheader" className={estilos.derecha}>Engagement</span>
                </div>
                {REDES.map((r) => (
                  <div key={r.red} className={estilos.fila5} role="row">
                    <span role="cell">{r.red}</span>
                    <span role="cell" className={estilos.derecha}>{ENTERO.format(r.seguidores)}</span>
                    <span role="cell" className={estilos.derecha}>{ENTERO.format(r.impresiones)}</span>
                    <span role="cell" className={estilos.derecha}>{ENTERO.format(r.interacciones)}</span>
                    <span role="cell" className={estilos.derecha}>{PCT(r.engagement, 2)}</span>
                  </div>
                ))}
              </div>
              <div className={`${estilos.tabla} ${estilos.aparece}`} style={orden(3)} role="table" aria-label="Paid media por empresa">
                <div className={`${estilos.fila6} ${estilos.cabeceraTabla}`} role="row">
                  <span role="columnheader">Paid media</span>
                  <span role="columnheader" className={estilos.derecha}>MQL</span>
                  <span role="columnheader" className={estilos.derecha}>Costo por MQL</span>
                  <span role="columnheader" className={estilos.derecha}>SQL</span>
                  <span role="columnheader" className={estilos.derecha}>Pipeline</span>
                  <span role="columnheader" className={estilos.derecha}>Facturado + por facturar</span>
                </div>
                {PAID.map((p) => (
                  <div key={p.udn} className={estilos.fila6} role="row">
                    <span role="cell">{p.udn}</span>
                    <span role="cell" className={estilos.derecha}>{p.mql ?? '—'}</span>
                    <span role="cell" className={estilos.derecha}>{p.costoMql === null ? '—' : PESOS.format(p.costoMql)}</span>
                    <span role="cell" className={estilos.derecha}>{p.sql ?? '—'}</span>
                    <span role="cell" className={estilos.derecha}>{MONTO(p.pipeline)}</span>
                    <span role="cell" className={estilos.derecha}>{MONTO(p.facturado)}</span>
                  </div>
                ))}
                <div className={`${estilos.fila6} ${estilos.totalTabla}`} role="row">
                  <span role="cell">Total</span>
                  <span role="cell" className={estilos.derecha}>{suma(PAID, (p) => p.mql)}</span>
                  <span role="cell" />
                  <span role="cell" className={estilos.derecha}>{suma(PAID, (p) => p.sql)}</span>
                  <span role="cell" className={estilos.derecha}>{MONTO(suma(PAID, (p) => p.pipeline))}</span>
                  <span role="cell" className={estilos.derecha}>{MONTO(suma(PAID, (p) => p.facturado))}</span>
                </div>
              </div>
            </div>
            <div className={estilos.insightsLaterales}>
              {[...INSIGHTS_PAID, ...INSIGHTS_REDES].map((t, i) => (
                <p key={t} className={`${estilos.insightLateral} ${estilos.aparece}`} style={orden(i + 4)}>{t}</p>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>Paid media y redes: squad de Paid y RRSS · Fernando Borges</Pie>
      </section>

      {/* 22 · ANEXO: SITIOS WEB */}
      <section data-layout="digital-web" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Anexo · presencia digital Q3">Sitios web, inbound y visitas desde IA</Cabecera>
          <div className={`${estilos.cuerpo} ${estilos.digital}`}>
            <div className={estilos.tablas}>
              <div className={`${estilos.tabla} ${estilos.aparece}`} style={orden(2)} role="table" aria-label="Sitios web por empresa">
                <div className={`${estilos.fila7} ${estilos.cabeceraTabla}`} role="row">
                  <span role="columnheader">Sitio</span>
                  <span role="columnheader" className={estilos.derecha}>Visitas</span>
                  <span role="columnheader">En Google*</span>
                  <span role="columnheader" className={estilos.derecha}>MQL</span>
                  <span role="columnheader" className={estilos.derecha}>SQL</span>
                  <span role="columnheader" className={estilos.derecha}>Pipeline vivo</span>
                  <span role="columnheader" className={estilos.derecha}>Facturado + por facturar</span>
                </div>
                {WEB.map((w) => (
                  <div key={w.udn} className={estilos.fila7} role="row">
                    <span role="cell">{w.udn}</span>
                    <span role="cell" className={estilos.derecha}>{ENTERO.format(w.visitas)}</span>
                    <span role="cell">{w.posicion}</span>
                    <span role="cell" className={estilos.derecha}>{w.mql}</span>
                    <span role="cell" className={estilos.derecha}>{w.sql}</span>
                    <span role="cell" className={estilos.derecha}>{MONTO(w.pipeline)}</span>
                    <span role="cell" className={estilos.derecha}>{MONTO(w.facturado)}</span>
                  </div>
                ))}
                <div className={`${estilos.fila7} ${estilos.totalTabla}`} role="row">
                  <span role="cell">Total Q3</span>
                  <span role="cell" className={estilos.derecha}>{ENTERO.format(suma(WEB, (w) => w.visitas))}</span>
                  <span role="cell" />
                  <span role="cell" className={estilos.derecha}>{suma(WEB, (w) => w.mql)}</span>
                  <span role="cell" className={estilos.derecha}>{suma(WEB, (w) => w.sql)}</span>
                  <span role="cell" className={estilos.derecha}>{MONTO(suma(WEB, (w) => w.pipeline))}</span>
                  <span role="cell" className={estilos.derecha}>{MONTO(suma(WEB, (w) => w.facturado))}</span>
                </div>
              </div>
              <p className={`${estilos.notaTabla} ${estilos.aparece}`} style={orden(3)}>
                *Página de Google en la que aparece, en promedio, el sitio de cada empresa cuando alguien busca los servicios que ofrece.
              </p>
            </div>
            <div className={estilos.insightsLaterales}>
              {INSIGHTS_WEB.map((t, i) => (
                <p key={t} className={`${estilos.insightLateral} ${estilos.aparece}`} style={orden(i + 4)}>{t}</p>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>Sitios, inbound y referidos de IA: squad de Web y Contenidos · Iris Mugica</Pie>
      </section>

      {/* 23 · ANEXO: EQUIPO */}
      <section data-layout="equipo" className={`${estilos.pantalla} ${estilos.clara}`}>
        <Escena className={estilos.escena}>
          <Cabecera ante="Anexo · equipo">Cuatro acciones ya en marcha</Cabecera>
          <div className={estilos.cuerpo}>
            <p className={`${estilos.nota} ${estilos.aparece}`} style={orden(2)}>{EQUIPO.intro}</p>
            <div className={estilos.acciones}>
              {EQUIPO.acciones.map((a, i) => (
                <article key={a.titulo} className={`${estilos.accionEquipo} ${estilos.aparece}`} style={orden(i + 3)}>
                  <span className={estilos.accionEje}>{a.eje}</span>
                  <h3 className={estilos.accionTitulo}>{a.titulo}</h3>
                  <p className={estilos.accionTexto}>{a.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </Escena>
        <Pie>Marketing Corporativo</Pie>
      </section>

      {/* 24 · GRACIAS */}
      <section data-layout="gracias" className={`${estilos.pantalla} ${estilos.oscura} ${estilos.portada}`}>
        <Orbes />
        <Escena className={estilos.escena}>
          <h2 className={`${estilos.tituloPortada} ${estilos.aparece}`} style={orden(0)}>
            <span className={estilos.degradado}>¡Gracias!</span>
          </h2>
          <p className={`${estilos.subtituloPortada} ${estilos.aparece}`} style={orden(1)}>Estatus Marketing Corporativo · Octubre 2026</p>
          <Image
            src="/logos/mkt-corp-grupo-upax-blanco-recortado.png"
            alt="Grupo UPAX y Marketing Corp"
            width={1600}
            height={244}
            className={`${estilos.logoCierre} ${estilos.aparece}`}
            style={orden(2)}
            loading="eager"
          />
        </Escena>
      </section>
    </div>
  )
}
