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
  /** Nulo si la reunión no pertenece a ninguna sala. */
  salaSlug: string | null
  salaNombre: string
  salaColor: string
  estado: string
}

/**
 * EL NOMBRE CORTO OFICIAL de cada UDN — la tabla de Franco en
 * `~/CLAUDE.md` ("OFFICIAL NAMES, NO EXCEPTIONS"), no una sigla inventada
 * aquí. Existe porque a 390px el chip de cada sesión mide ~28-34px de ancho
 * (medido con Playwright contra `/reuniones` real: 7 columnas compitiendo
 * con el padding de página y el borde de cada celda) y ningún nombre
 * completo cabe — "Research Land" pide 77px, "Marketing United" 91px — así
 * que hoy se cortan a dos o tres letras ("Res…", "Ma…"), que es exactamente
 * lo único que ese chip tiene que decir.
 *
 * La salida NO es el punto de color solo: Marketing United y House of Films
 * comparten el mismo primario NEGRO (pendiente conocido, fuera de este
 * arreglo — ver `ClaveDeSala`/leyenda), así que el color por sí solo no
 * distingue. Con un nombre corto de por medio esa ambigüedad deja de
 * importar: el texto es lo que identifica la sala, el color es refuerzo.
 *
 * Comparación por nombre completo, sin distinguir mayúsculas ni espacios
 * sobrantes, porque `salaNombre` es texto libre editado desde `/salas`
 * (`FormularioSala.tsx`) — el modelo (`EstadoSala`, `src/dominio/salas.ts`)
 * no tiene un campo de "nombre corto" propio.
 */
const NOMBRE_CORTO_DE_UDN: Record<string, string> = {
  'research land': 'RL',
  'promo espacio': 'PE',
  'marketing united': 'MU',
  'mexa creativa': 'MC',
  'house of films': 'HoF',
  uix: 'UiX',
  neracode: 'NC',
  zeus: 'Zeus',
}

/**
 * Una sala que NO está en la tabla de arriba —"Ceci" (no es UDN), o una que
 * un director cree mañana desde `/salas` con un nombre nuevo— no tiene
 * abreviatura oficial que inventar: se queda con su propio nombre completo,
 * sujeto al mismo `text-overflow: ellipsis` de siempre (`.marcaSalaCorta`,
 * `agenda.module.css`). Es el mismo comportamiento de HOY para esos casos
 * —ni mejor ni peor—, y evita acuñar una sigla que Franco no definió.
 */
export function nombreCortoDeSala(nombre: string): string {
  return NOMBRE_CORTO_DE_UDN[nombre.trim().toLowerCase()] ?? nombre
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

      <div className={estilos.rejilla} role="grid" aria-label={`Reuniones de ${mesLargo(anio, mes)}`}>
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
                  href={`/deck/${s.id}`}
                  className={estilos.marca}
                  style={{ '--sala': s.salaColor } as React.CSSProperties}
                  data-estado={s.estado}
                  title={`${s.salaNombre} · ${horaBreve(s.fecha)} · ${s.titulo}`}
                >
                  <span className={estilos.marcaHora}>{horaBreve(s.fecha)}</span>
                  {/* Dos textos, uno visible a la vez (`agenda.module.css`,
                      media query de 390px): el nombre completo para escritorio,
                      y el corto oficial —o el mismo nombre si no hay corto
                      oficial, ver `nombreCortoDeSala`— para cuando el chip no
                      tiene los ~90px que pide "Marketing United" entero. */}
                  <span className={estilos.marcaSala}>
                    <span className={estilos.marcaSalaLarga}>{s.salaNombre}</span>
                    <span className={estilos.marcaSalaCorta}>{nombreCortoDeSala(s.salaNombre)}</span>
                  </span>
                </a>
              ))}
            </div>
          )
        })}
      </div>

      <p className={estilos.leyendaCalendario}>
        <span className={estilos.leyendaItem} data-estado="agendada">agendada</span>
        <span className={estilos.leyendaItem} data-estado="dada">ya se dio</span>
      </p>
    </div>
  )
}
