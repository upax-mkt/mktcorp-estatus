import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { Escena } from '@/componentes/politico/Escena'
import { GraficoComparativo } from './GraficoComparativo'
import { GaleriaQ3 } from './GaleriaQ3'
import { DetalleQ3 } from './DetalleQ3'
import { IconoQ3, type NombreIcono } from './IconoQ3'
import { LogoUdn, lugarUdn, udnsEn } from './LogoUdn'
import { IndiceQ3 } from './IndiceQ3'
import {
  ARTEFACTOS, CONVERSION_Q3, CORTO, COLUMNAS_MATERIALES, CUMPLIMIENTO_REPORTADO_Q3,
  DEMANDA_Q3, DESTACADAS, EQUIPO, ESTADO_MATERIAL, EVENTOS, FACTURADO_POR_UDN,
  FACTURADO_Q3, FUNNEL, GANADAS, INNER_CIRCLE, INSIGHTS_WEB,
  KAITAI_CONFIRMADOS_REPORTADOS, KAITAI_SECTORES, LANZAMIENTO_RL_IA,
  MATERIALES, NEGOCIOS_FACTURADOS_Q3, PAID, PAID_PIPELINE_TOTAL, PIPELINE, PIPELINE_ETAPAS, PIPELINE_OTRAS,
  PIPELINE_UDN, POR_SEMBRAR, PR, REDES, REDES_Q2, ROADMAP, TRASLAPE_VENTA, UDNS_FUNNEL, UPAX_ONE, WEB,
  accionesRoadmap, costoMql, cuentaMateriales, empresasGanadas, ganadoPorFacturar, ganadoPorUdn,
  marcasDestacadas, montoPorFacturar, negociosVenta, notasEnMedios, notasRL, notasSinRL, parteEvaluando,
  personasDe, pipelinePorSembrar, suma, totalGanado, ventaGenerada,
  type EstadoMaterial,
} from '@/estatus/q3-2026'
import estilos from './estatus.module.css'

