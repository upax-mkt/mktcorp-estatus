'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import estilos from '../../deck.module.css'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import { SelectorResponsable } from '@/componentes/SelectorResponsable'
import { ListaOrdenable } from '@/componentes/ListaOrdenable'
import { personaMasParecida, type PersonaResponsable } from '@/lib/personas'
import { generarMinutaAction, publicarMinutaAction, type DeQueReunion, type EstadoGeneracion } from './acciones'
import { ensamblarCorreo, formatearFechaTabla, urlSesion } from '@/minuta/ensamblar'
import type { InsumosCorreo } from '@/minuta/ensamblar'
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
  sugerencia: PersonaResponsable | null
  /**
   * Identidad de la fila para el `key` de React Y para `ListaOrdenable`
   * (ronda 11, tarea 1: antes solo hacía falta para el `key`, ahora además
   * es el id con el que se arrastra y se reordena) — el índice se corre al
   * quitar una fila o al reordenar, y SelectorResponsable guarda estado
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
  /** La gente de Mkt Corp, para elegir como responsable — ver genteParaResponsable() en src/db/personas.ts. */
  personas: PersonaResponsable[]
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
 * La `sugerencia` NO se aplica sola, aunque la coincidencia sea evidente:
 * `personaMasParecida` nunca decide el responsable por su cuenta,
 * solo se calcula y se guarda aparte para que SelectorResponsable la OFREZCA
 * como un botón — el id solo entra al estado si alguien pulsa "Confirmar" o
 * elige a mano. Sin ese clic, el acuerdo se guarda con el nombre de texto que
 * trajo la IA y sin id: vive en la sala, no entra a la bandeja, y ponerle
 * dueño después es una edición, no una reconstrucción.
 */
function aFilaEditable(a: AcuerdoPropuesto, personas: PersonaResponsable[]): FilaAcuerdo {
  return {
    ...a,
    incluir: true,
    sugerencia: personaMasParecida(a.responsable, personas),
    claveUi: crypto.randomUUID(),
  }
}

/**
 * ESTILOS DE LA VISTA PREVIA EDITABLE (ronda 11, tarea 1).
 *
 * Antes esta vista era el MISMO HTML que se copia al portapapeles
 * (`CorreoMinuta`/`correoAHtml`, vía `dangerouslySetInnerHTML`). Dejó de
 * serlo aquí a propósito: en cuanto un bloque es editable, su texto tiene que
 * vivir en un `<textarea>` de verdad —no en HTML generado—, y `correoAHtml`
 * no tiene forma de intercalar un control de React dentro del suyo. Lo que se
 * COPIA y lo que se PUBLICA (`textoCorreo`, más abajo) sigue siendo el texto
 * real armado por `ensamblarCorreo` con el formato completo (viñetas, tabla);
 * lo que cambia aquí es solo esta vista EN PANTALLA, que ahora se compone a
 * mano con las mismas piezas para poder editarla in situ.
 */
