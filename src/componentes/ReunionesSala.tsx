'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { tienePresentacion, type Reunion } from '@/dominio/reunion'
import type { Participante } from '@/db/participacion'
import type { CategoriaArchivo } from '@/db/archivos'
import { fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import { TAMANO_MAXIMO, pesoLegible } from '@/lib/blob'
import { ParticipantesSesion } from '@/componentes/sesion/ParticipantesSesion'
import { CopiarBoton } from './CopiarBoton'
import { CarasDeReunion } from './reuniones/CarasDeReunion'
import { AcuerdosDeReunion } from './reuniones/AcuerdosDeReunion'
import { subirArchivoDirecto } from './ArchivosSala'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LAS REUNIONES DE UNA SALA: lo que se presentó y lo que se acordó, juntos.
 *
 * Franco: "el módulo Presentaciones y minutas creo que debe ser uno, así la
 * presentación está asociada a una minuta, es decir a una reunión".
 *
 * Antes eran dos secciones paralelas, cada una ordenada por su cuenta. Para
 * saber qué se acordó en la presentación de mayo había que buscar mayo dos
 * veces y confiar en que las dos listas hablaban del mismo día. Ahora cada
 * reunión es una fila con sus dos caras, y lo que le falta se ve sin buscar:
 * una reunión presentada y sin minuta lo dice en su propia fila.
 *
 * La minuta se lee AQUÍ, en un `<dialog>` de verdad: el navegador ya atrapa el
 * foco dentro, cierra con Escape, deja inerte lo de detrás y lo anuncia a un
 * lector de pantalla. Reimplementar eso a mano es como se fabrican las trampas
 * de teclado.
 *
 * "+ SUBIR PRESENTACIÓN" SUBE DE VERDAD (ronda 10, tarea 9b). La Tarea 9 dejó
 * el hueco en `CarasDeReunion` (`onSubirPresentacion`, sin nadie que lo
 * llenara); la Tarea 11 dejó `registrarArchivoAction` listo para recibir un
 * `reunionId`. Nadie los unió — el botón se veía, se pulsaba, y no pasaba
 * nada, que es peor que el "Sin presentación" que vino a sustituir.
 *
 * El flujo vive AQUÍ, no en `CarasDeReunion` (que solo pide el clic, según su
 * propio comentario de cabecera) ni en `page.tsx` (Server Component: no
 * puede sostener un `<input type="file">` con estado propio). Un único input
 * de archivo, oculto, compartido por todas las filas, disparado
 * programáticamente por el botón de LA fila que se pulsó —guardada en un
 * `ref`, no en estado, para no depender de que un re-render llegue a tiempo
 * antes de que el usuario elija el archivo—. La subida en sí reutiliza
 * `subirArchivoDirecto`, extraída de `ArchivosSala` en esta misma tarea: el
 * mismo mecanismo (navegador → Blob → `registrarArchivoAction`), nunca un
 * segundo camino. `categoria` siempre `'presentacion'`; `reunionId` y
 * `fecha` siempre los de la reunión que abrió el selector — la fecha se
 * hereda de la reunión, nunca se le vuelve a pedir a quien sube.
 */

interface Props {
  reuniones: Reunion[]
  /** El equipo puede corregir la minuta; el director solo la lee. */
  equipo: boolean
  /**
   * Quién preparó y quién presentó cada reunión, por `id` de reunión — SOLO
   * llega poblado cuando quien mira es equipo (ver el comentario junto a
   * donde se arma, en `src/app/cliente/[slug]/page.tsx`). Con un director de
   * UDN mirando, este objeto llega vacío: no hay nombres que ocultar al
   * pintar porque no hay nombres que hayan viajado hasta aquí.
   *
   * RENOMBRADO EN LA TAREA 7 (`participacionPorSesion` → `participacionPorReunion`):
   * mismo dato, misma regla de privacidad — solo cambia que la clave es el id
   * de la reunión (`Reunion.id`, siempre presente) y no el de una sesión que
   * ya no existe como concepto en pantalla.
   */
  participacionPorReunion?: Record<string, Participante[]>
  /** La sala de estas reuniones — construye la ruta del blob (ronda 10, tarea 9b). */
  salaSlug: string
  /**
   * LA MISMA Server Action que usa `ArchivosSala` para "archivos de
   * interés" (`registrarArchivoAction`, definida en
   * `cliente/[slug]/page.tsx`): ya exige `exigirEditor()` y ya acepta y
   * reenvía `reunionId` (Tarea 11). Aquí se llama con `categoria:
   * 'presentacion'` y el `reunionId`/`fecha` de la reunión concreta desde la
   * que se pulsó "+ Subir presentación" (Tarea 9b) — cierra el hueco que
   * dejó la Tarea 9 en `CarasDeReunion`. NO es opcional: page.tsx siempre la
   * tiene lista, y dejarla opcional invitaría a que un llamador nuevo la
   * olvidara otra vez.
   */
  registrarArchivoAction: (datos: {
    categoria: CategoriaArchivo
    titulo: string
    fecha: string | null
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
    reunionId?: string | null
  }) => Promise<{ error?: string }>
}

export function ReunionesSala({
  reuniones,
  equipo,
  participacionPorReunion = {},
  salaSlug,
  registrarArchivoAction,
}: Props) {
  const [abierta, setAbierta] = useState<Reunion | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  // ---- "+ Subir presentación" (Tarea 9b): un input compartido, la reunión
  // objetivo en un ref (no en estado: no depende de que un re-render llegue
  // antes de que el usuario elija el archivo del selector nativo). ----
  const objetivoSubida = useRef<Reunion | null>(null)
  const entradaArchivo = useRef<HTMLInputElement>(null)
  const [subiendoReunionId, setSubiendoReunionId] = useState<string | null>(null)
  const [errorSubida, setErrorSubida] = useState<{ reunionId: string; mensaje: string } | null>(null)

  function alPulsarSubirPresentacion(reunion: Reunion) {
    objetivoSubida.current = reunion
    setErrorSubida(null)
    entradaArchivo.current?.click()
  }

  async function alElegirArchivoDePresentacion(archivo: File | undefined) {
    const reunion = objetivoSubida.current
    if (!archivo || !reunion) return

    // Mismo aviso de cortesía que `ArchivosSala`: el servidor es el que
    // manda (`/api/archivos/subir`), esto solo evita esperar a que suba un
    // archivo que iba a rechazarse al final.
    if (archivo.size > TAMANO_MAXIMO) {
      setErrorSubida({
        reunionId: reunion.id,
        mensaje: `El archivo pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`,
      })
      return
    }

    setSubiendoReunionId(reunion.id)
    try {
      const subido = await subirArchivoDirecto(salaSlug, 'presentacion', archivo)
      const r = await registrarArchivoAction({
        categoria: 'presentacion',
        titulo: archivo.name,
        fecha: reunion.fecha,
        reunionId: reunion.id,
        ...subido,
      })
      if (r.error) setErrorSubida({ reunionId: reunion.id, mensaje: r.error })
    } catch (e) {
      setErrorSubida({
        reunionId: reunion.id,
        mensaje: e instanceof Error ? e.message : 'No se pudo subir el archivo.',
      })
    } finally {
      setSubiendoReunionId(null)
      objetivoSubida.current = null
    }
  }

  // `showModal()` es lo que da el modo modal. Un `<dialog open>` declarativo
  // NO es modal: sale en el flujo y el resto sigue siendo tabulable por detrás.
  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierta && !nodo.open) nodo.showModal()
    if (!abierta && nodo.open) nodo.close()
  }, [abierta])

  if (reuniones.length === 0) {
    return (
      <p className={estilos.vacioNota}>
        Todavía no se ha dado ninguna reunión con este cliente. La primera nace al preparar una
        presentación; su minuta se levanta al terminarla.
      </p>
    )
  }

  const [ultima, ...anteriores] = reuniones
  const minutaDe = (r: Reunion) => r.minuta
  /**
   * Quién tocó ESTA reunión, o `undefined` si no hay nada que decir.
   *
   * Defensa doble a propósito, no redundancia inútil: el mapa ya llega vacío
   * para un director (page.tsx no lo pide), pero este componente tampoco lo
   * pintaría aunque llegara poblado — `equipo` se comprueba también aquí.
   */
  const participantesDeReunion = (r: Reunion): Participante[] | undefined =>
    equipo ? participacionPorReunion[r.id] : undefined
  const participantesUltima = participantesDeReunion(ultima)

  return (
    <>
      {/* Compartido por TODAS las filas: se dispara programáticamente desde
          `alPulsarSubirPresentacion`, nunca se ve ni se clica directo. */}
      <input
        ref={entradaArchivo}
        type="file"
        className={estilos.entradaOculta}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          e.target.value = '' // permite volver a elegir el mismo archivo si algo falla
          void alElegirArchivoDePresentacion(archivo)
        }}
      />

      <div className={estilos.reunionDestacada}>
        <div className={estilos.reunionCabecera}>
          <div>
            <div className={estilos.presTag}>La última</div>
            <h3 className={estilos.presTitulo}>{ultima.titulo}</h3>
            <div className={estilos.presFecha}>{fechaCompleta(ultima.fecha)}</div>
          </div>
        </div>
        <CarasDeReunion
          reunion={ultima}
          equipo={equipo}
          onLeerMinuta={() => setAbierta(ultima)}
          onSubirPresentacion={equipo ? () => alPulsarSubirPresentacion(ultima) : undefined}
        />
        {subiendoReunionId === ultima.id && <p className={estilos.subirPista}>Subiendo…</p>}
        {errorSubida?.reunionId === ultima.id && <p className={estilos.subirError}>{errorSubida.mensaje}</p>}
        <AcuerdosDeReunion acuerdos={ultima.acuerdos} />
        {participantesUltima && <ParticipantesSesion participantes={participantesUltima} />}
      </div>

      {anteriores.length > 0 && (
        <div className={estilos.reuniones}>
          {anteriores.map((r) => {
            const participantes = participantesDeReunion(r)
            return (
              <div key={r.id} className={estilos.reunionFila}>
                <div className={estilos.reunionFilaTexto}>
                  <span className={estilos.presFilaTitulo}>{r.titulo}</span>
                  <span className={estilos.presFilaFecha}>{fechaBreveConAnio(r.fecha)}</span>
                </div>
                <CarasDeReunion
                  reunion={r}
                  equipo={equipo}
                  onLeerMinuta={() => setAbierta(r)}
                  onSubirPresentacion={equipo ? () => alPulsarSubirPresentacion(r) : undefined}
                  compacta
                />
                {subiendoReunionId === r.id && <p className={estilos.subirPista}>Subiendo…</p>}
                {errorSubida?.reunionId === r.id && <p className={estilos.subirError}>{errorSubida.mensaje}</p>}
                <AcuerdosDeReunion acuerdos={r.acuerdos} />
                {participantes && (
                  <div className={estilos.reunionFilaParticipacion}>
                    <ParticipantesSesion participantes={participantes} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <dialog
        ref={dialogo}
        className={estilos.lightbox}
        aria-label={abierta ? `Minuta · ${abierta.titulo}` : 'Minuta'}
        // El backdrop cierra, pero solo si el clic cayó EN el backdrop: un
        // `<dialog>` recibe los clics de su contenido, así que sin comprobar el
        // destino se cierra al soltar el ratón dentro del propio texto.
        onClick={(e) => {
          if (e.target === dialogo.current) setAbierta(null)
        }}
        onClose={() => setAbierta(null)}
      >
        {abierta && minutaDe(abierta) && (
          <div className={estilos.lightboxCaja}>
            <header className={estilos.lightboxCabecera}>
              <div>
                <h3 className={estilos.lightboxTitulo}>{minutaDe(abierta)!.titulo}</h3>
                <div className={estilos.lightboxFecha}>
                  {fechaCompleta(minutaDe(abierta)!.fecha)} · {textoEnvio(minutaDe(abierta)!.enviadaA)}
                </div>
              </div>
              <button
                type="button"
                className={estilos.lightboxCerrar}
                onClick={() => setAbierta(null)}
                aria-label="Cerrar la minuta"
              >
                ✕
              </button>
            </header>

            {minutaDe(abierta)!.texto ? (
              <div className={estilos.lightboxTexto}>{minutaDe(abierta)!.texto}</div>
            ) : (
              <p className={estilos.lightboxVacio}>
                Esta minuta no tiene texto guardado. Se generó antes de que la sala pudiera
                mostrarlas, o se publicó sin cuerpo.
              </p>
            )}

            <footer className={estilos.lightboxPie}>
              {minutaDe(abierta)!.texto && (
                <CopiarBoton texto={minutaDe(abierta)!.texto!} formatoCorreo className={estilos.lightboxBoton} />
              )}
              {/* Desde la minuta se llega al documento de SU reunión: es la
                  pregunta que sigue a leer un acuerdo — "¿qué se presentó?". */}
              {tienePresentacion(abierta) && (
                <Link href={`/reunion/${abierta.id}`} className={estilos.lightboxEnlace}>
                  Ver la presentación →
                </Link>
              )}
              {equipo && (
                <Link href={`/deck/${abierta.id}/minuta`} className={estilos.lightboxEnlace}>
                  Corregir el texto →
                </Link>
              )}
            </footer>
          </div>
        )}
      </dialog>
    </>
  )
}

/** "enviada a 0" es la forma más fría de decir que no se ha mandado. */
function textoEnvio(cuantos: number): string {
  if (cuantos === 0) return 'sin enviar'
  return `enviada a ${cuantos}`
}
