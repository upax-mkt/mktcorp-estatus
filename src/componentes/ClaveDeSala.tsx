'use client'

import { useState, useTransition } from 'react'
import { CopiarBoton } from './CopiarBoton'
import { fechaCompleta } from '@/lib/fecha'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * La clave con la que entra el director de esta UDN.
 *
 * Se enseña ENTERA una sola vez, justo al generarla. Después solo se puede
 * regenerar: lo que se guarda es un hash, no la clave, así que ni la app
 * puede volver a leerla. Es el patrón de cualquier API key, y evita que la
 * tabla de salas sea una lista de credenciales en claro.
 *
 * Regenerar es barato a propósito — volver a compartirla es un mensaje— para
 * que perder una clave no sea un problema que haya que evitar.
 */

interface Props {
  nombreSala: string
  tiene: boolean
  creadaEn: string | null
  regenerarAction: () => Promise<{ clave?: string; error?: string }>
  quitarAction: () => Promise<void>
}

export function ClaveDeSala({ nombreSala, tiene, creadaEn, regenerarAction, quitarAction }: Props) {
  const [clave, setClave] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  function generar() {
    setError(null)
    setConfirmando(false)
    empezar(async () => {
      const r = await regenerarAction()
      if (r.error) setError(r.error)
      else setClave(r.clave ?? null)
    })
  }

  // Recién generada: es el único momento en que existe en pantalla.
  if (clave) {
    return (
      <div className={estilos.claveNueva}>
        <span className={estilos.claveEtiqueta}>
          Cópiala ahora — no se puede volver a ver
        </span>
        <div className={estilos.claveFila}>
          <code className={estilos.claveTexto}>{clave}</code>
          <CopiarBoton texto={clave} className={estilos.accesoBoton} />
        </div>
        <p className={estilos.claveNota}>
          Con ella, quien la tenga entra a {nombreSala} —y solo a {nombreSala}— y puede mover los
          acuerdos de su espacio. No puede preparar reuniones, subir archivos ni ver otros clientes.
        </p>
        <button type="button" className={estilos.botonVolverSesion} onClick={() => setClave(null)}>
          Ya la copié
        </button>
      </div>
    )
  }

  return (
    <div className={estilos.acceso}>
      <div className={estilos.accesoTexto}>
        <div className={estilos.accesoTitulo}>
          {tiene ? `${nombreSala} tiene clave` : `${nombreSala} no tiene clave todavía`}
        </div>
        <p className={estilos.accesoNota}>
          {tiene ? (
            <>
              Creada el {creadaEn ? fechaCompleta(creadaEn) : 'algún momento'}. No se puede volver a
              ver: si se perdió, genera una nueva y comparte esa.
            </>
          ) : (
            <>
              Con una clave, el director entra tecleándola y llega directo a su espacio. Puede mover
              acuerdos; nada más.
            </>
          )}
        </p>
        {error && <p className={estilos.subirError}>{error}</p>}
      </div>

      <div className={estilos.claveAcciones}>
        {tiene && confirmando ? (
          <span className={estilos.confirmarBorrado}>
            <span className={estilos.subirPista}>La anterior deja de funcionar.</span>
            <button type="button" className={estilos.archivoGuardar} disabled={pendiente} onClick={generar}>
              {pendiente ? 'Generando…' : 'Sí, generar otra'}
            </button>
            <button type="button" className={estilos.botonCancelarBorrado} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </span>
        ) : (
          <>
            <button
              type="button"
              className={estilos.accesoBoton}
              disabled={pendiente}
              onClick={() => (tiene ? setConfirmando(true) : generar())}
            >
              {pendiente ? 'Generando…' : tiene ? 'Generar una nueva' : 'Generar clave'}
            </button>
            {tiene && (
              <button
                type="button"
                className={estilos.botonVolverSesion}
                disabled={pendiente}
                onClick={() => empezar(async () => { await quitarAction() })}
              >
                Quitar el acceso
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
