'use client'

import { useState } from 'react'
import type { PersonaMonday } from '@/monday/personas'
import estilos from '@/app/cliente/cliente.module.css'

interface ValorInicial {
  nombre: string
  mondayId: string | null
}

interface Props {
  /**
   * La gente viva de Mkt Corp — ver `directorio()` en src/db/personas.ts.
   * Vacío cuando Monday está caído y no hay copia local: el aviso lo dice y
   * el texto libre de la UDN sigue funcionando igual.
   */
  personas: PersonaMonday[]
  /** El responsable actual, al editar un acuerdo que ya lo tenía. Sin esto, arranca en blanco. */
  valorInicial?: ValorInicial
}

/**
 * QUIÉN ES EL RESPONSABLE: de la lista viva de Mkt Corp, o escrito a mano si
 * es alguien de la UDN cliente — nunca las dos cosas a la vez.
 *
 * Por qué de una lista y no escrito a mano: una app hermana de este mismo
 * equipo empareja el responsable por el nombre que alguien tecleó contra un
 * diccionario congelado, y hoy tiene seis personas que ya no existen, cinco
 * que faltan, y una que nunca se asigna porque en Monday se llama distinto.
 * El id viaja aparte del nombre —ver `responsableMondayId` en
 * src/db/acuerdos.ts— justo para no repetir ese error: emparejar por texto es
 * una apuesta, guardar el id que dio Monday no lo es.
 *
 * Elegir en uno limpia el otro: un acuerdo tiene un responsable, no dos. Lo
 * que este componente le entrega al resto del formulario viaja siempre en dos
 * campos ocultos — `responsable` (el nombre visible, lo que lee la sala y la
 * minuta) y `responsableMondayId` (el id, o cadena vacía si no hay nadie de
 * Mkt Corp elegido). Normalizar esa cadena vacía a `null` es trabajo de quien
 * recoge el formulario, no de este componente — ver NuevoAcuerdoForm.
 */
export function SelectorResponsable({ personas, valorInicial }: Props) {
  const tieneMondayIdInicial = Boolean(valorInicial?.mondayId)
  const [mondayId, setMondayId] = useState(tieneMondayIdInicial ? (valorInicial!.mondayId as string) : '')
  const [libre, setLibre] = useState(tieneMondayIdInicial ? '' : (valorInicial?.nombre ?? ''))

  function elegirDeMktCorp(id: string) {
    setMondayId(id)
    if (id !== '') setLibre('')
  }

  function escribirLibre(valor: string) {
    setLibre(valor)
    setMondayId('')
  }

  const personaElegida = mondayId !== '' ? personas.find((p) => p.id === mondayId) : undefined
  // Si el id ya no aparece en la lista viva (alguien salió de Monday entre
  // que se guardó y hoy), el nombre que se conocía es mejor que uno vacío.
  const responsable = mondayId !== '' ? (personaElegida?.nombre ?? valorInicial?.nombre ?? '') : libre

  return (
    <div className={estilos.responsable}>
      <fieldset className={estilos.responsableGrupo}>
        <legend className={estilos.responsableLeyenda}>Mkt Corp</legend>
        {personas.length === 0 ? (
          <p className={estilos.responsableAviso}>
            No se pudo cargar la gente de Monday ahora mismo: elige a alguien de la UDN.
          </p>
        ) : (
          <select
            className={estilos.responsableSelect}
            value={mondayId}
            onChange={(e) => elegirDeMktCorp(e.target.value)}
            aria-label="Responsable de Mkt Corp"
          >
            <option value="">Elegir de Mkt Corp…</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id} title={p.correo}>{p.nombre}</option>
            ))}
          </select>
        )}
      </fieldset>

      <label className={estilos.responsableLibre}>
        <span className="micro">…o alguien de la UDN</span>
        <input
          type="text"
          className={estilos.nuevoAcuerdoCampo}
          value={libre}
          onChange={(e) => escribirLibre(e.target.value)}
          placeholder="Nombre de la persona"
        />
      </label>

      {/* Lo único que de verdad lee el resto del formulario: siempre presentes,
          nunca deshabilitados, para que un FormData los traiga pase lo que
          pase con la selección visual de arriba. */}
      <input type="hidden" name="responsable" value={responsable} />
      <input type="hidden" name="responsableMondayId" value={mondayId} />
    </div>
  )
}
