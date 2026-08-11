'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { tienePresentacion, type CaraArchivo, type Reunion } from '@/dominio/reunion'
import estilos from './CarasDeReunion.module.css'

/**
 * LAS DOS CARAS DE UNA REUNIÓN, Y LOS HUECOS QUE LAS LLENAN (ronda 10, tarea 9).
 *
 * Extraído de `ReunionesSala.tsx`, que hasta ahora pintaba lo que faltaba como
 * texto muerto: "Sin presentación", "Falta la minuta" — dos lamentos que no
 * llevan a ninguna parte. Nace de la queja de Franco: tuvo su Quincenal
 * Comercial con Research Land, tenía el PPT en PDF y la transcripción, y la
 * app no le dejaba meterle la minuta a lo que ya había subido, ni al revés.
 * La causa de fondo —la reunión como entidad— la resolvió la Tarea 6; esta
 * tarea es lo que Franco VE: cada hueco es el botón que lo llena, pero SOLO
 * para quien puede llenarlo. Un director de UDN sigue viendo que algo falta
 * —es información útil— pero sin el botón, porque no le toca a él.
 *
 * DOCUMENTO Y ARCHIVO CONVIVEN, a propósito: una reunión puede tener el
 * documento web que arma la app Y un PDF subido aparte — no son excluyentes,
 * es justo lo que Franco pedía. Cada archivo se anuncia con SU TÍTULO —o su
 * nombre original si no tiene uno, defensivo— no un genérico "presentación".
 *
 * EL TÍTULO SE PUEDE EDITAR DESDE AQUÍ (ronda 11, tarea 3). Franco: "una vez
 * cargado un archivo como una presentación debería poder editar el nombre
 * con el que se ve en el front". `editarArchivo` (`src/db/archivos.ts`) y su
 * Server Action ya existían para los archivos de interés de `ArchivosSala`;
 * lo que faltaba era ofrecerlo aquí, que es donde vive un archivo colgado de
 * una reunión. EL TÍTULO ES LO EDITABLE Y MANDA EN CUANTO EXISTE:
 * `nombreOriginal` se conserva como DATO —sigue siendo lo que de verdad se
 * descarga (`archivo.url`, sin tocar)— pero deja de ser lo que se lee.
 * `editarArchivoAction` es opcional, mismo criterio que
 * `onSubirPresentacion` un poco más abajo: sin ella no se ofrece el lápiz,
 * ni para equipo.
 *
 * "+ SUBIR PRESENTACIÓN" ESTÁ CABLEADO DE VERDAD desde la tarea 9b: la subida
 * —elegir archivo, mandarlo a Blob, registrar la fila con su `reunionId`—
 * vive en `ReunionesSala`, que comparte un solo `<input type="file">` entre
 * todas las filas y reutiliza `subirArchivoDirecto` de `ArchivosSala` en vez
 * de abrir un segundo camino de subida.
 *
 * `onSubirPresentacion` es opcional PORQUE SOLO SE LE DA AL EQUIPO: un
 * director de UDN recibe el componente sin ella y ve la píldora informativa
 * en vez del botón. **Si eres equipo y la omites, pintas un botón que no
 * hace nada** — que es peor que el "Sin presentación" que vino a sustituir, y
 * es exactamente el defecto que tuvo esta ronda entre las tareas 9 y 9b.
 *
 * "+ LEVANTAR MINUTA" SÍ es autosuficiente: navega a `/deck/{id}/minuta`, la
 * pantalla que YA sabe generar el acta de una reunión existente a partir de
 * su id (`generarMinutaAction`/`publicarMinutaAction`, gateadas por
 * `esEditor()` en el servidor — `src/app/deck/[id]/minuta/acciones.ts`, sin
 * tocar). NO usa `useRouter()` de `next/navigation`: ese hook exige un árbol
 * de Next real y revienta con "invariant expected app router to be mounted"
 * bajo Testing Library sin ese contexto —probado en caliente antes de
 * escribir esto—, y además esta pieza se renderiza en cada fila de
 * `ReunionesSala`, cuyo propio test la monta con `render()` a secas.
 *
 * CORREGIDO EN LA REVISIÓN FINAL DE LA RONDA 10: la conclusión de arriba era
 * correcta —evitar `useRouter()`— pero la alternativa que se eligió,
 * `window.location.href` en el `onClick` de un `<button>`, nunca fue la
 * única salida. `<Link>` de `next/link` navega sin `useRouter()` y sin
 * árbol de Next real: es justo lo que ya usa `CaraPresentacion`, arriba en
 * este mismo archivo, para "Documento" —y lo que su propio test verifica
 * (`CarasDeReunion.test.tsx`) sin ningún mock de router—. Una recarga dura
 * tira el shell entero de la app, pierde el scroll de una sala larga y, al
 * ser `<button>` y no `<a>`, se lleva por delante el clic-medio, el
 * ctrl-clic, "copiar dirección del enlace" y la vista previa del destino al
 * pasar el ratón. El mismo destino ya se alcanza con `<Link>` desde
 * `ReunionesSala.tsx` ("Corregir el texto →"): esto solo alinea esta pieza
 * con el resto de la app.
 */

