'use client'

import { useState, useTransition } from 'react'
import { fechaCompleta } from '@/lib/fecha'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * EL INTERRUPTOR DE FREEZE COMERCIAL (tarea 12, ronda 7).
 *
 * Pausar apaga lo que la app le EXIGE a la sala —próxima reunión, seguimiento,
 * vencimientos— sin borrar nada de su historia: se sigue consultando igual.
 * Reactivar es la contrapartida exacta: sus acuerdos vuelven a correr y uno
 * que ya pasó de fecha aparece vencido ese mismo día (ver `estatusEfectivo`
 * en src/dominio/salas.ts).
 *
 * Confirmación EN EL SITIO antes de pausar, no un `confirm()` del navegador
 * que bloquea la página — mismo criterio que `ClaveDeSala` y
 * `AcuerdoControles`. Reactivar no la pide: es la vuelta a la normalidad, no
 * una acción destructiva.
 *
 * Solo EQUIPO la ve — la página la envuelve en `{equipo && ...}` — pero la
 * comprobación que cuenta es `exigirAdmin()` dentro de `pausarSalaAction` /
 * `reactivarSalaAction` (ronda 9, tarea 2: congelar una sala es una decisión
 * de administrador, no de cualquier editor): esconder este componente es
 * cosmética.
 */

interface Props {
  nombreSala: string
  activa: boolean
  pausadaDesde: string | null
  pausarAction: () => Promise<void>
  reactivarAction: () => Promise<void>
}

export function PausaSala({ nombreSala, activa, pausadaDesde, pausarAction, reactivarAction }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  function ejecutar(accion: () => Promise<void>) {
    setError(null)
    empezar(async () => {
      try {
        await accion()
        setConfirmando(false)
      } catch (e) {
        // El fallo tiene que LLEGAR A LA PANTALLA — mismo criterio que
        // Estrella.tsx: quien pulsó necesita leer por qué, no ver que el
        // interruptor simplemente no se movió.
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  if (activa) {
    return (
      <div className={estilos.acceso}>
        <div className={estilos.accesoTexto}>
          <div className={estilos.accesoTitulo}>{nombreSala} está activa</div>
          <p className={estilos.accesoNota}>
            En pausa se apagan la próxima reunión y los vencimientos, sin borrar nada de su
            historia: se sigue consultando igual.
          </p>
          {error && <p className={estilos.subirError}>{error}</p>}
        </div>

        {confirmando ? (
          <span className={estilos.confirmarBorrado}>
            <span className={estilos.subirPista}>No hay reuniones ni gestión hasta reactivarla.</span>
            <button
              type="button"
              className={estilos.botonBorrar}
              disabled={pendiente}
              onClick={() => ejecutar(pausarAction)}
            >
              {pendiente ? 'Pausando…' : 'Sí, pausar'}
            </button>
            <button type="button" className={estilos.botonCancelarBorrado} onClick={() => setConfirmando(false)}>
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={estilos.botonVolverSesion}
            disabled={pendiente}
            onClick={() => setConfirmando(true)}
          >
            Pausar esta sala
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={estilos.acceso}>
      <div className={estilos.accesoTexto}>
        <div className={estilos.accesoTitulo}>{nombreSala} está en pausa</div>
        <p className={estilos.accesoNota}>
          {pausadaDesde ? `Desde el ${fechaCompleta(pausadaDesde)}. ` : ''}
          No se piden reuniones ni se cuentan vencimientos. Su historia se sigue consultando igual;
          lo que no se puede es preparar una reunión nueva sin reactivarla primero.
        </p>
        {error && <p className={estilos.subirError}>{error}</p>}
      </div>
      <button type="button" className={estilos.accesoBoton} disabled={pendiente} onClick={() => ejecutar(reactivarAction)}>
        {pendiente ? 'Reactivando…' : 'Reactivar'}
      </button>
    </div>
  )
}
