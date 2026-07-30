'use client'

import { useState } from 'react'
import type { PersonaMonday } from '@/monday/personas'
import estilos from './SelectorResponsable.module.css'

interface ValorInicial {
  nombre: string
  mondayId: string | null
  /**
   * `true` cuando `mondayId` no es una elección confirmada por una persona,
   * sino la sugerencia de `personaMasParecida()` a partir de un nombre que
   * detectó la IA en una transcripción — nunca lo decide la IA sola (ver
   * MinutaCliente.tsx). Se muestra marcada como sugerencia, no como un
   * hecho, y basta con tocar cualquiera de los dos controles para que deje
   * de tratarse como tal.
   */
  sugerido?: boolean
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
  /**
   * Modo controlado, para quien necesita enterarse de cada cambio en el
   * momento — MinutaCliente edita filas en estado de React, no lee un
   * FormData al enviar (no hay `<form>` alrededor de esas filas). Los campos
   * ocultos `responsable`/`responsableMondayId` siguen existiendo igual:
   * esto es un aviso ADEMÁS, no en su lugar.
   */
  onCambiar?: (valor: { responsable: string; responsableMondayId: string | null }) => void
  /** Deshabilita los dos controles — para una fila que no se va a publicar. */
  disabled?: boolean
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
 * recoge el valor (el borde del formulario, o el candado compartido de
 * crearAcuerdo/editarAcuerdo en src/db/acuerdos.ts) — no de este componente.
 */
export function SelectorResponsable({ personas, valorInicial, onCambiar, disabled = false }: Props) {
  const tieneMondayIdInicial = Boolean(valorInicial?.mondayId)
  const [mondayId, setMondayId] = useState(tieneMondayIdInicial ? (valorInicial!.mondayId as string) : '')
  const [libre, setLibre] = useState(tieneMondayIdInicial ? '' : (valorInicial?.nombre ?? ''))
  const [esSugerenciaSinConfirmar, setEsSugerenciaSinConfirmar] = useState(
    Boolean(valorInicial?.sugerido && valorInicial?.mondayId),
  )

  function avisar(idNuevo: string, libreNuevo: string) {
    if (!onCambiar) return
    const persona = idNuevo !== '' ? personas.find((p) => p.id === idNuevo) : undefined
    const nombreResuelto = idNuevo !== '' ? (persona?.nombre ?? valorInicial?.nombre ?? '') : libreNuevo
    onCambiar({ responsable: nombreResuelto, responsableMondayId: idNuevo !== '' ? idNuevo : null })
  }

  function elegirDeMktCorp(id: string) {
    setMondayId(id)
    setEsSugerenciaSinConfirmar(false)
    const libreNuevo = id !== '' ? '' : libre
    if (id !== '') setLibre('')
    avisar(id, libreNuevo)
  }

  function escribirLibre(valor: string) {
    setLibre(valor)
    setMondayId('')
    setEsSugerenciaSinConfirmar(false)
    avisar('', valor)
  }

  const personaElegida = mondayId !== '' ? personas.find((p) => p.id === mondayId) : undefined
  // Si el id ya no aparece en la lista viva (alguien salió de Monday entre
  // que se guardó y hoy), el nombre que se conocía es mejor que uno vacío.
  const responsable = mondayId !== '' ? (personaElegida?.nombre ?? valorInicial?.nombre ?? '') : libre

  return (
    <div className={estilos.responsable}>
      <fieldset className={estilos.responsableGrupo} disabled={disabled}>
        <legend className={estilos.responsableLeyenda}>Mkt Corp</legend>
        {personas.length === 0 ? (
          <p className={estilos.responsableAviso}>
            No se pudo cargar la gente de Monday ahora mismo: elige a alguien de la UDN.
          </p>
        ) : (
          <select
            className={`${estilos.responsableSelect} ${esSugerenciaSinConfirmar ? estilos.responsableSelectSugerido : ''}`}
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
        {esSugerenciaSinConfirmar && (
          <p className={estilos.responsableSugerencia}>
            Sugerencia por el nombre de la transcripción — confírmala o cambia a otra persona.
          </p>
        )}
      </fieldset>

      <label className={estilos.responsableLibre}>
        <span className="micro">…o alguien de la UDN</span>
        <input
          type="text"
          value={libre}
          onChange={(e) => escribirLibre(e.target.value)}
          placeholder="Nombre de la persona"
          disabled={disabled}
        />
      </label>

      {/* Lo único que de verdad lee quien recoge un FormData: siempre
          presentes, nunca deshabilitados, pase lo que pase con la selección
          visual de arriba. */}
      <input type="hidden" name="responsable" value={responsable} />
      <input type="hidden" name="responsableMondayId" value={mondayId} />
    </div>
  )
}
