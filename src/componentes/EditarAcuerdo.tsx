'use client'

import { useState, useTransition } from 'react'
import type { PersonaMonday } from '@/monday/personas'
import { SelectorResponsable } from './SelectorResponsable'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * CORREGIR UN ACUERDO YA PUBLICADO, en su sitio.
 *
 * Franco: *"¿cómo hago para editar un acuerdo ya publicado?"*. No se podía:
 * el texto solo se editaba en la bandeja y solo mientras el acuerdo seguía
 * pendiente. Una vez en la sala, ante una errata o un dueño mal asignado la
 * única salida era borrarlo y crearlo de nuevo, perdiendo su origen y su
 * antigüedad.
 *
 * EN SITIO Y NO EN UN DIÁLOGO: un acuerdo se corrige mirando los de al lado
 * —para no repetir uno, para que el verbo case con el resto— y un modal tapa
 * justo eso. Es el mismo criterio que ya usa la bandeja (`EdicionEnSitio`).
 *
 * SIN RASTRO. Franco: *"no queda registro histórico y desaparece de todos
 * lados"*. No se pinta "antes decía…" en ninguna parte, y la acción revalida
 * las cuatro pantallas donde el acuerdo puede estar, para que el texto viejo
 * no sobreviva en la caché de ninguna.
 *
 * QUIÉN LO VE: solo admin y editores. El gate real vive en la Server Action
 * (`exigirEditor()`); esto es la interfaz, y esconder un botón no protege un
 * endpoint. Por eso la página tampoco monta este componente para el director
 * de la UDN — que sigue moviendo el estatus y la fecha de los suyos.
 */
export function EditarAcuerdo({
  acuerdoId,
  queInicial,
  responsableInicial,
  personas,
  editarAction,
}: {
  acuerdoId: string
  queInicial: string
  responsableInicial: string
  personas: PersonaMonday[]
  editarAction: (
    acuerdoId: string,
    cambios: { que: string; responsable: string; responsableMondayId: string | null },
  ) => Promise<{ error?: string }>
}) {
  const [editando, setEditando] = useState(false)
  const [que, setQue] = useState(queInicial)
  const [responsable, setResponsable] = useState({
    responsable: responsableInicial,
    responsableMondayId: null as string | null,
  })
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  if (!editando) {
    return (
      <button
        type="button"
        className={estilos.acuerdoLapiz}
        onClick={() => setEditando(true)}
        aria-label={`Corregir el acuerdo ${queInicial}`}
        title="Corregir"
      >
        ✎
      </button>
    )
  }

  function guardar() {
    setError(null)
    empezar(async () => {
      const r = await editarAction(acuerdoId, {
        que,
        responsable: responsable.responsable,
        responsableMondayId: responsable.responsableMondayId,
      })
      if (r.error) { setError(r.error); return }
      setEditando(false)
    })
  }

  return (
    <div className={estilos.acuerdoEditor}>
      <textarea
        className={estilos.acuerdoEditorTexto}
        value={que}
        onChange={(e) => setQue(e.target.value)}
        rows={2}
        aria-label="Qué hay que hacer"
        autoFocus
      />
      <SelectorResponsable
        personas={personas}
        valorInicial={{ nombre: responsableInicial, mondayId: null }}
        onCambiar={setResponsable}
        disabled={pendiente}
      />
      {error && <p className={estilos.subirError} role="alert">{error}</p>}
      <div className={estilos.acuerdoEditorAcciones}>
        <button
          type="button"
          className={estilos.archivoGuardar}
          disabled={pendiente || que.trim().length === 0}
          onClick={guardar}
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          className={estilos.botonVolverSesion}
          disabled={pendiente}
          onClick={() => {
            // Se descarta lo tecleado: cancelar tiene que devolver la fila a
            // como estaba, no dejar el borrador esperando al próximo clic.
            setQue(queInicial)
            setResponsable({ responsable: responsableInicial, responsableMondayId: null })
            setError(null)
            setEditando(false)
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
