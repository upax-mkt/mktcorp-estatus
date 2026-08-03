'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import estilos from '@/app/personas/personas.module.css'
import type { Persona, RolPersona } from '@/db/directorio'

/**
 * UNA FILA DEL DIRECTORIO (ronda 9, tarea 3).
 *
 * El correo se pinta SIEMPRE, aparte del nombre — es la clave real de
 * `personas` (columna primaria en `src/db/esquema.ts`) y dos personas se
 * pueden llamar igual sin ser la misma fila. El nombre es solo una etiqueta.
 *
 * `esYo` apaga los dos controles que te dejarían fuera de esta misma
 * pantalla si los usaras contigo mismo (la guarda 1 de la tarea: "nadie se
 * quita a sí mismo el admin ni se desactiva"):
 *   - el selector de rol se deshabilita ENTERO, no solo la opción de dejar
 *     de ser admin — más simple de leer, y quien de verdad decide qué se
 *     puede es el servidor (`../../app/personas/acciones.ts`), no este disabled;
 *   - el botón «Desactivar» ni se pinta.
 * «Activar» SÍ se deja disponible aunque `esYo` sea true: si tu propia fila
 * llegara a estar inactiva (alguien más te desactivó), reactivarte no es el
 * riesgo que esta guarda existe para evitar — es lo contrario.
 *
 * ESTO ES SOLO LA AYUDA VISUAL. Las guardas que de verdad protegen viven en
 * el servidor, dentro de `cambiarRolAction`/`activarPersonaAction`: quien
 * conozca el nombre de esas Server Actions las puede llamar sin pasar por
 * este componente, así que un `disabled` de aquí no es una defensa.
 */

interface Props {
  persona: Persona
  /** Si esta fila es la de quien está viendo la pantalla ahora mismo. */
  esYo: boolean
  /** Ya ligada al correo de esta fila (ver `../../app/personas/page.tsx`, `.bind(null, correo)`). */
  cambiarRol: (rol: RolPersona) => Promise<{ error?: string } | void>
  /** Ídem: ya ligada al correo de esta fila. */
  activar: (activa: boolean) => Promise<{ error?: string } | void>
}

const ROLES: { valor: RolPersona; etiqueta: string }[] = [
  { valor: 'admin', etiqueta: 'Admin' },
  { valor: 'editor', etiqueta: 'Editor' },
  { valor: 'viewer', etiqueta: 'Viewer' },
]

export function FilaPersona({ persona, esYo, cambiarRol, activar }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  // Mismo criterio de try/catch que `PausaSala`/`BloqueEnlaceAgenda`: las dos
  // acciones empiezan con `exigirAdmin()`, que LANZA (no devuelve `{error}`)
  // si la sesión ya venció mientras esta pestaña seguía abierta.
  function alCambiarRol(e: ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value as RolPersona
    if (nuevo === persona.rol) return
    setError(null)
    empezar(async () => {
      try {
        const r = await cambiarRol(nuevo)
        if (r?.error) setError(r.error)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }

  function alActivar(activa: boolean) {
    setError(null)
    empezar(async () => {
      try {
        const r = await activar(activa)
        if (r?.error) setError(r.error)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <li className={estilos.fila} data-inactiva={persona.activa ? undefined : 'true'}>
      <div className={estilos.filaIdentidad}>
        <span className={estilos.filaNombre}>{persona.nombre}</span>
        {/* El correo, SIEMPRE visible y aparte del nombre: es la clave real. */}
        <span className={estilos.filaCorreo}>{persona.correo}</span>
        {esYo && (
          <span className="pildora" data-tono="activo">
            tú
          </span>
        )}
        {!persona.activa && <span className="pildora">inactiva</span>}
      </div>

      <select
        aria-label="Rol"
        className={estilos.entrada}
        value={persona.rol}
        disabled={esYo || pendiente}
        onChange={alCambiarRol}
      >
        {ROLES.map((r) => (
          <option key={r.valor} value={r.valor}>
            {r.etiqueta}
          </option>
        ))}
      </select>

      <span className={estilos.filaAcciones}>
        {/* Desactivar: nunca para esYo (guarda 1 — ver la cabecera). */}
        {persona.activa && !esYo && (
          <button
            type="button"
            className="boton"
            data-tono="fantasma"
            disabled={pendiente}
            onClick={() => alActivar(false)}
          >
            {pendiente ? 'Un momento…' : 'Desactivar'}
          </button>
        )}
        {/* Activar: SÍ disponible aunque esYo — reactivarte no es el riesgo. */}
        {!persona.activa && (
          <button
            type="button"
            className="boton"
            data-tono="suave"
            disabled={pendiente}
            onClick={() => alActivar(true)}
          >
            {pendiente ? 'Un momento…' : 'Activar'}
          </button>
        )}
      </span>

      {error && <p className={estilos.filaError}>{error}</p>}
    </li>
  )
}