interface Props {
  reunion: Reunion
  /** El equipo puede llenar los huecos (subir, levantar minuta); el director solo ve que faltan. */
  equipo: boolean
  /** Abre la minuta YA PUBLICADA en el lightbox de la sala — sin tocar aquí. */
  onLeerMinuta: () => void
  /** Las reuniones anteriores se pintan más apretadas que la última. */
  compacta?: boolean
  /**
   * El equipo pulsó "+ Subir presentación" para ESTA reunión. Opcional: ver
   * el comentario de cabecera de este archivo — es el hueco de integración
   * con `cliente/[slug]/page.tsx` que reporta la Tarea 9 para la Tarea 11.
   */
  onSubirPresentacion?: () => void
  /**
   * Edita el TÍTULO de un archivo de la reunión (ronda 11, tarea 3). LA
   * MISMA `editarArchivoAction` que ya usa `ArchivosSala` para los archivos
   * de interés (definida en `cliente/[slug]/page.tsx`, ya exige editor en el
   * servidor) — se le pasa SIN `fecha` a propósito: `CaraArchivo` no la
   * trae (la fecha de un archivo de reunión es la de SU reunión, no una
   * propia) y mandar `fecha: null` la borraría en la base (`editarArchivo`,
   * `src/db/archivos.ts`, trata `undefined` como "no la toques" pero `null`
   * como "bórrala"). Opcional, mismo criterio que `onSubirPresentacion`: sin
   * ella no se ofrece el lápiz, ni para equipo.
   */
  editarArchivoAction?: (id: string, cambios: { titulo: string }) => Promise<void>
}

export function CarasDeReunion({
  reunion,
  equipo,
  onLeerMinuta,
  compacta,
  onSubirPresentacion,
  editarArchivoAction,
}: Props) {
  return (
    <div className={compacta ? estilos.carasCompactas : estilos.caras}>
      <CaraPresentacion
        reunion={reunion}
        equipo={equipo}
        onSubirPresentacion={onSubirPresentacion}
        editarArchivoAction={editarArchivoAction}
      />
      <CaraMinuta reunion={reunion} equipo={equipo} onLeerMinuta={onLeerMinuta} />
    </div>
  )
}

/**
 * EL DOCUMENTO, LOS ARCHIVOS, O EL HUECO. `tienePresentacion` (dominio/reunion.ts)
 * ya decide con el mismo umbral que `fueDada`: documento LISTO (no solo
 * `documentoId`) o algún archivo. Si hay algo, se enseña TODO lo que hay —no
 * solo lo primero— porque documento y archivo conviven.
 */
