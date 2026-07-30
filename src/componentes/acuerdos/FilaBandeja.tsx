'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AcuerdoPendienteDeSubir } from '@/db/acuerdos'
import type { ElementoDeDelivery } from '@/monday/cliente'
import type { PersonaMonday } from '@/monday/personas'
import { SelectorResponsable } from '@/componentes/SelectorResponsable'
import { fechaBreve } from '@/lib/fecha'
import { colorDeTextoDeMarca } from '@/temas'
import estilos from './bandeja.module.css'

type Destino = { tipo: 'elemento' } | { tipo: 'subelemento'; padreId: string }

interface CambiosEnBandeja {
  que: string
  responsable: string
  responsableMondayId: string | null
  fechaCompromiso: string | null
}

interface Props {
  acuerdo: AcuerdoPendienteDeSubir
  /** Los elementos de Delivery de SU sala, para poder colgar el acuerdo de uno. */
  elementos: ElementoDeDelivery[]
  /** La gente viva de Mkt Corp, para corregir el responsable ahí mismo — ver directorio() en src/db/personas.ts. */
  personas: PersonaMonday[]
  subir: (id: string, destino: Destino) => Promise<void>
  descartar: (id: string) => Promise<void>
  /**
   * Edita el acuerdo, su responsable o su fecha sin salir de la bandeja (spec
   * §3: "editables ahí mismo"). `salaSlug` viaja aparte del resto de
   * `acuerdo` para que la acción pueda revalidar también la sala, sin tener
   * que releerla en el servidor.
   */
  editar: (id: string, salaSlug: string, cambios: CambiosEnBandeja) => Promise<void>
  /**
   * Si la subida a Monday está disponible hoy (token + escritura + grupo
   * comprobado). Por defecto encendido: lo que de verdad decide si se puede
   * subir vive en la página (el estado de la integración), no en esta fila —
   * los tests de este componente no simulan esa parte.
   */
  puedeSubir?: boolean
  /** Si `elementos` puede estar incompleta (el tablero llegó al límite de 100). */
  truncado?: boolean
}

/**
 * UNA FILA DE LA BANDEJA: un acuerdo, listo para que alguien confirme qué
 * forma toma en Delivery, lo edite ahí mismo, o lo descarte.
 *
 * Arranca en «elemento nuevo» — colgar de algo que ya existe es la
 * excepción, no lo normal, así que no se obliga a mirar una lista antes de
 * poder actuar. Cuando la sala no tiene todavía ningún elemento en Delivery,
 * la opción de colgar se deshabilita en vez de ofrecer un selector vacío.
 */
