'use client'

import { useState } from 'react'
import Link from 'next/link'
import { semanasDelMes, agruparPorDia, mesVecino, NOMBRES_DE_DIA } from '@/dominio/calendario'
import { mesLargo, horaBreve, diaCivil, fechaCompleta } from '@/lib/fecha'
import type { SesionEnCalendario } from '@/componentes/agenda/Calendario'
import estilos from '@/app/hub.module.css'

/**
 * El mes, dentro del Home.
 *
 * Franco lo pidió como módulo del Home y no como pantalla aparte, y tiene
 * razón: "¿cuándo me toca Mexa?" es una pregunta de pantalla de inicio, no un
 * viaje a otra ruta. La página `/agenda` sigue existiendo para agendar y
 * editar; aquí se MIRA y se salta al día.
 *
 * Compacto a propósito: sin nombres de sala dentro de las celdas, solo un
 * punto del color de cada marca. En un cuadro de esta altura el nombre no
 * cabe sin recortarse, y un nombre recortado no se lee — el color sí.
 */

interface Props {
  sesiones: SesionEnCalendario[]
  hoy: string
}

export function ModuloCalendario({ sesiones, hoy }: Props) {
  const referencia = new Date(hoy)
  const [{ anio, mes }, setMes] = useState({
    anio: referencia.getFullYear(),
    mes: referencia.getMonth(),
  })
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)

  const semanas = semanasDelMes(anio, mes, referencia)
  const porDia = agruparPorDia(sesiones)
  const delDiaAbierto = diaAbierto ? (porDia.get(diaAbierto) ?? []) : []

  return (
    <section className={`tarjeta ${estilos.modulo}`}>
      <header className={estilos.moduloCabecera}>
        <h2 className={estilos.moduloTitulo}>{mesLargo(anio, mes)}</h2>
        <div className={estilos.moduloAcciones}>
          <button
            type="button"
            className={estilos.pasoMes}
            onClick={() => { setDiaAbierto(null); setMes(mesVecino(anio, mes, -1)) }}
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className={estilos.pasoMes}
            onClick={() => { setDiaAbierto(null); setMes(mesVecino(anio, mes, 1)) }}
            aria-label="Mes siguiente"
          >
            ›
          </button>
          <Link href="/agenda" className="boton" data-tono="fantasma">Agenda →</Link>
        </div>
      </header>

      <div className={estilos.rejillaMes} role="grid" aria-label={`Sesiones de ${mesLargo(anio, mes)}`}>
        {NOMBRES_DE_DIA.map((n) => (
          <span key={n} className={estilos.diaCabecera}>{n}</span>
        ))}

        {semanas.flat().map((celda) => {
          const delDia = porDia.get(celda.dia) ?? []
          return (
            <button
              key={celda.dia}
              type="button"
              className={estilos.diaCelda}
              data-fuera={celda.delMes ? undefined : 'true'}
              data-hoy={celda.esHoy ? 'true' : undefined}
              data-abierto={celda.dia === diaAbierto ? 'true' : undefined}
              data-ocupado={delDia.length > 0 ? 'true' : undefined}
              onClick={() => setDiaAbierto(celda.dia === diaAbierto ? null : celda.dia)}
              aria-label={`${celda.numero}${delDia.length ? `, ${delDia.length} sesión(es)` : ''}`}
            >
              <span className={estilos.diaNumero}>{celda.numero}</span>
              {/* Puntos del color de cada marca. No caben nombres aquí, y un
                  nombre recortado no se lee; el color sí. */}
              {delDia.length > 0 && (
                <span className={estilos.diaPuntos}>
                  {delDia.slice(0, 3).map((s) => (
                    <span key={s.id} className={estilos.diaPunto} style={{ background: s.salaColor }} />
                  ))}
                  {delDia.length > 3 && <span className={estilos.diaMas}>+{delDia.length - 3}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Al tocar un día se abre lo que hay ese día, sin cambiar de pantalla. */}
      {diaAbierto && (
        <div className={estilos.diaDetalle}>
          <span className="micro">{fechaCompleta(diaAbierto)}</span>
          {delDiaAbierto.length === 0 ? (
            <p className={estilos.moduloVacio}>
              Nada agendado. <Link href="/agenda" className={estilos.enlaceSuave}>Agendar →</Link>
            </p>
          ) : (
            <ul className={estilos.listaDia}>
              {delDiaAbierto.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/deck/${s.id}`}
                    className={estilos.filaDia}
                    style={{ '--marca': s.salaColor } as React.CSSProperties}
                  >
                    <span className={estilos.filaDiaHora}>{horaBreve(s.fecha)}</span>
                    <span className={estilos.filaDiaSala}>{s.salaNombre}</span>
                    <span className={estilos.filaDiaTitulo}>{s.titulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Lo siguiente que viene, siempre a la vista aunque no se toque nada. */}
      {!diaAbierto && <Proximas sesiones={sesiones} hoy={hoy} />}
    </section>
  )
}

function Proximas({ sesiones, hoy }: Props) {
  const proximas = sesiones
    .filter((s) => s.estado !== 'presentada' && s.estado !== 'minutada')
    .filter((s) => diaCivil(s.fecha) >= diaCivil(hoy))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 3)

  if (proximas.length === 0) {
    return (
      <div className={estilos.diaDetalle}>
        <p className={estilos.moduloVacio}>
          No hay sesiones agendadas. <Link href="/agenda" className={estilos.enlaceSuave}>Agendar la primera →</Link>
        </p>
      </div>
    )
  }

  return (
    <div className={estilos.diaDetalle}>
      <span className="micro">Lo que viene</span>
      <ul className={estilos.listaDia}>
        {proximas.map((s) => (
          <li key={s.id}>
            <Link
              href={`/deck/${s.id}`}
              className={estilos.filaDia}
              style={{ '--marca': s.salaColor } as React.CSSProperties}
            >
              <span className={estilos.filaDiaHora}>{fechaCompleta(s.fecha).replace(/ de \d{4}$/, '')}</span>
              <span className={estilos.filaDiaSala}>{s.salaNombre}</span>
              <span className={estilos.filaDiaTitulo}>{s.titulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
