'use client'

import { useState, useTransition, type FormEvent } from 'react'
import estilos from '@/app/personas/personas.module.css'
import type { NuevaPersona, RolPersona } from '@/db/directorio'
import { SQUADS_MKT_CORP, type SquadMktCorp } from '@/lib/equipos'

/**
 * DAR DE ALTA A UNA PERSONA (ronda 9, tarea 3) — correo, nombre y rol; queda
 * activa desde el alta (ver `altaPersona`, src/db/directorio.ts). Mismo
 * patrón de `useTransition` + try/catch que `FormularioSala`: `altaAction`
 * empieza con `exigirAdmin()`, que LANZA si la sesión ya venció con esta
 * pestaña todavía abierta — sin el catch, esa promesa rechazada no tendría
 * dónde aterrizar.
 *
 * Empieza en 'viewer', el rol de menos alcance — dar de alta a alguien como
 * admin es la excepción, no el valor por defecto que nadie debería poder
 * dejar pasar por descuido.
 */

interface Props {
  altaAction: (datos: NuevaPersona) => Promise<{ error?: string }>
}

const ROLES: { valor: RolPersona; etiqueta: string }[] = [
  { valor: 'viewer', etiqueta: 'Viewer' },
  { valor: 'editor', etiqueta: 'Editor' },
  { valor: 'admin', etiqueta: 'Admin' },
]

export function FormularioAlta({ altaAction }: Props) {
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<RolPersona>('viewer')
  const [squad, setSquad] = useState<SquadMktCorp>('Squad Paid y RRSS')
  const [error, setError] = useState<string | null>(null)
  const [creada, setCreada] = useState(false)
  const [pendiente, empezar] = useTransition()

  const listo = correo.trim().length > 0 && nombre.trim().length > 0

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    if (!listo) return
    setError(null)
    setCreada(false)
    empezar(async () => {
      try {
        const r = await altaAction({ correo: correo.trim(), nombre: nombre.trim(), rol, squad })
        if (r.error) {
          setError(r.error)
          return
        }
        setCorreo('')
        setNombre('')
        setRol('viewer')
        setSquad('Squad Paid y RRSS')
        setCreada(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <form className={`tarjeta ${estilos.formulario}`} onSubmit={alEnviar}>
      <div className={estilos.formularioCampos}>
        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Correo</span>
          <input
            type="email"
            className={estilos.entrada}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre@upax.com.mx"
            required
          />
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Nombre</span>
          <input
            type="text"
            className={estilos.entrada}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre Apellido"
            required
          />
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Squad</span>
          <select
            className={estilos.entrada}
            value={squad}
            onChange={(e) => setSquad(e.target.value as SquadMktCorp)}
          >
            {SQUADS_MKT_CORP.map((nombreSquad) => (
              <option key={nombreSquad} value={nombreSquad}>{nombreSquad}</option>
            ))}
          </select>
        </label>

        <label className={estilos.campo}>
          <span className={estilos.etiqueta}>Rol</span>
          <select
            className={estilos.entrada}
            value={rol}
            onChange={(e) => setRol(e.target.value as RolPersona)}
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className={estilos.formularioError}>{error}</p>}
      {creada && <p className={estilos.formularioOk}>Persona dada de alta.</p>}

      <div className={estilos.formularioAcciones}>
        <button type="submit" className="boton" disabled={pendiente || !listo}>
          {pendiente ? 'Dando de alta…' : 'Dar de alta'}
        </button>
      </div>
    </form>
  )
}
