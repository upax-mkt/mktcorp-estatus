import type { ReactNode } from 'react'
import Image from 'next/image'
import { Escena } from '@/componentes/politico/Escena'
import { IconoQ3 } from './IconoQ3'
import { LogoUdn, lugarUdn } from './LogoUdn'
import {
  DEMANDA_Q3, EVENTOS, FUNNEL, GANADAS, KAITAI_CONFIRMADOS_REPORTADOS, KAITAI_OTRAS_EMPRESAS, KAITAI_SECTORES, PAID,
  PAID_PIPELINE_TOTAL, UDNS_FUNNEL, UPAX_ONE, WEB, costoMql, costoPromedioMqlPaid, marcasDestacadas, personasDe, suma,
  totalEtapa, totalGanado, type Material,
} from '@/estatus/q3-2026'
import estilos from './estatus.module.css'

/**
 * EL ANEXO DEL ESTATUS Q3: lo que en pantalla vive detrás de una pestaña, un diálogo o el cursor.
 *
 * Existe para el PDF (Franco, 2-oct-2026: «el PDF no es navegable, entonces no trae toda la info; debo
 * enviársela también a Ceci»). La pieza en vivo no lo enseña: ahí cada gráfico cambia de métrica, la galería
 * cambia de pieza y los detalles se abren. Un PDF no puede, así que aquí va todo desplegado, una página por
 * tema, en el orden de las láminas a las que pertenece. Ningún dato es nuevo: todo sale de `q3-2026.ts`.
 *
 * Solo se pinta con `/estatus?anexo=1`, que es la dirección que usa el generador del PDF.
 */
export const ANEXOS_Q3 = [
  { id: 'kaitai', letra: 'A1', vuelve: 'kaitai' },
  { id: 'piezas-kaitai', letra: 'A2', vuelve: 'campanas' },
  { id: 'piezas-miracle', letra: 'A3', vuelve: 'campanas' },
  { id: 'piezas-soledad', letra: 'A4', vuelve: 'campanas' },
  { id: 'demanda', letra: 'A5', vuelve: 'funnel-empresas' },
  { id: 'ganados', letra: 'A6', vuelve: 'venta' },
  { id: 'paid', letra: 'A7', vuelve: 'paid' },
  { id: 'web', letra: 'A8', vuelve: 'web' },
  { id: 'upax-one', letra: 'A9', vuelve: 'upax-one' },
] as const
export type AnexoId = (typeof ANEXOS_Q3)[number]['id']
/** El primer anexo de cada lámina: a dónde apunta su «detalle completo». */
export const anexoDe = (lamina: string) => ANEXOS_Q3.find(a => a.vuelve === lamina)

const entero = new Intl.NumberFormat('es-MX')
const pesos0 = (n: number) => `$${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n)}`
const pesos2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
const millones = (n: number) => `$${(n / 1e6).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`
const FUENTE = 'Reporte Q3 de Marketing Corporativo · corte 30 sep 2026'
const porOrden = <T extends { udn: string }>(filas: T[]) => [...filas].sort((a, b) => lugarUdn(a.udn) - lugarUdn(b.udn))
/** El mayor de una columna (o el menor, si es un costo): se resalta igual que en el gráfico de la lámina. */
const destacado = (valores: (number | null)[], menor = false) => {
  const conDato = valores.filter((v): v is number => v != null)
  return conDato.length ? (menor ? Math.min(...conDato) : Math.max(...conDato)) : null
}