export function FilaBandeja({
  acuerdo,
  elementos,
  personas,
  subir,
  descartar,
  editar,
  puedeSubir = true,
  truncado = false,
}: Props) {
  const [tipo, setTipo] = useState<'elemento' | 'subelemento'>('elemento')
  const [padreId, setPadreId] = useState(elementos[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const [pendiente, empezar] = useTransition()

  const hayElementos = elementos.length > 0
  // La integración puede estar apagada (sin escritura, sin grupo válido): en
  // ese caso ningún botón de subir sirve de nada, así que se deshabilita en
  // vez de dejar que alguien lo pulse para nada.
  const subidaDeshabilitada = pendiente || !puedeSubir
  // Defensa extra: no debería ser alcanzable desde la UI (el radio de
  // «Subelemento de» ya está deshabilitado sin elementos), pero un botón de
  // Subir nunca debe poder mandar un padreId vacío.
  const faltaElegirPadre = tipo === 'subelemento' && padreId === ''

  function manejarSubir() {
    setError(null)
    const destino: Destino = tipo === 'subelemento' ? { tipo: 'subelemento', padreId } : { tipo: 'elemento' }
    empezar(async () => {
      try {
        await subir(acuerdo.id, destino)
        // Sin más: `subirAcuerdoAction` revalida la ruta al terminar, y esta
        // fila deja de llegar en la siguiente carga — no hay lista local que
        // actualizar a mano aquí.
      } catch (e) {
        // El fallo tiene que LLEGAR A LA PANTALLA: quien pulsó necesita leer
        // por qué (Monday caído, el grupo que desapareció), no ver un
        // renglón que no se mueve.
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  function manejarDescartar() {
    empezar(async () => {
      await descartar(acuerdo.id)
    })
  }

  const estiloFila = {
    '--marca': acuerdo.salaColor,
    '--marca-texto': acuerdo.salaColor ? colorDeTextoDeMarca(acuerdo.salaColor) : undefined,
  } as React.CSSProperties

  return (
    <li className={estilos.fila} style={estiloFila}>
      <EdicionEnSitio acuerdo={acuerdo} personas={personas} editar={editar} deshabilitado={pendiente} />

      <div className={estilos.destino}>
        <label className={estilos.opcion}>
          <input
            type="radio"
            name={`destino-${acuerdo.id}`}
            checked={tipo === 'elemento'}
            disabled={subidaDeshabilitada}
            onChange={() => setTipo('elemento')}
          />
          Elemento nuevo
        </label>
        <label className={estilos.opcion}>
          <input
            type="radio"
            name={`destino-${acuerdo.id}`}
            checked={tipo === 'subelemento'}
            disabled={subidaDeshabilitada || !hayElementos}
            onChange={() => setTipo('subelemento')}
          />
          Subelemento de
        </label>
        <div className={estilos.subelementoDetalle}>
          <select
            className={estilos.select}
            aria-label="Elemento del que cuelga"
            value={padreId}
            disabled={subidaDeshabilitada || !hayElementos || tipo !== 'subelemento'}
            onChange={(e) => setPadreId(e.target.value)}
          >
            {hayElementos
              ? elementos.map((el) => (
                  <option key={el.id} value={el.id}>{el.nombre}</option>
                ))
              : <option value="">Sin elementos en Delivery todavía</option>}
          </select>
          {/* Quien elige "cuelga de" merece saber que la lista puede no estar
              completa: el buscador de Delivery se corta en 100 elementos. */}
          {truncado && (
            <p className={estilos.truncado}>
              El tablero puede tener más elementos de los que se muestran aquí.
            </p>
          )}
        </div>
      </div>

      <div className={estilos.acciones}>
        {error && <p className={estilos.error}>{error}</p>}

        <button
          type="button"
          className="boton"
          disabled={subidaDeshabilitada || faltaElegirPadre}
          onClick={manejarSubir}
        >
          {pendiente ? 'Subiendo…' : 'Subir'}
        </button>

        {/* Descartar no toca Monday — es una decisión sobre NUESTRA bandeja,
            así que sigue disponible aunque la integración esté apagada. Pero
            es definitivo (no vuelve a ofrecerse nunca), así que confirma en
            dos tiempos, igual que el resto de acciones irreversibles de la
            app (ver AcuerdoControles / BorrarBorrador). */}
        {confirmandoDescarte ? (
          <span className={estilos.confirmar}>
            <span className={estilos.confirmarTexto}>¿Descartar? No vuelve a ofrecerse.</span>
            <button
              type="button"
              className={estilos.botonDescartarConfirmar}
              disabled={pendiente}
              onClick={manejarDescartar}
            >
              {pendiente ? 'Descartando…' : 'Sí, descartar'}
            </button>
            <button
              type="button"
              className={estilos.botonTexto}
              disabled={pendiente}
              onClick={() => setConfirmandoDescarte(false)}
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="boton"
            data-tono="fantasma"
            disabled={pendiente}
            onClick={() => setConfirmandoDescarte(true)}
          >
            Descartar
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * EL ACUERDO, SU RESPONSABLE Y SU FECHA, EDITABLES AHÍ MISMO (spec §3).
 *
 * Es el último punto donde alguien puede corregir un nombre que la
 * transcripción se comió o una fecha mal detectada ANTES de que aparezca en
 * el tablero de 950 elementos que mira todo el equipo — después de subir, ya
 * no (subir/descartar exigen `bandeja = 'pendiente'`).
 *
 * Aparte, en su propio componente: mismo patrón que `FilaArchivo` dentro de
 * ArchivosSala.tsx (un `editando` local que sustituye el texto por el
 * formulario, Guardar/Cancelar) — no porque haga falta reinventar nada, sino
 * porque es exactamente el mismo problema con el mismo formato de solución.
 */
function EdicionEnSitio({
  acuerdo,
  personas,
  editar,
  deshabilitado,
}: {
  acuerdo: AcuerdoPendienteDeSubir
  personas: PersonaMonday[]
  editar: Props['editar']
  /** La fila ya está ocupada subiendo o descartando: no se abre edición encima. */
  deshabilitado: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [que, setQue] = useState(acuerdo.que)
  const [fecha, setFecha] = useState(acuerdo.fechaCompromiso ?? '')
  // El responsable vive en dos campos, igual que en cualquier otro formulario
  // de esta app que usa SelectorResponsable (ver NuevoAcuerdoForm): el
  // nombre visible y el id de Monday, nunca uno sin el otro.
  const [responsable, setResponsable] = useState(acuerdo.responsable)
  const [responsableMondayId, setResponsableMondayId] = useState(acuerdo.responsableMondayId)
  const [error, setError] = useState<string | null>(null)
  const [guardando, empezarGuardado] = useTransition()

  function abrir() {
    setQue(acuerdo.que)
    setFecha(acuerdo.fechaCompromiso ?? '')
    setResponsable(acuerdo.responsable)
    setResponsableMondayId(acuerdo.responsableMondayId)
    setError(null)
    setEditando(true)
  }

  function cancelar() {
    setEditando(false)
    setError(null)
  }

  function guardar() {
    if (que.trim().length === 0) {
      setError('El acuerdo no puede quedar vacío.')
      return
    }
    setError(null)
    empezarGuardado(async () => {
      try {
        await editar(acuerdo.id, acuerdo.salaSlug, {
          que: que.trim(),
          responsable,
          responsableMondayId,
          fechaCompromiso: fecha || null,
        })
        // Sin más: editarEnBandejaAction revalida la ruta — mismo criterio
        // que subir/descartar, no hay copia local que mantener a mano.
        setEditando(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  if (editando) {
    return (
      <div className={estilos.cuerpo}>
        <div className={estilos.edicion}>
          <input
            type="text"
            className={estilos.edicionQue}
            value={que}
            onChange={(e) => setQue(e.target.value)}
            aria-label="Qué se acordó"
            disabled={guardando}
            autoFocus
          />
          <div className={estilos.edicionFila}>
            <SelectorResponsable
              personas={personas}
              valorInicial={{ nombre: acuerdo.responsable, mondayId: acuerdo.responsableMondayId }}
              onCambiar={(v) => { setResponsable(v.responsable); setResponsableMondayId(v.responsableMondayId) }}
              disabled={guardando}
            />
            <input
              type="date"
              className={estilos.edicionFecha}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={guardando}
              aria-label="Fecha compromiso"
            />
          </div>
          {error && <p className={estilos.error}>{error}</p>}
          <div className={estilos.edicionAcciones}>
            <button
              type="button"
              className="boton"
              data-tono="suave"
              disabled={guardando || que.trim().length === 0}
              onClick={guardar}
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className={estilos.botonTexto} disabled={guardando} onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.cuerpo}>
      <p className={estilos.que}>{acuerdo.que}</p>
      <div className={estilos.meta}>
        <Link href={`/cliente/${acuerdo.salaSlug}`} className={estilos.metaSala}>
          {acuerdo.salaNombre}
        </Link>
        <span className={estilos.punto} aria-hidden>·</span>
        <span>{acuerdo.responsable}</span>
        <span className={estilos.punto} aria-hidden>·</span>
        <span>{acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}</span>
        <span className={estilos.punto} aria-hidden>·</span>
        <button type="button" className={estilos.editarBoton} disabled={deshabilitado} onClick={abrir}>
          Editar
        </button>
      </div>
    </div>
  )
}
