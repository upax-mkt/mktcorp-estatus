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
 * "+ SUBIR PRESENTACIÓN" es un hueco de INTEGRACIÓN, todavía no una función
 * completa: la subida en sí —elegir archivo, mandarlo a Blob, registrar la
 * fila con el `reunionId` que hoy no viaja por ninguna parte de
 * `registrarArchivoAction`— vive fuera de este componente (hoy en
 * `ArchivosSala`/`cliente/[slug]/page.tsx`). Por eso `onSubirPresentacion` es
 * OPCIONAL: sin ella el botón se ve y se puede pulsar igual —el equipo ve la
 * acción disponible, nunca un lamento— pero no hace nada todavía, a la
 * espera de que quien monte este componente la cablee. Ver el reporte de la
 * Tarea 9 (`task-9-report.md`) para la firma exacta que necesita
 * `cliente/[slug]/page.tsx` vía `ReunionesSala`.
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
 * `window.location.href` es la navegación real sin esa dependencia, y deja
 * el elemento como `<button>` de verdad —rol, teclado (Enter Y Espacio),
 * foco— en vez de un enlace disfrazado con `role="button"`.
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
    if (!equipo) return <span className="pildora">Sin presentación</span>
    return (
      <button type="button" className={estilos.caraAccion} onClick={() => onSubirPresentacion?.()}>
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
    <button
      type="button"
      className={estilos.caraAccion}
      onClick={() => {
        window.location.href = `/deck/${reunion.id}/minuta`
      }}
    >
      <span aria-hidden>+</span> Levantar minuta
    </button>
  )
}
