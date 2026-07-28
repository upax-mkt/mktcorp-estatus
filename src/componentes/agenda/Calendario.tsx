'use client'

import { useState } from 'react'
import { semanasDelMes, agruparPorDia, mesVecino, NOMBRES_DE_DIA } from '@/dominio/calendario'
import { mesLargo, horaBreve } from '@/lib/fecha'
import estilos from '@/app/agenda/agenda.module.css'

/**
 * El mes de un vistazo: qué sala tiene sesión cada día.
 *
 * Diez salas con cadencias distintas no se siguen en una lista — eso es lo
 * que pidió Franco, y es también por qué el cuadro muestra el COLOR de cada
 * sala y no un punto neutro: la pregunta que se hace de un vistazo no es
 * "¿cuántas reuniones hay el martes?" sino "¿cuándo me toca Mexa?".
 *
 * La navegación de mes es local: las sesiones caben de sobra en una carga
 * (diez salas, cadencia mensual) y pedirle una ida y vuelta al servidor para
 * pasar de julio a agosto sería lento sin ganar nada.
 */

export interface SesionEnCalendario {
  id: string
  fecha: string // ISO
  titulo: string
  salaSlug: string
  salaNombre: string
  salaColor: string
  estado: string
}

interface Props {
  sesiones: SesionEnCalendario[]
  /** Hoy, resuelto en el servidor: el cliente no debe inventar la fecha. */
  hoy: string
  /** Mes en el que abrir (YYYY-MM). Por defecto, el de hoy. */
  mesInicial?: string | null
  alElegirDia?: (dia: string) => void
}

export function Calendario({ sesiones, hoy, mesInicial, alElegirDia }: Props) {
  const referencia = new Date(hoy)
  const [{ anio, mes }, setMes] = useState(() => {
    if (mesInicial) {
      const [a, m] = mesInicial.split('-').map(Number)
      if (a && m) return { anio: a, mes: m - 1 }
    }
    return { anio: referencia.getFullYear(), mes: referencia.getMonth() }
  })

  const semanas = semanasDelMes(anio, mes, referencia)
  const porDia = agruparPorDia(sesiones)

  return (
    <div className={estilos.calendario}>
      <div className={estilos.calendarioBarra}>
        <h2 className={estilos.calendarioMes}>{mesLargo(anio, mes)}</h2>
        <div className={estilos.calendarioNav}>
          <button
            type="button"
            className={estilos.calendarioBoton}
            onClick={() => setMes(mesVecino(anio, mes, -1))}
            aria-label="Mes anterior"
          >
            ←
          </button>
          <button
            type="button"
            className={estilos.calendarioHoy}
            onClick={() => setMes({ anio: referencia.getFullYear(), mes: referencia.getMonth() })}
          >
            Hoy
          </button>
          <button
            type="button"
            className={estilos.calendarioBoton}
            onClick={() => setMes(mesVecino(anio, mes, 1))}
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      <div className={estilos.rejilla} role="grid" aria-label={`Sesiones de ${mesLargo(anio, mes)}`}>
        {NOMBRES_DE_DIA.map((nombre) => (
          <div key={nombre} className={estilos.cabeceraDia}>
            {nombre}
          </div>
        ))}

        {semanas.flat().map((celda) => {
          const delDia = porDia.get(celda.dia) ?? []
          return (
            <div
              key={celda.dia}
              className={estilos.celda}
              data-fuera={celda.delMes ? undefined : 'true'}
              data-hoy={celda.esHoy ? 'true' : undefined}
              onClick={alElegirDia && celda.delMes ? () => alElegirDia(celda.dia) : undefined}
            >
              <span className={estilos.numeroDia}>{celda.numero}</span>
              {delDia.map((s) => (
                <a
                  key={s.id}
                  href={`/preparar/${s.id}`}
                  className={estilos.marca}
                  style={{ '--sala': s.salaColor } as React.CSSProperties}
                  data-estado={s.estado}
                  title={`${s.salaNombre} · ${horaBreve(s.fecha)} · ${s.titulo}`}
                >
                  <span className={estilos.marcaHora}>{horaBreve(s.fecha)}</span>
                  <span className={estilos.marcaSala}>{s.salaNombre}</span>
                </a>
              ))}
            </div>
          )
        })}
      </div>

      <p className={estilos.leyendaCalendario}>
        <span className={estilos.leyendaItem} data-estado="agendada">agendada</span>
        <span className={estilos.leyendaItem} data-estado="borrador">preparándose</span>
        <span className={estilos.leyendaItem} data-estado="presentada">ya se dio</span>
      </p>
    </div>
  )
}
