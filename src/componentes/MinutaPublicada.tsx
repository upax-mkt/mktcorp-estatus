'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'
import { CopiarBoton } from './CopiarBoton'
import { CorreoMinuta } from './CorreoMinuta'

interface Props {
  texto: string
  editarAction: (texto: string) => Promise<void>
  eliminarAction: () => Promise<void>
}

/**
 * Una minuta ya publicada: leerla, corregirla y borrarla.
 *
 * Antes solo se podía mirar. Una minuta se manda por correo y se cita durante
 * semanas, así que una errata o un nombre mal escrito tienen que poder
 * arreglarse sin volver a generar nada — y una publicada por error tiene que
 * poder desaparecer.
 *
 * Editar aquí NO vuelve a crear acuerdos: los que se publicaron ya viven en la
 * sala y llevan su propia vida. Esto solo cambia el texto.
 */
export function MinutaPublicada({ texto, editarAction, eliminarAction }: Props) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(texto)
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  if (editando) {
    return (
      <div className={estilos.minutaCorreoWrap}>
        <div className={estilos.minutaCorreoCabecera}>
          <span className={estilos.campoInlineLabel}>Corrigiendo el texto</span>
        </div>
        <textarea
          className={`${estilos.textarea} ${estilos.textareaAlta}`}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          aria-label="Texto de la minuta"
        />
        <div className={estilos.minutaAcciones}>
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonAcento}`}
            disabled={pendiente}
            onClick={() =>
              empezar(async () => {
                await editarAction(borrador)
                setEditando(false)
              })
            }
          >
            {pendiente ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonSecundario}`}
            onClick={() => {
              setBorrador(texto)
              setEditando(false)
            }}
          >
            Descartar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.minutaCorreoWrap}>
      <div className={estilos.minutaCorreoCabecera}>
        <span className={estilos.campoInlineLabel}>Texto enviado</span>
        <div className={estilos.minutaAcciones}>
          <CopiarBoton texto={texto} formatoCorreo className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`} />
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
            onClick={() => setEditando(true)}
          >
            Corregir
          </button>
          {confirmando ? (
            <>
              <button
                type="button"
                className={`${estilos.boton} ${estilos.botonPeligro} ${estilos.botonChico}`}
                disabled={pendiente}
                onClick={() => empezar(() => eliminarAction())}
              >
                Borrar minuta
              </button>
              <button
                type="button"
                className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
                onClick={() => setConfirmando(false)}
              >
                No
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
              onClick={() => setConfirmando(true)}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
      {confirmando && (
        <p className={estilos.minutaAviso}>
          Se borra el texto de la minuta. Los acuerdos que ya se publicaron en la sala se quedan:
          si alguno tampoco debía existir, bórralo desde la sala.
        </p>
      )}
      <CorreoMinuta texto={texto} />
    </div>
  )
}
