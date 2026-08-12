'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ArchivoSala } from '@/db/archivos'
import { ListaOrdenable } from './ListaOrdenable'
import { MaterialesSala } from './MaterialesSala'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LOS MATERIALES DE UNA SALA, EN SUBCATEGORÍAS Y ARRASTRABLES.
 *
 * Franco: *"en los módulos de Materiales Comerciales y Archivos de Interés
 * debo poder crear subcategorías dentro del módulo, así una presentación
 * comercial o un video corp queda dentro de un ítem (define el nombre)
 * mientras que una nota de prensa o un caso de éxito en otro ítem, pero todos
 * dentro del mismo módulo. Y además necesito poder reubicar su orden drag and
 * drop"*.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TRES DECISIONES.
 *
 * 1. **UN GRUPO NACE AL PONERLE NOMBRE A UN MATERIAL, no antes.** No hay
 *    "crear categoría" y luego "meter cosas": se escribe el nombre en el
 *    material y el grupo aparece. Al vaciarse desaparece solo. Un grupo aquí
 *    es una etiqueta que ordena, no una entidad que mantener — por eso en la
 *    base son dos columnas y no una tabla (ver la migración 0037).
 *
 * 2. **SE ARRASTRA DENTRO DE UN GRUPO; PARA CAMBIARLO, SE ELIGE.** Arrastrar
 *    entre contenedores con dnd-kit exige un montaje bastante más frágil, y
 *    el gesto que de verdad se repite es ordenar dentro de una categoría —
 *    "las credenciales primero, el tarifario al final"—. Mover de categoría
 *    pasa una vez por material, y para eso un desplegable es más rápido y no
 *    falla. Se reusa `ListaOrdenable`, el mismo componente del cuestionario.
 *
 * 3. **LO SIN AGRUPAR VA ARRIBA Y SIN TÍTULO.** Es donde cae todo lo que ya
 *    existía y lo que se sube sin pensar en categorías. Ponerle un encabezado
 *    —"Sin agrupar"— convertiría en un problema lo que hoy es el caso normal.
 */

/**
 * La clave del pseudo-grupo "sin agrupar". Con `__` y no con un espacio
 * delante: un valor que empieza por espacio lo normalizan el navegador y las
 * herramientas, y deja de encajar consigo mismo.
 */
const SIN_GRUPO = '__sin-grupo__'
/** El valor de la opción "crear una nueva", por el mismo motivo. */
const NUEVA_SUBCATEGORIA = '__nueva__'

interface Props {
  materiales: ArchivoSala[]
  equipo: boolean
  vacio: string
  editarAction: (id: string, cambios: { titulo: string; fecha: string | null }) => Promise<void>
  eliminarAction: (id: string) => Promise<void>
  /** La lista COMPLETA del módulo tal como quedó: ver `reubicarMateriales`. */
  reubicarAction: (enOrden: Array<{ id: string; grupo: string | null }>) => Promise<void>
}

