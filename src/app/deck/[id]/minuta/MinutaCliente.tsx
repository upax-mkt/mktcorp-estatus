'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import estilos from '../../deck.module.css'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import { CorreoMinuta } from '@/componentes/CorreoMinuta'
import { SelectorResponsable } from '@/componentes/SelectorResponsable'
import { personaMasParecida, type PersonaMonday } from '@/monday/personas'
import { generarMinutaAction, publicarMinutaAction, type DeQueReunion } from './acciones'
import type { AcuerdoPropuesto } from '@/minuta/esquema'
import type { AcuerdoConfirmado } from '@/db/minutas'

interface FilaAcuerdo extends AcuerdoConfirmado {
  incluir: boolean
  /**
   * La persona que `personaMasParecida()` encontró a partir del nombre que
   * trajo la IA, para OFRECERLA como botón en SelectorResponsable — nunca se
   * aplica sola. `null` sin coincidencia evidente. Se congela al crear la
   * fila (no se recalcula si el campo se edita después) y no viaja a
   * publicarMinutaAction: es un dato de pantalla, no del acuerdo.
   */
  sugerencia: PersonaMonday | null
  /**
   * Identidad de la fila para el `key` de React — el índice se corre al
   * quitar una fila (botón «Quitar»), y SelectorResponsable guarda estado
   * propio (qué hay elegido) que no debe heredarlo la fila que ocupe después
   * su misma posición.
   */
  claveUi: string
}

interface Props {
  /**
   * De qué reunión es esta minuta: una que ya existe en la app, o una descrita
   * a mano que todavía NO SE HA REGISTRADO. Lo segundo es lo que evita las
   * reuniones fantasma — se registra al publicar, no al empezar a escribir.
   */
  de: DeQueReunion
  /**
   * Qué hacer cuando la minuta queda publicada. Por defecto vuelve al
   * cuestionario de la reunión — lo correcto cuando el flujo se abre desde el
   * preparador. Desde la SALA, en cambio, no hay a dónde volver: se cierra la
   * ventana flotante y la sala se refresca.
   */
  alPublicar?: (reunionId: string) => void
  /**
   * Transcripción ya capturada, si la reunión se grabó desde el modo
   * presentación. Es un valor INICIAL, no controlado: quien lo recibe puede
   * corregirlo antes de generar — una transcripción automática se equivoca
   * con los nombres propios, y esos nombres acaban siendo responsables de
   * acuerdos.
   */
  transcripcionInicial?: string
  /** La gente viva de Mkt Corp, para elegir como responsable — ver directorio() en src/db/personas.ts. */
  personas: PersonaMonday[]
}

const SUGERENCIAS_PRIORIDAD = ['alta', 'media', 'baja']

/**
 * Lee el archivo con SU codificación, no con la que suponemos.
 *
 * `File.text()` decodifica SIEMPRE como UTF-8, y las transcripciones de Teams
 * en Windows salen en UTF-16 — con marca de orden de bytes al principio. Leer
 * un UTF-16 como UTF-8 no falla: devuelve el texto con un byte nulo entre cada
 * letra. Es el peor tipo de error, porque no rompe nada: llega al modelo, el
 * modelo se las arregla, y nadie se entera de que la mitad de lo que se envió
 * era basura.
 *
 * Se mira el BOM, que es exactamente para esto. Sin BOM se asume UTF-8, que es
 * lo que es todo lo demás.
 */
async function leerTexto(archivo: File): Promise<string> {
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const bom =
    bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be'
    : 'utf-8'
  return new TextDecoder(bom).decode(bytes)
}

/** Cuántas palabras hay. Es la señal de que el archivo entró de verdad. */
function palabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

/**
 * El acuerdo que propuso la IA, listo para revisarse en pantalla.
 *
 * `responsableMondayId` nace SIEMPRE en `null`, aunque haya una coincidencia
 * evidente: `personaMasParecida` nunca decide el responsable por su cuenta,
 * solo se calcula y se guarda aparte para que SelectorResponsable la OFREZCA
 * como un botón — el id solo entra al estado si alguien pulsa "Confirmar" o
 * elige a mano. Sin ese clic, el acuerdo se guarda con el nombre de texto que
 * trajo la IA y sin id: vive en la sala, no entra a la bandeja, y ponerle
 * dueño después es una edición, no una reconstrucción.
 */
function aFilaEditable(a: AcuerdoPropuesto, personas: PersonaMonday[]): FilaAcuerdo {
  return {
    ...a,
    incluir: true,
    responsableMondayId: null,
    sugerencia: personaMasParecida(a.responsable, personas),
    claveUi: crypto.randomUUID(),
  }
}

