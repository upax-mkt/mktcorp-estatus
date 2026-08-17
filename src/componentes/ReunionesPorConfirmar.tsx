'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { fechaBreveConAnio } from '@/lib/fecha'
import { colorDeTextoDeMarca } from '@/temas'
import type { SesionPorConfirmar } from '@/dominio/salas'
import { claveDeClase, etiquetaDeClase } from '@/secciones/plantillas'
import estilos from './ReunionesPorConfirmar.module.css'

/**
 * REUNIONES QUE NECESITAN UNA PALABRA HUMANA: `lista`, con el día ya pasado —
 * el mismo conjunto sobre el que actúa `fueDada` (src/dominio/salas.ts) para
 * darlas por ocurridas sin que nadie marque nada.
 *
 * Punto 2 del encargo de Franco: el botón de marcar presentada existía
 * (`MarcarPresentada`) pero estaba ENTERRADO —solo se llegaba entrando al
 * editor, abriendo el documento y pulsando «Ver documento →»— así que de
 * siete reuniones dadas solo una se marcó. Aquí vive donde SE VE la reunión:
 * el Home y la vista de sala.
 *
 * No reusa el componente `MarcarPresentada` tal cual (aunque la fila "Ya se
 * dio" llama a la MISMA acción, `marcarPresentada`): ese componente está
 * escrito sobre las clases de `deck.module.css`, que dependen de alias
 * (`--tx`, `--acento`) que solo declara el `.app` de esa página y el de la
 * sala — NO el del Home (mismo problema, ya documentado, que motivó que
 * `minuta.module.css` tenga hoja propia sobre los tokens de `sistema.css` en
 * vez de heredar los de `sala.module.css`). Este componente vive en las dos
 * pantallas a la vez, así que construye su propia UI sobre esos mismos
 * tokens compartidos: mismo verbo, misma acción de servidor, sin la trampa
 * de los alias.
 *
 * Punto 3: junto al "sí" vive el "no" —`marcarNoDada`/`desmarcarNoDada`—
 * porque son la misma pregunta en las dos direcciones. Un solo estado de
 * confirmación POR FILA (`Modo`, en `FilaPorConfirmar`) y no dos
 * independientes: con dos, confirmar "Ya se dio" y luego, sin cancelar,
 * pulsar "No se dio" dejaba las DOS confirmaciones abiertas a la vez en la
 * misma fila —dos botones «Confirmar» diciendo cosas contrarias—, que es
 * peor que cualquiera de los dos por separado.
 */

interface Props {
  sesiones: SesionPorConfirmar[]
  marcarPresentadaAction: (reunionId: string) => Promise<void>
  marcarNoDadaAction: (reunionId: string) => Promise<void>
  desmarcarNoDadaAction: (reunionId: string) => Promise<void>
}

export function ReunionesPorConfirmar({
  sesiones, marcarPresentadaAction, marcarNoDadaAction, desmarcarNoDadaAction,
}: Props) {
  if (sesiones.length === 0) return null

  return (
    <div className={estilos.lista}>
      {sesiones.map((s) => (
        <FilaPorConfirmar
          key={s.id}
          sesion={s}
          marcarPresentadaAction={() => marcarPresentadaAction(s.id)}
          marcarNoDadaAction={() => marcarNoDadaAction(s.id)}
          desmarcarNoDadaAction={() => desmarcarNoDadaAction(s.id)}
        />
      ))}
    </div>
  )
}

type Modo = 'neutral' | 'confirmando-si' | 'confirmando-no'

