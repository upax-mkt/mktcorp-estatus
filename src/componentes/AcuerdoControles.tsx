'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/cliente/cliente.module.css'

type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

interface Props {
  acuerdoId: string
  estatusInicial: 'abierto' | 'cumplido' | 'vencido'
  fechaInicial: string | null // yyyy-mm-dd
  cambiarEstatusAction: (acuerdoId: string, estatus: EstatusAcuerdo) => Promise<void>
  editarFechaAction: (acuerdoId: string, fecha: string | null) => Promise<void>
  eliminarAction: (acuerdoId: string) => Promise<void>
}

/**
 * Controles de edición para el equipo interno (spec §4/§6): cambiar estatus
 * y editar la fecha compromiso de un acuerdo, discretos dentro de la fila ya
 * existente de `sala/[slug]/page.tsx` — no se rediseña la vista de sala.
 *
 * Solo se pintan si quien mira es del equipo: la vista de sala los envuelve en
 * `{equipo && ...}`. Esconderlos es cosmética — lo que de verdad protege es el
 * `exigirEquipo()` al inicio de cada Server Action, porque una acción es un
 * endpoint y se puede llamar sin pasar por esta pantalla.
 */
export function AcuerdoControles({
  acuerdoId,
  estatusInicial,
  fechaInicial,
  cambiarEstatusAction,
  editarFechaAction,
  eliminarAction,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(fechaInicial ?? '')
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className={estilos.controlesEquipo} title="Solo equipo Mkt Corp">
      <select
        className={estilos.selectEstatus}
        defaultValue={estatusInicial}
        disabled={pending}
        onChange={(e) => startTransition(() => cambiarEstatusAction(acuerdoId, e.target.value as EstatusAcuerdo))}
        aria-label="Cambiar estatus del acuerdo"
      >
        <option value="abierto">Abierto</option>
        <option value="cumplido">Cumplido</option>
        <option value="vencido">Vencido</option>
        <option value="cancelado">Cancelado</option>
      </select>
      <input
        type="date"
        className={estilos.inputFechaChica}
        value={fecha}
        disabled={pending}
        aria-label="Editar fecha compromiso"
        onChange={(e) => setFecha(e.target.value)}
        onBlur={() => startTransition(() => editarFechaAction(acuerdoId, fecha || null))}
      />

      {/* Borrar es irreversible y no hay papelera: se pide confirmación en el
          propio sitio, sin un diálogo del navegador que bloquea la página.
          Cancelar es distinto de borrar y sigue estando en el desplegable: un
          acuerdo cancelado existió y se dejó sin efecto; uno borrado nunca
          debió existir (un duplicado, un error de dedo). */}
      {confirmando ? (
        <span className={estilos.confirmarBorrado}>
          <button
            type="button"
            className={estilos.botonBorrar}
            disabled={pending}
            onClick={() => startTransition(() => eliminarAction(acuerdoId))}
          >
            Borrar
          </button>
          <button type="button" className={estilos.botonCancelarBorrado} onClick={() => setConfirmando(false)}>
            No
          </button>
        </span>
      ) : (
        <button
          type="button"
          className={estilos.botonIconoBorrar}
          onClick={() => setConfirmando(true)}
          title="Eliminar acuerdo"
          aria-label="Eliminar acuerdo"
        >
          ×
        </button>
      )}
    </div>
  )
}