export function MinutaCliente({ de, alPublicar, transcripcionInicial, personas }: Props) {
  const router = useRouter()
  const [transcripcion, setTranscripcion] = useState(transcripcionInicial ?? '')
  const [textoCorreo, setTextoCorreo] = useState<string | null>(null)
  const [filas, setFilas] = useState<FilaAcuerdo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)
  const [generando, startGenerar] = useTransition()
  const [publicando, startPublicar] = useTransition()

  /**
   * SUBIR LA TRANSCRIPCIÓN COMO ARCHIVO, además de pegarla.
   *
   * Franco: "debería además de pedir pegar el texto dar la opción de subir un
   * archivo txt". Es el caso normal: Meet y Teams dejan la transcripción como
   * archivo, y pegarla obliga a abrirlo, seleccionar todo y copiar — tres
   * pasos para algo que el navegador sabe hacer solo.
   *
   * Se lee EN EL NAVEGADOR y se vuelca al campo: no se sube a ningún sitio, y
   * lo que viaja al servidor es el mismo texto que si se hubiera pegado. Así
   * quien lo sube puede corregirlo antes de generar —una transcripción
   * automática se equivoca con los nombres propios— y no hay un archivo con
   * la conversación entera de una junta guardado en ninguna parte.
   */
  async function cargarArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    // Un .txt de una reunión de una hora ronda las 60 KB; un límite generoso
    // evita que alguien intente cargar un vídeo por error y espere.
    if (archivo.size > 2_000_000) {
      setError('El archivo es demasiado grande. Una transcripción de texto no pasa de unos cientos de KB.')
      return
    }
    try {
      const texto = await leerTexto(archivo)
      if (!texto.trim()) {
        setError('El archivo está vacío.')
        return
      }
      setTranscripcion(texto)
      setNombreArchivo(archivo.name)
    } catch {
      setError('No se pudo leer el archivo.')
    }
  }

  function generar() {
    // NO se deshabilita el botón cuando falta el texto: un botón al 40% de
    // opacidad sobre una tarjeta blanca se lee como que no existe, y eso fue
    // exactamente lo que pasó ("no tiene botón de acción para generar la
    // minuta"). Se deja a plena tinta y se dice qué falta al pulsarlo.
    if (transcripcion.trim().length === 0) {
      setError('Pega la transcripción o sube el archivo antes de generar.')
      return
    }
    setError(null)
    startGenerar(async () => {
      const r = await generarMinutaAction(de, transcripcion)
      if (!r.ok || !r.textoCorreo || !r.acuerdosPropuestos) {
        setError(r.error ?? 'No se pudo generar la minuta.')
        return
      }
      setTextoCorreo(r.textoCorreo)
      setFilas(r.acuerdosPropuestos.map((a) => aFilaEditable(a, personas)))
    })
  }

  function actualizarFila(indice: number, cambios: Partial<FilaAcuerdo>) {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, ...cambios } : f)))
  }

  function publicar() {
    if (!textoCorreo) return
    setError(null)
    startPublicar(async () => {
      const confirmados = filas
        .filter((f) => f.incluir)
        .map(({ incluir: _incluir, sugerencia: _sugerencia, claveUi: _claveUi, ...resto }) => resto)

      const r = await publicarMinutaAction(de, transcripcion, textoCorreo, confirmados)
      if (!r.ok || !r.reunionId) {
        setError(r.error ?? 'No se pudo publicar la minuta.')
        return
      }
      // El id viene de la respuesta y no de las props: cuando la reunión se
      // describió a mano, hasta este momento no existía.
      if (alPublicar) {
        alPublicar(r.reunionId)
      } else {
        router.push(`/deck/${r.reunionId}`)
      }
      router.refresh()
    })
  }

  const incluidos = filas.filter((f) => f.incluir)
  const sinFecha = incluidos.filter((f) => !f.fechaCompromiso).length

  return (
    <div className={estilos.minutaFlujo}>
      {!textoCorreo && (
        <div className={estilos.campoInline}>
          <div className={estilos.transcripcionCabecera}>
            <span className={estilos.campoInlineLabel}>Transcripción de la reunión</span>
            {/* Las dos vías, a la misma altura: pegar y subir. */}
            <label className={estilos.subirTxt}>
              <input
                type="file"
                accept=".txt,.md,.vtt,.srt,text/plain"
                onChange={(e) => { void cargarArchivo(e.target.files?.[0]); e.target.value = '' }}
              />
              <span>Subir un archivo</span>
            </label>
          </div>

          <textarea
            className={`${estilos.textarea} ${estilos.textareaGrande}`}
            value={transcripcion}
            onChange={(e) => { setTranscripcion(e.target.value); setNombreArchivo(null) }}
            placeholder="Pega aquí la transcripción completa de la reunión (Meet/Teams), o sube el archivo."
          />

          <div className={estilos.generarFila}>
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonAcento}`}
              disabled={generando}
              onClick={generar}
            >
              {generando ? 'Generando…' : 'Generar minuta →'}
            </button>
            <span className={estilos.generarNota}>
              {nombreArchivo
                ? `${nombreArchivo} · ${palabras(transcripcion)} palabras`
                : transcripcion.trim()
                  ? `${palabras(transcripcion)} palabras`
                  : 'Redactada con Claude Opus 5. Nada se publica sin que lo revises.'}
            </span>
          </div>
        </div>
      )}

      {error && <p className={estilos.avisoError}>{error}</p>}

      {textoCorreo && (
        <>
          <div className={estilos.minutaCorreoWrap}>
            <div className={estilos.minutaCorreoCabecera}>
              <span className={estilos.campoInlineLabel}>Texto del correo</span>
              <CopiarBoton
                texto={textoCorreo}
                formatoCorreo
                className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
              />
            </div>
            <CorreoMinuta texto={textoCorreo} />
          </div>

          <div className={estilos.minutaAcuerdos}>
            <div className={estilos.minutaAcuerdosCabecera}>
              <span className={estilos.campoInlineLabel}>Acuerdos propuestos — revisa antes de publicar</span>
              {sinFecha > 0 && <span className={estilos.avisoSinFecha}>{sinFecha} sin fecha compromiso</span>}
            </div>

            {filas.length === 0 ? (
              <p className={estilos.pistaTextarea}>La transcripción no arrojó acuerdos accionables.</p>
            ) : (
              filas.map((f, i) => (
                <div key={f.claveUi} className={estilos.filaAcuerdoEditable}>
                  <input
                    type="checkbox"
                    checked={f.incluir}
                    onChange={(e) => actualizarFila(i, { incluir: e.target.checked })}
                    aria-label={f.incluir ? 'Descartar este acuerdo' : 'Incluir este acuerdo'}
                    className={estilos.checkAcuerdo}
                  />
                  <div className={estilos.filaAcuerdoCampos}>
                    <input
                      type="text"
                      className={estilos.inputTexto}
                      value={f.que}
                      onChange={(e) => actualizarFila(i, { que: e.target.value })}
                      placeholder="Qué se acordó"
                      disabled={!f.incluir}
                    />
                    <div className={estilos.filaAcuerdoCamposChicos}>
                      <SelectorResponsable
                        personas={personas}
                        valorInicial={{ nombre: f.responsable, mondayId: f.responsableMondayId ?? null }}
                        sugerencia={f.sugerencia}
                        onCambiar={(v) => actualizarFila(i, { responsable: v.responsable, responsableMondayId: v.responsableMondayId })}
                        disabled={!f.incluir}
                      />
                      <input
                        type="text"
                        className={estilos.inputTexto}
                        value={f.squad ?? ''}
                        onChange={(e) => actualizarFila(i, { squad: e.target.value || undefined })}
                        placeholder="Squad (opcional)"
                        disabled={!f.incluir}
                      />
                      <input
                        type="text"
                        className={estilos.inputTexto}
                        value={f.prioridad}
                        onChange={(e) => actualizarFila(i, { prioridad: e.target.value })}
                        placeholder="Prioridad"
                        list="prioridades-sugeridas"
                        disabled={!f.incluir}
                      />
                      <input
                        type="date"
                        className={`${estilos.inputTexto} ${!f.fechaCompromiso ? estilos.inputFechaVacia : ''}`}
                        value={f.fechaCompromiso ?? ''}
                        onChange={(e) => actualizarFila(i, { fechaCompromiso: e.target.value || null })}
                        disabled={!f.incluir}
                      />
                    </div>
                    <div className={estilos.filaAcuerdoPie}>
                      {f.incluir && !f.fechaCompromiso && (
                        <span className={estilos.etiquetaPorDefinir}>por definir — revisa antes de enviar</span>
                      )}
                      {/* QUITAR es distinto de DESMARCAR: desmarcar deja el
                          acuerdo a la vista, por si uno se arrepiente; quitar
                          lo borra de la lista. Lo primero es para dudar, lo
                          segundo para lo que el modelo no debió proponer. */}
                      <button
                        type="button"
                        className={estilos.quitarAcuerdo}
                        onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))}
                        aria-label={`Quitar el acuerdo ${i + 1}`}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {/* AÑADIR Y QUITAR, no solo incluir o excluir.
                La casilla sirve para dejar fuera lo que el modelo propuso de
                más, pero una reunión siempre tiene el acuerdo que nadie dijo
                en voz alta y todos dieron por hecho — y ese no se puede
                escribir en ningún sitio si la lista es de solo lectura. */}
            <div className={estilos.acuerdosAcciones}>
              <button
                type="button"
                className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
                onClick={() => setFilas((f) => [...f, {
                  que: '',
                  responsable: 'por asignar',
                  responsableMondayId: null,
                  prioridad: 'media',
                  fechaCompromiso: null,
                  incluir: true,
                  sugerencia: null,
                  claveUi: crypto.randomUUID(),
                }])}
              >
                + Añadir un acuerdo
              </button>
            </div>

            <datalist id="prioridades-sugeridas">
              {SUGERENCIAS_PRIORIDAD.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className={estilos.panelMaquetar}>
            <span className={estilos.panelMaquetarTexto}>
              {incluidos.length} de {filas.length} acuerdos se publicarán en el espacio del cliente.
              {sinFecha > 0 && ' Revisa los que dicen "por definir" antes de enviar el correo.'}
            </span>
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonAcento}`}
              disabled={publicando}
              onClick={publicar}
            >
              {publicando ? 'Publicando…' : 'Publicar minuta →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
