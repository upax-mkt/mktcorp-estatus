'use client'

import { useState } from 'react'
import type { PersonaMonday } from '@/monday/personas'
import estilos from './SelectorResponsable.module.css'

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
  /**
   * Alguien de Mkt Corp cuyo nombre se parece al que trae `valorInicial` —
   * típicamente la salida de `personaMasParecida()` sobre un nombre que la
   * IA detectó en una transcripción (ver MinutaCliente.tsx). SOLO SE OFRECE,
   * nunca se aplica sola: el `<select>` arranca vacío igual, y esta persona
   * aparece como un botón aparte para confirmarla con un clic. Lo que se ve
   * elegido en el desplegable es siempre lo que se guarda — nunca una
   * elección que nadie hizo.
   */
  sugerencia?: PersonaMonday | null
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
 * LA SUGERENCIA NUNCA SE APLICA SOLA (corrección de revisión, ronda 7): la
 * primera versión preseleccionaba al candidato de `personaMasParecida()` y
 * lo marcaba con un borde de color — pero un desplegable que MUESTRA a
 * alguien elegido y GUARDA ese mismo id es una elección, la llames como la
 * llames en el código; el color es decoración, no consentimiento. Quien
 * revisa cinco acuerdos y publica sin fijarse en cada campo aplicaba cinco
 * emparejamientos sin saberlo — y el precio de una asignación equivocada lo
 * paga alguien que ni sabe que esta app existe (le aparece trabajo en el
 * tablero del equipo). Ahora el `<select>` arranca vacío pase lo que pase, y
 * la sugerencia es un botón: "¿Es Fulano? Confirmar". Sin ese clic, el
 * acuerdo se guarda con el nombre de texto y sin id — vive en la app, no
 * entra a la bandeja, y ponerle dueño después es tan fácil como editarlo.
 *
 * Elegir en uno limpia el otro: un acuerdo tiene un responsable, no dos. Lo
 * que este componente le entrega al resto del formulario viaja siempre en dos
 * campos ocultos — `responsable` (el nombre visible, lo que lee la sala y la
 * minuta) y `responsableMondayId` (el id, o cadena vacía si no hay nadie de
 * Mkt Corp elegido). Normalizar esa cadena vacía a `null` es trabajo de quien
 * recoge el valor (el borde del formulario, o el candado compartido de
 * crearAcuerdo/editarAcuerdo en src/db/acuerdos.ts) — no de este componente.
 */
export function SelectorResponsable({ personas, valorInicial, sugerencia, onCambiar, disabled = false }: Props) {
  const tieneMondayIdInicial = Boolean(valorInicial?.mondayId)
  const [mondayId, setMondayId] = useState(tieneMondayIdInicial ? (valorInicial!.mondayId as string) : '')
  const [libre, setLibre] = useState(tieneMondayIdInicial ? '' : (valorInicial?.nombre ?? ''))

  function avisar(idNuevo: string, libreNuevo: string) {
    if (!onCambiar) return
    const persona = idNuevo !== '' ? personas.find((p) => p.id === idNuevo) : undefined
    const nombreResuelto = idNuevo !== '' ? (persona?.nombre ?? valorInicial?.nombre ?? '') : libreNuevo
    onCambiar({ responsable: nombreResuelto, responsableMondayId: idNuevo !== '' ? idNuevo : null })
  }

  function elegirDeMktCorp(id: string) {
    setMondayId(id)
    const libreNuevo = id !== '' ? '' : libre
    if (id !== '') setLibre('')
    avisar(id, libreNuevo)
  }

  function escribirLibre(valor: string) {
    setLibre(valor)
    setMondayId('')
    avisar('', valor)
  }

  const personaElegida = mondayId !== '' ? personas.find((p) => p.id === mondayId) : undefined
  // Si el id ya no aparece en la lista viva (alguien salió de Monday entre
  // que se guardó y hoy), el nombre que se conocía es mejor que uno vacío.
  const responsable = mondayId !== '' ? (personaElegida?.nombre ?? valorInicial?.nombre ?? '') : libre

  // El botón de aceptar solo tiene sentido mientras nadie ha elegido nada
  // todavía: en cuanto hay un mondayId (venga de aceptar la sugerencia o de
  // elegir a otra persona a mano), ya no hay nada más que confirmar.
  const ofrecerSugerencia = Boolean(sugerencia) && mondayId === ''

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
            className={estilos.responsableSelect}
            value={mondayId}
            onChange={(e) => elegirDeMktCorp(e.target.value)}
            aria-label="Responsable de Mkt Corp"
          >
            <option value="">Elegir de Mkt Corp…</option>
            {personas.map((p) => (
              // Sin `title={p.correo}` (corrección de la revisión final de la
              // ronda 7, punto 7): este selector se pinta también en páginas
              // que se comparten con el cliente interno por enlace firmado
              // de 30 días — el correo de las 24 personas de Mkt Corp no
              // tiene que viajar al HTML de esa página para elegir un
              // nombre. El id (lo único que de verdad hace falta) sigue
              // yendo en `value`, sin cambios.
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        )}
        {ofrecerSugerencia && sugerencia && (
          <p className={estilos.responsableSugerencia}>
            ¿Es <strong>{sugerencia.nombre}</strong>?{' '}
            <button
              type="button"
              className={estilos.responsableSugerenciaBoton}
              onClick={() => elegirDeMktCorp(sugerencia.id)}
              disabled={disabled}
              aria-label={`Confirmar a ${sugerencia.nombre} como responsable de Mkt Corp`}
            >
              Confirmar
            </button>
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
