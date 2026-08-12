'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ArchivoSala } from '@/db/archivos'
import { Seccion } from './Seccion'
import { MaterialesSala } from './MaterialesSala'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LOS MATERIALES DE UNA SALA, EN SUBCATEGORÍAS.
 *
 * Franco: *"debo poder crear subcategorías dentro del módulo, así una
 * presentación comercial o un video corp queda dentro de un ítem (define el
 * nombre) mientras que una nota de prensa o un caso de éxito en otro ítem,
 * pero todos dentro del mismo módulo. Y además necesito poder reubicar su
 * orden drag and drop"*.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ORGANIZAR ES UN MODO, NO LA VISTA. La primera versión de esto dejó el
 * aparato de edición encendido todo el tiempo, y Franco lo cazó de inmediato:
 * *"la edición y drag & drop está abierto en la vista de la sala; debería ser
 * una función de edición del módulo y una vez hecho poder verlo en vista
 * normal como viewer"*.
 *
 * Tenía razón y el coste era medible: la rejilla de cuatro carátulas se
 * convirtió en una columna donde cada material ocupaba una fila entera con su
 * asa, su número, un desplegable a todo ancho repitiendo el nombre de su
 * grupo, y «Renombrar ✕» permanentes. Seis materiales de House of Films
 * pasaron a medir dos mil píxeles de alto. Un módulo que se CONSULTA a diario
 * y se ORGANIZA una vez al mes no puede pagar el precio de la segunda cosa
 * todo el rato — y menos cuando esta misma pantalla la ve el director de la
 * UDN.
 *
 * Así que hay dos vistas de lo mismo:
 * - **Leer** (siempre, y la única para quien no es del equipo): la rejilla de
 *   carátulas de siempre, con el nombre de la subcategoría de encabezado.
 *   Nada más.
 * - **Organizar** (equipo, tras pulsar el botón): asas, orden y desplegables.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LOS GRUPOS TAMBIÉN SE ARRASTRAN. *"Las categorías no se pueden arrastrar,
 * quedó en HoF videos arriba de credenciales y no está bien"*. Se arrastraban
 * los materiales dentro de su grupo y nada más, así que el orden de los
 * grupos era el que salió — irreversible sin vaciar y rellenar.
 *
 * Y NO HACE FALTA UNA COLUMNA `orden_de_grupo`: un grupo se ordena por dónde
 * caen sus materiales, así que moverlo es reescribir el `orden` de todos ellos
 * en bloque. `reubicarMateriales` ya recibe la lista COMPLETA tal como quedó
 * (ver `src/db/archivos.ts`), que es justo lo que hace falta. Un segundo campo
 * de orden sería un segundo sitio donde el orden puede quedar mal.
 *
 * UN SOLO `DndContext` con varios `SortableContext` dentro —uno para los
 * grupos y uno por grupo para sus materiales—, y los ids llevan prefijo (`g:`
 * / `m:`) para saber qué se soltó. Anidar contextos de arrastre completos es
 * frágil; anidar solo los ordenables no.
 *
 * ⚠️ Y ESO OBLIGA A UNA DETECCIÓN DE COLISIÓN PROPIA (`soloDeSuTipo`, abajo).
 * Con `closestCenter` a secas, arrastrar una subcategoría no hacía NADA: los
 * materiales también son zonas de destino y están más cerca del cursor, así
 * que el `over` que llegaba era un material y el reordenamiento de grupos no
 * se disparaba nunca. El síntoma —"las categorías no se pueden arrastrar"— se
 * ve igual que si no hubiera arrastre.
 */

/**
 * Un grupo solo puede soltarse sobre un grupo, y un material sobre un
 * material. Sin este filtro, los candidatos de los dos niveles compiten por
 * cercanía y gana el equivocado.
 */
export const soloDeSuTipo: CollisionDetection = (args) => {
  const tipo = String(args.active.id).startsWith(G) ? G : M
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => String(c.id).startsWith(tipo)),
  })
}

/** La clave del pseudo-grupo "sin agrupar". */
const SIN_GRUPO = '__sin-grupo__'
/** El valor de la opción "crear una nueva". */
const NUEVA_SUBCATEGORIA = '__nueva__'

/** Los ids del arrastre llevan prefijo: `onDragEnd` recibe uno solo. */
const G = 'g:'
const M = 'm:'

type Grupo = [clave: string, materiales: ArchivoSala[]]

