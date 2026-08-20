'use client'

import { useRef, useState, useTransition } from 'react'
import estilos from '@/app/cliente/cliente.module.css'
import { SelectorResponsable } from './SelectorResponsable'
import type { PersonaResponsable } from '@/lib/personas'

interface Props {
  /**
   * Devuelve `{ aviso }` cuando el acuerdo SÍ se guardó pero hay algo que
   * quien lo dio de alta tiene que saber — hoy, que su minuta no tenía tabla
   * donde insertarlo (ver `crearAcuerdoEnReunionAction`). Devolver `void`
   * sigue valiendo: el alta de la sala no tiene nada que avisar.
   */
  crearAction: (datos: {
    que: string
    responsable: string
    squad?: string
    fechaCompromiso: string | null
  }) => Promise<void | { error?: string; aviso?: string }>
  /** La gente de Mkt Corp, para elegir como responsable — ver genteParaResponsable() en src/db/personas.ts. */
  personas: PersonaResponsable[]
  /**
   * El rótulo del botón cerrado. Por defecto "+ Añadir acuerdo", que es como
   * se lee en la sala; dentro de una reunión concreta dice de cuál se trata.
   */
  etiqueta?: string
  /**
   * Oculta el campo de squad. Dentro de una reunión el formulario va en una
   * tarjeta estrecha y lo que urge es qué se acordó y de quién es — el squad
   * se pone después corrigiendo la fila, como cualquier otro campo.
   */
  sinSquad?: boolean
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
export function NuevoAcuerdoForm({
  crearAction,
  personas,
  etiqueta = '+ Añadir acuerdo',
  sinSquad = false,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, empezar] = useTransition()
  const [mensaje, setMensaje] = useState<{ tono: 'error' | 'aviso'; texto: string } | null>(null)
  const formulario = useRef<HTMLFormElement>(null)

  if (!abierto) {
    return (
      <>
        <button type="button" className={estilos.nuevoAcuerdoAbrir} onClick={() => setAbierto(true)}>
          {etiqueta}
        </button>
        {/* El aviso sobrevive al cierre del formulario a propósito: el acuerdo
            se guardó, así que el formulario tiene que desaparecer, pero lo que
            hay que hacer a mano con la minuta no puede irse con él. */}
        {mensaje?.tono === 'aviso' && (
          <p className={estilos.nuevoAcuerdoAviso} role="status">{mensaje.texto}</p>
        )}
      </>
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
        if (que.length === 0) return

        empezar(async () => {
          const r = await crearAction({
            que,
            responsable: responsable.length > 0 ? responsable : 'por asignar',
            squad: squad.length > 0 ? squad : undefined,
            fechaCompromiso: fecha.length > 0 ? fecha : null,
          })
          // Un error deja el formulario ABIERTO con lo escrito dentro: quien
          // lo rellenó no tiene que volver a teclearlo para reintentar.
          if (r && r.error) {
            setMensaje({ tono: 'error', texto: r.error })
            return
          }
          setMensaje(r && r.aviso ? { tono: 'aviso', texto: r.aviso } : null)
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
      {mensaje?.tono === 'error' && (
        <p className={estilos.nuevoAcuerdoError} role="alert">{mensaje.texto}</p>
      )}
      <div className={estilos.nuevoAcuerdoFila}>
        <SelectorResponsable personas={personas} />
        {!sinSquad && (
          <input name="squad" className={estilos.nuevoAcuerdoCampo} placeholder="Squad (opcional)" />
        )}
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
