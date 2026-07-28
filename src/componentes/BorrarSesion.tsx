'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/preparar/preparar.module.css'

/**
 * Borrar una sesión creada por error, con su cuestionario y su documento.
 *
 * Hasta ahora una sesión mal creada se quedaba para siempre ensuciando la
 * lista de preparación y el histórico de la sala. Los acuerdos que se hayan
 * publicado desde su minuta NO se van con ella: cuelgan de la sala y pueden
 * llevar semanas moviéndose.
 */
export function BorrarSesion({ borrarAction }: { borrarAction: () => Promise<void> }) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  return (
    <div className={estilos.zonaPeligro}>
      <p className={estilos.zonaPeligroTexto}>
        {confirmando
          ? 'Se borran el cuestionario, su contenido y el documento maquetado. Los acuerdos ya publicados en el espacio del cliente se quedan.'
          : '¿Creaste esta sesión por error?'}
      </p>
      {confirmando ? (
        <div className={estilos.minutaAcciones}>
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonPeligro} ${estilos.botonChico}`}
            disabled={pendiente}
            onClick={() => empezar(() => borrarAction())}
          >
            {pendiente ? 'Borrando…' : 'Sí, borrar la sesión'}
          </button>
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
          onClick={() => setConfirmando(true)}
        >
          Eliminar sesión
        </button>
      )}
    </div>
  )
}