interface Props {
  materiales: ArchivoSala[]
  equipo: boolean
  vacio: string
  /** El título del módulo: este componente dibuja su propia cabecera. */
  titulo: string
  /**
   * El ancla de la sección, para el índice de la sala. Se reenvía a `Seccion`
   * — sin esto, dos de las seis entradas del menú nacerían muertas, porque
   * este componente dibuja su propia cabecera y `Seccion` no la ve.
   */
  id?: string
  editarAction: (id: string, cambios: { titulo: string; fecha: string | null }) => Promise<void>
  eliminarAction: (id: string) => Promise<void>
  /** La lista COMPLETA del módulo tal como quedó: ver `reubicarMateriales`. */
  reubicarAction: (enOrden: Array<{ id: string; grupo: string | null }>) => Promise<void>
  /**
   * Lo que va al pie de la sección — «+ Añadir material», que lo monta la
   * página porque necesita el token de subida del servidor. Añadir NO es
   * organizar: se ofrece siempre, en un botón al pie, no en cada tarjeta.
   */
  children?: React.ReactNode
}

export function MaterialesAgrupados({
  materiales,
  equipo,
  vacio,
  titulo,
  id,
  editarAction,
  eliminarAction,
  reubicarAction,
  children,
}: Props) {
  const [organizando, setOrganizando] = useState(false)

  /**
   * Los grupos en el orden en que aparecen sus materiales — que ya viene
   * resuelto de la base (`porOrdenYFecha`). Sin agrupar SIEMPRE primero: es
   * donde cae lo que se sube sin elegir categoría, y hundirlo al final lo
   * convertiría en un cajón de sastre que nadie mira.
   */
  const grupos: Grupo[] = useMemo(() => {
    const mapa = new Map<string, ArchivoSala[]>()
    for (const m of materiales) {
      const clave = m.grupo ?? SIN_GRUPO
      const lista = mapa.get(clave)
      if (lista) lista.push(m)
      else mapa.set(clave, [m])
    }
    return [...mapa.entries()].sort(([a], [b]) =>
      a === SIN_GRUPO ? -1 : b === SIN_GRUPO ? 1 : 0,
    )
  }, [materiales])

  // El botón vive en la esquina de la cabecera, donde `Seccion` pone el
  // conteo. Por eso este componente dibuja su propia sección en vez de que se
  // la monte la página: el control tiene estado, y el estado es del cliente.
  const cabecera =
    !equipo || materiales.length === 0 ? (
      materiales.length > 0 ? materiales.length : undefined
    ) : (
      <span className={estilos.moduloBarra}>
        {!organizando && <span className={estilos.conteoSuelto}>{materiales.length}</span>}
        <button
          type="button"
          className="boton"
          data-tono={organizando ? undefined : 'fantasma'}
          onClick={() => setOrganizando((v) => !v)}
        >
          {organizando ? 'Listo' : 'Organizar'}
        </button>
      </span>
    )

  return (
    /* Plegable como el resto (Franco: *"los módulos todos deben tener la
       opción de colapsarse"*). Abierta por defecto: lo que se esconde de
       serie deja de existir. */
    <Seccion id={id} icono="archivos" titulo={titulo} conteo={cabecera} plegable>
      {materiales.length === 0 ? (
        <p className={estilos.vacioNota}>{vacio}</p>
      ) : equipo && organizando ? (
        <Organizador
          grupos={grupos}
          materiales={materiales}
          editarAction={editarAction}
          eliminarAction={eliminarAction}
          reubicarAction={reubicarAction}
        />
      ) : (
        <Lectura grupos={grupos} vacio={vacio} />
      )}
      {children}
    </Seccion>
  )
}

/**
 * LA VISTA DE SIEMPRE, con un encabezado por subcategoría. `equipo={false}` a
 * propósito aunque quien mire sea del equipo: leer es leer, y las acciones de
 * cada tarjeta viven en Organizar. Es lo que pidió Franco — *"una vez hecho,
 * poder verlo en vista normal como viewer"*.
 */
function Lectura({ grupos, vacio }: { grupos: Grupo[]; vacio: string }) {
  return (
    <div className={estilos.gruposMateriales}>
      {grupos.map(([clave, lista]) => (
        <section key={clave} className={estilos.grupoMaterial}>
          {clave !== SIN_GRUPO && (
            <div className={estilos.grupoCabecera}>
              <h3 className={estilos.grupoNombre}>{clave}</h3>
              <span className={estilos.conteo}>{lista.length}</span>
            </div>
          )}
          <MaterialesSala
            materiales={lista}
            equipo={false}
            vacio={vacio}
            editarAction={noAplica}
            eliminarAction={noAplica}
          />
        </section>
      ))}
    </div>
  )
}

/**
 * En lectura nadie edita, pero `MaterialesSala` pide las dos acciones por
 * tipo. No se le pasan las de verdad: con `equipo={false}` no las llama, y
 * dárselas de todos modos es dejar el cable puesto para que alguien lo
 * enchufe sin querer.
 */
async function noAplica(): Promise<void> {}

