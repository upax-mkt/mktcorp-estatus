import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import estilos from './estatus.module.css'
import { Escena } from '@/componentes/politico/Escena'
import { CifraAnimada } from '@/componentes/politico/CifraAnimada'
import {
  ARTEFACTOS,
  CORTO,
  COLUMNAS_MATERIALES,
  DESTACADAS,
  EQUIPO,
  ESTADO_MATERIAL,
  EVENTOS,
  FACTURADO_POR_UDN,
  FACTURADO_Q3,
  FUNNEL,
  GANADAS,
  INNER_CIRCLE,
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
  REDES_Q2,
  REFERENCIA,
  ROADMAP,
  UDNS_FUNNEL,
  UPAX_ONE,
  WEB,
  accionesRoadmap,
  costoPromedioMqlPaid,
  cuentaMateriales,
  cumplimientoFacturacion,
  ejecutivosConfirmados,
  ganadoPorUdn,
  marcasDestacadas,
  materialesListosPorUdn,
  notasEnMedios,
  parteEvaluando,
  parteNotasRL,
  personasDe,
  sitiosPrimeraPagina,
  suma,
  tasa,
  totalEtapa,
  totalGanado,
  visitasPorMql,
  type EstadoMaterial,
} from '@/estatus/q3-2026'

/**
 * EL ESTATUS DE MARKETING CORPORATIVO, Q3 2026, CONTADO COMO HISTORIA.
 *
 * Segunda versión (1-oct-2026). La primera pasaba el borrador del equipo a
 * pantallas casi tal cual —tablas completas, sin decir qué significa cada
 * cifra— y Franco la rechazó: «le falta orden, exceso de datos mal
 * diagramados, sin insights, no es autoexplicativa». Y cuando propuse mandar
 * redes, paid y el sitio al anexo: contar mejor, no menos.
 *
 * LA REGLA DE CADA LÁMINA (`Lamina`): sección numerada arriba, el título ES la
 * conclusión, una bajada que la explica en una o dos frases, un solo visual y
 * la fuente al pie. Leída sin nadie que la narre, se entiende.
 *
 * Ningún número se escribe aquí: todo sale de `src/estatus/q3-2026.ts`, donde
 * lo derivado (conversiones, partes, promedios) se calcula y se prueba.
 */