function LaminaAnexo({ id, laminas, titulo, bajada, fuente = FUENTE, children }: {
  id: AnexoId; laminas: readonly string[]; titulo: ReactNode; bajada?: ReactNode; fuente?: string; children: ReactNode
}) {
  const anexo = ANEXOS_Q3.find(a => a.id === id)!
  const lamina = String(laminas.indexOf(anexo.vuelve) + 1).padStart(2, '0')
  return <section id={`anexo-${id}`} data-layout={`anexo-${id}`} data-bloque="anexo" data-tono="claro" className={`${estilos.pantalla} ${estilos.claro}`} aria-labelledby={`anexo-${id}-titulo`}>
    <span className={estilos.luces} aria-hidden="true"><i /><i /></span>
    <Escena className={estilos.escena}>
      <header className={estilos.cabecera}>
        <p className={estilos.seccion}><IconoQ3 nombre="capas" />Anexo {anexo.letra}<a className={estilos.volver} href={`#${anexo.vuelve}`}>← Volver a la lámina {lamina}</a></p>
        <h2 id={`anexo-${id}-titulo`} className={estilos.titulo}><span>{titulo}</span></h2>
        {bajada && <p className={estilos.bajada}>{bajada}</p>}
      </header>
      <div className={estilos.cuerpo}>{children}</div>
      <footer className={estilos.pie}><span>{fuente}</span><a href="#portada">{anexo.letra} / A{ANEXOS_Q3.length}</a></footer>
    </Escena>
  </section>
}

/** Las piezas de una campaña, todas a la vista: las verticales (correos, invitación) completas hasta donde cabe; las horizontales, enteras. */
function Piezas({ materiales }: { materiales: Material[] }) {
  return <div className={estilos.piezasAnexo}>{materiales.map((m, i) => <figure key={m.src} data-forma={m.alto > m.ancho ? 'vertical' : 'horizontal'}>
    <Image src={m.src} alt={m.alt} width={m.ancho} height={m.alto} unoptimized />
    <figcaption><span>{String(i + 1).padStart(2, '0')}</span>{m.alt}</figcaption>
  </figure>)}</div>
}