const estiloParrafo: CSSProperties = { margin: '0 0 0.85rem', lineHeight: 1.55, fontSize: '0.92rem' }
const estiloCabeceraBloque: CSSProperties = { margin: '0 0 0.4rem', fontSize: '0.92rem', fontWeight: 700 }
const estiloTabla: CSSProperties = { borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem', margin: '0 0 0.85rem' }
const estiloCeldaCabecera: CSSProperties = {
  textAlign: 'left', padding: '0.4rem 0.75rem 0.4rem 0', borderBottom: '2px solid var(--tx)', fontWeight: 700,
}
const estiloCelda: CSSProperties = {
  textAlign: 'left', padding: '0.4rem 0.75rem 0.4rem 0', borderBottom: '1px solid var(--borde)', verticalAlign: 'top',
}

/** Líneas no vacías de un texto de varias líneas (saludo/cierre), cada una su propio párrafo. */
function lineasNoVacias(texto: string): string[] {
  return texto.split('\n').map((l) => l.trim()).filter(Boolean)
}

/**
 * La tabla de acuerdos, TAL COMO VA A QUEDAR — nunca editable como texto: se
 * deriva de `filas` (ambigüedad resuelta del brief), igual que la tabla real
 * del correo (`ensamblarCorreo`/`tablaAcuerdos`). Mismo formato de fecha
 * (`formatearFechaTabla`) que la versión que de verdad se envía, para que lo
 * que se revisa aquí sea lo que va a llegar.
 */
function TablaAcuerdosVista({ acuerdos }: { acuerdos: FilaAcuerdo[] }) {
  if (acuerdos.length === 0) {
    return <p style={estiloParrafo}>(sin acuerdos accionables identificados en la transcripción)</p>
  }
  return (
    <table style={estiloTabla}>
      <thead>
        <tr>
          <th style={estiloCeldaCabecera}>Acción</th>
          <th style={estiloCeldaCabecera}>Owner</th>
          <th style={estiloCeldaCabecera}>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {acuerdos.map((a) => (
          <tr key={a.claveUi}>
            <td style={estiloCelda}>{a.que}</td>
            <td style={estiloCelda}>{a.responsable}</td>
            <td style={estiloCelda}>{formatearFechaTabla(a.fechaCompromiso)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MinutaCliente({ de, alPublicar, transcripcionInicial, personas }: Props) {
  const router = useRouter()
  const [transcripcion, setTranscripcion] = useState(transcripcionInicial ?? '')
  /**
   * EL ARREGLO DEL BUG (ronda 11, tarea 1; Franco: "cuando quito uno la
   * minuta no se modifica y está mal"). Antes `textoCorreo` era su propio
   * `useState`, guardado UNA vez al generar: quitar un acuerdo tocaba `filas`
   * pero nadie volvía a armar el texto, así que el correo seguía nombrando
   * lo que ya no se iba a publicar.
   *
   * Ahora no se guarda texto ensamblado en ningún lado. Se guardan las DOS
   * piezas crudas —`bloques` (la prosa, editable) e `insumosCorreo` (todo lo
   * demás: sala, molde, contexto)— y el correo se REARMA con
   * `ensamblarCorreo` en cada render, a partir de esas piezas más `filas`
   * ahora mismo. Determinista, instantáneo, sin llamar al modelo: exactamente
   * lo que ya hacía `ensamblarCorreo` en el servidor, movido al cliente.
   */
  const [bloques, setBloques] = useState<string[] | null>(null)
  const [insumosCorreo, setInsumosCorreo] = useState<InsumosCorreo | null>(null)
  const [filas, setFilas] = useState<FilaAcuerdo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)
  const [generando, startGenerar] = useTransition()
  const [publicando, startPublicar] = useTransition()
  /** El cuadro "¿qué entendió mal?" — Franco: "un cuadro de comunicación y feedback para la IA". */
  const [correccionTexto, setCorreccionTexto] = useState('')
  /** Regenerar descarta lo editado a mano: se avisa ANTES, con un paso de confirmación, no después. */
  const [confirmandoRegenerar, setConfirmandoRegenerar] = useState(false)

  // EL CORREO, REARMADO EN CADA RENDER — no hace falta memoizarlo: es
  // construcción de texto sobre un puñado de líneas, no un cálculo caro. Se
  // recalcula solo con lo que se ve en pantalla: los bloques (con lo editado
  // a mano, si lo hay) y los acuerdos INCLUIDOS, en su orden actual.
  const textoCorreo = bloques && insumosCorreo
    ? ensamblarCorreo(
        insumosCorreo.salaSlug,
        bloques,
        filas.filter((f) => f.incluir),
        insumosCorreo.molde,
        insumosCorreo.reunionId,
        insumosCorreo.contexto,
      )
    : null

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

  /** Aplica el resultado de generar/regenerar — comparten esta misma forma de leerlo. */
  function aplicarGeneracion(r: EstadoGeneracion) {
    if (!r.ok || !r.bloques || !r.acuerdosPropuestos || !r.insumosCorreo) {
      setError(r.error ?? 'No se pudo generar la minuta.')
      return
    }
    setBloques(r.bloques)
    setInsumosCorreo(r.insumosCorreo)
    setFilas(r.acuerdosPropuestos.map((a) => aFilaEditable(a, personas)))
    setCorreccionTexto('')
    setConfirmandoRegenerar(false)
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
      aplicarGeneracion(await generarMinutaAction(de, transcripcion))
    })
  }

  /** Edita la prosa de UN bloque — la tabla no vive aquí, se deriva sola de `filas`. */
  function editarBloque(indice: number, texto: string) {
    setBloques((prev) => (prev ? prev.map((b, i) => (i === indice ? texto : b)) : prev))
  }

  function actualizarFila(indice: number, cambios: Partial<FilaAcuerdo>) {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, ...cambios } : f)))
  }

  /**
   * El orden de `filas` importa en dos sitios (ronda 11, tarea 1): la tabla
   * del correo (`textoCorreo` arriba se rearma con `filas` en este orden) y
   * el orden en el que se publican los acuerdos (`publicar`, abajo, recorre
   * `filas` tal cual). Reordenar es puramente local — no hay nada que
   * persistir en el servidor hasta que se publica — así que solo hace falta
   * reacomodar el estado; la `Promise` es para cumplir el contrato de
   * `ListaOrdenable.reordenarAction`.
   */
  async function reordenarAcuerdos(idsEnOrden: string[]) {
    setFilas((prev) => {
      const porId = new Map(prev.map((f) => [f.claveUi, f]))
      return idsEnOrden.map((id) => porId.get(id)).filter((f): f is FilaAcuerdo => f != null)
    })
  }

  function confirmarRegenerar() {
    setError(null)
    startGenerar(async () => {
      aplicarGeneracion(await generarMinutaAction(de, transcripcion, correccionTexto.trim() || undefined))
    })
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

  /**
   * Los bloques del molde, EN SU ORDEN, cada uno con el `indice` que le
   * corresponde dentro de `bloques` (solo los que no son `conTabla` — mismo
   * criterio que `ensamblarCorreo`/`construirPromptMinuta`: el índice avanza
   * solo con los bloques redactables, o todo saldría corrido una posición).
   * Se resuelve aquí, una vez, para que la vista previa de abajo no repita la
   * cuenta en cada fila.
   */
  const segmentosCorreo: { key: string; titulo: string; conTabla: boolean; indice: number }[] = []
  if (insumosCorreo) {
    let redactable = 0
    insumosCorreo.molde.bloques.forEach((b, idx) => {
      segmentosCorreo.push({
        key: `bloque-${idx}-${b.titulo}`,
        titulo: b.titulo,
        conTabla: Boolean(b.conTabla),
        indice: b.conTabla ? -1 : redactable++,
      })
    })
  }

  return (
    <div className={estilos.minutaFlujo}>
      {!bloques && (
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

      {bloques && insumosCorreo && textoCorreo && (
        <>
          {/*
            LA MINUTA SE EDITA AHÍ MISMO (Franco: "una vez que se genera la
            minuta quiero poder editarla ahí mismo"). Un único bloque visual,
            que es a la vez la vista previa y la superficie de edición: el
            saludo/entradilla/cierre/enlace se pintan como texto (los pone el
            molde, no se editan aquí); cada bloque REDACTABLE es un
            `<textarea>` de verdad, en su sitio; y el bloque `conTabla` es
            SIEMPRE la tabla derivada de los acuerdos — nunca texto editable,
            para que editar a mano y tocar acuerdos (abajo) no compitan por la
            misma verdad (ambigüedad resuelta del brief).

            Lo que se COPIA (`CopiarBoton`) y lo que se PUBLICA es
            `textoCorreo`, el texto real armado por `ensamblarCorreo` — esta
            vista es su equivalente editable en pantalla, no una segunda
            fuente de verdad.
          */}
          <div className={estilos.minutaCorreoWrap}>
            <div className={estilos.minutaCorreoCabecera}>
              <span className={estilos.campoInlineLabel}>Texto del correo</span>
              <CopiarBoton
                texto={textoCorreo}
                formatoCorreo
                className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
              />
            </div>
            <span className={estilos.generarNota}>Los bloques de texto se editan aquí mismo; la tabla se arma sola con los acuerdos de abajo.</span>
            <div className={estilos.minutaCorreoVista}>
              {lineasNoVacias(insumosCorreo.molde.saludo).map((linea, i) => (
                <p key={`saludo-${i}`} style={estiloParrafo}>{linea}</p>
              ))}
              {lineasNoVacias(
                insumosCorreo.molde.entradilla
                  .replace('{reunion}', insumosCorreo.contexto.reunion)
                  .replace('{fecha}', insumosCorreo.contexto.fecha),
              ).map((linea, i) => (
                <p key={`entradilla-${i}`} style={estiloParrafo}>{linea}</p>
              ))}

              {segmentosCorreo.map((seg) => (
                <div key={seg.key}>
                  <p style={estiloCabeceraBloque}>{seg.titulo}</p>
                  {seg.conTabla ? (
                    <TablaAcuerdosVista acuerdos={incluidos} />
                  ) : (
                    <textarea
                      className={estilos.textarea}
                      aria-label={`Editar el bloque «${seg.titulo}»`}
                      value={bloques[seg.indice] ?? ''}
                      onChange={(e) => editarBloque(seg.indice, e.target.value)}
                      disabled={generando}
                    />
                  )}
                </div>
              ))}

              {lineasNoVacias(insumosCorreo.molde.cierre).map((linea, i) => (
                <p key={`cierre-${i}`} style={estiloParrafo}>{linea}</p>
              ))}
              {insumosCorreo.molde.conEnlace && (
                <p style={estiloParrafo}>{urlSesion(insumosCorreo.salaSlug, insumosCorreo.reunionId)}</p>
              )}
            </div>
          </div>

          <div className={estilos.minutaAcuerdos}>
            <div className={estilos.minutaAcuerdosCabecera}>
              <span className={estilos.campoInlineLabel}>Acuerdos propuestos — revisa antes de publicar</span>
              {sinFecha > 0 && <span className={estilos.avisoSinFecha}>{sinFecha} sin fecha compromiso</span>}
            </div>

            {filas.length === 0 ? (
              <p className={estilos.pistaTextarea}>La transcripción no arrojó acuerdos accionables.</p>
            ) : (
              // Arrastre por importancia (Franco: "deberían poder arrastrarse
              // por orden de importancia tipo drag and drop"). `ListaOrdenable`
              // ya resuelve esto en el editor de secciones —arrastre con
              // dnd-kit, y botones ↑/↓ + teclado como vía accesible siempre
              // disponible— así que se reusa tal cual en vez de reescribirlo.
              <ListaOrdenable ids={filas.map((f) => f.claveUi)} reordenarAction={reordenarAcuerdos}>
                {filas.map((f, i) => (
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
                          valorInicial={f.responsable}
                          sugerencia={f.sugerencia}
                          onCambiar={(v) => actualizarFila(i, { responsable: v.responsable })}
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
                ))}
              </ListaOrdenable>
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

          {/*
            EL CUADRO DE FEEDBACK PARA LA IA + REGENERAR (Franco: "falta un
            cuadro de comunicación y feedback para la IA una vez generada la
            minuta... al lado que tenga un botón para regenerar"). Regenerar
            DESCARTA lo editado a mano —los bloques vuelven a lo que traiga el
            borrador nuevo— así que se avisa ANTES, con la misma confirmación
            en dos tiempos que ya usa el resto de la app (`MarcarPresentada`,
            `FilaBandeja`): el botón se sustituye por el mensaje + "Sí,
            regenerar" + "Cancelar", nunca un `confirm()` del navegador.
          */}
          <div className={estilos.campoInline}>
            <span className={estilos.campoInlineLabel}>Corrección para la IA</span>
            <textarea
              className={estilos.textarea}
              aria-label="Corrección para la IA"
              value={correccionTexto}
              onChange={(e) => setCorreccionTexto(e.target.value)}
              placeholder="¿La IA no captó un acuerdo o entendió algo mal? Descríbelo — viaja al modelo junto con la transcripción al regenerar."
              disabled={generando}
            />
          </div>

          {!confirmandoRegenerar ? (
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonSecundario}`}
              disabled={generando}
              onClick={() => setConfirmandoRegenerar(true)}
            >
              Regenerar minuta →
            </button>
          ) : (
            <span className={estilos.confirmarInline}>
              <span className={estilos.confirmarTexto}>
                Se descarta lo editado a mano y se genera un borrador nuevo con esta corrección. ¿Seguro?
              </span>
              <button
                type="button"
                className={`${estilos.boton} ${estilos.botonAcento}`}
                disabled={generando}
                onClick={confirmarRegenerar}
              >
                Sí, regenerar
              </button>
              <button
                type="button"
                className={estilos.botonTexto}
                disabled={generando}
                onClick={() => setConfirmandoRegenerar(false)}
              >
                Cancelar
              </button>
            </span>
          )}

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
