import { semanasDelMes, agruparPorDia, mesVecino, NOMBRES_DE_DIA } from '@/dominio/calendario'
import { mesLargo, fechaCompleta } from '@/lib/fecha'
import type { ReunionPublica } from '@/db/reuniones'
import { ajustarColorParaContraste } from '@/lib/superficie-texto'
import estilos from './calendario-publico.module.css'

/**
 * EL FONDO REAL DE UNA FILA DE LA LISTA, en sRGB: `--papel-2` de
 * `sistema.css` (`oklch(0.985 0.002 250)`), medido en el navegador → `#f9fafb`.
 *
 * Va escrito aquí y no se usa `colorDeTextoDeMarca` (que es el atajo de
 * `src/temas`) porque ESE ajusta contra BLANCO PURO, y estas filas no son
 * blancas. La diferencia parece nada y cruza justo el umbral: medido, sobre
 * `#ffffff` el ajuste deja a Marketing United en 4,53 y a Mexa en 4,51, pero
 * sobre `#f9fafb` esos mismos colores caen a 4,37 y 4,35 — por debajo del
 * 4,5:1 de AA. Un color validado lo está contra un fondo concreto.
 */
const FONDO_DE_FILA = '#f9fafb'

interface Props {
  anio: number
  /** 1-12, como se dice un mes en voz alta — no 0-11 como `Date`. */
  mes: number
  reuniones: ReunionPublica[]
}

/**
 * El querystring del mes vecino, SIN slash inicial: `?mes=2026-08`.
 *
 * Es a propósito que no lleve `/agenda/<token>` delante — este componente no
 * conoce el token. Un enlace relativo así lo resuelve el navegador contra la
 * URL actual, así que el clic se queda dentro de `/agenda/<token>` solo,
 * sin que el componente tenga que saber en qué token está.
 */
function hrefDeMes(anio: number, mes1a12: number): string {
  return `?mes=${anio}-${String(mes1a12).padStart(2, '0')}`
}

/** No hay id de sesión en `ReunionPublica` —a propósito, ver sesionesPublicasDelMes—, así que la key sale de sus propios campos. */
function claveDe(r: ReunionPublica): string {
  return `${r.salaSlug}-${r.fecha}-${r.hora}`
}

/**
 * La agenda pública, en pantalla: qué sala, qué día y a qué hora — nada más.
 *
 * Componente de SERVIDOR sin interactividad: sin `'use client'`, sin estado,
 * sin efectos. La navegación de mes son dos `<a>` normales a un querystring
 * relativo (ver `hrefDeMes`), y son los ÚNICOS enlaces que pinta. Nada de
 * acuerdos, participantes, contenido de reunión ni enlaces hacia el resto de
 * la app: es una hoja, no una puerta.
 */
export function CalendarioPublico({ anio, mes, reuniones }: Props) {
  const mes0 = mes - 1 // semanasDelMes/mesLargo usan 0-11, como Date.
  const hoy = new Date()
  const semanas = semanasDelMes(anio, mes0, hoy)
  const porDia = agruparPorDia(reuniones)
  const anterior = mesVecino(anio, mes0, -1)
  const siguiente = mesVecino(anio, mes0, 1)

  // No se confía en el orden de llegada de `reuniones`: la lista se ordena
  // aquí, así que el componente es correcto sin importar quién lo llame.
  const ordenadas = [...reuniones].sort((a, b) =>
    a.fecha === b.fecha ? a.hora.localeCompare(b.hora) : a.fecha.localeCompare(b.fecha),
  )

  return (
    <div className={`tarjeta ${estilos.calendario}`}>
      <div className={estilos.barra}>
        <a href={hrefDeMes(anterior.anio, anterior.mes + 1)} className={estilos.navBoton} aria-label="Mes anterior">
          ←
        </a>
        <h2 className={estilos.mes}>{mesLargo(anio, mes0)}</h2>
        <a href={hrefDeMes(siguiente.anio, siguiente.mes + 1)} className={estilos.navBoton} aria-label="Mes siguiente">
          →
        </a>
      </div>

      <div className={estilos.rejilla} role="grid" aria-label={`Reuniones de ${mesLargo(anio, mes0)}`}>
        {NOMBRES_DE_DIA.map((nombre) => (
          <div key={nombre} className={estilos.cabeceraDia}>{nombre}</div>
        ))}

        {semanas.flat().map((celda) => {
          const delDia = porDia.get(celda.dia) ?? []
          return (
            <div
              key={celda.dia}
              className={estilos.celda}
              data-fuera={celda.delMes ? undefined : 'true'}
              data-hoy={celda.esHoy ? 'true' : undefined}
            >
              <span className={estilos.numeroDia}>{celda.numero}</span>
              {delDia.length > 0 && (
                <span className={estilos.puntos}>
                  {delDia.map((r) => (
                    <span
                      key={claveDe(r)}
                      className={estilos.punto}
                      style={{ '--sala': r.salaColor } as React.CSSProperties}
                      title={`${r.salaNombre} · ${r.hora}`}
                    />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {reuniones.length === 0 ? (
        <p className={estilos.vacio}>No hay reuniones agendadas para este mes.</p>
      ) : (
        <>
          <p className={estilos.listaTitulo}>Reuniones del mes</p>
          <ul className={estilos.lista}>
            {/*
              LAS DOS VARIABLES VAN EN EL `<li>`, NO EN EL PUNTO — y ese era el
              bug. `--sala` se declaraba solo en `.itemColor`, y una propiedad
              personalizada baja a los DESCENDIENTES, no cruza a los hermanos:
              `.itemSala { color: var(--sala) }` se quedaba sin valor, la
              declaración salía inválida y el nombre heredaba `--tinta`.
              Medido en el navegador: los seis nombres de sala pintaban
              exactamente el mismo casi-negro (`lab(9.47 …)`), Research Land
              igual que Mexa Creativa. El color de marca de esta pantalla vivía
              entero en un punto de 8 px.

              Y son DOS y no una, como manda `src/temas/index.ts`: `--sala` es
              el color exacto del brandbook, para el punto —ahí no hay nada que
              leer y la fidelidad manda—; `--sala-texto` es ese mismo tono
              oscurecido lo justo para llegar a 4,5:1 SOBRE ESTA FILA, para el
              nombre.
            */}
            {ordenadas.map((r) => (
              <li
                key={claveDe(r)}
                className={estilos.item}
                style={{
                  '--sala': r.salaColor,
                  '--sala-texto': ajustarColorParaContraste(r.salaColor, FONDO_DE_FILA, 4.5),
                } as React.CSSProperties}
              >
                <span className={estilos.itemColor} />
                <span className={estilos.itemSala}>{r.salaNombre}</span>
                <span className={estilos.itemFecha}>{fechaCompleta(r.fecha)}</span>
                <span className={estilos.itemHora}>{r.hora}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