export function AnexoQ3({ laminas }: { laminas: readonly string[] }) {
  const udns = [...UDNS_FUNNEL].sort((a, b) => lugarUdn(a) - lugarUdn(b))
  const etapas = ['MQL', 'SQL', 'Propuestas', 'Ganados'] as const
  const paid = porOrden(PAID); const web = porOrden(WEB)
  const [mapa, salon, tunel] = UPAX_ONE.renders
  return <>
    <LaminaAnexo id="kaitai" laminas={laminas} titulo={<>Kaitai: <em>quiénes ya confirmaron</em></>} bajada={`${KAITAI_CONFIRMADOS_REPORTADOS} confirmados al 30 de septiembre. Aquí, los perfiles de las ${marcasDestacadas()} empresas destacadas; otros ${KAITAI_OTRAS_EMPRESAS} confirmados son de otras empresas.`} fuente={`${FUENTE} · confirmados / David Porchini`}>
      <div className={estilos.cargosAnexo}>{KAITAI_SECTORES.map(s => <section key={s.nombre} className={estilos.panel}>
        <header><h3>{s.nombre}</h3><span>{personasDe(s)} {personasDe(s) === 1 ? 'persona' : 'personas'} · {s.empresas.length} {s.empresas.length === 1 ? 'empresa' : 'empresas'}</span></header>
        <ul>{s.empresas.map(e => <li key={e.empresa}><b>{e.empresa}</b>{e.cargos.map(c => <span key={c}>{c}</span>)}</li>)}</ul>
      </section>)}</div>
    </LaminaAnexo>

    {EVENTOS.map(e => <LaminaAnexo key={e.id} id={`piezas-${e.id}`} laminas={laminas} titulo={<>{e.nombre}: <em>las piezas de la campaña</em></>} bajada={`${e.fecha} · ${e.sede}. El recorrido de comunicación, de la invitación a la confirmación.`} fuente={`${FUENTE} · piezas reales / Iris Mugica y David Porchini`}>
      <Piezas materiales={[...(e.id === 'miracle' && e.keyVisual ? [e.keyVisual] : []), ...e.materiales]} />
    </LaminaAnexo>)}

    <LaminaAnexo id="demanda" laminas={laminas} titulo={<>Generación de demanda por empresa: <em>las cuatro etapas</em></>} bajada="Lo que en pantalla se ve cambiando de pestaña. El total de Orbit incluye a otras unidades del grupo que no se desglosan." fuente={`${FUENTE} · Orbit, generado por Marketing / César Mejía`}>
      <div className={`${estilos.panel} ${estilos.cajaTabla}`}><table className={estilos.tablaAnexo}>
        <thead><tr><th scope="col">Empresa</th>{etapas.map(e => <th key={e} scope="col">{e}</th>)}</tr></thead>
        <tbody>
          {udns.map(u => <tr key={u}><th scope="row"><LogoUdn nombre={u} /></th>{etapas.map(e => <td key={e} data-mayor={FUNNEL[u][e] === destacado(udns.map(x => FUNNEL[x][e])) || undefined}>{entero.format(FUNNEL[u][e])}</td>)}</tr>)}
          <tr data-nota="true"><th scope="row">Otras unidades del grupo</th>{etapas.map(e => <td key={e}>{entero.format(DEMANDA_Q3[e] - totalEtapa(e))}</td>)}</tr>
        </tbody>
        <tfoot><tr><th scope="row">Total del trimestre</th>{etapas.map(e => <td key={e}>{entero.format(DEMANDA_Q3[e])}</td>)}</tr></tfoot>
      </table></div>
    </LaminaAnexo>

    <LaminaAnexo id="ganados" laminas={laminas} titulo={<>Los {GANADAS.length} negocios <em>ganados en Q3</em></>} bajada={`${millones(totalGanado())} en total. «Facturado» ya está en caja; «por facturar» se suma cuando se facture.`} fuente={`${FUENTE} · Orbit / César Mejía`}>
      {/* Dieciséis renglones no caben en una columna: van en dos, de mayor a menor monto, con el total debajo. */}
      <div className={estilos.dosTablas}>{[GANADAS.slice(0, Math.ceil(GANADAS.length / 2)), GANADAS.slice(Math.ceil(GANADAS.length / 2))].map((mitad, k) => <div key={k} className={`${estilos.panel} ${estilos.cajaTabla}`}><table className={`${estilos.tablaAnexo} ${estilos.tablaDensa}`}>
        <thead><tr><th scope="col">Cliente</th><th scope="col">Empresa del grupo</th><th scope="col">Estado</th><th scope="col">Monto</th></tr></thead>
        <tbody>{mitad.map((g, i) => <tr key={`${g.empresa}-${i}`}><th scope="row">{g.empresa}</th><td><LogoUdn nombre={g.udn} /></td><td>{g.etapa === 'Facturado' ? 'Facturado' : 'Por facturar'}</td><td>{pesos2.format(g.valor)}</td></tr>)}</tbody>
      </table></div>)}</div>
      <p className={estilos.totalAnexo}><b>{pesos2.format(totalGanado())}</b> en {GANADAS.length} negocios · {GANADAS.filter(g => g.etapa === 'Facturado').length} facturados · {GANADAS.filter(g => g.etapa !== 'Facturado').length} por facturar ({millones(GANADAS.filter(g => g.etapa !== 'Facturado').reduce((n, g) => n + g.valor, 0))})</p>
    </LaminaAnexo>

    <LaminaAnexo id="paid" laminas={laminas} titulo={<>Paid por empresa: <em>del MQL a la venta</em></>} bajada={`UiX no tiene MQL propios de paid: sus SQL llegan por cross-sell con NeraCode. El pipeline del canal (${millones(PAID_PIPELINE_TOTAL)}) incluye ${millones(PAID_PIPELINE_TOTAL - suma(PAID, f => f.pipeline))} de otra unidad del grupo.`} fuente={`${FUENTE} · Orbit, fuente Paid Media / Fernando Borges e Iris Mugica`}>
      <div className={`${estilos.panel} ${estilos.cajaTabla}`}><table className={estilos.tablaAnexo}>
        <thead><tr><th scope="col">Empresa</th><th scope="col">MQL</th><th scope="col">Costo por MQL</th><th scope="col">SQL</th><th scope="col">Pipeline</th><th scope="col">Facturado + por facturar</th></tr></thead>
        <tbody>{paid.map(p => <tr key={p.udn}><th scope="row"><LogoUdn nombre={p.udn} />{p.nota && <small>{p.nota}</small>}</th>
          <td data-mayor={(p.mql != null && p.mql === destacado(paid.map(x => x.mql))) || undefined}>{p.mql == null ? '—' : entero.format(p.mql)}</td>
          <td data-mayor={(costoMql(p) != null && costoMql(p) === destacado(paid.map(costoMql), true)) || undefined}>{costoMql(p) == null ? '—' : pesos0(costoMql(p)!)}</td>
          <td data-mayor={(p.sql != null && p.sql === destacado(paid.map(x => x.sql))) || undefined}>{p.sql == null ? '—' : entero.format(p.sql)}</td>
          <td data-mayor={p.pipeline === destacado(paid.map(x => x.pipeline)) || undefined}>{millones(p.pipeline)}</td>
          <td data-mayor={p.facturado === destacado(paid.map(x => x.facturado)) || undefined}>{millones(p.facturado)}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Las siete empresas</th><td>{entero.format(suma(PAID, f => f.mql))}</td><td>{pesos0(costoPromedioMqlPaid())} promedio</td><td>{entero.format(suma(PAID, f => f.sql))}</td><td>{millones(suma(PAID, f => f.pipeline))}</td><td>{millones(suma(PAID, f => f.facturado))}</td></tr></tfoot>
      </table></div>
    </LaminaAnexo>

    <LaminaAnexo id="web" laminas={laminas} titulo={<>La web por empresa: <em>de la visita a la venta</em></>} bajada="Las cinco vistas del gráfico de la lámina, en una sola tabla. Es el corte que reporta el canal: no se suma al de paid ni al pipeline de Orbit." fuente={`${FUENTE} · reporte web del equipo`}>
      <div className={`${estilos.panel} ${estilos.cajaTabla}`}><table className={estilos.tablaAnexo}>
        <thead><tr><th scope="col">Empresa</th><th scope="col">Visitas</th><th scope="col">En Google</th><th scope="col">MQL</th><th scope="col">SQL</th><th scope="col">Pipeline</th><th scope="col">Facturado + por facturar</th></tr></thead>
        <tbody>{web.map(w => <tr key={w.udn}><th scope="row"><LogoUdn nombre={w.udn} /></th>
          <td data-mayor={w.visitas === destacado(web.map(x => x.visitas)) || undefined}>{entero.format(w.visitas)}</td>
          <td>{w.posicion}</td>
          <td data-mayor={w.mql === destacado(web.map(x => x.mql)) || undefined}>{entero.format(w.mql)}</td>
          <td data-mayor={w.sql === destacado(web.map(x => x.sql)) || undefined}>{entero.format(w.sql)}</td>
          <td data-mayor={w.pipeline === destacado(web.map(x => x.pipeline)) || undefined}>{millones(w.pipeline)}</td>
          <td data-mayor={w.facturado === destacado(web.map(x => x.facturado)) || undefined}>{millones(w.facturado)}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Los siete sitios</th><td>{entero.format(suma(WEB, f => f.visitas))}</td><td /><td>{entero.format(suma(WEB, f => f.mql))}</td><td>{entero.format(suma(WEB, f => f.sql))}</td><td>{millones(suma(WEB, f => f.pipeline))}</td><td>{millones(suma(WEB, f => f.facturado))}</td></tr></tfoot>
      </table></div>
    </LaminaAnexo>

    <LaminaAnexo id="upax-one" laminas={laminas} titulo={<>UPAX ONE: <em>los renders completos</em></>} bajada="El mapa del evento, con un espacio para cada empresa alrededor del escenario; el encuentro de la comunidad y el túnel de llegada." fuente={`${FUENTE} · propuesta conceptual / renders del equipo`}>
      <div className={estilos.rendersAnexo}>
        <figure className={estilos.panel}><Image src={mapa.src} alt={mapa.alt} width={mapa.ancho} height={mapa.alto} unoptimized /><figcaption>{mapa.pie}</figcaption></figure>
        <div>
          <figure className={estilos.panel}><Image src={salon.src} alt={salon.alt} width={salon.ancho} height={salon.alto} unoptimized /><figcaption>{salon.pie}</figcaption></figure>
          <figure className={estilos.panel} data-recorte="true"><Image src={tunel.src} alt={tunel.alt} width={tunel.ancho} height={tunel.alto} unoptimized /><figcaption>{tunel.pie} · {tunel.titulo?.toLowerCase()}</figcaption></figure>
        </div>
      </div>
    </LaminaAnexo>
  </>
}