function CaraPresentacion({
  reunion,
  equipo,
  onSubirPresentacion,
  editarArchivoAction,
}: {
  reunion: Reunion
  equipo: boolean
  onSubirPresentacion?: () => void
  editarArchivoAction?: (id: string, cambios: { titulo: string }) => Promise<void>
}) {
  if (!tienePresentacion(reunion)) {
    if (!equipo) return <span className="pildora">Sin presentación</span>
    /**
     * LAS DOS VÍAS, JUNTAS (Franco: *"al crear una nueva reunión… allí me debe
     * permitir o cargar la presentación que ya hicimos o crearla en el
     * editor"*).
     *
     * Una reunión recién creada solo ofrecía subir un archivo, así que armarla
     * en el editor exigía saberse la ruta `/deck/<id>` o volver por la lista
     * de Presentaciones. Son los dos caminos normales y ninguno es el
     * principal: unas veces el deck ya existe en PowerPoint y otras se
     * construye aquí.
     *
     * `onSubirPresentacion` sigue siendo opcional y su botón solo se pinta si
     * llega: un botón sin manejador es peor que no ofrecer la acción — el
     * defecto que ya tuvo esta pantalla una vez. El del editor no depende de
     * nadie: es un enlace a una ruta que siempre existe.
     */
    return (
      <>
        {onSubirPresentacion && (
          <button type="button" className={estilos.caraAccion} onClick={onSubirPresentacion}>
            <span aria-hidden>+</span> Subir presentación
          </button>
        )}
        <Link href={`/deck/${reunion.id}`} className={estilos.caraAccion}>
          <span aria-hidden>✎</span> Armarla en el editor
        </Link>
      </>
    )
  }

  return (
    <>
      {reunion.documentoListo && (
        <Link href={`/reunion/${reunion.id}`} className={estilos.cara}>
          <span aria-hidden>▤</span> Documento
        </Link>
      )}
      {reunion.archivos.map((archivo) => (
        <ArchivoDeReunion
          key={archivo.id}
          archivo={archivo}
          equipo={equipo}
          editarArchivoAction={editarArchivoAction}
        />
      ))}
    </>
  )
}

/**
 * UN ARCHIVO DE LA REUNIÓN: su título, y el lápiz para editarlo si toca
 * (ronda 11, tarea 3). Alterna entre pintar (enlace + lápiz) y editar (input
 * + Guardar/Cancelar) — mismo patrón que `FilaArchivo` en `ArchivosSala.tsx`,
 * pero SIN reutilizar sus clases de `cliente.module.css`: ver la cabecera de
 * `CarasDeReunion.module.css` — este componente no depende de los alias de
 * ninguna página en particular, así que sus clases de edición son propias,
 * sobre los mismos tokens de `sistema.css` que ya usa `.cara`/`.caraAccion`.
 */
function ArchivoDeReunion({
  archivo,
  equipo,
  editarArchivoAction,
}: {
  archivo: CaraArchivo
  equipo: boolean
  editarArchivoAction?: (id: string, cambios: { titulo: string }) => Promise<void>
}) {
  const tituloVisible = archivo.titulo || archivo.nombreOriginal
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(tituloVisible)
  const [pendiente, empezar] = useTransition()

  // Solo equipo Y con la acción en mano: sin cualquiera de las dos, ni el
  // lápiz se ofrece — el director de UDN no edita nada (nunca la recibe), y
  // un llamador que se olvide de pasarla no deja un botón roto a la vista.
  const puedeEditar = equipo && Boolean(editarArchivoAction)

  if (puedeEditar && editando) {
    return (
      <span className={estilos.caraEditando}>
        <input
          type="text"
          className={estilos.caraInput}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label={`Título de ${archivo.nombreOriginal}`}
          autoFocus
        />
        <button
          type="button"
          className={estilos.caraGuardar}
          disabled={pendiente || titulo.trim().length === 0}
          onClick={() =>
            empezar(async () => {
              await editarArchivoAction!(archivo.id, { titulo: titulo.trim() })
              setEditando(false)
            })
          }
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          className={estilos.caraCancelarEdicion}
          disabled={pendiente}
          onClick={() => {
            setTitulo(tituloVisible)
            setEditando(false)
          }}
        >
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <span className={estilos.caraConLapiz}>
      <a href={archivo.url} target="_blank" rel="noopener" className={estilos.cara}>
        <span aria-hidden>▤</span> {tituloVisible}
      </a>
      {puedeEditar && (
        <button
          type="button"
          className={estilos.caraLapiz}
          onClick={() => setEditando(true)}
          aria-label={`Editar el título de ${tituloVisible}`}
        >
          ✎
        </button>
      )}
    </span>
  )
}

/** La minuta YA PUBLICADA, o el hueco — mismo criterio de huecos accionables que CaraPresentacion. */
function CaraMinuta({
  reunion,
  equipo,
  onLeerMinuta,
}: {
  reunion: Reunion
  equipo: boolean
  onLeerMinuta: () => void
}) {
  if (reunion.minuta) {
    return (
      <button type="button" className={estilos.cara} onClick={onLeerMinuta}>
        <span aria-hidden>✎</span> Minuta
      </button>
    )
  }

  if (!equipo) return <span className="pildora" data-tono="ojo">Falta la minuta</span>

  return (
    <Link href={`/deck/${reunion.id}/minuta`} className={estilos.caraAccion}>
      <span aria-hidden>+</span> Levantar minuta
    </Link>
  )
}
