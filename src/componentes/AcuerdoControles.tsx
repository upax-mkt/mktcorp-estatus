'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/sala/sala.module.css'

type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

interface Props {
  acuerdoId: string
  estatusInicial: 'abierto' | 'cumplido' | 'vencido'
  fechaInicial: string | null // yyyy-mm-dd
  cambiarEstatusAction: (acuerdoId: string, estatus: EstatusAcuerdo) => Promise<void>
  editarFechaAction: (acuerdoId: string, fecha: string | null) => Promise<void>
}

/**
 * Controles de edición para el equipo interno (spec §4/§6): cambiar estatus
 * y editar la fecha compromiso de un acuerdo, discretos dentro de la fila ya
 * existente de `sala/[slug]/page.tsx` — no se rediseña la vista de sala.
 *
 * [PENDIENTE — tarea "Login SSO Slack y tokens de sala"]: hoy no hay auth, así
 * que estos controles se muestran siempre, incluso en el link público de la
 * sala. Cuando exista sesión de equipo, envolver el `<AcuerdoControles>` del
 * padre en `{ esEquipoMktCorp && <AcuerdoControles ... /> }` para que la sala
 * pública (el director) deje de verlos.
 */
export function AcuerdoControles({
  acuerdoId,
  estatusInicial,
  fechaInicial,
  cambiarEstatusAction,
  editarFechaAction,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(fechaInicial ?? '')

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
    </div>
  )
}
