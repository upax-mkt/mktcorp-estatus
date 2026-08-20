'use client'

import { useState } from 'react'
import type { PersonaResponsable } from '@/lib/personas'
import { esEquipo, type Equipos } from '@/lib/equipos'
import estilos from './SelectorResponsable.module.css'

interface Props {
  /**
   * La gente de Mkt Corp que se puede elegir — ver `genteParaResponsable()`
   * en src/db/personas.ts. Solo llega vacía si la app no tiene base; entonces
   * el aviso lo dice y el texto libre sigue funcionando igual.
   */
  personas: PersonaResponsable[]
  /**
   * El responsable actual, al editar un acuerdo que ya lo tenía: el NOMBRE
   * tal como está guardado. Sin esto, arranca en blanco.
   */
  valorInicial?: string
  /**
   * Alguien de Mkt Corp cuyo nombre se parece al que trae `valorInicial` —
   * típicamente la salida de `personaMasParecida()` sobre un nombre que la
   * IA detectó en una transcripción (ver MinutaCliente.tsx). SOLO SE OFRECE,
   * nunca se aplica sola: el `<select>` arranca vacío igual, y esta persona
   * aparece como un botón aparte para confirmarla con un clic. Lo que se ve
   * elegido en el desplegable es siempre lo que se guarda — nunca una
   * elección que nadie hizo.
   */
  sugerencia?: PersonaResponsable | null
  /**
   * Modo controlado, para quien necesita enterarse de cada cambio en el
   * momento — MinutaCliente edita filas en estado de React, no lee un
   * FormData al enviar (no hay `<form>` alrededor de esas filas). El campo
   * oculto `responsable` sigue existiendo igual: esto es un aviso ADEMÁS, no
   * en su lugar.
   */
  onCambiar?: (valor: { responsable: string }) => void
  /** Deshabilita los controles — para una fila que no se va a publicar. */
  disabled?: boolean
  /**
   * Los equipos que pueden cargar con el acuerdo: los squads de Mkt Corp y
   * las UDN vivas (ver src/lib/equipos.ts). Sin esta prop el control no se
   * pinta, y el componente se comporta como antes del 13-ago — así una
   * pantalla que aún no sepa de equipos no empieza a ofrecerlos por accidente.
   */
  equipos?: Equipos
}

/**
 * QUIÉN ES EL RESPONSABLE: de la lista viva de Mkt Corp, un equipo, o escrito
 * a mano si es alguien de la UDN cliente — nunca dos a la vez.
 *
 * Por qué de una lista y no escrito a mano: una app hermana de este mismo
 * equipo empareja el responsable por el nombre que alguien tecleó contra un
 * diccionario congelado, y hoy tiene seis personas que ya no existen, cinco
 * que faltan, y una que nunca se asigna porque está escrita distinto. Elegir
 * de una lista evita las erratas y las tres grafías del mismo nombre.
 *
 * LO QUE SE GUARDA ES EL NOMBRE, y solo el nombre (`acuerdos.responsable`, un
 * texto). Hasta el 20-ago-2026 viajaba además un `responsableMondayId` con el
 * id del usuario en el tablero, y las opciones del directorio propio llevaban
 * un prefijo `app:` para no colarse en esa columna. Con Monday desmontado no
 * hay dos identificadores que mantener de acuerdo: el `value` de cada opción
 * ES el nombre.
 *
 * LA SUGERENCIA NUNCA SE APLICA SOLA (corrección de revisión, ronda 7): la
 * primera versión preseleccionaba al candidato de `personaMasParecida()` y
 * lo marcaba con un borde de color — pero un desplegable que MUESTRA a
 * alguien elegido y GUARDA a esa misma persona es una elección, la llames
 * como la llames en el código; el color es decoración, no consentimiento.
 * Quien revisa cinco acuerdos y publica sin fijarse en cada campo aplicaba
 * cinco emparejamientos sin saberlo. Ahora el `<select>` arranca vacío pase
 * lo que pase, y la sugerencia es un botón: "¿Es Fulano? Confirmar".
 *
 * Elegir en uno limpia los otros: un acuerdo tiene un responsable, no tres.
 * Lo que este componente le entrega al resto del formulario viaja en un campo
 * oculto — `responsable`, el nombre visible, que es lo que lee la sala y la
 * minuta.
 */
