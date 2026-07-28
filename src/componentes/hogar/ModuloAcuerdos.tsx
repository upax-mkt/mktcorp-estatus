'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AcuerdoEnRiesgo, EstatusAcuerdo } from '@/db/consultas'
import { fechaBreve } from '@/lib/fecha'
import estilos from '@/app/hub.module.css'

/**
 * Acuerdos y pendientes, dentro del Home y EDITABLES ahí mismo.
 *
 * Antes el Home solo los listaba: para mover un estatus o poner una fecha
 * había que entrar a la sala, buscarlo entre todos los de esa UDN y volver.
 * Lo que se hace veinte veces al día no puede costar tres pantallas.
 *
 * Muestra los que están en riesgo —vencidos y sin fecha— porque son los que
 * justifican una pantalla de inicio: lo que ya está al día no necesita que
 * nadie lo mire.
 */

interface Props {
  acuerdos: AcuerdoEnRiesgo[]
  cambiarEstatusAction: (id: string, estatus: EstatusAcuerdo) => Promise<void>
  ponerFechaAction: (id: string, fecha: string | null) => Promise<void>
}

export function ModuloAcuerdos({ acuerdos, cambiarEstatusAction, ponerFechaAction }: Props) {
  if (acuerdos.length === 0) {
    return (
      <section className={`tarjeta ${estilos.modulo}`}>
        <header className={estilos.moduloCabecera}>
          <h2 className={estilos.moduloTitulo}>Acuerdos y pendientes</h2>
        </header>
        <p className={estilos.moduloVacio}>
          Nada vencido ni sin fecha. Todo lo abierto tiene dueño y día.
        </p>
      </section>
    )
  }

  return (
    <section className={`tarjeta ${estilos.modulo}`}>
      <header className={estilos.moduloCabecera}>
        <h2 className={estilos.moduloTitulo}>Acuerdos y pendientes</h2>
        <span className="pildora" data-tono="mal">{acuerdos.length} en riesgo</span>
      </header>

      <ul className={estilos.acuerdos}>
        {acuerdos.map((a) => (
          <Fila
            key={a.id}
            acuerdo={a}
            cambiarEstatusAction={cambiarEstatusAction}
            ponerFechaAction={ponerFechaAction}
          />
        ))}
      </ul>
    </section>
  )
}

function Fila({
  acuerdo,
  cambiarEstatusAction,
  ponerFechaAction,
}: {
  acuerdo: AcuerdoEnRiesgo
  cambiarEstatusAction: Props['cambiarEstatusAction']
  ponerFechaAction: Props['ponerFechaAction']
}) {
  const [pendiente, empezar] = useTransition()
  const [editandoFecha, setEditandoFecha] = useState(false)

  return (
    <li className={estilos.acuerdo} style={{ '--marca': acuerdo.salaColor } as React.CSSProperties}>
      <div className={estilos.acuerdoCuerpo}>
        <p className={estilos.acuerdoQue}>{acuerdo.que}</p>
        <div className={estilos.acuerdoMeta}>
          <Link href={`/sala/${acuerdo.salaSlug}`} className={estilos.acuerdoSala}>
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
            data-tono={acuerdo.fechaCompromiso ? 'mal' : 'ojo'}
            onClick={() => setEditandoFecha(true)}
          >
            {acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}
          </button>
        )}

        <button
          type="button"
          className="boton"
          data-tono="suave"
          disabled={pendiente}
          onClick={() => empezar(async () => { await cambiarEstatusAction(acuerdo.id, 'cumplido') })}
        >
          {pendiente ? '…' : 'Cumplido'}
        </button>
      </div>
    </li>
  )
}
