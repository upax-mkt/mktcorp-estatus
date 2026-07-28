'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import estilos from '../../preparar.module.css'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import { generarMinutaAction, publicarMinutaAction } from './acciones'
import type { AcuerdoPropuesto } from '@/minuta/esquema'

interface FilaAcuerdo extends AcuerdoPropuesto {
  incluir: boolean
}

interface Props {
  sesionId: string
  /**
   * Qué hacer cuando la minuta queda publicada. Por defecto vuelve al
   * cuestionario de la sesión — lo correcto cuando el flujo se abre desde el
   * preparador. Desde la SALA, en cambio, no hay a dónde volver: se cierra la
   * ventana flotante y la sala se refresca.
   */
  alPublicar?: () => void
  /**
   * Transcripción ya capturada, si la reunión se grabó desde el modo
   * presentación. Es un valor INICIAL, no controlado: quien lo recibe puede
   * corregirlo antes de generar — una transcripción automática se equivoca
   * con los nombres propios, y esos nombres acaban siendo responsables de
   * acuerdos.
   */
  transcripcionInicial?: string
}

const SUGERENCIAS_PRIORIDAD = ['alta', 'media', 'baja']

function aFilaEditable(a: AcuerdoPropuesto): FilaAcuerdo {
  return { ...a, incluir: true }
}

export function MinutaCliente({ sesionId, alPublicar, transcripcionInicial }: Props) {
  const router = useRouter()
  const [transcripcion, setTranscripcion] = useState(transcripcionInicial ?? '')
  const [textoCorreo, setTextoCorreo] = useState<string | null>(null)
  const [filas, setFilas] = useState<FilaAcuerdo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [generando, startGenerar] = useTransition()
  const [publicando, startPublicar] = useTransition()

  function generar() {
    setError(null)
    startGenerar(async () => {
      const r = await generarMinutaAction(sesionId, transcripcion)
      if (!r.ok || !r.textoCorreo || !r.acuerdosPropuestos) {
        setError(r.error ?? 'No se pudo generar la minuta.')
        return
      }
      setTextoCorreo(r.textoCorreo)
      setFilas(r.acuerdosPropuestos.map(aFilaEditable))
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
        .map(({ incluir: _incluir, ...resto }) => resto)

      const r = await publicarMinutaAction(sesionId, transcripcion, textoCorreo, confirmados)
      if (!r.ok) {
        setError(r.error ?? 'No se pudo publicar la minuta.')
        return
      }
      if (alPublicar) {
        alPublicar()
      } else {
        router.push(`/preparar/${sesionId}`)
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
          <span className={estilos.campoInlineLabel}>Transcripción de la reunión</span>
          <textarea
            className={`${estilos.textarea} ${estilos.textareaGrande}`}
            value={transcripcion}
            onChange={(e) => setTranscripcion(e.target.value)}
            placeholder="Pega aquí la transcripción completa de la reunión (Meet/Teams)…"
          />
          <div>
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonAcento}`}
              disabled={generando || transcripcion.trim().length === 0}
              onClick={generar}
            >
              {generando ? 'Generando…' : 'Generar minuta →'}
            </button>
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
                className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
              />
            </div>
            <pre className={estilos.minutaCorreo}>{textoCorreo}</pre>
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
                <div key={i} className={estilos.filaAcuerdoEditable}>
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
                      <input
                        type="text"
                        className={estilos.inputTexto}
                        value={f.responsable}
                        onChange={(e) => actualizarFila(i, { responsable: e.target.value })}
                        placeholder="Responsable"
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
                    {f.incluir && !f.fechaCompromiso && (
                      <span className={estilos.etiquetaPorDefinir}>por definir — revisa antes de enviar</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <datalist id="prioridades-sugeridas">
              {SUGERENCIAS_PRIORIDAD.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className={estilos.panelMaquetar}>
            <span className={estilos.panelMaquetarTexto}>
              {incluidos.length} de {filas.length} acuerdos se publicarán en la sala.
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
