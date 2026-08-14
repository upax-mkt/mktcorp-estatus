'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'
import Link from 'next/link'
import { estaCongelado, type AcuerdoConSala } from '@/db/consultas'
import { fechaBreve } from '@/lib/fecha'
import { colorDeTextoDeMarca } from '@/temas'
import type { PersonaMonday } from '@/monday/personas'
import type { Equipos } from '@/lib/equipos'
import { EditarAcuerdo } from '@/componentes/EditarAcuerdo'
import { Estrella } from './Estrella'
import estilos from './bandeja.module.css'

interface Props {
  acuerdos: AcuerdoConSala[]
  /** `destacarAction` — ver la cabecera de Estrella.tsx sobre por qué se recibe por prop. */
  destacar: (id: string, destacado: boolean) => Promise<void>
  /**
   * CORREGIR EL ACUERDO desde aquí (13-ago). Opcional: quien no puede editar
   * no la recibe y la fila no ofrece el lápiz. La comprobación que manda vive
   * en la Server Action — esconder un botón no protege un endpoint.
   */
  editar?: (
    acuerdoId: string,
    cambios: { que: string; responsable: string; responsableMondayId: string | null },
  ) => Promise<{ error?: string }>
  /** La gente de Mkt Corp para el desplegable de responsable. Solo se usa al editar. */
  personas?: PersonaMonday[]
  /** Los squads y las UDN que pueden cargar con el acuerdo (src/lib/equipos.ts). */
  equipos?: Equipos
  /**
   * ELIMINAR, sin papelera. Franco: *"como administrador debo poder eliminar
   * acuerdos desde la pestaña acuerdos"*. Solo llega si quien mira es admin:
   * dentro de una sala borra cualquier editor, pero esta pantalla cruza las
   * nueve y el borrado es un DELETE de verdad.
   */
  eliminar?: (acuerdoId: string) => Promise<void>
}

const ETIQUETA_ESTATUS: Record<AcuerdoConSala['estatus'], string> = {
  abierto: 'Abierto',
  vencido: 'Vencido',
  cumplido: 'Cumplido',
}

/** El tono de `.pildora` (sistema.css) para cada estatus. `undefined` = neutro, para "abierto". */
const TONO_ESTATUS: Partial<Record<AcuerdoConSala['estatus'], string>> = {
  cumplido: 'bien',
  vencido: 'mal',
}

const SIN_FILTRO = ''

/**
 * EL ESPACIO DE ACUERDOS: las diez salas juntas, filtrables, con la sala en
 * pausa aparte y apagada.
 *
 * Los filtros (sala, responsable, estatus) son de CLIENTE, sobre la lista que
 * ya llegó autorizada desde el servidor — la única puerta que importa es
 * quién puede cargar `/acuerdos` (`exigirLectura()` en la página), no qué
 * fila queda visible después de elegir un filtro.
 */
