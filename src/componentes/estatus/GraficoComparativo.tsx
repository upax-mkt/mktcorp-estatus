'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { LogoUdn, lugarUdn, tieneLogo } from './LogoUdn'
import estilos from './estatus.module.css'

export type MetricaGrafico = {
  id: string
  nombre: string
  formato: 'entero' | 'dinero' | 'millones' | 'porcentaje'
  /** En una métrica de costo gana el menor: se resalta ese, no el mayor. */
  mejor?: 'menor'
}
export type FilaGrafico = { nombre: string; detalle?: string; valores: Record<string, number | null> }

const numero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })
const pesosEnteros = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const enMillones = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formato(valor: number | null | undefined, tipo: MetricaGrafico['formato']) {
  if (valor == null || !Number.isFinite(valor)) return 'Sin dato'
  if (tipo === 'millones') return `$${enMillones.format(valor / 1e6)} M`
  if (tipo === 'dinero') return `$${pesosEnteros.format(valor)}`
  if (tipo === 'porcentaje') return `${numero.format(valor * 100)}%`
  return numero.format(valor)
}

/**
 * ELEGIR UNA EMPRESA LA ENCIENDE EN TODOS LOS GRÁFICOS de la presentación.
 * El foco vive en `<html data-udn-foco>` y no en estado de React: lo leen por
 * CSS todos los gráficos a la vez, también los que aún no están en pantalla.
 * Volver a pulsar la misma empresa lo quita.
 */
function alternarFoco(nombre: string) {
  const raiz = document.documentElement
  if (raiz.dataset.udnFoco === nombre) delete raiz.dataset.udnFoco
  else raiz.dataset.udnFoco = nombre
}

/** La empresa que se está siguiendo en toda la pieza (vive en `<html data-udn-foco>`). */
function useFocoUdn() {
  const [foco, setFoco] = useState<string | null>(null)
  useEffect(() => {
    const raiz = document.documentElement
    const leer = () => setFoco(raiz.dataset.udnFoco ?? null)
    const observador = new MutationObserver(leer)
    observador.observe(raiz, { attributes: true, attributeFilter: ['data-udn-foco'] })
    leer()
    return () => observador.disconnect()
  }, [])
  return foco
}

const lugar = lugarUdn

/** Las filas permanecen al cambiar la métrica: una ausencia nunca elimina una UDN. */
export function GraficoComparativo({ titulo, metricas, filas, alerta, nota }: {
  titulo: string
  metricas: readonly [MetricaGrafico, ...MetricaGrafico[]]
  filas: FilaGrafico[]
  /** Empresas que la lámina señala como pendiente propio (dónde falta generar demanda): se marcan, no se resaltan como logro. */
  alerta?: readonly string[]
  /** Una línea bajo la tabla: lo que el gráfico no desglosa o lo que hay que leer en él. */
  nota?: ReactNode
}) {
  const [indice, setIndice] = useState(0)
  const foco = useFocoUdn()
  const ausente = foco && filas.some(f => tieneLogo(f.nombre)) && !filas.some(f => f.nombre === foco)
  const metrica = metricas[indice] ?? metricas[0]
  const ordenadas = [...filas].sort((a, b) => lugar(a.nombre) - lugar(b.nombre))
  const maximo = Math.max(0, ...filas.map(f => f.valores[metrica.id] ?? 0))
  const conDato = filas.map(f => f.valores[metrica.id]).filter((v): v is number => v != null && Number.isFinite(v))
  const destacado = metrica.mejor === 'menor' ? Math.min(...conDato) : maximo
  const siguiendo = !!foco && !ausente
  return (
    <div className={estilos.comparativo} onKeyDown={e => e.stopPropagation()}>
      <div className={estilos.graficoCabecera}>
        <h3>{titulo}{metricas.length > 1 && <span> · {metrica.nombre}</span>}</h3>
        {ausente && <p className={estilos.sinFoco}>{foco} no aparece en este corte</p>}
        {metricas.length > 1 && <div className={estilos.selector} role="group" aria-label={`Métrica de ${titulo}`}>
          {metricas.map((m, i) => <button key={m.id} type="button" aria-pressed={i === indice} onClick={() => setIndice(i)}>{m.nombre}</button>)}
        </div>}
      </div>
      <table className={estilos.tablaBarras} aria-label={`${titulo}: ${metrica.nombre}`}>
        <thead className={estilos.soloLectores}><tr><th scope="col">Empresa</th><th scope="col">{metrica.nombre}</th></tr></thead>
        <tbody>
          {ordenadas.map((fila, i) => {
            const valor = fila.valores[metrica.id]
            const ancho = valor != null && Number.isFinite(valor) && maximo > 0 ? Math.max(0, valor / maximo * 100) : 0
            return <tr key={fila.nombre} data-udn={fila.nombre} data-alerta={alerta?.includes(fila.nombre) || undefined} data-mayor={(maximo > 0 && valor === destacado && (!siguiendo || fila.nombre === foco)) || undefined}>
              <th scope="row">{tieneLogo(fila.nombre)
                ? <button type="button" className={estilos.udn} aria-label={fila.nombre} title={`Seguir a ${fila.nombre} en toda la presentación`} onClick={() => alternarFoco(fila.nombre)}><LogoUdn nombre={fila.nombre} /></button>
                : <span className={estilos.filaTexto}>{fila.nombre}</span>}{fila.detalle && <small>{fila.detalle}</small>}</th>
              <td><div className={estilos.celdaBarra}>
                <span aria-hidden="true" className={estilos.traza}><span className={estilos.relleno} style={{ '--ancho': `${ancho}%`, '--i': i } as CSSProperties} /></span>
                <strong data-vacio={valor == null || undefined}>{formato(valor, metrica.formato)}</strong>
              </div></td>
            </tr>
          })}
        </tbody>
      </table>
      {nota && <p className={estilos.graficoNota}>{nota}</p>}
      <p className={estilos.soloLectores} role="status">Mostrando {metrica.nombre}.</p>
    </div>
  )
}
