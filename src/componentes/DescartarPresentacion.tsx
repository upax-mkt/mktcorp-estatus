'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'

/**
 * DESCARTAR LA PRESENTACIÓN QUE SE ESTÁ ARMANDO — NO LA REUNIÓN.
 *
 * Franco: *"si estoy en el editor y quiero eliminar lo que estoy trabajando,
 * no puede eliminar la reunión, ya que son cosas distintas"*.
 *
 * Tenía razón y era un error de modelo, no de redacción. Este botón decía
 * "Eliminar reunión" y llamaba a `eliminarReunion`: quien quería tirar un
 * deck mal empezado —lo normal, se empieza dos veces— se llevaba por delante
 * la junta del calendario, su fecha y su sitio en la sala. Y la reunión
 * sobrevive a su deck por definición: se puede dar con un PDF, con un
 * documento armado aquí, o con las dos cosas.
 *
 * ASÍ QUE AQUÍ SOLO SE BORRA EL DOCUMENTO. La reunión se queda en el
 * calendario, y desde ella se vuelve a elegir: subir la presentación ya hecha
 * o armarla de nuevo en el editor.
 *
 * BORRAR LA REUNIÓN ENTERA SIGUE SIENDO POSIBLE, pero donde corresponde: en
 * la lista de Presentaciones (`/deck`), que es la pantalla que habla de
 * reuniones. No se pierde ninguna capacidad, se muda a su sitio.
 */
export function DescartarPresentacion({
  descartarAction,
}: {
  descartarAction: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  return (
    <div className={estilos.zonaPeligro}>
      <p className={estilos.zonaPeligroTexto}>
        {confirmando
          ? 'Se borra el contenido de esta presentación y su documento maquetado. La reunión se queda en el calendario, con su fecha, sus archivos y su minuta: desde ahí puedes subir la presentación ya hecha o volver a armarla aquí.'
          : '¿Quieres empezar esta presentación de cero?'}
      </p>
      {confirmando ? (
        <div className={estilos.minutaAcciones}>
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonPeligro} ${estilos.botonChico}`}
            disabled={pendiente}
            onClick={() => empezar(() => descartarAction())}
          >
            {pendiente ? 'Descartando…' : 'Sí, descartar la presentación'}
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
          Descartar la presentación
        </button>
      )}
    </div>
  )
}