export function MaterialesAgrupados({
  materiales,
  equipo,
  vacio,
  editarAction,
  eliminarAction,
  reubicarAction,
}: Props) {
  const [pendiente, empezar] = useTransition()

  /**
   * Los grupos en el orden en que aparecen sus materiales — que ya viene
   * resuelto de la base (`porOrdenYFecha`). Así el orden de los grupos se
   * mueve solo al mover sus materiales, sin un segundo campo que mantener.
   */
  const grupos = useMemo(() => {
    const mapa = new Map<string, ArchivoSala[]>()
    for (const m of materiales) {
      const clave = m.grupo ?? SIN_GRUPO
      const lista = mapa.get(clave)
      if (lista) lista.push(m)
      else mapa.set(clave, [m])
    }
    // Sin agrupar SIEMPRE primero, sea cual sea el orden de sus materiales.
    return [...mapa.entries()].sort(([a], [b]) =>
      a === SIN_GRUPO ? -1 : b === SIN_GRUPO ? 1 : 0,
    )
  }, [materiales])

  if (materiales.length === 0) {
    return <p className={estilos.vacioNota}>{vacio}</p>
  }

  /** La lista entera, con un grupo reordenado dentro. */
  function conGrupoReordenado(clave: string, idsEnOrden: string[]) {
    const porId = new Map(materiales.map((m) => [m.id, m]))
    const reordenados = idsEnOrden.map((id) => porId.get(id)!).filter(Boolean)
    return grupos.flatMap(([g, lista]) =>
      (g === clave ? reordenados : lista).map((m) => ({
        id: m.id,
        grupo: g === SIN_GRUPO ? null : g,
      })),
    )
  }

  return (
    <div className={estilos.gruposMateriales}>
      {grupos.map(([clave, lista]) => (
        <section key={clave} className={estilos.grupoMaterial}>
          {clave !== SIN_GRUPO && (
            <NombreDeGrupo
              nombre={clave}
              cuantos={lista.length}
              equipo={equipo}
              renombrar={(nuevo) =>
                reubicarAction(
                  materiales.map((m) => ({
                    id: m.id,
                    grupo: m.grupo === clave ? nuevo : (m.grupo ?? null),
                  })),
                )
              }
            />
          )}

          {equipo ? (
            <ListaOrdenable
              ids={lista.map((m) => m.id)}
              reordenarAction={async (ids) => { await reubicarAction(conGrupoReordenado(clave, ids)) }}
            >
              {lista.map((m) => (
                <MaterialConGrupo
                  key={m.id}
                  material={m}
                  grupos={grupos.map(([g]) => g).filter((g) => g !== SIN_GRUPO)}
                  equipo={equipo}
                  editarAction={editarAction}
                  eliminarAction={eliminarAction}
                  moverAGrupo={(destino) =>
                    empezar(() => reubicarAction(
                      materiales.map((x) => ({
                        id: x.id,
                        grupo: x.id === m.id ? destino : (x.grupo ?? null),
                      })),
                    ))
                  }
                  pendiente={pendiente}
                />
              ))}
            </ListaOrdenable>
          ) : (
            // Sin permiso de escritura no hay que arrastrar nada: la rejilla
            // de siempre, que es la que se lee mejor.
            <MaterialesSala
              materiales={lista}
              equipo={false}
              vacio={vacio}
              editarAction={editarAction}
              eliminarAction={eliminarAction}
            />
          )}
        </section>
      ))}
    </div>
  )
}

/** El nombre de una subcategoría, editable en sitio. */
function NombreDeGrupo({
  nombre,
  cuantos,
  equipo,
  renombrar,
}: {
  nombre: string
  cuantos: number
  equipo: boolean
  renombrar: (nuevo: string) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(nombre)
  const [pendiente, empezar] = useTransition()

  if (editando) {
    return (
      <div className={estilos.grupoCabecera}>
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
          onClick={() => { setTexto(nombre); setEditando(false) }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className={estilos.grupoCabecera}>
      <h3 className={estilos.grupoNombre}>{nombre}</h3>
      <span className={estilos.conteo}>{cuantos}</span>
      {equipo && (
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
    </div>
  )
}

/** Un material dentro de su grupo, con la vía para cambiarlo de categoría. */
function MaterialConGrupo({
  material,
  grupos,
  equipo,
  editarAction,
  eliminarAction,
  moverAGrupo,
  pendiente,
}: {
  material: ArchivoSala
  grupos: string[]
  equipo: boolean
  editarAction: Props['editarAction']
  eliminarAction: Props['eliminarAction']
  moverAGrupo: (destino: string | null) => void
  pendiente: boolean
}) {
  const [creando, setCreando] = useState(false)
  const [nuevo, setNuevo] = useState('')

  return (
    <div className={estilos.materialEnGrupo}>
      <MaterialesSala
        materiales={[material]}
        equipo={equipo}
        vacio=""
        editarAction={editarAction}
        eliminarAction={eliminarAction}
      />
      {equipo && (
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
      )}
    </div>
  )
}
