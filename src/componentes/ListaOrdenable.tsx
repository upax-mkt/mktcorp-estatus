'use client'

import { useState, useTransition, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import estilos from './lista-ordenable.module.css'
// El número de cada sección se pinta aquí y no dentro de la tarjeta porque
// este componente es el que conoce el orden optimista: si lo pintara el
// servidor, al arrastrar se verían los números descolocados hasta que llegara
// la respuesta. Se reusa el estilo de la página para que se vea idéntico.
import estilosPreparar from '@/app/preparar/preparar.module.css'

interface Props {
  /** Ids de las secciones, en el mismo orden que `children`. */
  ids: string[]
  /** Una tarjeta por id, ya renderizadas en el servidor. */
  children: ReactNode[]
  /** Persiste el orden nuevo. Recibe los ids en su orden final. */
  reordenarAction: (idsEnOrden: string[]) => Promise<void>
}

/**
 * Reordenar las secciones de la sesión arrastrándolas.
 *
 * Corre sobre dnd-kit. Antes usaba el arrastre nativo de HTML5, que en una
 * herramienta de edición se queda corto en tres cosas concretas:
 *
 * - **No funciona con el dedo.** El evento `dragstart` de HTML5 no existe en
 *   táctil, así que en tablet no se podía reordenar nada. dnd-kit escucha
 *   punteros, que cubren ratón, dedo y lápiz con el mismo código.
 * - **No hay animación de reacomodo.** Las tarjetas saltaban a su nueva
 *   posición; ahora las de alrededor se apartan con una transición y se ve
 *   dónde va a caer la que llevas.
 * - **La imagen de arrastre era una captura del navegador**, con sus bordes y
 *   su fondo. Con `DragOverlay` se arrastra la tarjeta de verdad.
 *
 * LO QUE NO CAMBIA: el arrastre sigue siendo un ATAJO. Los botones ↑/↓ de cada
 * tarjeta siguen ahí, y dnd-kit añade además teclado (Tab hasta el asa, espacio
 * para levantar, flechas para mover). Arrastrar nunca es el único modo.
 *
 * SOLO EL ASA ARRASTRA: dentro de cada tarjeta hay campos de texto donde
 * arrastrar significa seleccionar. Los listeners van en el asa, no en la
 * tarjeta.
 */
export function ListaOrdenable({ ids, children, reordenarAction }: Props) {
  const [orden, setOrden] = useState(ids)
  const [arrastrado, setArrastrado] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  // El servidor manda: si llega una lista distinta (otro reordenamiento, una
  // sección nueva o borrada), se adopta y se descarta el estado local.
  const [idsPrevios, setIdsPrevios] = useState(ids)
  if (ids.join() !== idsPrevios.join()) {
    setIdsPrevios(ids)
    setOrden(ids)
  }

  const tarjetaPorId = new Map(ids.map((id, i) => [id, children[i]]))

  const sensores = useSensors(
    // Ocho píxeles de margen antes de considerar que es un arrastre: sin esto,
    // un clic con un temblor de ratón sobre el asa se lee como arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alEmpezar(evento: DragStartEvent) {
    setArrastrado(String(evento.active.id))
  }

  function alTerminar(evento: DragEndEvent) {
    setArrastrado(null)
    const { active, over } = evento
    if (!over || active.id === over.id) return

    const desde = orden.indexOf(String(active.id))
    const hasta = orden.indexOf(String(over.id))
    if (desde < 0 || hasta < 0) return

    const anterior = orden
    const nuevo = arrayMove(orden, desde, hasta)
    setOrden(nuevo)

    // Se reordena en pantalla al instante y se persiste después: esperar la
    // ida y vuelta al servidor para ver moverse una tarjeta se siente roto.
    empezarTransicion(async () => {
      try {
        await reordenarAction(nuevo)
      } catch {
        setOrden(anterior)
      }
    })
  }

  return (
    <DndContext
      // Id FIJO. dnd-kit genera los ids de sus anuncios de accesibilidad con
      // un contador propio que arranca distinto en el servidor y en el
      // navegador: sin esto, React avisa de desajuste de hidratación en cada
      // asa de la lista.
      id="secciones-de-la-sesion"
      sensors={sensores}
      collisionDetection={closestCenter}
      // La lista es una columna: dejar arrastrar en horizontal solo permite
      // sacar la tarjeta de la página sin que eso signifique nada.
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={alEmpezar}
      onDragEnd={alTerminar}
      onDragCancel={() => setArrastrado(null)}
    >
      <SortableContext items={orden} strategy={verticalListSortingStrategy}>
        <div className={estilos.lista}>
          {orden.map((id, posicion) => (
            <Fila key={id} id={id} posicion={posicion}>
              {tarjetaPorId.get(id)}
            </Fila>
          ))}
        </div>
      </SortableContext>

      {/* Lo que sigue al cursor es la tarjeta de verdad, no una captura. */}
      <DragOverlay>
        {arrastrado && (
          <div className={`${estilos.fila} ${estilos.sobrevolando}`}>
            <span className={estilos.asa} aria-hidden="true">⠿</span>
            <span className={`${estilosPreparar.tarjetaNumero} ${estilos.posicion}`}>
              {orden.indexOf(arrastrado) + 1}
            </span>
            {tarjetaPorId.get(arrastrado)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Fila({ id, posicion, children }: { id: string; posicion: number; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${estilos.fila} ${isDragging ? estilos.arrastrando : ''}`}
    >
      {/* El asa es un botón de verdad: se alcanza con Tab, se levanta con
          espacio y se mueve con las flechas. Un `<span>` con listeners deja
          fuera a quien no usa ratón. */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={estilos.asa}
        title="Arrastra para cambiar el orden"
        aria-label={`Mover la sección ${posicion + 1}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className={`${estilosPreparar.tarjetaNumero} ${estilos.posicion}`}>{posicion + 1}</span>
      {children}
    </div>
  )
}
