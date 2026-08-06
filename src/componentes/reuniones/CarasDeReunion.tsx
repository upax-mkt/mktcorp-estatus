'use client'

import Link from 'next/link'
import { tienePresentacion, type Reunion } from '@/dominio/reunion'
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
 * es justo lo que Franco pedía. Cada archivo se anuncia con SU NOMBRE
 * ORIGINAL, no un genérico "presentación": es lo que deja saber qué se va a
 * descargar antes de hacer clic.
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
}

export function CarasDeReunion({ reunion, equipo, onLeerMinuta, compacta, onSubirPresentacion }: Props) {
  return (
    <div className={compacta ? estilos.carasCompactas : estilos.caras}>
      <CaraPresentacion reunion={reunion} equipo={equipo} onSubirPresentacion={onSubirPresentacion} />
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
}: {
  reunion: Reunion
  equipo: boolean
  onSubirPresentacion?: () => void
}) {
  if (!tienePresentacion(reunion)) {
    // Sin manejador no se ofrece la acción, aunque quien mire sea equipo: un
    // botón que no hace nada es peor que este texto. Es el defecto que tuvo
    // esta ronda entre las tareas 9 y 9b, y esta línea es lo que impide que
    // vuelva sin que ningún test se entere.
    if (!equipo || !onSubirPresentacion) return <span className="pildora">Sin presentación</span>
    return (
      <button type="button" className={estilos.caraAccion} onClick={onSubirPresentacion}>
        <span aria-hidden>+</span> Subir presentación
      </button>
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
        <a key={archivo.id} href={archivo.url} target="_blank" rel="noopener" className={estilos.cara}>
          <span aria-hidden>▤</span> {archivo.nombreOriginal}
        </a>
      ))}
    </>
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
