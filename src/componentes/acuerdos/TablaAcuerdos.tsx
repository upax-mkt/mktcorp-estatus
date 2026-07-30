'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import type { AcuerdoConSala } from '@/db/consultas'
import { fechaBreve } from '@/lib/fecha'
import { colorDeTextoDeMarca } from '@/temas'
import { Estrella } from './Estrella'
import estilos from './bandeja.module.css'

interface Props {
  acuerdos: AcuerdoConSala[]
  /** `destacarAction` — ver la cabecera de Estrella.tsx sobre por qué se recibe por prop. */
  destacar: (id: string, destacado: boolean) => Promise<void>
}

const ETIQUETA_ESTATUS: Record<AcuerdoConSala['estatus'], string> = {
  abierto: 'Abierto',
  vencido: 'Vencido',
  cumplido: 'Cumplido',
}

/** El tono de `.pildora` (sistema.css) para cada estatus. `undefined` = neutro, para "abierto". */
const TONO_ESTATUS: Partial<Record<AcuerdoConSala['estatus'], string>> = {
  cumplido: 'bien',
  vencido: 'mal',
}

const SIN_FILTRO = ''

/**
 * EL ESPACIO DE ACUERDOS: las diez salas juntas, filtrables, con la sala en
 * pausa aparte y apagada.
 *
 * Los filtros (sala, responsable, estatus) son de CLIENTE, sobre la lista que
 * ya llegó autorizada desde el servidor — la única puerta que importa es
 * quién puede cargar `/acuerdos` (`exigirEquipo()` en la página), no qué fila
 * queda visible después de elegir un filtro.
 */
export function TablaAcuerdos({ acuerdos, destacar }: Props) {
  const [sala, setSala] = useState(SIN_FILTRO)
  const [responsable, setResponsable] = useState(SIN_FILTRO)
  const [estatus, setEstatus] = useState(SIN_FILTRO)

  const salas = useMemo(() => {
    const vistas = new Map<string, string>()
    for (const a of acuerdos) vistas.set(a.salaSlug, a.salaNombre)
    return [...vistas.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [acuerdos])

  const responsables = useMemo(
    () => [...new Set(acuerdos.map((a) => a.responsable))].sort((a, b) => a.localeCompare(b, 'es')),
    [acuerdos],
  )

  // SIN NINGÚN ACUERDO —de ninguna sala, de ningún tipo— no tiene sentido
  // enseñar filtros para una tabla que no existe: ese vacío se dice antes de
  // llegar a los controles, no como una fila más dentro de una lista vacía.
  if (acuerdos.length === 0) {
    return (
      <p className={estilos.vacio}>
        Todavía no hay acuerdos. Se levantan en el espacio del cliente o al cerrar una minuta.
      </p>
    )
  }

  const coincide = (a: AcuerdoConSala) =>
    (sala === SIN_FILTRO || a.salaSlug === sala) &&
    (responsable === SIN_FILTRO || a.responsable === responsable) &&
    (estatus === SIN_FILTRO || a.estatus === estatus)

  const congeladosTodos = acuerdos.filter((a) => !a.salaActiva)
  const vivos = acuerdos.filter((a) => a.salaActiva && coincide(a))
  const congelados = congeladosTodos.filter(coincide)

  return (
    <>
      <div className={estilos.filtros}>
        <label className={estilos.filtro}>
          <span className="micro" data-sinpunto>Sala</span>
          <select className={estilos.select} value={sala} onChange={(e) => setSala(e.target.value)}>
            <option value={SIN_FILTRO}>Todas las salas</option>
            {salas.map(([slug, nombre]) => (
              <option key={slug} value={slug}>{nombre}</option>
            ))}
          </select>
        </label>
        <label className={estilos.filtro}>
          <span className="micro" data-sinpunto>Responsable</span>
          <select className={estilos.select} value={responsable} onChange={(e) => setResponsable(e.target.value)}>
            <option value={SIN_FILTRO}>Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className={estilos.filtro}>
          <span className="micro" data-sinpunto>Estatus</span>
          <select className={estilos.select} value={estatus} onChange={(e) => setEstatus(e.target.value)}>
            <option value={SIN_FILTRO}>Todos los estatus</option>
            <option value="abierto">Abierto</option>
            <option value="vencido">Vencido</option>
            <option value="cumplido">Cumplido</option>
          </select>
        </label>
      </div>

      <section className={`tarjeta ${estilos.tarjetaLista}`}>
        {vivos.length === 0 ? (
          <p className={estilos.vacio}>Ningún acuerdo coincide con estos filtros.</p>
        ) : (
          <ul className={estilos.lista}>
            {vivos.map((a) => (
              <Fila key={a.id} acuerdo={a} destacar={destacar} />
            ))}
          </ul>
        )}
      </section>

      {/* Aparte y apagado: hoy las diez salas están activas, así que este
          bloque no aparece nunca en producción todavía — pero el filtro por
          `salaActiva` ya está puesto (tarea 12 le da el interruptor de
          pausar). El día que exista una sala en pausa, empieza a mostrarse
          solo, sin tocar este componente otra vez. */}
      {congeladosTodos.length > 0 && (
        <section className={`tarjeta ${estilos.tarjetaLista} ${estilos.congelados}`} aria-label="Congelados">
          <h2 className={estilos.congeladosTitulo}>Congelados</h2>
          <p className={estilos.congeladosNota}>
            Sus salas están en pausa: no vencen, no cuentan y no se pueden subir a Monday.
          </p>
          {congelados.length === 0 ? (
            <p className={estilos.vacio}>Ningún acuerdo congelado coincide con estos filtros.</p>
          ) : (
            <ul className={estilos.lista}>
              {congelados.map((a) => (
                <Fila key={a.id} acuerdo={a} destacar={destacar} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}

function Fila({ acuerdo, destacar }: { acuerdo: AcuerdoConSala; destacar: Props['destacar'] }) {
  const estiloFila = {
    '--marca': acuerdo.salaColor,
    '--marca-texto': colorDeTextoDeMarca(acuerdo.salaColor),
  } as CSSProperties

  return (
    <li className={estilos.fila} style={estiloFila}>
      <div className={estilos.cuerpo}>
        <p className={estilos.que}>{acuerdo.que}</p>
        <div className={estilos.meta}>
          <Link href={`/cliente/${acuerdo.salaSlug}`} className={estilos.metaSala}>
            {acuerdo.salaNombre}
          </Link>
          <span className={estilos.punto} aria-hidden>·</span>
          <span>{acuerdo.responsable}</span>
          <span className={estilos.punto} aria-hidden>·</span>
          <span>{acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}</span>
          {acuerdo.mondayUrl && (
            <>
              <span className={estilos.punto} aria-hidden>·</span>
              <a href={acuerdo.mondayUrl} target="_blank" rel="noopener noreferrer" className={estilos.enlaceMonday}>
                Ver en Monday ↗
              </a>
            </>
          )}
        </div>
      </div>

      <div className={estilos.filaDcha}>
        <span className="pildora" data-tono={TONO_ESTATUS[acuerdo.estatus]}>
          {ETIQUETA_ESTATUS[acuerdo.estatus]}
        </span>
        <Estrella acuerdoId={acuerdo.id} destacado={acuerdo.destacado} destacar={destacar} />
      </div>
    </li>
  )
}
