'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { ordenTrasMover } from '@/db/orden'
import estilos from './lista-ordenable.module.css'
// El número de cada item se pinta aquí y no dentro de la tarjeta porque este
// componente es el que conoce el orden optimista: si lo pintara el servidor,
// al arrastrar se verían los números descolocados hasta que llegara la
// respuesta. Se reusa el estilo de la página para que se vea idéntico.
import estilosPreparar from '@/app/preparar/preparar.module.css'

interface Props {
  /** Ids de los items, en el mismo orden que `children`. */
  ids: string[]
  /** Una tarjeta por id, ya renderizadas en el servidor. */
  children: ReactNode[]
  /** Persiste el orden nuevo. Recibe los ids en su orden final. */
  reordenarAction: (idsEnOrden: string[]) => Promise<void>
}

/**
 * Envuelve las tarjetas del cuestionario para poder arrastrarlas y cambiarles
 * el orden.
 *
 * Decisiones que importan:
 *
 * - **El arrastre es un atajo, no la única vía.** Los botones ↑/↓ de cada
 *   tarjeta siguen ahí: son el camino accesible por teclado y el que funciona
 *   sin ratón. Arrastrar nunca es el único modo de hacer algo.
 * - **Solo el asa arrastra.** Si la tarjeta entera fuera `draggable`, no se
 *   podría seleccionar texto dentro de sus campos. El atributo se enciende al
 *   apretar el asa y se apaga al soltar.
 * - **Se reordena en pantalla al instante** y se persiste después: esperar la
 *   ida y vuelta al servidor para ver moverse una tarjeta se siente roto.
 *   Si la escritura falla, se vuelve al orden que había.
 */
export function ListaOrdenable({ ids, children, reordenarAction }: Props) {
  const [orden, setOrden] = useState(ids)
  const [arrastrado, setArrastrado] = useState<string | null>(null)
  const [encima, setEncima] = useState<string | null>(null)
  const [asaActiva, setAsaActiva] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  // El servidor manda: si llega una lista distinta (otro reordenamiento, un
  // item nuevo), se adopta y se descarta el estado local.
  const [idsPrevios, setIdsPrevios] = useState(ids)
  if (ids.join() !== idsPrevios.join()) {
    setIdsPrevios(ids)
    setOrden(ids)
  }

  const tarjetaPorId = new Map(ids.map((id, i) => [id, children[i]]))

  function soltarEn(idDestino: string) {
    if (!arrastrado || arrastrado === idDestino) return limpiar()

    const nuevo = ordenTrasMover(orden, arrastrado, orden.indexOf(idDestino))
    const anterior = orden
    setOrden(nuevo)
    limpiar()

    empezarTransicion(async () => {
      try {
        await reordenarAction(nuevo)
      } catch {
        setOrden(anterior)
      }
    })
  }

  function limpiar() {
    setArrastrado(null)
    setEncima(null)
    setAsaActiva(null)
  }

  return (
    <div className={estilos.lista}>
      {orden.map((id, posicion) => (
        <div
          key={id}
          draggable={asaActiva === id}
          onDragStart={() => setArrastrado(id)}
          onDragEnd={limpiar}
          onDragOver={(e) => {
            e.preventDefault()
            if (arrastrado && arrastrado !== id) setEncima(id)
          }}
          onDragLeave={() => setEncima((actual) => (actual === id ? null : actual))}
          onDrop={(e) => {
            e.preventDefault()
            soltarEn(id)
          }}
          className={[
            estilos.fila,
            arrastrado === id ? estilos.arrastrando : '',
            encima === id ? estilos.destino : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span
            className={estilos.asa}
            onMouseDown={() => setAsaActiva(id)}
            onMouseUp={() => setAsaActiva(null)}
            onTouchStart={() => setAsaActiva(id)}
            onTouchEnd={() => setAsaActiva(null)}
            title="Arrastra para cambiar el orden"
            aria-hidden="true"
          >
            ⠿
          </span>
          <span className={`${estilosPreparar.tarjetaNumero} ${estilos.posicion}`}>{posicion + 1}</span>
          {tarjetaPorId.get(id)}
        </div>
      ))}
    </div>
  )
}
