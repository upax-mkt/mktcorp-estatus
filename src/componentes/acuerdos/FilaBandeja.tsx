'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AcuerdoPendienteDeSubir } from '@/db/acuerdos'
import type { ElementoDeDelivery } from '@/monday/cliente'
import { fechaBreve } from '@/lib/fecha'
import { colorDeTextoDeMarca } from '@/temas'
import estilos from './bandeja.module.css'

type Destino = { tipo: 'elemento' } | { tipo: 'subelemento'; padreId: string }

interface Props {
  acuerdo: AcuerdoPendienteDeSubir
  /** Los elementos de Delivery de SU sala, para poder colgar el acuerdo de uno. */
  elementos: ElementoDeDelivery[]
  subir: (id: string, destino: Destino) => Promise<void>
  descartar: (id: string) => Promise<void>
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
 * forma toma en Delivery, o lo descarte.
 *
 * Arranca en «elemento nuevo» — colgar de algo que ya existe es la
 * excepción, no lo normal, así que no se obliga a mirar una lista antes de
 * poder actuar. Cuando la sala no tiene todavía ningún elemento en Delivery,
 * la opción de colgar se deshabilita en vez de ofrecer un selector vacío.
 */
export function FilaBandeja({
  acuerdo,
  elementos,
  subir,
  descartar,
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
        </div>
      </div>

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