export function TablaAcuerdos({ acuerdos, destacar, editar, personas, equipos, eliminar }: Props) {
  const [sala, setSala] = useState(SIN_FILTRO)
  const [responsable, setResponsable] = useState(SIN_FILTRO)
  const [estatus, setEstatus] = useState(SIN_FILTRO)

  const salas = useMemo(() => {
    const vistas = new Map<string, string>()
    for (const a of acuerdos) vistas.set(a.salaSlug, a.salaNombre)
    return [...vistas.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [acuerdos])

  const responsables = useMemo(
    () => [...new Set(acuerdos.map((a) => a.responsable))].sort((a, b) => a.localeCompare(b, 'es')),
    [acuerdos],
  )

  // SIN NINGÚN ACUERDO —de ninguna sala, de ningún tipo— no tiene sentido
  // enseñar filtros para una tabla que no existe: ese vacío se dice antes de
  // llegar a los controles, no como una fila más dentro de una lista vacía.
  if (acuerdos.length === 0) {
    return (
      <p className={estilos.vacio}>
        Todavía no hay acuerdos. Se levantan en el espacio del cliente o al cerrar una minuta.
      </p>
    )
  }

  const coincide = (a: AcuerdoConSala) =>
    (sala === SIN_FILTRO || a.salaSlug === sala) &&
    (responsable === SIN_FILTRO || a.responsable === responsable) &&
    (estatus === SIN_FILTRO || a.estatus === estatus)

  const congeladosTodos = acuerdos.filter((a) => !a.salaActiva)
  const vivos = acuerdos.filter((a) => a.salaActiva && coincide(a))
  const congelados = congeladosTodos.filter(coincide)

  return (
    <>
      <div className={estilos.filtros}>
        <label className={estilos.filtro}>
          <span className="micro" data-sinpunto>Sala</span>
          <select className={estilos.select} value={sala} onChange={(e) => setSala(e.target.value)}>
            <option value={SIN_FILTRO}>Todas las salas</option>
            {salas.map(([slug, nombre]) => (
              <option key={slug} value={slug}>{nombre}</option>
            ))}
          </select>
        </label>
        <label className={estilos.filtro}>
          <span className="micro" data-sinpunto>Responsable</span>
          <select className={estilos.select} value={responsable} onChange={(e) => setResponsable(e.target.value)}>
            <option value={SIN_FILTRO}>Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className={estilos.filtro}>
          <span className="micro" data-sinpunto>Estatus</span>
          <select className={estilos.select} value={estatus} onChange={(e) => setEstatus(e.target.value)}>
            <option value={SIN_FILTRO}>Todos los estatus</option>
            <option value="abierto">Abierto</option>
            <option value="vencido">Vencido</option>
            <option value="cumplido">Cumplido</option>
          </select>
        </label>
      </div>

      <section className={`tarjeta ${estilos.tarjetaLista}`}>
        {vivos.length === 0 ? (
          <p className={estilos.vacio}>Ningún acuerdo coincide con estos filtros.</p>
        ) : (
          <ul className={estilos.lista}>
            {vivos.map((a) => (
              <Fila key={a.id} acuerdo={a} destacar={destacar} editar={editar}
                    personas={personas} equipos={equipos} eliminar={eliminar} />
            ))}
          </ul>
        )}
      </section>

      {/* Aparte y apagado: hoy las diez salas están activas, así que este
          bloque no aparece nunca en producción todavía — pero el filtro por
          `salaActiva` ya está puesto (tarea 12 le da el interruptor de
          pausar). El día que exista una sala en pausa, empieza a mostrarse
          solo, sin tocar este componente otra vez. */}
      {congeladosTodos.length > 0 && (
        <section className={`tarjeta ${estilos.tarjetaLista} ${estilos.congelados}`} aria-label="Congelados">
          <h2 className={estilos.congeladosTitulo}>Congelados</h2>
          <p className={estilos.congeladosNota}>
            Sus salas están en pausa: no vencen, no cuentan y no se pueden subir a Monday.
          </p>
          {congelados.length === 0 ? (
            <p className={estilos.vacio}>Ningún acuerdo congelado coincide con estos filtros.</p>
          ) : (
            <ul className={estilos.lista}>
              {congelados.map((a) => (
                <Fila key={a.id} acuerdo={a} destacar={destacar} editar={editar}
                    personas={personas} equipos={equipos} eliminar={eliminar} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}

function Fila({
  acuerdo,
  destacar,
  editar,
  personas,
  equipos,
  eliminar,
}: {
  acuerdo: AcuerdoConSala
  destacar: Props['destacar']
  editar?: Props['editar']
  personas?: Props['personas']
  equipos?: Props['equipos']
  eliminar?: Props['eliminar']
}) {
  const estiloFila = {
    '--marca': acuerdo.salaColor,
    '--marca-texto': colorDeTextoDeMarca(acuerdo.salaColor),
  } as CSSProperties

  // Congelado (revisión final de la ronda 7, punto menor): dentro del bloque
  // "Congelados" esta MISMA fila se pintaba con el badge "Abierto" liso —
  // `ETIQUETA_ESTATUS`/`TONO_ESTATUS` no sabían nada del freeze de la sala.
  // `estaCongelado` ya distingue exactamente eso (solo un `abierto` de una
  // sala en pausa lo es; un `cumplido` de esa misma sala NO — no tiene un
  // plazo que congelar), así que se comprueba POR FILA, no por bloque: es lo
  // mismo que ya hace src/app/cliente/[slug]/page.tsx.
  const congelado = estaCongelado(acuerdo, { activa: acuerdo.salaActiva })

  return (
    <li className={estilos.fila} style={estiloFila}>
      <div className={estilos.cuerpo}>
        {/* EL MISMO EDITOR QUE LA SALA, no uno parecido: `EditarAcuerdo` ya
            resuelve corregir el texto y el responsable en sitio, con su lápiz
            y su cancelar. Escribir aquí otro sería tener dos sitios donde
            arreglar el mismo defecto —la lección que dejó la ronda 12 con la
            sección del Home y la de la sala. */}
        {editar ? (
          <EditarAcuerdo
            acuerdoId={acuerdo.id}
            queInicial={acuerdo.que}
            responsableInicial={acuerdo.responsable}
            personas={personas ?? []}
            equipos={equipos}
            siempreVisible
            editarAction={editar}
          />
        ) : (
          <p className={estilos.que}>{acuerdo.que}</p>
        )}
        <div className={estilos.meta}>
          <Link href={`/cliente/${acuerdo.salaSlug}`} className={estilos.metaSala}>
            {acuerdo.salaNombre}
          </Link>
          <span className={estilos.punto} aria-hidden>·</span>
          {/* "sin dueño" y no un hueco: un acuerdo sin responsable es
              justamente lo que hay que ver para arreglarlo, y es como lo
              nombra la sala. */}
          <span>{acuerdo.responsable || 'sin dueño'}</span>
          <span className={estilos.punto} aria-hidden>·</span>
          <span>{acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}</span>
          {acuerdo.mondayUrl && (
            <>
              <span className={estilos.punto} aria-hidden>·</span>
              <a href={acuerdo.mondayUrl} target="_blank" rel="noopener noreferrer" className={estilos.enlaceMonday}>
                Ver en Monday ↗
              </a>
            </>
          )}
          {/* El aviso que pide el diseño (§4) cuando el elemento desapareció
              de Monday (revisión final de la ronda 7, punto 6): antes esta
              fila se quedaba con `mondayUrl` colgado —"Ver en Monday ↗" a un
              elemento que ya no existe—; ahora refrescarDesdeMonday lo limpia
              y esta es la señal de que eso pasó. */}
          {acuerdo.mondayDesvinculado && (
            <>
              <span className={estilos.punto} aria-hidden>·</span>
              <span className={estilos.avisoDesvinculado}>Se dejó de sincronizar con Monday: el elemento ya no existe allá</span>
            </>
          )}
        </div>
      </div>

      <div className={estilos.filaDcha}>
        <span className="pildora" data-tono={congelado ? undefined : TONO_ESTATUS[acuerdo.estatus]}>
          {congelado ? 'Congelado' : ETIQUETA_ESTATUS[acuerdo.estatus]}
        </span>
        <Estrella acuerdoId={acuerdo.id} destacado={acuerdo.destacado} destacar={destacar} />
        {eliminar && <Eliminar acuerdoId={acuerdo.id} eliminar={eliminar} />}
      </div>
    </li>
  )
}

/**
 * BORRAR EN DOS TIEMPOS, con el mismo gesto que la sala (`AcuerdoControles`):
 * la × abre la confirmación en el propio sitio y "Borrar" la ejecuta. Sin
 * diálogo del navegador, que bloquea la página entera para preguntar una cosa.
 *
 * No es lo mismo que "Cancelado", que sigue siendo un estatus: un acuerdo
 * cancelado existió y se dejó sin efecto; uno borrado nunca debió existir —un
 * duplicado, una línea que la IA sacó de una transcripción y no era un
 * acuerdo—. Por eso no hay papelera y por eso se pregunta.
 */
function Eliminar({ acuerdoId, eliminar }: { acuerdoId: string; eliminar: NonNullable<Props['eliminar']> }) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  if (!confirmando) {
    return (
      <button
        type="button"
        className={estilos.botonIconoBorrar}
        onClick={() => setConfirmando(true)}
        title="Eliminar acuerdo"
        aria-label="Eliminar acuerdo"
      >
        ×
      </button>
    )
  }

  return (
    <span className={estilos.confirmarBorrado}>
      <button
        type="button"
        className={estilos.botonBorrar}
        disabled={pendiente}
        onClick={() => empezar(async () => { await eliminar(acuerdoId) })}
      >
        Borrar
      </button>
      <button type="button" className={estilos.botonCancelarBorrado} onClick={() => setConfirmando(false)}>
        No
      </button>
    </span>
  )
}
