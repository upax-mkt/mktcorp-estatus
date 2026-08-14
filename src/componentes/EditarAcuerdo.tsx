'use client'

import { useState, useTransition } from 'react'
import type { PersonaMonday } from '@/monday/personas'
import type { Equipos } from '@/lib/equipos'
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
  equipos,
  siempreVisible,
  editarAction,
  editando: editandoControlado,
  onEditandoChange,
}: {
  acuerdoId: string
  queInicial: string
  responsableInicial: string
  personas: PersonaMonday[]
  /**
   * Los squads y las UDN que también pueden ser responsables (13-ago, ver
   * src/lib/equipos.ts). Opcional: sin ellos el editor se comporta como antes.
   */
  equipos?: Equipos
  /**
   * El control de corregir se pinta SIEMPRE, con su etiqueta, en vez de
   * asomar al pasar el ratón.
   *
   * En la sala el lápiz discreto está bien: la fila se lee, y quien va a
   * corregir ya sabe que puede. En `/acuerdos` la pantalla ES para trabajar
   * los acuerdos, y Franco reportó que "no se puede editar" teniéndolo
   * montado desde la ronda 13 — porque `opacity: 0` + `:hover` es invisible
   * al llegar e INALCANZABLE en un teléfono, donde no existe el hover.
   */
  siempreVisible?: boolean
  editarAction: (
    acuerdoId: string,
    cambios: { que: string; responsable: string; responsableMondayId: string | null },
  ) => Promise<{ error?: string }>
  /**
   * ABRIR/CERRAR CONTROLADO DESDE FUERA (ronda 14, tarea 4 — arreglo del
   * ruling de consolidar estatus/fecha/sala detrás de "Corregir").
   *
   * Por defecto este componente es dueño de su propio abrir/cerrar (como
   * siempre) — la sala lo sigue usando así, sin tocar una línea. Pero
   * `/acuerdos` necesita abrir MÁS que el texto al mismo tiempo (estatus,
   * fecha, sala viven fuera de este componente, en `TablaAcuerdos.tsx`), así
   * que ese padre necesita ENTERARSE de cada clic en "Corregir"/"Guardar"/
   * "Cancelar" para abrir y cerrar todo junto. Híbrido controlado/no
   * controlado, mismo patrón que un `<input>` de React: si llegan los dos,
   * el padre decide; si no, el estado es interno y nada cambia para nadie
   * que no los pase.
   */
  editando?: boolean
  onEditandoChange?: (editando: boolean) => void
}) {
  const [editandoInterno, setEditandoInterno] = useState(false)
  const editando = editandoControlado ?? editandoInterno
  function cambiarEditando(valor: boolean) {
    if (onEditandoChange) onEditandoChange(valor)
    else setEditandoInterno(valor)
  }
  const [que, setQue] = useState(queInicial)
  const [responsable, setResponsable] = useState({
    responsable: responsableInicial,
    responsableMondayId: null as string | null,
  })
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  /**
   * EN REPOSO PINTA EL TEXTO Y SU LÁPIZ; editando, SOLO el editor.
   *
   * El componente es dueño del texto —no solo del botón— porque si no, al
   * abrir el editor el acuerdo original se quedaba a la izquierda y la caja
   * de edición aparecía al lado: dos versiones del mismo compromiso en
   * pantalla, y la vieja con más peso visual que la que se está escribiendo.
   * Para saber cuál esconder hay que saber si se está editando, y eso vive
   * aquí.
   *
   * El lápiz es HERMANO del texto, no hijo: dentro, su glifo pasaba a formar
   * parte del acuerdo al seleccionarlo o copiarlo.
   */
  if (!editando) {
    return (
      <div className={estilos.acuerdoLinea}>
        <div className={estilos.acuerdoQue}>{queInicial}</div>
        <button
          type="button"
          className={siempreVisible ? estilos.acuerdoCorregir : estilos.acuerdoLapiz}
          onClick={() => cambiarEditando(true)}
          aria-label={`Corregir el acuerdo ${queInicial}`}
          title="Corregir"
        >
          {siempreVisible ? '✎ Corregir' : '✎'}
        </button>
      </div>
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
      cambiarEditando(false)
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
        equipos={equipos}
        valorInicial={{ nombre: responsableInicial, mondayId: null }}
        onCambiar={setResponsable}
        disabled={pendiente}
      />
      {error && <p className={estilos.subirError} role="alert">{error}</p>}
      {/* "GUARDAR"/"CANCELAR" GOBIERNAN ESTA CAJA Y NADA MÁS — por qué
          conviven dos modelos (revisión final de la ronda 14, hallazgo I2).

          El texto y el responsable se editan en un BORRADOR: se teclean, se
          corrigen, y solo al pulsar "Guardar" salen de aquí. Cancelar puede
          revertirlos porque todavía no habían salido. Los otros tres campos
          del panel de `/acuerdos` —estatus, fecha y sala— no tienen borrador:
          cambiarlos ES la operación, se aplican al vuelo y se deshacen
          repitiendo el gesto (poner de vuelta el estatus, la fecha o la sala
          anterior). Es la misma distinción que la app ya defiende en
          `AcuerdoControles`: dos tiempos solo para lo irreversible (borrar),
          al vuelo lo reversible.
          Lo que faltaba no era unificarlos, era DECIRLO: `.acuerdoEditor`
          pinta ahora una caja con borde —el mismo patrón que `.nuevoAcuerdo`
          en la sala— para que se vea que estos dos botones alcanzan hasta
          aquí, y `TablaAcuerdos` añade una línea de ayuda bajo los otros
          controles. Sin esto, un "Cancelar" bien visible parecía devolver el
          panel entero al punto de partida y solo deshacía la mitad. */}
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
            cambiarEditando(false)
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