const ENTERO = new Intl.NumberFormat('es-MX')
const PCT = (n: number, d = 1) => `${(n * 100).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
const MILLONES = (n: number, d = 1) => `$${(n / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })} M`
const MONTO = (n: number) => (n === 0 ? '$0' : n >= 1_000_000 ? MILLONES(n, 2) : `$${Math.round(n / 1000).toLocaleString('es-MX')} mil`)
const PESOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

const orden = (i: number) => ({ '--i': i }) as CSSProperties
const ancho = (valor: number, maximo: number, minimo = 2) => ({ '--ancho': `${Math.max(minimo, (valor / maximo) * 100)}%` }) as CSSProperties

const SECCIONES = {
  eventos: '01 · Eventos',
  demanda: '02 · Demanda y venta',
  marca: '03 · Marca y presencia digital',
  herramientas: '04 · Herramientas para vender',
  q4: '05 · Lo que viene en Q4',
  equipo: '06 · Equipo',
} as const

/** El orden de las láminas, sección por sección (lo vigilan las pruebas). */
export const LAMINAS_Q3 = [
  'portada', 'resumen',
  'eventos', 'kaitai', 'campanas',
  'funnel', 'funnel-empresas', 'destacadas', 'facturacion', 'ganados', 'pipeline',
  'pr', 'redes', 'paid', 'web',
  'artefactos', 'materiales',
  'relacion', 'inner-circle', 'rl-ia', 'roadmap',
  'equipo', 'gracias',
] as const

function Orbes({ n = 3 }: { n?: number }) {
  return (
    <div className={estilos.orbes} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={estilos.orbe} />
      ))}
    </div>
  )
}

/** Una lámina: sección, título-conclusión, bajada, un visual y su fuente. */
function Lamina({
  id,
  seccion,
  titulo,
  bajada,
  fuente,
  tono = 'clara',
  children,
}: {
  id: (typeof LAMINAS_Q3)[number]
  seccion: string
  titulo: ReactNode
  bajada?: ReactNode
  fuente?: string
  tono?: 'clara' | 'oscura' | 'noche'
  children: ReactNode
}) {
  return (
    <section data-layout={id} className={`${estilos.pantalla} ${estilos[tono]}`}>
      {tono === 'oscura' && <Orbes n={2} />}
      <Escena className={estilos.escena}>
        <header className={estilos.cabecera}>
          <p className={`${estilos.seccion} ${estilos.aparece}`} style={orden(0)}>{seccion}</p>
          <h2 className={`${estilos.titulo} ${estilos.aparece}`} style={orden(1)}>{titulo}</h2>
          {bajada && <p className={`${estilos.bajada} ${estilos.aparece}`} style={orden(2)}>{bajada}</p>}
        </header>
        <div className={estilos.cuerpo}>{children}</div>
      </Escena>
      {fuente && <p className={estilos.pie}>{fuente}</p>}
    </section>
  )
}

function Cifra({ valor, decimales = 0, prefijo = '', sufijo = '', rotulo, i, destacada = false }: {
  valor: number
  decimales?: number
  prefijo?: string
  sufijo?: string
  rotulo: string
  i: number
  destacada?: boolean
}) {
  return (
    <article className={`${estilos.cifra} ${destacada ? estilos.cifraDestacada : ''} ${estilos.aparece}`} style={orden(i)}>
      <CifraAnimada valor={valor} decimales={decimales} prefijo={prefijo} sufijo={sufijo} className={estilos.cifraValor} />
      <p className={estilos.cifraRotulo}>{rotulo}</p>
    </article>
  )
}

export function EstatusQ3() {
  const ganado = ganadoPorUdn()
  const maximoGanado = ganado[0].monto
  const maximoPipelineUdn = Math.max(...PIPELINE_UDN.map((f) => f.monto))
  const maximoMql = Math.max(...UDNS_FUNNEL.map((u) => FUNNEL[u].MQL))
  const maximoVisitas = Math.max(...WEB.map((w) => w.visitas))
  const maximoMqlPaid = Math.max(...PAID.map((p) => p.mql ?? 0))
  const pipelinePaid = suma(PAID, (p) => p.pipeline)
  const nera = PIPELINE_UDN.find((f) => f.udn === 'NeraCode')!
  const neraPaid = PAID.find((p) => p.udn === 'NeraCode')!
  const facturadoMexaMu = FACTURADO_POR_UDN.reduce((n, f) => n + f.monto, 0)
  const notasRL = PR.porUdn.find((f) => f.udn === 'Research Land')!.notas
  const linkedin = REDES.find((r) => r.red === 'LinkedIn')!
  const instagram = REDES.find((r) => r.red === 'Instagram')!
  const listos = materialesListosPorUdn()
  const rl = listos.find((f) => f.udn === 'Research Land')!
  const sqlPeNc = FUNNEL['Promo Espacio'].SQL + FUNNEL.NeraCode.SQL
  const visitas = suma(WEB, (w) => w.visitas)
  const mayor = [...GANADAS].sort((a, b) => b.valor - a.valor)[0]
  const vecesLinkedin = Math.floor(linkedin.engagement / instagram.engagement)

  return (
    <div className={estilos.documento}>
      {/* ── PORTADA ── */}
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

      {/* ── RESUMEN ── */}
      <Lamina
        id="resumen"
        seccion="Resumen del trimestre"
        titulo="Q3 en seis cifras"
        bajada="Lo que hicimos de julio a septiembre, sección por sección."
        tono="oscura"
      >
        <div className={estilos.resumen}>
          <Cifra i={3} valor={ejecutivosConfirmados()} rotulo="ejecutivos confirmados para Kaitai, el primer Ignite" />
          <Cifra i={4} valor={totalEtapa('SQL')} rotulo="oportunidades calificadas (SQL) en el funnel" />
          <Cifra i={5} valor={FACTURADO_Q3 / 1e6} decimales={1} prefijo="$" sufijo=" M" rotulo="facturados de negocios del funnel" />
          <Cifra i={6} valor={PIPELINE.total / 1e6} decimales={1} prefijo="$" sufijo=" M" rotulo={`de pipeline abierto, en ${PIPELINE.negocios} negocios`} />
          <Cifra i={7} valor={notasEnMedios()} rotulo={`notas en medios, con ${PR.alcance / 1e6} M de alcance`} />
          <Cifra i={8} valor={visitas} rotulo="visitas a los sitios de las siete empresas" />
        </div>
        <p className={`${estilos.remate} ${estilos.aparece}`} style={orden(9)}>
          En Q4: Inner Circle, UPAX ONE, el lanzamiento de Research Land + IA, y PR y contenido para las siete empresas.
        </p>
      </Lamina>

      {/* ── 01 · EVENTOS ── */}
      <Lamina
        id="eventos"
        seccion={SECCIONES.eventos}
        titulo="Tres experiencias para sentar a nuestras empresas con quien decide"
        bajada="Upax Fire Experience: cada experiencia la presentan dos empresas del grupo, frente a tomadores de decisión de su industria."
        fuente="Fechas y sedes al 30 de septiembre · David Porchini"
        tono="oscura"
      >
        <ol className={estilos.lineaEventos}>
          {EVENTOS.map((ev, i) => {
            const imagen = ev.keyVisual ?? ev.fotos[0]
            return (
              <li key={ev.id} className={`${estilos.eventoTarjeta} ${estilos.aparece}`} style={orden(i + 3)}>
                <Image src={imagen.src} alt="" width={imagen.ancho} height={imagen.alto} className={estilos.eventoImagen} unoptimized loading="eager" />
                <div className={estilos.eventoTexto}>
                  <span className={estilos.eventoFecha}>{ev.fecha}</span>
                  <h3 className={estilos.eventoNombre}>{ev.nombre}</h3>
                  <p className={estilos.eventoQuien}>{ev.presentan.join(' + ')}</p>
                  <p className={estilos.eventoResumen}>{ev.resumen}</p>
                  <p className={estilos.eventoSede}>{ev.sede} · {ev.direccion}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </Lamina>

      <Lamina
        id="kaitai"
        seccion={SECCIONES.eventos}
        titulo={<>Kaitai ya tiene <span className={estilos.si}>{ejecutivosConfirmados()} ejecutivos</span> confirmados</>}
        bajada={`${KAITAI_SECTORES.reduce((n, s) => n + personasDe(s), 0)} de ${marcasDestacadas()} marcas destacadas de banca, salud, consumo y automotriz, más ${KAITAI_OTRAS_EMPRESAS} de otras empresas. Es el ${EVENTOS[0].fecha.toLowerCase()}.`}
        fuente="Lista de confirmados de Kaitai · David Porchini"
        tono="noche"
      >
        <div className={estilos.treemap}>
          {KAITAI_SECTORES.map((sector, s) => (
            <section
              key={sector.nombre}
              className={`${estilos.sector} ${estilos.aparece}`}
              data-color={sector.color}
              data-sector={sector.nombre}
              style={orden(s + 3)}
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
      </Lamina>

      <Lamina
        id="campanas"
        seccion={SECCIONES.eventos}
        titulo="Cada experiencia lleva su campaña completa"
        bajada="Key visual, invitación, landing de registro y correos de invitación y confirmación, hechos por el equipo."
        fuente="Testigos materiales · Iris Mugica y David Porchini"
        tono="oscura"
      >
        <div className={estilos.campanas}>
          {EVENTOS.map((ev, i) => (
            <article key={ev.id} className={`${estilos.campana} ${estilos.aparece}`} style={orden(i + 3)}>
              <h3 className={estilos.campanaNombre}>{ev.nombre}</h3>
              <div className={estilos.campanaPiezas}>
                {ev.materiales.map((mat) => (
                  <Image key={mat.src} src={mat.src} alt={mat.alt} width={mat.ancho} height={mat.alto} className={estilos.pieza} unoptimized loading="eager" />
                ))}
              </div>
            </article>
          ))}
        </div>
      </Lamina>

      {/* ── 02 · DEMANDA Y VENTA ── */}
      <Lamina
        id="funnel"
        seccion={SECCIONES.demanda}
        titulo="La demanda califica bien; el reto está en cerrar"
        bajada={`De los MQL, ${PCT(tasa('MQL', 'SQL'))} llegó a SQL, cerca del ${PCT(REFERENCIA.mqlASql, 0)} proyectado. De las propuestas se ganó el ${PCT(tasa('Propuestas', 'Ganados'))}, contra un objetivo de ${PCT(REFERENCIA.oportunidadACliente, 0)}.`}
        fuente="HubSpot, julio a septiembre · César Mejía · objetivos: Forecast 2026"
      >
        <ol className={estilos.pasos}>
          {/* Tres pasos y no cuatro: en la tabla hay más propuestas (103) que SQL
              (95), y en la cadena se leía como un error. Las propuestas van en la
              conversión de los ganados, que es donde se miden. */}
          {(['MQL', 'SQL', 'Ganados'] as const).map((etapa, i) => (
            <li key={etapa} className={`${estilos.paso} ${estilos.aparece}`} style={orden(i + 3)} data-etapa={etapa}>
              <CifraAnimada valor={totalEtapa(etapa)} className={estilos.pasoValor} />
              <span className={estilos.pasoNombre}>
                {etapa === 'MQL' ? 'MQL' : etapa === 'SQL' ? 'SQL · oportunidades calificadas' : 'negocios ganados'}
              </span>
              {etapa === 'SQL' && (
                <span className={estilos.conversion} data-estado="cerca">
                  {PCT(tasa('MQL', 'SQL'))} de los MQL · meta {PCT(REFERENCIA.mqlASql, 0)}
                </span>
              )}
              {etapa === 'Ganados' && (
                <span className={estilos.conversion} data-estado="abajo">
                  {totalEtapa('Ganados')} de {totalEtapa('Propuestas')} propuestas: {PCT(tasa('Propuestas', 'Ganados'))} · meta {PCT(REFERENCIA.oportunidadACliente, 0)}
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className={`${estilos.notaBase} ${estilos.aparece}`} style={orden(8)}>
          Todo sale de una base de {ENTERO.format(totalEtapa('Contactos'))} contactos.
        </p>
      </Lamina>

      <Lamina
        id="funnel-empresas"
        seccion={SECCIONES.demanda}
        titulo="Promo Espacio y NeraCode aportan la mitad de los SQL"
        bajada={`${sqlPeNc} de los ${totalEtapa('SQL')} SQL vienen de ellas. Mexa Creativa y House of Films generan muchos MQL que todavía no llegan a SQL.`}
        fuente="HubSpot, julio a septiembre · César Mejía"
      >
        <div className={estilos.pares} role="table" aria-label="MQL y SQL por empresa">
          <div className={`${estilos.parFila} ${estilos.parCabecera}`} role="row">
            <span role="columnheader" />
            <span role="columnheader">MQL</span>
            <span role="columnheader">SQL</span>
          </div>
          {[...UDNS_FUNNEL].sort((a, b) => FUNNEL[b].SQL - FUNNEL[a].SQL).map((u, i) => (
            <div key={u} className={`${estilos.parFila} ${estilos.aparece}`} style={orden(i + 3)} role="row">
              <span role="rowheader" className={estilos.parNombre}>{u}</span>
              <span role="cell" className={estilos.parCarril}>
                <span className={`${estilos.barra} ${estilos.barraSuave}`} style={{ ...orden(i + 3), ...ancho(FUNNEL[u].MQL, maximoMql) }} />
                <span className={estilos.parValor}>{FUNNEL[u].MQL}</span>
              </span>
              <span role="cell" className={estilos.parCarril}>
                <span className={estilos.barra} style={{ ...orden(i + 3), ...ancho(FUNNEL[u].SQL, maximoMql) }} />
                <span className={`${estilos.parValor} ${estilos.parFuerte}`}>{FUNNEL[u].SQL}</span>
              </span>
            </div>
          ))}
        </div>
      </Lamina>

      <Lamina
        id="destacadas"
        seccion={SECCIONES.demanda}
        titulo="Marcas con las que ya estamos conversando"
        bajada="Algunas de las empresas destacadas del funnel del trimestre."
        fuente="Empresas destacadas del funnel · Ileana Cruz"
      >
        <ul className={estilos.muroLogos}>
          {DESTACADAS.map((d, i) => (
            <li key={d.empresa} className={`${estilos.celdaLogo} ${estilos.aparece}`} style={orden((i % 8) + 3)}>
              <Image src={d.logo} alt={d.empresa} width={260} height={150} className={estilos.logoMuro} unoptimized loading="eager" />
            </li>
          ))}
        </ul>
      </Lamina>

      <Lamina
        id="facturacion"
        seccion={SECCIONES.demanda}
        titulo={`Facturamos ${MILLONES(FACTURADO_Q3)} de negocios del funnel`}
        bajada={`${PCT(facturadoMexaMu / FACTURADO_Q3, 0)} vino de Mexa Creativa y Marketing United. Es el ${PCT(cumplimientoFacturacion())} de la meta de venta externa del grupo en el trimestre, que incluye toda la venta y no solo la que genera Marketing.`}
        fuente="Insights: Ileana Cruz · meta: Forecast 2026, venta externa de julio a septiembre de las siete empresas"
        tono="oscura"
      >
        <div className={estilos.facturacion}>
          <div>
            <p className={`${estilos.rotuloBloque} ${estilos.aparece}`} style={orden(3)}>De dónde vino lo facturado</p>
            <div className={`${estilos.barraApilada} ${estilos.aparece}`} style={orden(4)}>
              {FACTURADO_POR_UDN.map((f) => (
                <span key={f.udn} className={estilos.tramo} style={{ flexGrow: f.monto }}>
                  <strong>{f.udn}</strong> {MILLONES(f.monto, 2)}
                </span>
              ))}
              <span className={`${estilos.tramo} ${estilos.tramoResto}`} style={{ flexGrow: FACTURADO_Q3 - facturadoMexaMu }}>
                <strong>Otras</strong>
              </span>
            </div>
          </div>
          <div>
            <p className={`${estilos.rotuloBloque} ${estilos.aparece}`} style={orden(5)}>
              Contra la meta de venta externa del grupo en Q3 ({MILLONES(META_FACTURADO_Q3)})
            </p>
            <div className={`${estilos.avance} ${estilos.aparece}`} style={orden(6)}>
              <span className={estilos.avanceRelleno} style={{ width: `${cumplimientoFacturacion() * 100}%` }} />
              <span className={estilos.avanceRotulo} style={{ paddingLeft: `calc(${cumplimientoFacturacion() * 100}% + 1rem)` }}>{PCT(cumplimientoFacturacion())}</span>
            </div>
          </div>
        </div>
      </Lamina>

      <Lamina
        id="ganados"
        seccion={SECCIONES.demanda}
        titulo={`Ganamos ${GANADAS.length} negocios nuevos por ${MILLONES(totalGanado())}`}
        bajada={`${ganado[0].udn} cerró ${ganado[0].negocios}, por ${MILLONES(ganado[0].monto)}. El más grande del trimestre: ${mayor.empresa}, ${MILLONES(mayor.valor)}, de ${mayor.udn}.`}
        fuente="Orbit · negocios en Ganado (por facturar) y Facturado del trimestre · César Mejía"
      >
        <ul className={estilos.barrasGrandes}>
          {ganado.map((f, i) => (
            <li key={f.udn} className={`${estilos.barraGrande} ${estilos.aparece}`} style={orden(i + 3)}>
              <span className={estilos.barraGrandeNombre}>
                {f.udn}
                <small>{f.negocios} {f.negocios === 1 ? 'negocio' : 'negocios'}</small>
              </span>
              <span className={estilos.barraGrandeCarril}>
                <span className={estilos.barra} style={{ ...orden(i + 3), ...ancho(f.monto, maximoGanado) }} />
                <span className={estilos.barraGrandeMonto}>{MONTO(f.monto)}</span>
              </span>
              <span className={estilos.clientes}>{f.clientes.join(' · ')}</span>
            </li>
          ))}
        </ul>
      </Lamina>

      <Lamina
        id="pipeline"
        seccion={SECCIONES.demanda}
        titulo={`Quedan ${MILLONES(PIPELINE.total)} por cerrar y ${PCT(parteEvaluando(), 0)} ya está en evaluación`}
        bajada={`${PIPELINE.negocios} negocios abiertos. NeraCode concentra más de un tercio: ${MILLONES(nera.monto)} en ${nera.negocios} negocios.`}
        fuente="Orbit, vista MBR · negocios abiertos al 30 de septiembre · César Mejía"
        tono="oscura"
      >
        <div className={estilos.pipeline}>
          <div>
            <p className={`${estilos.rotuloBloque} ${estilos.aparece}`} style={orden(3)}>Por etapa</p>
            <div className={`${estilos.barraApilada} ${estilos.aparece}`} style={orden(4)}>
              {PIPELINE_ETAPAS.map((e) => (
                <span key={e.etapa} className={`${estilos.tramo} ${e.etapa === 'Evaluando' ? '' : estilos.tramoResto}`} style={{ flexGrow: e.monto }}>
                  {e.monto / PIPELINE.total > 0.2 && (
                    <>
                      <strong>{e.etapa}</strong> {MILLONES(e.monto)} · {e.negocios} negocios
                    </>
                  )}
                </span>
              ))}
            </div>
            <ul className={`${estilos.leyendaEtapas} ${estilos.aparece}`} style={orden(5)}>
              {PIPELINE_ETAPAS.filter((e) => e.monto / PIPELINE.total <= 0.2).map((e) => (
                <li key={e.etapa}>
                  {e.etapa}: {MONTO(e.monto)} · {e.negocios} {e.negocios === 1 ? 'negocio' : 'negocios'}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`${estilos.rotuloBloque} ${estilos.aparece}`} style={orden(5)}>Por empresa</p>
            <ul className={estilos.barras}>
              {PIPELINE_UDN.map((f, i) => (
                <li key={f.udn} className={`${estilos.barraFila} ${estilos.aparece}`} style={orden(i + 6)}>
                  <span className={estilos.barraNombre}>{f.udn}</span>
                  <span className={estilos.barraCarril}>
                    <span className={estilos.barra} style={{ ...orden(i + 6), ...ancho(f.monto, maximoPipelineUdn, 1.5) }} />
                  </span>
                  <span className={estilos.barraMonto}>{MONTO(f.monto)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Lamina>

      {/* ── 03 · MARCA Y PRESENCIA DIGITAL ── */}
      <Lamina
        id="pr"
        seccion={SECCIONES.marca}
        titulo={`${notasEnMedios()} notas en medios; 9 de cada 10 fueron de Research Land`}
        bajada={`Las otras seis empresas sumaron ${notasEnMedios() - notasRL} notas. El plan de Q4 las pone a todas en medios.`}
        fuente="Monitoreo de medios del trimestre · Carolina Rojas"
      >
        <div className={estilos.pr}>
          <div className={estilos.trio}>
            <Cifra i={3} valor={notasEnMedios()} rotulo="notas en medios" destacada />
            <Cifra i={4} valor={PR.alcance / 1e6} sufijo=" M" rotulo="de alcance estimado" />
            <Cifra i={5} valor={PR.valorPublicitario / 1e6} decimales={1} prefijo="+$" sufijo=" MDP" rotulo="de valor publicitario equivalente" />
          </div>
          <div
            className={`${estilos.barraApilada} ${estilos.aparece}`}
            style={orden(6)}
            role="img"
            aria-label={`Research Land, ${notasRL} notas; las otras seis empresas, ${notasEnMedios() - notasRL}`}
          >
            <span className={estilos.tramo} style={{ flexGrow: notasRL }}>
              <strong>Research Land</strong> {notasRL} notas · {PCT(parteNotasRL(), 0)}
            </span>
            <span className={`${estilos.tramo} ${estilos.tramoResto}`} style={{ flexGrow: Math.max(notasEnMedios() - notasRL, 28) }}>
              <strong>Otras seis</strong> {notasEnMedios() - notasRL}
            </span>
          </div>
          <ul className={estilos.medios} aria-label="Algunos medios donde salimos">
            {PR.medios.map((m, i) => (
              <li key={m.medio} className={estilos.aparece} style={orden(i + 7)}>
                <Image src={m.logo} alt={m.medio} width={220} height={60} className={estilos.logoMedio} unoptimized loading="eager" />
              </li>
            ))}
          </ul>
        </div>
      </Lamina>

      <Lamina
        id="redes"
        seccion={SECCIONES.marca}
        titulo="LinkedIn es donde nos responden"
        bajada={`Con menos impresiones que Instagram, LinkedIn tuvo ${ENTERO.format(linkedin.interacciones)} interacciones y ${PCT(linkedin.engagement)} de engagement, más de ${vecesLinkedin === 5 ? 'cinco' : vecesLinkedin} veces el de Instagram. Instagram mejoró su eficiencia: de ${PCT(REDES_Q2.engagementInstagram, 2)} en Q2 a ${PCT(instagram.engagement, 2)}.`}
        fuente="Redes de Grupo UPAX, julio a septiembre · squad de Paid y RRSS, Fernando Borges"
      >
        <div className={estilos.redes}>
          {REDES.map((r, i) => (
            <article key={r.red} className={`${estilos.red} ${r.red === 'LinkedIn' ? estilos.redDestacada : ''} ${estilos.aparece}`} style={orden(i + 3)}>
              <h3 className={estilos.redNombre}>{r.red}</h3>
              <p className={estilos.redEngagement}>
                {PCT(r.engagement, r.engagement < 0.1 ? 2 : 1)}
                <small>de engagement</small>
              </p>
              <dl className={estilos.redDatos}>
                <div><dt>Interacciones</dt><dd>{ENTERO.format(r.interacciones)}</dd></div>
                <div><dt>Impresiones</dt><dd>{ENTERO.format(r.impresiones)}</dd></div>
                <div><dt>Seguidores</dt><dd>{ENTERO.format(r.seguidores)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </Lamina>

      <Lamina
        id="paid"
        seccion={SECCIONES.marca}
        titulo={`Paid trajo ${suma(PAID, (p) => p.mql)} MQL a ${PESOS.format(costoPromedioMqlPaid())} en promedio y ${MILLONES(pipelinePaid)} de pipeline`}
        bajada={`Dos de cada tres pesos de ese pipeline son de NeraCode (${MILLONES(neraPaid.pipeline)}). Facturado y por facturar: ${MILLONES(suma(PAID, (p) => p.facturado))}, casi todo de Mexa Creativa y Marketing United.`}
        fuente="Paid media, julio a septiembre · squad de Paid y RRSS, Fernando Borges · costo por MQL promedio, ponderado"
      >
        <div className={estilos.pares} role="table" aria-label="Paid por empresa">
          <div className={`${estilos.parFila} ${estilos.parCabecera}`} role="row">
            <span role="columnheader" />
            <span role="columnheader">MQL · costo por MQL</span>
            <span role="columnheader">Pipeline</span>
          </div>
          {[...PAID].filter((p) => p.mql !== null).sort((a, b) => (b.mql ?? 0) - (a.mql ?? 0)).map((p, i) => (
            <div key={p.udn} className={`${estilos.parFila} ${estilos.aparece}`} style={orden(i + 3)} role="row">
              <span role="rowheader" className={estilos.parNombre}>{p.udn}</span>
              <span role="cell" className={estilos.parCarril}>
                <span className={estilos.barra} style={{ ...orden(i + 3), ...ancho(p.mql ?? 0, maximoMqlPaid) }} />
                <span className={`${estilos.parValor} ${estilos.parFuerte}`}>{p.mql}</span>
                <span className={estilos.parValor}>a {PESOS.format(p.costoMql ?? 0)}</span>
              </span>
              <span role="cell" className={estilos.parCarril}>
                <span className={`${estilos.barra} ${estilos.barraSuave}`} style={{ ...orden(i + 3), ...ancho(p.pipeline, neraPaid.pipeline) }} />
                <span className={estilos.parValor}>{MONTO(p.pipeline)}</span>
              </span>
            </div>
          ))}
        </div>
      </Lamina>

      <Lamina
        id="web"
        seccion={SECCIONES.marca}
        titulo={`Los sitios atraen ${ENTERO.format(Math.round(visitas / 1000))} mil visitas; convertirlas es el reto`}
        bajada={`Una de cada ${ENTERO.format(Math.round(visitasPorMql() / 100) * 100)} visitas deja sus datos. Aun así, esos contactos suman ${MILLONES(suma(WEB, (w) => w.pipeline))} de pipeline y ${MILLONES(suma(WEB, (w) => w.facturado))} facturados y por facturar. ${sitiosPrimeraPagina()} de los 7 sitios salen en la primera página de Google.`}
        fuente="Sitios web e inbound, julio a septiembre · squad de Web y Contenidos, Iris Mugica"
      >
        <div className={estilos.web}>
          <ul className={estilos.barras} aria-label="Visitas por sitio">
            {[...WEB].sort((a, b) => b.visitas - a.visitas).map((w, i) => (
              <li key={w.udn} className={`${estilos.barraFila} ${estilos.barraFilaWeb} ${estilos.aparece}`} style={orden(i + 3)}>
                <span className={estilos.barraNombre}>{w.udn}</span>
                <span className={estilos.barraCarril}>
                  <span className={estilos.barra} style={{ ...orden(i + 3), ...ancho(w.visitas, maximoVisitas) }} />
                </span>
                <span className={estilos.barraMonto}>{ENTERO.format(w.visitas)}</span>
                <span className={estilos.barraExtra}>{w.mql} MQL · {w.posicion} de Google</span>
              </li>
            ))}
          </ul>
          <aside className={`${estilos.nota2} ${estilos.aparece}`} style={orden(11)}>
            <p className={estilos.nota2Rotulo}>Visitas desde asistentes de IA</p>
            {/* Texto del equipo, tal cual (Franco, 1-oct). */}
            <p className={estilos.nota2Texto}>{INSIGHTS_WEB[0].replace('Los asistentes de IA son un canal emergente. ', '')}</p>
          </aside>
        </div>
      </Lamina>

      {/* ── 04 · HERRAMIENTAS PARA VENDER ── */}
      <Lamina
        id="artefactos"
        seccion={SECCIONES.herramientas}
        titulo="Construimos dos herramientas propias para vender"
        bajada="Hechas por el equipo, para que el comercial llegue con más contexto y cotice más rápido."
        fuente="César Mejía e Iris Mugica"
        tono="oscura"
      >
        <div className={estilos.artefactos}>
          {ARTEFACTOS.map((a, i) => (
            <article key={a.nombre} className={`${estilos.artefacto} ${estilos.aparece}`} style={orden(i + 3)}>
              <span className={estilos.artefactoDe}>{a.de}</span>
              <h3 className={estilos.artefactoNombre}>{a.nombre}</h3>
              <p className={estilos.artefactoTexto}>{a.descripcion}</p>
            </article>
          ))}
        </div>
      </Lamina>

      <Lamina
        id="materiales"
        seccion={SECCIONES.herramientas}
        titulo={`${cuentaMateriales('hecho')} de ${MATERIALES.length * COLUMNAS_MATERIALES.length} materiales de venta están listos`}
        bajada={`Research Land ya tiene ${rl.listos} de ${rl.total}. Del resto, ${cuentaMateriales('aprobacion')} están en aprobación, ${cuentaMateriales('modificacion')} en modificación y ${cuentaMateriales('elaborar')} por elaborar.`}
        fuente="Estatus de materiales de venta · Portafolio y Ecosistema, David Porchini"
      >
        <div className={`${estilos.matriz} ${estilos.aparece}`} style={orden(3)} role="table" aria-label="Estatus de materiales de venta por empresa">
          <div className={estilos.filaMatriz} role="row">
            <span role="columnheader" />
            {COLUMNAS_MATERIALES.map((u, i) => (
              <span key={u} role="columnheader" className={estilos.columnaMatriz} title={u}>
                {CORTO[u]}
                <small>{listos[i].listos} de {listos[i].total}</small>
              </span>
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
        <ul className={`${estilos.leyenda} ${estilos.aparece}`} style={orden(4)}>
          {(['hecho', 'aprobacion', 'modificacion', 'elaborar', 'noAplica'] as EstadoMaterial[]).map((e) => (
            <li key={e}>
              <span className={estilos.celdaMatriz} data-estado={e} aria-hidden="true" />
              {ESTADO_MATERIAL[e]} · {cuentaMateriales(e)}
            </li>
          ))}
        </ul>
      </Lamina>

      {/* ── 05 · LO QUE VIENE EN Q4 ── */}
      <Lamina
        id="relacion"
        seccion={SECCIONES.q4}
        titulo="Convertimos los eventos en relación de largo plazo"
        bajada="Inner Circle es la comunidad privada que deja cada experiencia; UPAX ONE, el encuentro mayor que reúne a esa comunidad."
        fuente="David Porchini"
        tono="oscura"
      >
        <div className={estilos.relacion}>
          <figure className={`${estilos.tarjetaImagen} ${estilos.aparece}`} style={orden(3)}>
            <Image src="/estatus-q3/inner-invitacion.webp" alt="Invitación a UPAX Inner Circle" width={1600} height={900} className={estilos.imagenRedonda} unoptimized loading="eager" />
            <figcaption>
              <strong>UPAX Inner Circle</strong>
              {INNER_CIRCLE.definicion}
            </figcaption>
          </figure>
          <figure className={`${estilos.tarjetaImagen} ${estilos.aparece}`} style={orden(4)}>
            <Image src="/estatus-q3/upax-one-tunel.webp" alt="Render de UPAX ONE: el túnel inmersivo" width={1920} height={1089} className={estilos.imagenRedonda} unoptimized loading="eager" />
            <figcaption>
              <strong>UPAX ONE</strong>
              {UPAX_ONE.convergencia}
            </figcaption>
          </figure>
        </div>
      </Lamina>

      <Lamina
        id="inner-circle"
        seccion={SECCIONES.q4}
        titulo="Cada empresa pone contenido exclusivo para los miembros"
        bajada="No es una plataforma comercial: es relación. Un ejemplo de lo que aporta cada una."
        fuente="David Porchini"
      >
        <div className={estilos.ideas}>
          {INNER_CIRCLE.contenidos.map((c, i) => (
            <article key={c.udn} className={`${estilos.idea} ${estilos.aparece}`} style={orden(i + 3)}>
              <h3 className={estilos.ideaUdn}>{c.udn}</h3>
              <p className={estilos.ideaTexto}>{c.ideas[0]}</p>
            </article>
          ))}
        </div>
      </Lamina>

      <Lamina
        id="rl-ia"
        seccion={SECCIONES.q4}
        titulo="Lanzamos Research Land + IA"
        bajada="Producción de materiales y estrategia de comunicación, de la marca a la campaña."
        fuente="David Porchini"
      >
        <ol className={estilos.ruta}>
          {LANZAMIENTO_RL_IA.map((e, i) => (
            <li key={e} className={`${estilos.rutaPaso} ${estilos.aparece}`} style={orden(i + 3)}>
              <span className={estilos.rutaNumero}>{String(i + 1).padStart(2, '0')}</span>
              <span className={estilos.rutaTexto}>{e}</span>
            </li>
          ))}
        </ol>
      </Lamina>

      <Lamina
        id="roadmap"
        seccion={SECCIONES.q4}
        titulo={`PR y contenido para las siete empresas: ${accionesRoadmap()} acciones de octubre a diciembre`}
        bajada="En azul, lo que sale a medios; en rosa, el contenido. Cada acción lleva la empresa que la protagoniza."
        fuente="Roadmap always on · Iris Mugica y Carolina Rojas"
      >
        <div className={`${estilos.roadmap} ${estilos.aparece}`} style={orden(3)}>
          <span />
          {['Octubre', 'Noviembre', 'Diciembre'].map((mes) => (
            <span key={mes} className={estilos.mes}>{mes}</span>
          ))}
          {ROADMAP.map((carril) => (
            <div key={carril.carril} className={estilos.carril} data-carril={carril.carril === 'PR y medios' ? 'pr' : 'contenidos'}>
              <span className={estilos.carrilNombre}>{carril.carril}</span>
              <div className={estilos.carrilAcciones}>
                {carril.acciones.map((a) => (
                  <span key={`${a.tema}-${a.quien}`} className={estilos.accion} style={{ gridColumn: `${a.desde} / ${a.hasta + 1}` }}>
                    <strong>{a.tema}</strong>
                    <small>{a.quien}</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Lamina>

      {/* ── 06 · EQUIPO ── */}
      <Lamina
        id="equipo"
        seccion={SECCIONES.equipo}
        titulo="Cuatro acciones para el equipo, nacidas de sus propias fricciones"
        bajada={EQUIPO.intro}
        fuente="Marketing Corporativo"
      >
        <div className={estilos.acciones}>
          {EQUIPO.acciones.map((a, i) => (
            <article key={a.titulo} className={`${estilos.accionEquipo} ${estilos.aparece}`} style={orden(i + 3)}>
              <span className={estilos.accionEje}>{a.eje}</span>
              <h3 className={estilos.accionTitulo}>{a.titulo}</h3>
              <p className={estilos.accionTexto}>{a.texto}</p>
            </article>
          ))}
        </div>
      </Lamina>

      {/* ── CIERRE ── */}
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
