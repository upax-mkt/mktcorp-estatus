'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AcuerdoConSala, EstatusAcuerdo } from '@/db/consultas'
import { fechaBreve } from '@/lib/fecha'
import { Estrella } from '@/componentes/acuerdos/Estrella'
import estilos from '@/app/hub.module.css'
import { colorDeTextoDeMarca } from '@/temas'

/**
 * Acuerdos y pendientes, dentro del Home y EDITABLES ahí mismo.
 *
 * Antes era una sola lista de "en riesgo" (vencidos + sin fecha). Ahora son
 * DOS preguntas distintas, con la estrella de la tarea 11 como bisagra entre
 * ellas (tarea 12):
 *
 * - Destacados: lo que el equipo decidió que vale la pena tener a la vista,
 *   cruzando las diez salas — sea cual sea su estatus. Es curaduría, no un
 *   cálculo.
 * - Vencidos: lo que objetivamente se pasó de fecha. No hace falta
 *   destacarlo para que aparezca aquí; es la señal que no se cura, se
 *   resuelve. (Una sala en freeze no aporta nada a este bloque — sus
 *   acuerdos están congelados, no vencidos: ver `estatusEfectivo`.)
 *
 * SOLAPAMIENTO (crítico de la auditoría UX/UI, ronda 11): `destacados` y
 * `vencidos` llegan como dos filtros INDEPENDIENTES sobre la misma lista
 * (`src/app/page.tsx`, `todosLosAcuerdos()`) y a propósito no son
 * excluyentes — cada uno contesta su propia pregunta completa ("todo lo
 * destacado", "todo lo vencido"), así que un acuerdo destacado que además
 * venció cumple los dos y llega aquí en las DOS listas. Hasta esta ronda
 * este componente lo pintaba entero en los dos bloques: mismo texto, misma
 * fecha, mismo botón, misma estrella.
 *
 * VENCIDOS MANDA — decisión de diseño, no accidente:
 * - Vencido es un hecho del calendario ("esto se pasó de fecha"); no deja de
 *   ser cierto porque alguien también lo haya destacado. Destacado es
 *   curaduría ("esto importa ahora"), una preferencia puesta a mano.
 * - La píldora roja de la cabecera, aquí abajo, cuenta sobre `vencidos` TAL
 *   CUAL llega, sin dedupear — si Destacados ganara el empate esa cuenta
 *   escondería acuerdos de verdad vencidos detrás de una curaduría manual, y
 *   es precisamente la cifra que Franco mira primero cada mañana.
 * - Nada se pierde: `Fila`, más abajo, ya pinta la estrella rellena cuando
 *   `acuerdo.destacado` es cierto y la píldora de fecha en rojo cuando
 *   `acuerdo.estatus` es 'vencido' — LAS DOS señales, sin importar en qué
 *   bloque caiga la fila. Un destacado que vence se sigue viendo destacado;
 *   solo cambia de vecindario, hacia el que se resuelve.
 *
 * CUATRO vacíos posibles, no tres — el de Destacados tiene DOS motivos
 * distintos para estar vacío ("nadie destacó nada todavía" y "lo único
 * destacado se fue a Vencidos") y cada uno necesita su propio texto: decir
 * el equivocado sobre un conjunto vacío ya pasó una vez en este proyecto
 * (ver el test de este componente).
 */

interface Props {
  destacados: AcuerdoConSala[]
  vencidos: AcuerdoConSala[]
  /**
   * Cuántos acuerdos hay EN TOTAL, de cualquier sala y estatus. Es el único
   * dato que distingue "todavía no hay ni uno" de "los hay, pero ninguno cae
   * en estos dos bloques" — los dos bloques pueden estar vacíos a la vez sin
   * que eso signifique que no hay nada.
   */
  total: number
  destacarAction: (id: string, destacado: boolean) => Promise<void>
  cambiarEstatusAction: (id: string, estatus: EstatusAcuerdo) => Promise<void>
  ponerFechaAction: (id: string, fecha: string | null) => Promise<void>
}