export function SelectorResponsable({
  personas,
  valorInicial,
  sugerencia,
  onCambiar,
  disabled = false,
  equipos,
}: Props) {
  /**
   * De qué CLASE es el responsable que llega, para reabrir en el control
   * correcto: un nombre suelto puede ser un squad ("RevOps & Analytics") o
   * una persona ("Pablo Levy"), y lo único que los distingue es la lista de
   * equipos — no se guarda ninguna marca en la base (ver src/lib/equipos.ts).
   *
   * ⚠️ EL DESPLEGABLE DE MKT CORP ARRANCA SIEMPRE VACÍO, aunque el nombre que
   * llega sea idéntico al de alguien de la lista. Es deliberado y es la misma
   * regla que la sugerencia: en la minuta, `valorInicial` es el nombre que la
   * IA leyó de una transcripción, y un desplegable que MUESTRA a esa persona
   * elegida y GUARDA a esa persona es una elección que nadie hizo. Quien
   * quiera preseleccionar tendrá que distinguir antes "nombre guardado por
   * una persona" de "nombre propuesto por el modelo" — hoy el componente no
   * puede saberlo.
   */
  const nombreInicial = valorInicial ?? ''
  const equipoInicial =
    equipos && nombreInicial !== '' && esEquipo(nombreInicial, equipos) ? nombreInicial : ''

  const [persona, setPersona] = useState('')
  const [equipo, setEquipo] = useState(equipoInicial)
  const [libre, setLibre] = useState(equipoInicial !== '' ? '' : nombreInicial)

  function avisar(nombre: string) {
    if (onCambiar) onCambiar({ responsable: nombre })
  }

  function elegirDeMktCorp(nombre: string) {
    setPersona(nombre)
    if (nombre !== '') { setLibre(''); setEquipo('') }
    avisar(nombre !== '' ? nombre : equipo !== '' ? equipo : libre)
  }

  function escribirLibre(valor: string) {
    setLibre(valor)
    setPersona('')
    setEquipo('')
    avisar(valor)
  }

  /**
   * UN ACUERDO TIENE UN RESPONSABLE, no tres. Elegir equipo apaga a la persona
   * y al texto libre por el mismo motivo por el que ya se apagaban entre sí:
   * dos campos llenos obligarían a decidir en el servidor cuál gana, y esa
   * decisión no la puede tomar quien no vio la pantalla.
   */
  function elegirEquipo(nombre: string) {
    setEquipo(nombre)
    if (nombre !== '') { setLibre(''); setPersona('') }
    avisar(nombre !== '' ? nombre : libre)
  }

  const responsable = persona !== '' ? persona : equipo !== '' ? equipo : libre

  // El botón de aceptar solo tiene sentido mientras nadie ha elegido a nadie
  // todavía: en cuanto hay persona (venga de aceptar la sugerencia o de
  // elegir a otra a mano), ya no hay nada más que confirmar.
  const ofrecerSugerencia = Boolean(sugerencia) && persona === ''

  return (
    <div className={estilos.responsable}>
      <fieldset className={estilos.responsableGrupo} disabled={disabled}>
        <legend className={estilos.responsableLeyenda}>Mkt Corp</legend>
        {personas.length === 0 ? (
          <p className={estilos.responsableAviso}>
            No se pudo cargar la gente de Mkt Corp ahora mismo: elige a alguien de la UDN.
          </p>
        ) : (
          <select
            className={estilos.responsableSelect}
            value={persona}
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
              // nombre. El nombre, que es lo único que se guarda, va en
              // `value`.
              <option key={p.correo} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        )}
        {ofrecerSugerencia && sugerencia && (
          <p className={estilos.responsableSugerencia}>
            ¿Es <strong>{sugerencia.nombre}</strong>?{' '}
            <button
              type="button"
              className={estilos.responsableSugerenciaBoton}
              onClick={() => elegirDeMktCorp(sugerencia.nombre)}
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

      {/* …O UN EQUIPO ENTERO. Va el ÚLTIMO a propósito: lo habitual es que un
          compromiso tenga dueño con nombre y apellido, y ofrecer el squad
          primero invita a repartir trabajo a un colectivo, que es la forma
          educada de que no lo haga nadie. Está para lo que de verdad es del
          equipo ("lo ve RevOps"), no como atajo. */}
      {equipos && (
        <label className={estilos.responsableLibre}>
          <span className="micro">…o un equipo</span>
          <select
            className={estilos.responsableSelect}
            value={equipo}
            onChange={(e) => elegirEquipo(e.target.value)}
            disabled={disabled}
            aria-label="Equipo responsable"
          >
            <option value="">Elegir un equipo…</option>
            <optgroup label="Squads de Mkt Corp">
              {equipos.squads.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </optgroup>
            {equipos.udns.length > 0 && (
              // "UDN y clientes" y no "UDN" a secas: esta lista son las salas
              // vivas de la app, y una de ellas —Ceci— no es una UDN. El
              // rótulo dice lo que la lista es de verdad.
              <optgroup label="UDN y clientes">
                {equipos.udns.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}

      {/* Lo único que de verdad lee quien recoge un FormData: siempre
          presente, nunca deshabilitado, pase lo que pase con la selección
          visual de arriba. */}
      <input type="hidden" name="responsable" value={responsable} />
    </div>
  )
}