const entero = new Intl.NumberFormat('es-MX')
const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
const millones = (n: number, d = 2) => `$${(n / 1e6).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })} M`
const porcentaje = (n: number) => `${(n * 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })}%`
const porciento = (n: number, d = 0) => `${(n * 100).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
/** «House of Films, Mexa Creativa y UiX»: una lista en prosa. */
const enProsa = (nombres: readonly string[]) => nombres.length < 2 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
const LOGO = '/logos/mkt-corp-grupo-upax-blanco-recortado.png'
const FUENTE = 'Reporte Q3 de Marketing Corporativo · corte 30 sep 2026'

/**
 * OJO con los ids: `agenda` está reservado. El modo presentar oculta `[data-layout='agenda']`
 * (el índice de otros documentos), así que la agenda de Q4 se llama `agenda-q4`.
 *
 * EL ORDEN ES LA AGENDA DEL EQUIPO (pizarrón del 29-sep): lectura, eventos,
 * demanda, pipeline y venta, PR, canales, artefactos, Q4. Los eventos van al
 * principio; no se mueven al final aunque ocurran en octubre y noviembre.
 *
 * REVISIÓN DEL EQUIPO (2-oct-2026): lo que se hizo con el equipo cierra el
 * balance de Q3 y va ANTES de «qué hacemos en Q4»; de Inner Circle en adelante
 * todo es siguiente paso.
 */
export const LAMINAS_Q3 = [
  'portada', 'resumen',
  'eventos', 'kaitai', 'campanas',
  'funnel', 'funnel-empresas', 'destacadas',
  'venta', 'pipeline',
  'pr',
  'redes', 'paid', 'web', 'ia',
  'artefactos', 'materiales',
  'equipo',
  'relacion', 'inner-circle', 'upax-one', 'rl-ia', 'agenda-q4',
  'cierre',
] as const

type LaminaId = (typeof LAMINAS_Q3)[number]

/** Los bloques del índice lateral: cada uno abre en la lámina que lleva su `id`. */
export const BLOQUES_Q3 = [
  { id: 'resumen', numero: '00', nombre: 'Lectura' },
  { id: 'eventos', numero: '01', nombre: 'Eventos' },
  { id: 'funnel', numero: '02', nombre: 'Demanda' },
  { id: 'venta', numero: '03', nombre: 'Pipeline y venta' },
  { id: 'pr', numero: '04', nombre: 'PR' },
  { id: 'redes', numero: '05', nombre: 'Canales' },
  { id: 'artefactos', numero: '06', nombre: 'Artefactos' },
  { id: 'equipo', numero: '07', nombre: 'Equipo' },
  { id: 'relacion', numero: '08', nombre: 'Q4' },
  { id: 'cierre', numero: '09', nombre: 'Cierre' },
] as const
type BloqueId = (typeof BLOQUES_Q3)[number]['id']

const ETIQUETA: Record<BloqueId, string> = {
  resumen: 'La lectura del trimestre',
  eventos: '01 / Eventos',
  funnel: '02 / Generación de demanda',
  venta: '03 / Pipeline y venta',
  pr: '04 / PR y medios',
  redes: '05 / Canales digitales',
  artefactos: '06 / Artefactos y materiales',
  equipo: '07 / Equipo',
  relacion: '08 / Qué hacemos en Q4',
  cierre: 'Q3 → Q4',
}
/** Fondos: material propio (sede de Kaitai, key visuals y renders desenfocados) y dos fotos CC0. Créditos en public/estatus-q3/fondos/CREDITOS.md. */
const foto = (nombre: string) => ({ backgroundImage: `url(/estatus-q3/fondos/${nombre}.jpg)` }) as CSSProperties

const ICONO_BLOQUE: Record<BloqueId, NombreIcono> = {
  resumen: 'lectura', eventos: 'copas', funnel: 'embudo', venta: 'dinero', pr: 'periodico',
  redes: 'canales', artefactos: 'herramienta', equipo: 'personas', relacion: 'cohete', cierre: 'bandera',
}
const MESES = ['Octubre', 'Noviembre', 'Diciembre'] as const
/** Los banners oficiales de los tres eventos (los entregó Franco el 1-oct-2026): traen el nombre y los logos de quienes presentan. */
const BANNER: Record<'kaitai' | 'miracle' | 'soledad', { src: string; alt: string }> = {
  kaitai: { src: '/estatus-q3/banner-kaitai.jpg', alt: 'Banner de Kaitai, presentan NeraCode y UiX' },
  miracle: { src: '/estatus-q3/banner-miracle.jpg', alt: 'Banner de Miracle Signal, presentan House of Films y Promo Espacio' },
  soledad: { src: '/estatus-q3/banner-soledad.jpg', alt: 'Banner de Estudio sobre la Soledad del Mexicano, presentan Mexa Creativa y Research Land' },
}
/** A Cecilia le importa de MQL en adelante: los contactos no son protagonistas, van en nota. */
const CORTES_DEMANDA = ['MQL', 'SQL', 'Propuestas', 'Ganados'] as const
const DESCRIPCION_CORTE: Record<(typeof CORTES_DEMANDA)[number], string> = { MQL: 'Calificados por marketing', SQL: 'Calificados por ventas', Propuestas: 'Propuestas registradas', Ganados: 'Negocios ganados' }
const orden = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * UNA LÁMINA. Tres superficies, para que la pieza respire y no repita un solo fondo:
 * `foto` (oscura, con una fotografía a sangre: los momentos de impacto), `claro`
 * (blanca, para leer datos; la foto, si la lleva, entra como banda lateral) y
 * `color` (el azul de la marca). `comp` cambia la composición entre vecinas.
 */
function Lamina({ id, bloque, titulo, bajada, children, tono = 'claro', imagen, fondo, fuente = FUENTE, comp = 'arriba', cumbre = false }: {
  id: LaminaId; bloque: BloqueId; titulo: ReactNode; bajada?: ReactNode; children: ReactNode
  tono?: 'foto' | 'claro' | 'color'; imagen?: string; fondo?: 'azul' | 'naranja' | 'rayo'; fuente?: string; comp?: 'arriba' | 'lado'; apertura?: boolean; cumbre?: boolean
}) {
  const pagina = LAMINAS_Q3.indexOf(id) + 1
  return <section id={id} data-layout={id} data-bloque={bloque} data-tono={tono} data-comp={comp} data-cumbre={cumbre || undefined} data-imagen={imagen ? 'si' : undefined} data-luz={imagen?.startsWith('luz') || undefined} data-fondo={fondo} className={`${estilos.pantalla} ${estilos[tono]}`} aria-labelledby={`${id}-titulo`}>
    {imagen && <span className={estilos.fondo} style={foto(imagen)} aria-hidden="true" />}
    <Escena className={estilos.escena}>
      <header className={estilos.cabecera}>
        <p className={estilos.seccion}><IconoQ3 nombre={ICONO_BLOQUE[bloque]} />{ETIQUETA[bloque]}<span>Marketing Corporativo · 2026</span></p>
        <h2 id={`${id}-titulo`} className={estilos.titulo}><span>{titulo}</span></h2>
        {bajada && <p className={`${estilos.bajada} ${estilos.entra}`} style={orden(1)}>{bajada}</p>}
      </header>
      <div className={`${estilos.cuerpo} ${estilos.entra}`} style={orden(2)}>{children}</div>
      <footer className={estilos.pie}><span>{fuente}</span><span>{String(pagina).padStart(2, '0')} / {LAMINAS_Q3.length}</span></footer>
    </Escena>
  </section>
}

/** El rayo de Marketing Corp entre dos signos: «Q⚡3» en la portada, «Q⚡4» en el cierre. Es el hilo de la pieza. */
function MarcaRayo({ izquierda, derecha, pie }: { izquierda: string; derecha: string; pie?: string }) {
  return <div className={estilos.trimestre} aria-hidden="true">
    <span>{izquierda}</span>
    <div className={estilos.rayo}>
      <span className={estilos.rayoBrillo} />
      <span className={estilos.rayoForma} />
      <svg viewBox="0 0 100 160" preserveAspectRatio="none"><polygon className={estilos.rayoChispa} pathLength={1} points="58,0 96,0 66,62 92,62 26,160 44,88 16,88" /></svg>
    </div>
    <span>{derecha}</span>
    {pie && <small>{pie}</small>}
  </div>
}

/** Una etiqueta con su icono: la iconografía nombra, no adorna. */
function Rotulo({ icono, children }: { icono: NombreIcono; children: ReactNode }) {
  return <span className={`${estilos.micro} ${estilos.rotulo}`}><IconoQ3 nombre={icono} />{children}</span>
}

/**
 * UNA CIFRA CON SU ETIQUETA. Ninguna cuenta desde cero: un estatus no enseña
 * «$48 M» medio segundo antes de decir «$57 M» (revisión del 1-oct-2026). La
 * protagonista (`heroe`) se descubre desde una máscara, ya con su valor.
 */
function Dato({ valor, etiqueta, prefijo = '', sufijo = '', decimales = 0, heroe = false }: {
  valor: number; etiqueta: string; prefijo?: string; sufijo?: string; decimales?: number; heroe?: boolean
}) {
  const fijo = `${prefijo}${valor.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}${sufijo}`
  return <div className={estilos.dato} data-heroe={heroe || undefined}><span>{fijo}</span><p>{etiqueta}</p></div>
}
function Lectura({ children, etiqueta = 'Lectura para Q4' }: { children: ReactNode; etiqueta?: string }) {
  return <aside className={estilos.lectura}><span>{etiqueta}</span><p>{children}</p><IconoQ3 nombre="avance" /></aside>
}
function TablaGanados() {
  return <table className={estilos.tablaDetalle}><thead><tr><th>Empresa</th><th>UDN</th><th>Monto</th><th>Estado</th></tr></thead><tbody>{GANADAS.map((g, i) => <tr key={`${g.empresa}-${i}`}><th scope="row">{g.empresa}</th><td>{g.udn}</td><td>{pesos.format(g.valor)}</td><td>{g.etapa}</td></tr>)}</tbody></table>
}
/**
 * LA AGENDA DE Q4, ORDENADA POR MES (corrección de Franco, 1-oct-2026): antes iba
 * por tema y empresa. Cada acción aparece una vez, en el mes en que arranca; si
 * sigue en los meses siguientes, lo dice. Las empresas van con su logo.
 */
function AgendaPorMes() {
  // Cada carril reserva las mismas filas en los tres meses: así «Contenidos» arranca a la misma altura en las tres columnas.
  const filas = (carril: (typeof ROADMAP)[number]) => Math.max(...MESES.map((_, i) => carril.acciones.filter(a => a.desde === i + 1).length))
  return <div className={estilos.meses}>
    {MESES.map((mes, i) => {
      const m = i + 1
      const total = ROADMAP.reduce((n, c) => n + c.acciones.filter(a => a.desde === m).length, 0)
      return <section key={mes} className={estilos.mesColumna} aria-label={mes}>
        <header><IconoQ3 nombre="calendario" /><h3>{mes}</h3><span>{total} {total === 1 ? 'acción arranca' : 'acciones arrancan'}</span></header>
        {ROADMAP.map(carril => {
          const acciones = carril.acciones.filter(a => a.desde === m)
          return <div key={carril.carril} className={estilos.mesCarril} style={{ '--filas': filas(carril) } as CSSProperties}>
            <p className={estilos.micro}><IconoQ3 nombre={carril.carril === 'Contenidos' ? 'documento' : 'megafono'} />{carril.carril}</p>
            <ul>{acciones.map(a => <li key={`${a.tema}-${a.quien}`} data-pendiente={a.tema === 'Tema por definir' || undefined}>
              <span className={estilos.accionTema}>{a.tema}{a.hasta > a.desde && <small>hasta {MESES[a.hasta - 1].slice(0, 3).toLowerCase()}.</small>}</span>
              <span className={estilos.accionQuien} data-varios={udnsEn(a.quien).length > 2 || undefined} title={a.quien}>{udnsEn(a.quien).map(u => <LogoUdn key={u} nombre={u} />)}</span>
            </li>)}</ul>
          </div>
        })}
      </section>
    })}
  </div>
}

/** La narrativa se renderiza en servidor; solo cifras, gráficos, índice y exploración son interactivos. */
export function EstatusQ3() {
  const ganado = ganadoPorUdn()
  const estados: EstadoMaterial[] = ['hecho', 'aprobacion', 'modificacion', 'elaborar', 'noAplica', 'sinDato']
  const simbolos: Record<EstadoMaterial, string> = { hecho: '✓', aprobacion: 'A', modificacion: 'M', elaborar: '+', noAplica: '—', sinDato: '?' }
  // Lo que concentran las dos empresas que más facturaron (las dos primeras de la tabla).
  const facturadoPrincipal = FACTURADO_POR_UDN.slice(0, 2).reduce((n, f) => n + f.monto, 0)
  const evaluando = PIPELINE_ETAPAS.find(e => e.etapa === 'Evaluando') ?? PIPELINE_ETAPAS[0]
  const columnas = COLUMNAS_MATERIALES.map((u, i) => ({ u, i })).sort((a, b) => lugarUdn(a.u) - lugarUdn(b.u))
  const temas = [...INNER_CIRCLE.contenidos].sort((a, b) => lugarUdn(a.udn) - lugarUdn(b.udn))
  return <main className={estilos.documento}>
    <IndiceQ3 bloques={BLOQUES_Q3} />

    <section id="portada" data-layout="portada" data-bloque="portada" data-tono="foto" className={`${estilos.pantalla} ${estilos.foto} ${estilos.portada}`} aria-labelledby="titulo-q3">
      {/* El rayo de Marketing Corp, en los colores de UPAX: «somos la chispa que inicia la llama». */}
      <div className={estilos.rayoFondo} aria-hidden="true"><i /><i /><i /><span className={estilos.rayoAura} /></div>
      <Escena className={estilos.portadaEscena}>
        <div className={estilos.portadaMarca}><Image src={LOGO} alt="Marketing Corp · Grupo UPAX" width={660} height={160} unoptimized priority /><span>02 OCTUBRE 2026</span></div>
        <div className={estilos.portadaCentro}>
          <div>
            <p className={`${estilos.micro} ${estilos.entra}`}>Estatus / Julio — Septiembre</p>
            <h1 id="titulo-q3"><span className={estilos.linea}><span>Resultados que</span></span> <span className={estilos.linea} style={orden(1)}><span>marcan el siguiente</span></span> <span className={estilos.linea} style={orden(2)}><span><em>movimiento.</em></span></span></h1>
            <p className={`${estilos.lema} ${estilos.entra}`} style={orden(5)}>Somos la chispa que inicia la llama.</p>
            <p className={`${estilos.portadaSub} ${estilos.entra}`} style={orden(6)}>Marketing Corporativo · Balance Q3 · Agenda Q4</p>
          </div>
          <MarcaRayo izquierda="Q" derecha="3" pie="2026" />
        </div>
        <nav className={`${estilos.agendaPortada} ${estilos.entra}`} style={orden(7)} aria-label="Recorrido de la presentación">
          {BLOQUES_Q3.slice(0, 9).map(b => <a key={b.id} href={`#${b.id}`}><IconoQ3 nombre={ICONO_BLOQUE[b.id]} />{b.nombre}</a>)}
        </nav>
        <footer className={`${estilos.pie} ${estilos.entra}`} style={orden(8)}><span>{FUENTE}</span><span>01 / {LAMINAS_Q3.length}</span></footer>
      </Escena>
    </section>

    <Lamina id="resumen" bloque="resumen" titulo={<>Hay negocio generado.<br />El siguiente reto es <em>convertir la oportunidad.</em></>} tono="foto" imagen="luz-3" bajada="Q3 deja pipeline abierto, venta en curso y demanda calificada. Q4 es para convertir.">
      <div className={estilos.resumen}>
        <article data-protagonista="true" className={estilos.entra} style={orden(3)}><Rotulo icono="avance">Pipeline abierto / al corte</Rotulo><Dato heroe valor={PIPELINE.total / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta={`en ${PIPELINE.negocios} negocios abiertos · ticket promedio de $${entero.format(PIPELINE.ticketPromedio)}`} /><p>{millones(evaluando.monto)} ya están en evaluación: a un paso de la decisión del cliente.</p><a href="#pipeline">Ver pipeline <span aria-hidden="true">↗</span></a></article>
        <article className={estilos.entra} style={orden(5)}><Rotulo icono="recibo">Venta / Q3</Rotulo><Dato valor={FACTURADO_Q3 / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta="facturados de negocios del funnel" /><p>{GANADAS.length} negocios ganados con {empresasGanadas()} clientes durante el trimestre: {millones(totalGanado())}.</p><a href="#venta">Ver la venta <span aria-hidden="true">↗</span></a></article>
        <article className={estilos.entra} style={orden(7)}><Rotulo icono="embudo">Demanda / Q3</Rotulo><Dato valor={DEMANDA_Q3.MQL} etiqueta="MQL generados" /><p>{DEMANDA_Q3.SQL} SQL y {DEMANDA_Q3.Propuestas} propuestas registradas en el trimestre.</p><a href="#funnel">Ver la demanda <span aria-hidden="true">↗</span></a></article>
      </div>
    </Lamina>

    {/* ── 01 · EVENTOS ── */}
    <Lamina id="eventos" bloque="eventos" titulo={<>Tres experiencias. Seis empresas.<br /><em>Una agenda de relación.</em></>} tono="foto" imagen="venue" bajada="Q3 dejó listas tres Fire Experience para octubre y noviembre: llevan las capacidades del grupo a una conversación cercana con tomadores de decisión." fuente={`${FUENTE} · agenda octubre–noviembre / David Porchini`}>
      <div className={estilos.eventos}>{EVENTOS.map((e, i) => <article key={e.id} className={estilos.entra} style={orden(3 + i)}><div className={estilos.eventoFoto} style={{ '--cartel': `url(${BANNER[e.id].src})` } as CSSProperties}><Image src={BANNER[e.id].src} alt={BANNER[e.id].alt} width={860} height={860} unoptimized /></div><div className={estilos.eventoTexto}><div className={estilos.eventoCabeza}><h3>{e.nombre}</h3><span className={estilos.eventoFecha}><IconoQ3 nombre="calendario" />{['08 OCT', '05 NOV', '19 NOV'][i]}</span></div><p>{['Ronqueo de atún y sake: tecnología y experiencia de usuario.', 'Miracle berry: transformar la percepción y provocar impacto.', 'Una experiencia inmersiva para presentar el estudio La Soledad.'][i]}</p><footer><b><IconoQ3 nombre="lugar" />{e.sede}</b><span><IconoQ3 nombre="reloj" />{e.hora} · CDMX</span></footer></div></article>)}</div>
    </Lamina>

    <Lamina id="kaitai" bloque="eventos" titulo={<>Kaitai reúne a líderes de <em>cuatro industrias</em></>} bajada="Tecnología, innovación y experiencia de cliente: una conversación relevante para UiX y NeraCode." fuente={`${FUENTE} · confirmados / David Porchini`}>
      <div className={estilos.kaitaiCabecera}><div className={estilos.duoCifras}><Dato valor={KAITAI_CONFIRMADOS_REPORTADOS} etiqueta="confirmados al 30 de septiembre" /><Dato valor={marcasDestacadas()} etiqueta="empresas destacadas en la selección" /></div><ul className={estilos.cuandoDonde}><li><IconoQ3 nombre="calendario" /><b>Jueves 8 de octubre · 7:15 pm</b></li><li><IconoQ3 nombre="lugar" />Onomura · Col. Roma, CDMX</li></ul></div>
      <div className={estilos.sectores}>{KAITAI_SECTORES.map(s => <article key={s.nombre}><header><h3>{s.nombre}</h3><span>{personasDe(s)} {personasDe(s) === 1 ? 'persona' : 'personas'} · {s.empresas.length} {s.empresas.length === 1 ? 'empresa' : 'empresas'}</span></header><div className={estilos.logosSector}>{s.empresas.map(e => <Image key={e.empresa} src={e.logo} alt={e.empresa} width={200} height={90} unoptimized />)}</div><DetalleQ3 etiqueta="Ver empresas y cargos" titulo={`${s.nombre} · perfiles confirmados`}><ul className={estilos.listaCargos}>{s.empresas.map(e => <li key={e.empresa}><b>{e.empresa}</b>{e.cargos.map(c => <p key={c}>{c}</p>)}</li>)}</ul></DetalleQ3></article>)}</div>
    </Lamina>

    <Lamina id="campanas" bloque="eventos" comp="lado" titulo={<>La experiencia empieza <em>desde la invitación</em></>} bajada="Un recorrido de comunicación que acompaña el registro y la confirmación de cada encuentro." fuente={`${FUENTE} · piezas reales / Iris Mugica y David Porchini`}>
      <GaleriaQ3 grupos={EVENTOS.map(e => ({ nombre: e.nombre, materiales: [...(e.id === 'miracle' && e.keyVisual ? [e.keyVisual] : []), ...e.materiales] }))} />
    </Lamina>

    {/* ── 02 · GENERACIÓN DE DEMANDA ── */}
    <Lamina id="funnel" bloque="funnel" titulo={<>Del MQL al cierre: <em>cuatro cortes de la demanda</em></>} bajada="Lo que generó Marketing en el trimestre, etapa por etapa, y cuánto convierte contra la tasa ideal." fuente={`${FUENTE} · Orbit, generado por Marketing / César Mejía`}>
      <ol className={estilos.cortes}>{CORTES_DEMANDA.map((e, i) => {
        const c = CONVERSION_Q3[i - 1]
        return <li key={e} data-ganados={e === 'Ganados' || undefined} style={{ '--lado': Math.sqrt(DEMANDA_Q3[e] / DEMANDA_Q3.MQL), '--i': i } as CSSProperties}>
          <span className={estilos.burbuja} aria-hidden="true" />
          <div><IconoQ3 nombre={(['megafono', 'objetivo', 'documento', 'trofeo'] as const)[i]} /><Dato valor={DEMANDA_Q3[e]} etiqueta={e} /><p>{DESCRIPCION_CORTE[e]}</p></div>
          {c
            ? <p className={estilos.tasa} data-cumple={c.real >= c.ideal}><span>De {c.de} a {c.a}</span><b>{porciento(c.real, 1)}</b><small>real · ideal {porciento(c.ideal)}</small></p>
            : <p className={estilos.tasa} data-base="true"><span>Punto de partida</span><small>La demanda que califica Marketing</small></p>}
        </li>
      })}</ol>
      <div className={estilos.definicionFunnel}><span>Cómo leerlo</span><p><b>Son cuatro conteos del trimestre, no un embudo de las mismas cuentas.</b> Cada círculo va a la misma escala de área. La tasa real divide un conteo entre el anterior; la ideal es la del Forecast 2026.</p></div>
    </Lamina>

    <Lamina id="funnel-empresas" bloque="funnel" comp="lado" titulo={<>Promo Espacio y NeraCode aportan <em>{FUNNEL['Promo Espacio'].SQL + FUNNEL.NeraCode.SQL} de los {DEMANDA_Q3.SQL} SQL</em></>} bajada="La vista sigue el orden del funnel: MQL, SQL, propuestas y ganados. Las empresas van en orden alfabético; elige una para seguirla en toda la presentación." fuente={`${FUENTE} · Orbit, generado por Marketing / César Mejía`}>
      <GraficoComparativo titulo="Generación de demanda por empresa del grupo" metricas={[{ id: 'MQL', nombre: 'MQL', formato: 'entero' }, { id: 'SQL', nombre: 'SQL', formato: 'entero' }, { id: 'Propuestas', nombre: 'Propuestas', formato: 'entero' }, { id: 'Ganados', nombre: 'Ganados', formato: 'entero' }]} filas={UDNS_FUNNEL.map(u => ({ nombre: u, valores: FUNNEL[u] }))} nota={<>El total del grupo ({DEMANDA_Q3.MQL} MQL, {DEMANDA_Q3.SQL} SQL y {DEMANDA_Q3.Propuestas} propuestas) incluye a otras unidades que aquí no se desglosan.</>} />
      <Lectura etiqueta="Dónde enfocar la conversación">Mexa Creativa lidera los MQL; Promo Espacio, los SQL; Marketing United, las propuestas y los negocios ganados.</Lectura>
    </Lamina>

    <Lamina id="destacadas" bloque="funnel" tono="color" titulo={<>La conversación ya incluye a <em>estas marcas</em></>} bajada="Selección de empresas destacadas del funnel de Q3. Cada marca representa una conversación comercial, no un cierre atribuido." fuente={`${FUENTE} · empresas destacadas / César Mejía`}>
      <ul className={estilos.muroLogos}>{DESTACADAS.map(d => <li key={d.empresa}><Image src={d.logo} alt={d.empresa} width={260} height={150} unoptimized /></li>)}</ul>
    </Lamina>

    {/* ── 03 · PIPELINE Y VENTA ── */}
    <Lamina id="venta" bloque="venta" titulo={<><em>{millones(ventaGenerada())}</em> de venta generada: facturado y ganado por facturar</>} bajada={`${negociosVenta()} negocios. Lo facturado ya está en caja; lo ganado se suma cuando se factura. ${TRASLAPE_VENTA.negocios} negocios ya pasaron de ganado a facturado dentro del trimestre y se cuentan una sola vez.`} fuente={`${FUENTE} · Orbit, generado por Marketing / César Mejía`}>
      <div className={estilos.dosCortes}>
        <article>
          <p className={estilos.corteEtiqueta}><IconoQ3 nombre="recibo" /><b>Corte 1</b> Facturado en Q3 · ya en caja</p>
          <div className={estilos.heroDato}><Dato valor={FACTURADO_Q3 / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta={`facturados en ${NEGOCIOS_FACTURADOS_Q3} negocios del funnel`} /></div>
          <div className={estilos.cumplimiento}><strong>{porcentaje(CUMPLIMIENTO_REPORTADO_Q3)}</strong><div><b>Cumplimiento de facturación Q3</b><p>Indicador reportado por el equipo de GDD.</p></div></div>
          <GraficoComparativo titulo="Composición de la facturación" metricas={[{ id: 'monto', nombre: 'Facturado', formato: 'millones' }]} filas={FACTURADO_POR_UDN.map(f => ({ nombre: f.udn, valores: { monto: f.monto } }))} />
          <p className={estilos.corteNota}><b>{porciento(facturadoPrincipal / FACTURADO_Q3)}</b> de lo facturado proviene de Mexa Creativa y Marketing United. Extender la contribución comercial a más empresas es el siguiente espacio de crecimiento.</p>
        </article>
        <div className={estilos.noSeSuman} aria-hidden="true"><span>+</span><p>Dos cortes.<br />Aún no se suman<br />completos.</p></div>
        <article>
          <p className={estilos.corteEtiqueta}><IconoQ3 nombre="trofeo" /><b>Corte 2</b> Negocios ganados en Q3</p>
          <div className={estilos.heroDato}><Dato valor={totalGanado() / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta={`ganados en ${GANADAS.length} negocios · ${millones(montoPorFacturar())} aún por facturar`} /></div>
          <div className={estilos.duoCifras}><Dato valor={ganadoPorFacturar().length} etiqueta="por facturar" /><Dato valor={empresasGanadas()} etiqueta="clientes" /><DetalleQ3 etiqueta="Explorar los 16 negocios" titulo="Negocios ganados · detalle de Orbit"><TablaGanados /></DetalleQ3></div>
          <GraficoComparativo titulo="Monto ganado por empresa del grupo" metricas={[{ id: 'monto', nombre: 'Monto ganado', formato: 'millones' }]} filas={ganado.map(f => ({ nombre: f.udn, detalle: `${f.negocios} ${f.negocios === 1 ? 'negocio' : 'negocios'}`, valores: { monto: f.monto } }))} />
          <p className={estilos.corteNota}><b>{millones(TRASLAPE_VENTA.monto)}</b> de lo ganado ya se facturó en el trimestre: está en los dos cortes y en el total se cuenta una vez.</p>
        </article>
      </div>
    </Lamina>

    <Lamina id="pipeline" bloque="venta" cumbre titulo={<>El pipeline está concentrado: <em>nos toca generar más demanda</em></>} tono="foto" imagen="pipeline" bajada={`${PIPELINE.negocios} negocios abiertos suman ${millones(PIPELINE.total)}. La primera oportunidad es cerrar lo que ya está en evaluación. La segunda es nuestra: más demanda para ${enProsa(POR_SEMBRAR)}.`} fuente={`${FUENTE} · Orbit, vista MBR, generado por Marketing / César Mejía`}>
      <div className={estilos.cumbre}>
        <div className={estilos.cumbreCifra}><Rotulo icono="avance">01 · Lo que avanza / en evaluación</Rotulo><Dato heroe valor={evaluando.monto / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta={`${porciento(parteEvaluando())} del pipeline abierto · ${evaluando.negocios} de ${PIPELINE.negocios} negocios`} /><p className={estilos.cumbreNota}>Están a una decisión del cliente. Aquí la oportunidad es acompañar el cierre.</p></div>
        <GraficoComparativo titulo="02 · Dónde nos toca generar más demanda" metricas={[{ id: 'monto', nombre: 'Pipeline', formato: 'millones' }]} filas={PIPELINE_UDN.map(f => ({ nombre: f.udn, valores: { monto: f.monto } }))} alerta={POR_SEMBRAR} nota={<><b>{millones(pipelinePorSembrar())}</b> entre {enProsa(POR_SEMBRAR)}: {porciento(pipelinePorSembrar() / PIPELINE.total)} del pipeline. Generar esa demanda es tarea de Marketing.</>} />
      </div>
      <div className={estilos.llegada}>
        <div className={estilos.pista} style={{ '--inicio': FACTURADO_Q3 / PIPELINE.total } as CSSProperties} aria-hidden="true"><i className={estilos.astro} /></div>
        <div className={estilos.tira} style={{ '--inicio': FACTURADO_Q3 / PIPELINE.total } as CSSProperties} role="img" aria-label={`Pipeline abierto por etapa, a escala: ${PIPELINE_ETAPAS.map(e => `${e.etapa} ${millones(e.monto)}`).join(', ')}`}>
          {PIPELINE_ETAPAS.map((e, i) => <span key={e.etapa} data-etapa={i} data-destacado={e.etapa === 'Evaluando' || undefined} style={{ '--parte': e.monto / PIPELINE.total } as CSSProperties} />)}
        </div>
        <ol className={estilos.tiraLeyenda}>{PIPELINE_ETAPAS.map((e, i) => <li key={e.etapa} data-etapa={i} data-destacado={e.etapa === 'Evaluando' || undefined}><span className={estilos.muestra} aria-hidden="true" /><b>{e.etapa}</b><span>{e.negocios} {e.negocios === 1 ? 'negocio' : 'negocios'}</span><strong>{millones(e.monto)}</strong></li>)}</ol>
        <div className={estilos.mismaEscala}><span className={estilos.bloqueFacturado} style={{ '--parte': FACTURADO_Q3 / PIPELINE.total } as CSSProperties} aria-hidden="true" /><p><b>A la misma escala:</b> lo facturado en Q3, {millones(FACTURADO_Q3)}. Es otro corte y no se suma al pipeline. El total incluye {millones(PIPELINE_OTRAS.monto)} de otra unidad del grupo que no se desglosa por empresa.</p></div>
      </div>
      <Lectura>Acompañar el cierre de lo que está en evaluación y subir la generación de demanda en {enProsa(POR_SEMBRAR)}.</Lectura>
    </Lamina>

    {/* ── 04 · PR ── */}
    <Lamina id="pr" bloque="pr" tono="foto" fondo="azul" titulo={<>Las siete empresas tuvieron <em>presencia en medios</em></>} bajada={`${notasEnMedios()} notas en el trimestre. Research Land se lee aparte: su mercado y su cadencia de publicación son distintos a los de las demás.`} fuente={`${FUENTE} · monitoreo de medios / Carolina Rojas`}>
      <div className={estilos.division}><div><div className={estilos.heroDato}><Dato valor={notasEnMedios()} etiqueta="notas en medios" /></div><div className={estilos.duoCifras}><Dato valor={149} sufijo=" M" etiqueta="alcance estimado" /><Dato valor={3.9} prefijo="$" sufijo=" M" decimales={1} etiqueta="valor publicitario equivalente" /></div><div className={estilos.medios}>{PR.medios.map(m => <Image key={m.medio} src={m.logo} alt={m.medio} width={160} height={60} unoptimized />)}</div></div>
        <div className={estilos.prDerecha}>
          <div className={`${estilos.panel} ${estilos.prAparte}`}><div><span className={estilos.micro}>Aparte, por su cadencia</span><LogoUdn nombre="Research Land" /></div><Dato valor={notasRL()} etiqueta="notas en el trimestre" /></div>
          <GraficoComparativo titulo="Notas de las otras seis empresas" metricas={[{ id: 'notas', nombre: 'Notas', formato: 'entero' }]} filas={notasSinRL().map(f => ({ nombre: f.udn, valores: { notas: f.notas } }))} />
        </div>
      </div>
    </Lamina>

    {/* ── 05 · CANALES DIGITALES ── */}
    <Lamina id="redes" bloque="redes" titulo={<>LinkedIn concentra la interacción; <em>Instagram mejora su tasa</em></>} bajada="Los canales cumplen papeles distintos: alcance, conversación y presencia audiovisual." fuente={`${FUENTE} · squad de presencia digital`}>
      <div className={estilos.redes}>{REDES.map((r, i) => <article key={r.red} data-lider={r.red === 'LinkedIn'}><div className={estilos.redEncabezado}><span className={estilos.redIcono}><IconoQ3 nombre={(['instagram', 'linkedin', 'youtube'] as const)[i]} /></span><h3>{r.red}</h3></div>{r.red === 'Instagram' && <p className={estilos.redAntes}><span>Q2</span><b>{porciento(REDES_Q2.engagementInstagram, 2)}</b><i aria-hidden="true">→</i><span>Q3</span></p>}<Dato valor={r.engagement * 100} sufijo="%" decimales={r.red === 'LinkedIn' ? 1 : 2} etiqueta={r.red === 'Instagram' ? `engagement · ×${Math.round(r.engagement / REDES_Q2.engagementInstagram)} contra Q2` : 'engagement reportado'} /><dl><div><dt>Interacciones</dt><dd>{entero.format(r.interacciones)}</dd></div><div><dt>Impresiones</dt><dd>{entero.format(r.impresiones)}</dd></div><div><dt>Seguidores</dt><dd>{entero.format(r.seguidores)}</dd></div></dl><p className={estilos.redLectura}>{['Crecimiento orgánico: la pauta solo busca alcance.', '11,688 interacciones: el mayor volumen entre las tres redes.', 'Presencia audiovisual con una comunidad de 22 seguidores.'][i]}</p></article>)}</div>
      <Lectura>Profundizar la conversación de negocio en LinkedIn y trasladar el aprendizaje de interacción a los demás formatos.</Lectura>
    </Lamina>

    <Lamina id="paid" bloque="redes" comp="lado" tono="color" titulo={<>Paid aporta {suma(PAID, f => f.mql)} MQL y <em>{millones(PAID_PIPELINE_TOTAL)} de pipeline</em></>} bajada="Mexa Creativa aporta más MQL; Promo Espacio tiene el menor costo por MQL y el mayor número de SQL." fuente={`${FUENTE} · Orbit, fuente Paid Media / Fernando Borges e Iris Mugica`}>
      <div className={estilos.franjaCifras}><Dato valor={suma(PAID, f => f.mql)} etiqueta="MQL" /><Dato valor={suma(PAID, f => f.sql)} etiqueta="SQL" /><Dato valor={PAID_PIPELINE_TOTAL / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta="pipeline del canal" /><Dato valor={suma(PAID, f => f.facturado) / 1e6} prefijo="$" sufijo=" M" decimales={2} etiqueta="facturado y por facturar" /></div>
      <GraficoComparativo titulo="Paid por empresa" metricas={[{ id: 'mql', nombre: 'MQL', formato: 'entero' }, { id: 'costoMql', nombre: 'Costo por MQL', formato: 'dinero', mejor: 'menor' }, { id: 'sql', nombre: 'SQL', formato: 'entero' }, { id: 'pipeline', nombre: 'Pipeline', formato: 'millones' }, { id: 'facturado', nombre: 'Facturado + por facturar', formato: 'millones' }]} filas={PAID.map(p => ({ nombre: p.udn, detalle: p.nota, valores: { mql: p.mql, costoMql: costoMql(p), sql: p.sql, pipeline: p.pipeline, facturado: p.facturado } }))} />
      <Lectura etiqueta="Cómo leerlo">UiX no tiene MQL propios de paid: sus SQL llegan por cross-sell con NeraCode. El pipeline del canal incluye {millones(PAID_PIPELINE_TOTAL - suma(PAID, f => f.pipeline))} de otra unidad del grupo.</Lectura>
    </Lamina>

    <Lamina id="web" bloque="redes" tono="foto" fondo="naranja" titulo={<>La web aporta 54 MQL y <em>$24.21{'\u00A0'}M de pipeline</em></>} bajada="Los siete sitios suman 25 SQL. NeraCode y UiX reúnen el mayor pipeline del canal; el siguiente paso es convertir mejor las 42,375 visitas." fuente={`${FUENTE} · reporte web del equipo`}>
      <div className={estilos.franjaCifras}><Dato valor={54} etiqueta="MQL reportados" /><Dato valor={25} etiqueta="SQL" /><Dato valor={24.212} prefijo="$" sufijo=" M" decimales={2} etiqueta="pipeline del canal" /><Dato valor={3.108} prefijo="$" sufijo=" M" decimales={2} etiqueta="facturado y por facturar" /></div>
      <GraficoComparativo titulo="Web por empresa" metricas={[{ id: 'visitas', nombre: 'Visitas', formato: 'entero' }, { id: 'mql', nombre: 'MQL', formato: 'entero' }, { id: 'sql', nombre: 'SQL', formato: 'entero' }, { id: 'pipeline', nombre: 'Pipeline', formato: 'millones' }, { id: 'facturado', nombre: 'Facturado + por facturar', formato: 'millones' }]} filas={WEB.map(w => ({ nombre: w.udn, valores: { visitas: w.visitas, mql: w.mql, sql: w.sql, pipeline: w.pipeline, facturado: w.facturado } }))} />
      <Lectura etiqueta="Cómo leerlo">Es el corte que reporta el canal. No se suma al de paid ni al pipeline de Orbit.</Lectura>
    </Lamina>

    <Lamina id="ia" bloque="redes" comp="lado" titulo={<>Los asistentes de IA ya abren <em>otra puerta de entrada</em></>} bajada="Una señal emergente que merece seguimiento en el ecosistema digital." fuente={`${FUENTE} · insight web, texto del equipo`}>
      <div className={estilos.iaVisual}><div className={estilos.evolucionCaja}><Rotulo icono="chispa">Sesiones desde asistentes</Rotulo><div className={estilos.evolucion}><span>94</span><span aria-hidden="true">↗</span><strong>224</strong></div><p className={estilos.multiplicador}><b>×2.4</b><span>de 94 a 224 sesiones</span></p></div><div className={estilos.iaLider}><span className={estilos.micro}>Mexa Creativa</span><Dato valor={73} etiqueta="sesiones" /><p><b>3:48 min</b> de duración<br /><b>30%</b> de rebote</p></div></div>
      <blockquote className={estilos.cita}><IconoQ3 nombre="mensaje" /><p>{INSIGHTS_WEB[0]}</p></blockquote>
    </Lamina>

    {/* ── 06 · ARTEFACTOS Y MATERIALES ── */}
    <Lamina id="artefactos" bloque="artefactos" tono="foto" imagen="luz-4" titulo={<>Dos herramientas acercan la conversación <em>a una propuesta</em></>} bajada="Visualización para mostrar cómo viviría una campaña. Inteligencia para encontrar el momento de contacto." fuente={`${FUENTE} · César Mejía e Iris Mugica`}>
      <div className={estilos.herramientas}>{ARTEFACTOS.map(a => <article key={a.id}><IconoQ3 nombre={a.id === 'senales' ? 'señal' : 'pantalla'} /><span className={estilos.micro}>{a.de}</span><h3>{a.nombre}</h3><p>{a.descripcion}</p><ol>{a.pasos.map((s, j) => <li key={s}><span>0{j + 1}</span>{s}</li>)}</ol><a className={estilos.enlaceDetalle} href={a.enlace} target="_blank" rel="noreferrer">{a.abrir} <span aria-hidden="true">↗</span></a></article>)}</div>
    </Lamina>

    <Lamina id="materiales" bloque="artefactos" titulo={<>{cuentaMateriales('hecho')} materiales están listos; el siguiente paso es <em>completar el kit</em></>} bajada="Las siete empresas tienen necesidades distintas. Esta matriz hace visible qué falta para acompañar la venta." fuente={`${FUENTE} · matriz de materiales / David Porchini`}>
      <div className={estilos.estados} style={{ '--estados': estados.filter(e => cuentaMateriales(e) > 0).length } as CSSProperties}>{estados.filter(e => cuentaMateriales(e) > 0).map(e => <div key={e}><span className={estilos.estado} data-estado={e}>{simbolos[e]}</span><strong>{cuentaMateriales(e)}</strong><span>{ESTADO_MATERIAL[e]}</span></div>)}</div>
      <div className={estilos.tablaScroll}><table className={estilos.matriz}><caption className={estilos.soloLectores}>Estatus de materiales de venta por UDN</caption><thead><tr><th scope="col">Material</th>{columnas.map(({ u }) => <th key={u} scope="col"><LogoUdn nombre={u} /><small>{CORTO[u]}</small></th>)}</tr></thead><tbody>{MATERIALES.map(m => <tr key={m.material}><th scope="row">{m.material}</th>{columnas.map(({ u, i }) => { const e = m.estados[i]; return <td key={u}><span className={estilos.estado} data-estado={e} aria-label={ESTADO_MATERIAL[e]} title={ESTADO_MATERIAL[e]}>{simbolos[e]}</span></td> })}</tr>)}</tbody></table></div>
    </Lamina>

    {/* ── 07 · EQUIPO: lo que se hizo, antes de lo que viene ── */}
    <Lamina id="equipo" bloque="equipo" tono="foto" imagen="equipo" titulo={<>La ejecución también empieza <em>dentro del equipo</em></>} bajada={EQUIPO.intro} fuente={`${FUENTE} · acciones derivadas del bootcamp de julio`}>
      <div className={estilos.equipo}>{EQUIPO.acciones.map((a, i) => <article key={a.titulo}><IconoQ3 nombre={(['personas', 'mensaje', 'estrella', 'objetivo'] as const)[i]} /><span className={estilos.micro}>{a.eje}</span><h3>{a.titulo}</h3><p>{a.texto}</p></article>)}</div>
    </Lamina>

    {/* ── 08 · QUÉ HACEMOS EN Q4: de Inner Circle en adelante, todo es siguiente paso ── */}
    <Lamina id="relacion" bloque="relacion" titulo={<>Inner Circle: las mejores conversaciones <em>no terminan con un evento</em></>} tono="foto" imagen="venue-2" bajada={INNER_CIRCLE.definicion} fuente={`${FUENTE} · Inner Circle / David Porchini`}>
      <div className={estilos.inner}>
        <figure className={`${estilos.panel} ${estilos.innerCarta} ${estilos.entra}`} style={orden(3)}><Image src="/estatus-q3/inner-invitacion.webp" alt="Invitación a UPAX Inner Circle, firmada por Cecilia Fallabrino, con su estuche y tarjeta" width={1600} height={900} unoptimized /><figcaption>La invitación que se entrega en la cena <DetalleQ3 etiqueta="Ver pieza completa" titulo="Invitación a UPAX Inner Circle"><Image src="/estatus-q3/inner-invitacion.webp" alt="Invitación a UPAX Inner Circle" width={1600} height={900} unoptimized className={estilos.imagenCompleta} /></DetalleQ3></figcaption></figure>
        <div className={estilos.innerClaves}>
          <div className={`${estilos.panel} ${estilos.innerMeta} ${estilos.entra}`} style={orden(4)}><Rotulo icono="objetivo">Objetivo a diciembre</Rotulo><Dato valor={INNER_CIRCLE.meta} etiqueta={INNER_CIRCLE.metaTexto} /></div>
          {INNER_CIRCLE.claves.map((c, i) => <div key={c.titulo} className={`${estilos.panel} ${estilos.entra}`} style={orden(5 + i)}><Rotulo icono={c.icono}>{c.titulo}</Rotulo><p>{c.texto}</p></div>)}
        </div>
      </div>
      <ol className={`${estilos.camino} ${estilos.entra}`} style={orden(10)}><li><b>01</b>Fire Experience<span>abre la conversación</span></li><li data-activo="true"><b>02</b>Inner Circle<span>la sostiene todo el año</span></li><li><b>03</b>UPAX ONE<span>reúne a la comunidad</span></li></ol>
    </Lamina>

    <Lamina id="inner-circle" bloque="relacion" titulo={<>Lo que recibe un miembro: <em>tendencias y data de cada industria</em></>} bajada="Cada empresa del grupo aporta tres líneas de contenido exclusivo para quienes deciden.">
      <div className={estilos.contenidos}><article data-intro="true"><IconoQ3 nombre="personas" /><h3>Inner Circle</h3><p>{INNER_CIRCLE.beneficio}</p></article>{temas.map(c => <article key={c.udn}><h3><LogoUdn nombre={c.udn} /></h3><ul className={estilos.temasVista}>{c.corto.map(t => <li key={t}>{t}</li>)}</ul></article>)}</div>
    </Lamina>

    <Lamina id="upax-one" bloque="relacion" titulo={<>UPAX ONE: un día para vivir <em>el ecosistema completo</em></>} bajada="El encuentro mayor de la comunidad: cada empresa muestra su oferta de valor y el grupo se entiende como uno solo." fuente={`${FUENTE} · propuesta conceptual / renders del equipo`}>
      <div className={estilos.oneClaves}>{UPAX_ONE.claves.map((c, i) => <div key={c.titulo} className={`${estilos.panel} ${estilos.entra}`} style={orden(3 + i)}><Rotulo icono={c.icono}>{c.titulo}</Rotulo><strong>{c.dato}</strong><p>{c.texto}</p></div>)}</div>
      <div className={estilos.one}><figure><Image src="/estatus-q3/upax-one-salon.jpg" alt="Render conceptual del salón de UPAX ONE" width={1600} height={900} unoptimized /><figcaption>Encuentro de la comunidad · visual conceptual</figcaption></figure><figure><Image src="/estatus-q3/upax-one-tunel.jpg" alt="Render conceptual del túnel de acceso de UPAX ONE" width={1600} height={900} unoptimized /><figcaption>Experiencia de llegada · visual conceptual</figcaption></figure></div>
    </Lamina>

    <Lamina id="rl-ia" bloque="relacion" titulo={<>Research Land + IA: una historia que llega a <em>todos los puntos de contacto</em></>} bajada="El lanzamiento articula identidad, materiales, medios y presencia digital bajo una misma narrativa.">
      <div className={estilos.lanzamiento}><div className={estilos.lanzamientoMarca}><span className={estilos.micro}>Plan de lanzamiento</span><strong>Research<br />Land<span>+ IA</span></strong><p>Siete frentes para presentar<br />la evolución de la marca.</p></div><ol>{LANZAMIENTO_RL_IA.map((t, i) => <li key={t}><span>0{i + 1}</span><p>{t}</p></li>)}</ol></div>
    </Lamina>



    <Lamina id="agenda-q4" bloque="relacion" titulo={<>{accionesRoadmap()} acciones sostienen la conversación <em>hasta diciembre</em></>} bajada="13 de PR y 10 de contenido, por el mes en que arrancan. Octubre abre conversación; noviembre activa servicios y estudios; diciembre prepara 2027." fuente={`${FUENTE} · roadmap PR / Carolina Rojas · roadmap contenidos / Iris Mugica`}>
      <AgendaPorMes />
    </Lamina>

    <Lamina id="cierre" bloque="cierre" titulo={<>Más oportunidades.<br />Más continuidad.<br /><em>Más avance comercial.</em></>} tono="foto" fondo="rayo" bajada="El siguiente trimestre conecta la demanda que ya existe con las relaciones y capacidades que estamos construyendo.">
      <div className={estilos.cierreRuta}>
        <ol className={estilos.cierre}>
          <li className={estilos.entra} style={orden(3)}><Rotulo icono="avance">Lo que deja Q3</Rotulo><div><p data-pipeline="true"><b>{millones(PIPELINE.total)}</b> de pipeline abierto</p><p><b>{millones(ventaGenerada())}</b> de venta generada</p><p><b>{notasEnMedios()}</b> notas en medios</p></div></li>
          <li className={estilos.entra} style={orden(5)}><Rotulo icono="copas">Lo que activa Q4</Rotulo><div><p><b>08 OCT</b> Kaitai</p><p><b>05 NOV</b> Miracle Signal</p><p><b>19 NOV</b> Soledad</p></div></li>
          <li className={estilos.entra} style={orden(7)}><Rotulo icono="cohete">La continuidad</Rotulo><div><p><b>Inner Circle</b> {INNER_CIRCLE.meta} tomadores de decisión</p><p><b>Research Land + IA</b> lanzamiento</p><p><b>{accionesRoadmap()} acciones</b> de PR y contenido</p></div></li>
        </ol>
        <div className={`${estilos.destino} ${estilos.entra}`} style={orden(9)}><MarcaRayo izquierda="Q" derecha="4" /><Image src={LOGO} alt="Marketing Corp · Grupo UPAX" width={660} height={160} className={estilos.logoCierre} unoptimized /><p className={estilos.lemaCierre}>Somos la chispa que inicia la llama.</p></div>
      </div>
    </Lamina>
  </main>
}