export function ModuloAcuerdos({
  destacados, vencidos, total, destacarAction, cambiarEstatusAction, ponerFechaAction,
}: Props) {
  if (total === 0) {
    return (
      <section className={`tarjeta ${estilos.modulo}`}>
        <header className={estilos.moduloCabecera}>
          <h2 className={estilos.moduloTitulo}>Acuerdos y pendientes</h2>
        </header>
        <p className={estilos.moduloVacio}>
          Todavía no hay acuerdos. Se levantan en el espacio del cliente o al cerrar una minuta.
        </p>
      </section>
    )
  }

  // EL MISMO ACUERDO SE PINTABA DOS VECES (crítico de la auditoría UX/UI,
  // ronda 11) — dedupe AQUÍ, al pintar, en vez de confiar en que quien arma
  // las dos listas (`src/app/page.tsx`) nunca las solape: es esta pantalla,
  // no la de origen, la que sabe qué significa "pintar" un acuerdo dos
  // veces. VENCIDOS MANDA (razonamiento completo arriba, en la cabecera del
  // archivo): un acuerdo presente en las dos listas se pinta SOLO en el
  // bloque de Vencidos.
  const idsVencidos = new Set(vencidos.map((a) => a.id))
  const destacadosSinVencer = destacados.filter((a) => !idsVencidos.has(a.id))
  // Cuántos destacados quedaron FUERA del bloque de arriba solo porque
  // vencieron — sin este número, un destacado vencido en solitario deja
  // "Destacados" vacío exactamente igual que "nadie destacó nada todavía", y
  // son dos mensajes distintos: uno invita a elegir algo, el otro señala
  // dónde mirar. Se deriva de `destacados` (no se pierde nada: ver arriba).
  const destacadosVencidos = destacados.length - destacadosSinVencer.length

  return (
    <section className={`tarjeta ${estilos.modulo}`}>
      <header className={estilos.moduloCabecera}>
        <h2 className={estilos.moduloTitulo}>Acuerdos y pendientes</h2>
        {vencidos.length > 0 && (
          <span className="pildora" data-tono="mal">
            {vencidos.length} vencido{vencidos.length > 1 ? 's' : ''}
          </span>
        )}
      </header>

      <div className={estilos.moduloBloque}>
        <h3 className={estilos.moduloSubtitulo}>Destacados</h3>
        {destacadosSinVencer.length === 0 ? (
          <p className={estilos.moduloVacio}>
            {destacadosVencidos > 0 ? (
              destacadosVencidos === 1
                ? 'El destacado está vencido: lo ves abajo, en Vencidos.'
                : `Los ${destacadosVencidos} destacados están vencidos: los ves abajo, en Vencidos.`
            ) : (
              <>
                Nada destacado todavía.{' '}
                <Link href="/acuerdos" className={estilos.enlaceSuave}>Elegir en el espacio de acuerdos →</Link>
              </>
            )}
          </p>
        ) : (
          <ul className={estilos.acuerdos}>
            {destacadosSinVencer.map((a) => (
              <Fila
                key={a.id}
                acuerdo={a}
                destacarAction={destacarAction}
                cambiarEstatusAction={cambiarEstatusAction}
                ponerFechaAction={ponerFechaAction}
              />
            ))}
          </ul>
        )}
      </div>

      <div className={estilos.moduloBloque}>
        <h3 className={estilos.moduloSubtitulo}>Vencidos</h3>
        {vencidos.length === 0 ? (
          <p className={estilos.moduloVacio}>Todo lo abierto está en fecha.</p>
        ) : (
          <ul className={estilos.acuerdos}>
            {vencidos.map((a) => (
              <Fila
                key={a.id}
                acuerdo={a}
                destacarAction={destacarAction}
                cambiarEstatusAction={cambiarEstatusAction}
                ponerFechaAction={ponerFechaAction}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function Fila({
  acuerdo,
  destacarAction,
  cambiarEstatusAction,
  ponerFechaAction,
}: {
  acuerdo: AcuerdoConSala
  destacarAction: Props['destacarAction']
  cambiarEstatusAction: Props['cambiarEstatusAction']
  ponerFechaAction: Props['ponerFechaAction']
}) {
  const [pendiente, empezar] = useTransition()
  const [editandoFecha, setEditandoFecha] = useState(false)

  return (
    <li className={estilos.acuerdo} style={{ '--marca': acuerdo.salaColor, '--marca-texto': colorDeTextoDeMarca(acuerdo.salaColor) } as React.CSSProperties}>
      <div className={estilos.acuerdoCuerpo}>
        <p className={estilos.acuerdoQue}>{acuerdo.que}</p>
        <div className={estilos.acuerdoMeta}>
          <Link href={`/cliente/${acuerdo.salaSlug}`} className={estilos.acuerdoSala}>
            {acuerdo.salaNombre}
          </Link>
          <span className={estilos.punto} aria-hidden>·</span>
          <span>{acuerdo.responsable === 'por asignar' ? 'sin dueño' : acuerdo.responsable}</span>
        </div>
      </div>

      <div className={estilos.acuerdoControles}>
        {/* La fecha se pone AQUÍ. "Sin fecha" es la mitad de lo que pone a un
            acuerdo en riesgo, y resolverlo tiene que costar un clic. */}
        {editandoFecha ? (
          <input
            type="date"
            className={estilos.campoFecha}
            defaultValue={acuerdo.fechaCompromiso ?? ''}
            autoFocus
            disabled={pendiente}
            onBlur={(e) => {
              const v = e.target.value
              empezar(async () => {
                await ponerFechaAction(acuerdo.id, v || null)
                setEditandoFecha(false)
              })
            }}
          />
        ) : (
          <button
            type="button"
            className="pildora"
            data-tono={acuerdo.estatus === 'vencido' ? 'mal' : acuerdo.fechaCompromiso ? undefined : 'ojo'}
            onClick={() => setEditandoFecha(true)}
          >
            {acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}
          </button>
        )}

        {/* Un destacado ya cumplido no necesita el botón: marcarlo otra vez
            no cambia nada y solo confundiría. En Vencidos siempre aplica. */}
        {acuerdo.estatus !== 'cumplido' && (
          <button
            type="button"
            className="boton"
            data-tono="suave"
            disabled={pendiente}
            onClick={() => empezar(async () => { await cambiarEstatusAction(acuerdo.id, 'cumplido') })}
          >
            {pendiente ? '…' : 'Cumplido'}
          </button>
        )}

        <Estrella acuerdoId={acuerdo.id} destacado={acuerdo.destacado} destacar={destacarAction} />
      </div>
    </li>
  )
}
