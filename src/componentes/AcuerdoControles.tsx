'use client'

import { useRef, useState, useTransition } from 'react'
import estilos from '@/app/cliente/cliente.module.css'

type EstatusAcuerdo = 'abierto' | 'cumplido' | 'vencido' | 'cancelado'

interface Props {
  acuerdoId: string
  estatusInicial: 'abierto' | 'cumplido' | 'vencido'
  fechaInicial: string | null // yyyy-mm-dd
  cambiarEstatusAction: (acuerdoId: string, estatus: EstatusAcuerdo) => Promise<void>
  editarFechaAction: (acuerdoId: string, fecha: string | null) => Promise<void>
  /**
   * ELIMINAR, OPCIONAL (ronda 14, tarea 4). En la sala el equipo entero que
   * llega aquí puede borrar (`editaAcuerdos` ya es admin+editor juntos), pero
   * `/acuerdos` reparte los roles distinto — Franco: *"como administrador
   * debo poder eliminar acuerdos"*, y corregir estatus/fecha es de editor.
   * Un editor sin admin monta igual este componente para mover estatus y
   * fecha, y NO tiene que recibir una × que no hace nada: mismo criterio que
   * `eliminar` en `TablaAcuerdos` — un botón sin manejador es peor que la
   * ausencia del botón. Por eso, sin esta acción, el componente NO PINTA su
   * ×. La sala la sigue pasando siempre (ver `src/app/cliente/[slug]/page.tsx`),
   * así que su comportamiento no cambia un pixel.
   */
  eliminarAction?: (acuerdoId: string) => Promise<void>
}

/**
 * Controles de edición para el equipo interno (spec §4/§6): cambiar estatus
 * y editar la fecha compromiso de un acuerdo, discretos dentro de la fila ya
 * existente de `sala/[slug]/page.tsx` — no se rediseña la vista de sala.
 *
 * Solo se pintan si quien mira es del equipo: la vista de sala los envuelve en
 * `{equipo && ...}`. Esconderlos es cosmética — lo que de verdad protege es
 * `exigirEdicionDeAcuerdos(slug)` al inicio de cada Server Action que recibe
 * este componente (`cambiarEstatusAction`/`editarFechaAction`/
 * `eliminarAction`, ver `src/app/cliente/[slug]/page.tsx`): admite al
 * equipo (admin o editor) Y al director de esta UDN en su propia sala, y una
 * acción es un endpoint que se puede llamar sin pasar por esta pantalla.
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
  // Lo último que de verdad se mandó a guardar (mismo patrón que
  // `ultimoGuardado` en EditorSeccion.tsx): enfocar y salir del campo sin
  // tocar el valor dispara el `onBlur` igual que si se hubiera editado — sin
  // esta referencia no hay forma de distinguir "no cambió nada" de "cambió y
  // ya se guardó", y cada blur reescribía la fecha (entrada nueva en
  // `historia`, llamada a Monday) aunque el día siguiera siendo el mismo.
  const fechaGuardada = useRef(fechaInicial ?? '')

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
        onBlur={() => {
          // Nada que guardar: es exactamente el caso de enfocar y salir sin
          // tocar el valor — tabular por una fila entera de acuerdos no debe
          // escribir una vez por celda.
          if (fecha === fechaGuardada.current) return
          fechaGuardada.current = fecha
          startTransition(() => editarFechaAction(acuerdoId, fecha || null))
        }}
      />

      {/* Borrar es irreversible y no hay papelera: se pide confirmación en el
          propio sitio, sin un diálogo del navegador que bloquea la página.
          Cancelar es distinto de borrar y sigue estando en el desplegable: un
          acuerdo cancelado existió y se dejó sin efecto; uno borrado nunca
          debió existir (un duplicado, un error de dedo).

          Y TODO ESTE BLOQUE es condicional a que llegue `eliminarAction`
          (ver el porqué en la cabecera de `Props`): sin ella, ni el botón ni
          la confirmación se pintan — no solo se deshabilitan. */}
      {eliminarAction && (
        confirmando ? (
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
        )
      )}
    </div>
  )
}
