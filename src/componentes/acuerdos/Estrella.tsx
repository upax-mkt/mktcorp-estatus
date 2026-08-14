'use client'

import { useState, useTransition } from 'react'
import estilos from './Estrella.module.css'

interface Props {
  acuerdoId: string
  destacado: boolean
  /**
   * `destacarAction` (src/app/acuerdos/acciones.ts), recibida por prop y no
   * importada aquí a propósito: este componente es el MISMO en las dos
   * pantallas donde se puede fijar (el espacio de acuerdos y la sala). La
   * estrella es un dato, no dos listas que se puedan desincronizar entre sí.
   * Iban a ser tres pantallas —el Home, tarea 12 pendiente—, pero el Home
   * dejó de listar acuerdos (§4 del spec) antes de que esa tarea llegara a
   * escribirse, así que ya no hay un tercer sitio que cablear. La acción
   * exige sesión de equipo del lado servidor (ver su comentario); este botón
   * no decide quién puede verlo, eso lo resuelve quien lo pinta.
   */
  destacar: (id: string, destacado: boolean) => Promise<void>
}

/**
 * LA ESTRELLA: fija un acuerdo arriba en `/acuerdos`.
 *
 * Hasta la ronda 14 significaba "sale en el Home" —y el Home dejó de listar
 * acuerdos (§4 del spec)—, así que se corrigió lo que la estrella DICE antes
 * de que existiera un solo despliegue donde prometiera algo que ya no
 * ocurre. El gesto y la columna `acuerdos.destacado` no se tocan: cambia el
 * texto y lo que produce el orden (ver `ordenarDestacadoArriba` en
 * TablaAcuerdos.tsx), no el dato.
 *
 * Sin estado local optimista a propósito: `destacar` revalida la ruta al
 * terminar (mismo patrón que FilaBandeja con `subir`/`descartar`), así que el
 * valor que se pinta siempre es el que quedó guardado, no uno que este botón
 * se inventó mientras la petición viajaba.
 */
export function Estrella({ acuerdoId, destacado, destacar }: Props) {
  const [pendiente, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function manejarClic() {
    setError(null)
    empezar(async () => {
      try {
        await destacar(acuerdoId, !destacado)
      } catch (e) {
        // El fallo tiene que LLEGAR A LA PANTALLA — mismo criterio que
        // FilaBandeja: quien pulsó necesita leer por qué, no ver una estrella
        // que no se mueve.
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <span className={estilos.envoltura}>
      <button
        type="button"
        className={estilos.boton}
        data-activa={destacado || undefined}
        disabled={pendiente}
        aria-pressed={destacado}
        aria-label={destacado ? 'Quitar de arriba' : 'Fijar arriba en Acuerdos'}
        title={destacado ? 'Quitar de arriba' : 'Fijar arriba en Acuerdos'}
        onClick={manejarClic}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill={destacado ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="12 3.5 14.86 9.3 21.27 10.24 16.64 14.75 17.74 21.13 12 18.1 6.26 21.13 7.36 14.75 2.73 10.24 9.14 9.3" />
        </svg>
      </button>
      {error && <span role="alert" className={estilos.error}>{error}</span>}
    </span>
  )
}