function Organizador({
  grupos,
  materiales,
  editarAction,
  eliminarAction,
  reubicarAction,
}: {
  grupos: Grupo[]
  materiales: ArchivoSala[]
  editarAction: Props['editarAction']
  eliminarAction: Props['eliminarAction']
  reubicarAction: Props['reubicarAction']
}) {
  const [arrastrado, setArrastrado] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const sensores = useSensors(
    // Ocho píxeles antes de leerlo como arrastre: un clic con temblor de ratón
    // sobre el asa no puede reordenar nada.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const nombresDeGrupo = grupos.map(([g]) => g).filter((g) => g !== SIN_GRUPO)

  /** La lista completa, aplanada, tal como la espera `reubicarMateriales`. */
  function aplanar(orden: Grupo[]) {
    return orden.flatMap(([g, lista]) =>
      lista.map((m) => ({ id: m.id, grupo: g === SIN_GRUPO ? null : g })),
    )
  }

  function guardar(orden: Grupo[]) {
    empezar(async () => { await reubicarAction(aplanar(orden)) })
  }

  function alSoltar(evento: DragEndEvent) {
    setArrastrado(null)
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const desde = String(active.id)
    const hasta = String(over.id)

    // UN GRUPO ENTERO. Lo que se persiste no es "el grupo va en la posición
    // 2", es el `orden` de todos sus materiales: el orden de un grupo se
    // deriva de dónde caen los suyos (ver la cabecera de este archivo).
    if (desde.startsWith(G) && hasta.startsWith(G)) {
      const i = grupos.findIndex(([g]) => G + g === desde)
      const j = grupos.findIndex(([g]) => G + g === hasta)
      if (i < 0 || j < 0) return
      guardar(arrayMove(grupos, i, j))
      return
    }

    // UN MATERIAL DENTRO DE SU GRUPO. Entre grupos se cambia con el
    // desplegable de su tarjeta: arrastrar de un contenedor a otro con dnd-kit
    // pide un montaje bastante más frágil, y ese gesto pasa una vez por
    // material mientras que ordenar dentro de una categoría se repite.
    if (desde.startsWith(M) && hasta.startsWith(M)) {
      const idA = desde.slice(M.length)
      const idB = hasta.slice(M.length)
      const dueño = grupos.findIndex(([, lista]) => lista.some((m) => m.id === idA))
      if (dueño < 0 || !grupos[dueño][1].some((m) => m.id === idB)) return
      const lista = grupos[dueño][1]
      const nuevo = grupos.map(([g, l], k): Grupo =>
        k === dueño
          ? [g, arrayMove(lista, lista.findIndex((m) => m.id === idA), lista.findIndex((m) => m.id === idB))]
          : [g, l],
      )
      guardar(nuevo)
    }
  }

  /** Mover UN material a otro grupo (o a uno nuevo), conservando el resto. */
  function moverAGrupo(id: string, destino: string | null) {
    empezar(async () => {
      await reubicarAction(
        materiales.map((m) => ({ id: m.id, grupo: m.id === id ? destino : (m.grupo ?? null) })),
      )
    })
  }

  /** Renombrar un grupo = reescribir esa etiqueta en todos sus materiales. */
  function renombrar(clave: string, nuevo: string) {
    return reubicarAction(
      materiales.map((m) => ({ id: m.id, grupo: m.grupo === clave ? nuevo : (m.grupo ?? null) })),
    )
  }

  return (
    <DndContext
      // Id FIJO: dnd-kit numera sus anuncios de accesibilidad con un contador
      // que arranca distinto en servidor y navegador, y sin esto React avisa
      // de desajuste de hidratación en cada asa.
      id="materiales-de-la-sala"
      sensors={sensores}
      collisionDetection={soloDeSuTipo}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={(e: DragStartEvent) => setArrastrado(String(e.active.id))}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastrado(null)}
    >
      <p className={estilos.organizandoNota}>
        Arrastra por el asa para cambiar el orden: las subcategorías entre sí, y los materiales
        dentro de la suya. {pendiente && <span aria-live="polite">Guardando…</span>}
      </p>

      <SortableContext items={grupos.map(([g]) => G + g)} strategy={verticalListSortingStrategy}>
        <div className={estilos.gruposMateriales}>
          {grupos.map(([clave, lista]) => (
            <GrupoOrdenable
              key={clave}
              clave={clave}
              cuantos={lista.length}
              renombrar={(nuevo) => renombrar(clave, nuevo)}
            >
              <SortableContext
                items={lista.map((m) => M + m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={estilos.materialesOrdenables}>
                  {lista.map((m) => (
                    <MaterialOrdenable
                      key={m.id}
                      material={m}
                      grupos={nombresDeGrupo}
                      pendiente={pendiente}
                      editarAction={editarAction}
                      eliminarAction={eliminarAction}
                      moverAGrupo={(destino) => moverAGrupo(m.id, destino)}
                    />
                  ))}
                </div>
              </SortableContext>
            </GrupoOrdenable>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {arrastrado && (
          <div className={estilos.arrastrandoFantasma}>
            {arrastrado.startsWith(G)
              ? (arrastrado.slice(G.length) === SIN_GRUPO ? 'Sin agrupar' : arrastrado.slice(G.length))
              : materiales.find((m) => M + m.id === arrastrado)?.titulo}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

/** Una subcategoría: su asa, su nombre editable, y sus materiales dentro. */
function GrupoOrdenable({
  clave,
  cuantos,
  renombrar,
  children,
}: {
  clave: string
  cuantos: number
  renombrar: (nuevo: string) => Promise<void>
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: G + clave })
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(clave)
  const [pendiente, empezar] = useTransition()

  const nombre = clave === SIN_GRUPO ? 'Sin agrupar' : clave

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${estilos.grupoMaterial} ${estilos.grupoOrdenable} ${isDragging ? estilos.arrastrando : ''}`}
    >
      <div className={estilos.grupoCabecera}>
        {/* Un botón de verdad y no un `<span>` con listeners: se alcanza con
            Tab, se levanta con espacio y se mueve con las flechas. */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          className={estilos.asaGrupo}
          title="Arrastra para cambiar el orden de las subcategorías"
          aria-label={`Mover la subcategoría ${nombre}`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {editando ? (
          <>
            <input
              type="text"
              className={estilos.archivoInput}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label={`Nombre de la subcategoría ${nombre}`}
              autoFocus
            />
            <button
              type="button"
              className={estilos.archivoGuardar}
              disabled={pendiente || texto.trim().length === 0}
              onClick={() => empezar(async () => { await renombrar(texto.trim()); setEditando(false) })}
            >
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              className={estilos.botonVolverSesion}
              onClick={() => { setTexto(clave); setEditando(false) }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <h3 className={estilos.grupoNombre}>{nombre}</h3>
            <span className={estilos.conteo}>{cuantos}</span>
            {/* Sin agrupar no es un grupo: no tiene nombre que cambiar. */}
            {clave !== SIN_GRUPO && (
              <button
                type="button"
                className={estilos.acuerdoLapiz}
                onClick={() => setEditando(true)}
                aria-label={`Renombrar la subcategoría ${nombre}`}
                title="Renombrar"
              >
                ✎
              </button>
            )}
          </>
        )}
      </div>
      {children}
    </section>
  )
}

/** Un material en modo organizar: asa, tarjeta, y a qué grupo pertenece. */
function MaterialOrdenable({
  material,
  grupos,
  pendiente,
  editarAction,
  eliminarAction,
  moverAGrupo,
}: {
  material: ArchivoSala
  grupos: string[]
  pendiente: boolean
  editarAction: Props['editarAction']
  eliminarAction: Props['eliminarAction']
  moverAGrupo: (destino: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: M + material.id })
  const [creando, setCreando] = useState(false)
  const [nuevo, setNuevo] = useState('')

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${estilos.materialOrdenable} ${isDragging ? estilos.arrastrando : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={estilos.asaGrupo}
        title="Arrastra para cambiar el orden"
        aria-label={`Mover ${material.titulo}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <MaterialesSala
        materiales={[material]}
        equipo
        vacio=""
        editarAction={editarAction}
        eliminarAction={eliminarAction}
      />

      <div className={estilos.materialGrupoSelector}>
        {creando ? (
          <>
            <input
              type="text"
              className={estilos.archivoInput}
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              placeholder="Nombre de la subcategoría"
              aria-label={`Nueva subcategoría para ${material.titulo}`}
              autoFocus
            />
            <button
              type="button"
              className={estilos.archivoGuardar}
              disabled={pendiente || nuevo.trim().length === 0}
              onClick={() => { moverAGrupo(nuevo.trim()); setCreando(false); setNuevo('') }}
            >
              Crear
            </button>
            <button
              type="button"
              className={estilos.botonVolverSesion}
              onClick={() => { setCreando(false); setNuevo('') }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <select
            className={estilos.archivoInput}
            value={material.grupo ?? ''}
            disabled={pendiente}
            aria-label={`Subcategoría de ${material.titulo}`}
            onChange={(e) => {
              if (e.target.value === NUEVA_SUBCATEGORIA) { setCreando(true); return }
              moverAGrupo(e.target.value || null)
            }}
          >
            <option value="">Sin agrupar</option>
            {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value={NUEVA_SUBCATEGORIA}>+ Nueva subcategoría…</option>
          </select>
        )}
      </div>
    </div>
  )
}
