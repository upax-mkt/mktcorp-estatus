'use client'

import { useRef, useState, useTransition } from 'react'
import estilos from '@/app/cliente/cliente.module.css'
import { SelectorResponsable } from './SelectorResponsable'
import type { PersonaMonday } from '@/monday/personas'

interface Props {
  crearAction: (datos: {
    que: string
    responsable: string
    /** El id de Monday del responsable, o `null` — nunca cadena vacía. Decide si el acuerdo entra a la bandeja (ver src/monday/bandeja.ts). */
    responsableMondayId: string | null
    squad?: string
    fechaCompromiso: string | null
  }) => Promise<void>
  /** La gente viva de Mkt Corp, para elegir como responsable — ver directorio() en src/db/personas.ts. */
  personas: PersonaMonday[]
}

/**
 * Alta manual de un acuerdo desde la sala.
 *
 * Hasta ahora un acuerdo solo podía nacer de una minuta, así que lo que se
 * acordaba por Slack o en un pasillo no tenía dónde entrar — y el hub, que
 * mide la salud de la relación por sus acuerdos, no lo veía.
 *
 * Arranca plegado a propósito: la sala es para consultar el estado, no un
 * formulario. Se despliega solo cuando alguien va a dar algo de alta.
 */
export function NuevoAcuerdoForm({ crearAction, personas }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, empezar] = useTransition()
  const formulario = useRef<HTMLFormElement>(null)

  if (!abierto) {
    return (
      <button type="button" className={estilos.nuevoAcuerdoAbrir} onClick={() => setAbierto(true)}>
        + Añadir acuerdo
      </button>
    )
  }

  return (
    <form
      ref={formulario}
      className={estilos.nuevoAcuerdo}
      action={(formData) => {
        const que = String(formData.get('que') ?? '').trim()
        const responsable = String(formData.get('responsable') ?? '').trim()
        const squad = String(formData.get('squad') ?? '').trim()
        const fecha = String(formData.get('fecha') ?? '').trim()
        // SelectorResponsable manda '' cuando no hay nadie de Mkt Corp elegido
        // — un <input> nunca puede guardar `null`. Aguas abajo esa cadena
        // vacía se convierte en Number('') === 0, el id de un usuario que no
        // existe, y el acuerdo se asignaría a nadie (el fallo que ya costó
        // dos rondas de arreglo en la tarea 6). Se normaliza aquí, en el
        // borde: o es un id de verdad, o es null — nunca ''.
        const responsableMondayIdCrudo = String(formData.get('responsableMondayId') ?? '').trim()
        const responsableMondayId = responsableMondayIdCrudo.length > 0 ? responsableMondayIdCrudo : null
        if (que.length === 0) return

        empezar(async () => {
          await crearAction({
            que,
            responsable: responsable.length > 0 ? responsable : 'por asignar',
            responsableMondayId,
            squad: squad.length > 0 ? squad : undefined,
            fechaCompromiso: fecha.length > 0 ? fecha : null,
          })
          formulario.current?.reset()
          setAbierto(false)
        })
      }}
    >
      <input
        name="que"
        className={estilos.nuevoAcuerdoQue}
        placeholder="Qué se acordó"
        required
        autoFocus
      />
      <div className={estilos.nuevoAcuerdoFila}>
        <SelectorResponsable personas={personas} />
        <input name="squad" className={estilos.nuevoAcuerdoCampo} placeholder="Squad (opcional)" />
        <input name="fecha" type="date" className={estilos.nuevoAcuerdoCampo} />
        <button type="submit" className={estilos.nuevoAcuerdoGuardar} disabled={pendiente}>
          {pendiente ? 'Guardando…' : 'Añadir'}
        </button>
        <button type="button" className={estilos.nuevoAcuerdoCancelar} onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