function FilaPorConfirmar({
  sesion,
  marcarPresentadaAction,
  marcarNoDadaAction,
  desmarcarNoDadaAction,
}: {
  sesion: SesionPorConfirmar
  marcarPresentadaAction: () => Promise<void>
  marcarNoDadaAction: () => Promise<void>
  desmarcarNoDadaAction: () => Promise<void>
}) {
  const [modo, setModo] = useState<Modo>('neutral')
  const [pendiente, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function ejecutar(accion: () => Promise<void>) {
    setError(null)
    empezar(async () => {
      try {
        await accion()
        setModo('neutral')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div
      className={estilos.fila}
      style={
        sesion.salaColor
          ? ({ '--marca': sesion.salaColor, '--marca-texto': colorDeTextoDeMarca(sesion.salaColor) } as React.CSSProperties)
          : undefined
      }
    >
      <Link href={`/deck/${sesion.id}/documento`} className={estilos.filaTexto}>
        {sesion.salaNombre && <span className={estilos.filaSala}>{sesion.salaNombre}</span>}
        <span className={estilos.filaTitulo}>{sesion.titulo}</span>
        {/* CUMPLIMIENTO (revisión C1, ronda 14.4 tarea 1): "Por confirmar"
            era 1 de las 4 tarjetas de 14 sin clase de junta pintada.
            `sesion.plantilla !== undefined`, no solo truthy: `undefined`
            (Home/sala, que no mandan este dato — ver `SesionPorConfirmar`,
            `dominio/salas.ts`) es "no aplica aquí" y no pinta nada; `null`
            (esta pantalla, junta sin clasificar) SÍ es un dato — "Sin
            clasificar" — y tiene que verse, igual que en las otras tres
            tarjetas del ciclo. `etiquetaDeClase(claveDeClase(...))`, nunca
            el campo crudo: mismo motivo que el resto de la app —
            `obtenerPlantilla(null)` cae a la primera del catálogo por
            diseño y mentiría "Estatus de UDN" sobre una junta sin clase. */}
        {sesion.plantilla !== undefined && (
          <span className={estilos.filaClase}>{etiquetaDeClase(claveDeClase(sesion.plantilla))}</span>
        )}
        <span className={estilos.filaFecha}>{fechaBreveConAnio(sesion.fecha)}</span>
      </Link>

      <span className={estilos.filaAcciones}>
        {sesion.noDadaEn ? (
          // Ya se dijo que no se dio: la única acción posible es deshacerlo.
          // Sin confirmación en dos tiempos, mismo criterio que "Reactivar"
          // en PausaSala — es la vuelta a la normalidad, no algo que dañe.
          <>
            <span className="pildora" data-tono="mal">no se dio</span>
            <button
              type="button"
              className={estilos.deshacer}
              disabled={pendiente}
              onClick={() => ejecutar(desmarcarNoDadaAction)}
            >
              {pendiente ? 'Deshaciendo…' : 'Deshacer'}
            </button>
          </>
        ) : modo === 'confirmando-si' ? (
          <>
            <button
              type="button"
              className={estilos.botonAfirmarConfirmar}
              disabled={pendiente}
              onClick={() => ejecutar(marcarPresentadaAction)}
            >
              {pendiente ? 'Marcando…' : 'Confirmar'}
            </button>
            <button type="button" className={estilos.botonTexto} disabled={pendiente} onClick={() => setModo('neutral')}>
              Cancelar
            </button>
          </>
        ) : modo === 'confirmando-no' ? (
          <>
            <span className={estilos.confirmarTexto}>Se puede deshacer después.</span>
            <button
              type="button"
              className={estilos.botonNegarConfirmar}
              disabled={pendiente}
              onClick={() => ejecutar(marcarNoDadaAction)}
            >
              {pendiente ? 'Marcando…' : 'Confirmar'}
            </button>
            <button type="button" className={estilos.botonTexto} disabled={pendiente} onClick={() => setModo('neutral')}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="button" className={estilos.botonAfirmar} onClick={() => setModo('confirmando-si')}>
              Ya se dio
            </button>
            <button type="button" className={estilos.botonTexto} onClick={() => setModo('confirmando-no')}>
              No se dio
            </button>
          </>
        )}
        {error && <span className={estilos.aviso} role="alert">{error}</span>}
      </span>
    </div>
  )
}
