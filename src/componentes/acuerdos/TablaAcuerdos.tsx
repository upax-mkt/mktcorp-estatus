'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'
import Link from 'next/link'
import { estaCongelado, type AcuerdoConSala } from '@/db/consultas'
import { fechaBreve } from '@/lib/fecha'
import { colorDeTextoDeMarca } from '@/temas'
import type { PersonaMonday } from '@/monday/personas'
import type { Equipos } from '@/lib/equipos'
import { EditarAcuerdo } from '@/componentes/EditarAcuerdo'
import { AcuerdoControles } from '@/componentes/AcuerdoControles'
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
   *
   * Se entrega a `AcuerdoControles`, que ya sabe pedir confirmación en dos
   * tiempos y ya sabe NO pintar su × cuando esta acción no llega. Vive
   * dentro del editor completo (detrás de "✎ Corregir"), no suelto en la
   * fila — ver `cambiarEstatus` más abajo sobre el porqué de la consolidación.
   */
  eliminar?: (acuerdoId: string) => Promise<void>
  /**
   * CAMBIAR ESTADO Y FECHA DESDE AQUÍ (ronda 14, tarea 4 — la costura de las
   * tareas 2 y 3: las Server Actions ya existían, sin llamador). Opcionales,
   * como `editar`/`eliminar`: quien no puede editar no las recibe y la fila
   * no ofrece el control. La comprobación que manda vive en cada Server
   * Action (`exigirEditor()`, ver src/app/acuerdos/acciones.ts) — esconder
   * el control aquí es cosmética, no protección.
   *
   * ⚠️ NO SE PINTAN EN REPOSO (ronda de arreglo 1 sobre esta tarea). La
   * primera versión los ponía siempre visibles en `filaDcha`, junto con el
   * `<select>` de sala en `.meta` — la revisión midió que eso le costaba a
   * la columna de lectura (el texto del acuerdo) ~225px en TODAS las filas
   * para todo el que puede editar (~700px → ~475px). Ahora viven detrás del
   * mismo "✎ Corregir" que ya abre texto/responsable: un editor completo, un
   * solo gesto, en vez de tres controles sueltos siempre encendidos. Ver
   * `Fila` para el detalle.
   */
  cambiarEstatus?: (acuerdoId: string, estatus: 'abierto' | 'cumplido' | 'vencido' | 'cancelado') => Promise<void>
  editarFecha?: (acuerdoId: string, fecha: string | null) => Promise<void>
  /**
   * MOVER DE SALA DESDE AQUÍ (tarea 3). Un acuerdo capturado en la sala
   * equivocada hoy solo se arreglaba borrándolo y creándolo de nuevo —perdía
   * su origen y su historia—; esto lo corrige en sitio. También de editor,
   * por el mismo motivo que `cambiarEstatus`: corrige un dato mal capturado,
   * no es una decisión de administración. Mismo criterio de arriba: vive
   * dentro del editor completo, no sustituyendo al enlace de la sala en
   * reposo (eso fue el error de la primera versión de esta tarea).
   */
  moverDeSala?: (acuerdoId: string, salaSlug: string) => Promise<{ error?: string }>
  /**
   * Las salas VIVAS a las que se puede mover un acuerdo — solo se usa junto
   * con `moverDeSala`. Las pausadas quedan fuera por el mismo criterio que ya
   * aplica `equiposPara`: a quien está en freeze no se le encarga trabajo
   * nuevo. Eso es sobre DESTINOS, no sobre orígenes — un acuerdo YA congelado
   * puede seguir saliendo de ahí (`Fila` añade su propia sala a las opciones
   * si hace falta, para que el `<select>` nunca muestre un valor que no es el
   * real; ver esa función).
   */
  salas?: Array<{ slug: string; nombre: string }>
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
export function TablaAcuerdos({
  acuerdos,
  destacar,
  editar,
  personas,
  equipos,
  eliminar,
  cambiarEstatus,
  editarFecha,
  moverDeSala,
  // Alias: esta función YA tiene un `salas` local (las que aparecen en el
  // filtro "Sala" de arriba, derivadas de `acuerdos`) — es una lista
  // distinta con un propósito distinto (destinos VIVOS a los que mover, no
  // "qué salas hay en esta tabla"), así que no pueden compartir nombre.
  salas: salasParaMover,
}: Props) {
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
                    personas={personas} equipos={equipos} eliminar={eliminar}
                    cambiarEstatus={cambiarEstatus} editarFecha={editarFecha}
                    moverDeSala={moverDeSala} salas={salasParaMover} />
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
                // `moverDeSala`/`salas` SÍ llegan aquí también: un congelado
                // puede estar mal capturado igual que un vivo, y "a quien
                // está en freeze no se le encarga trabajo" es sobre no
                // OFRECERLE trabajo nuevo, no sobre negarle salir de ahí. `Fila`
                // ya cuida que el `<select>` no mienta cuando la sala propia
                // —pausada— no está entre las opciones VIVAS (ver ahí el porqué).
                <Fila key={a.id} acuerdo={a} destacar={destacar} editar={editar}
                    personas={personas} equipos={equipos} eliminar={eliminar}
                    cambiarEstatus={cambiarEstatus} editarFecha={editarFecha}
                    moverDeSala={moverDeSala} salas={salasParaMover} />
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
  cambiarEstatus,
  editarFecha,
  moverDeSala,
  salas,
}: {
  acuerdo: AcuerdoConSala
  destacar: Props['destacar']
  editar?: Props['editar']
  personas?: Props['personas']
  equipos?: Props['equipos']
  eliminar?: Props['eliminar']
  cambiarEstatus?: Props['cambiarEstatus']
  editarFecha?: Props['editarFecha']
  moverDeSala?: Props['moverDeSala']
  salas?: Props['salas']
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

  // ABRIR/CERRAR, LEVANTADO AQUÍ (ronda de arreglo 1 sobre esta tarea —
  // ruling del coordinador). El brief original hacía que el `<select>` de
  // sala SUSTITUYERA al enlace en reposo, y estatus/fecha vivieran sueltos
  // en `filaDcha` siempre visibles: medido por la revisión, eso le costaba a
  // la columna de lectura ~225px (de ~700 a ~475) EN TODAS LAS FILAS, para
  // TODO el que puede editar — el texto del acuerdo es lo que se lee a
  // diario; el estatus/fecha/sala se tocan de vez en cuando. Ahora los tres
  // viven detrás del mismo "✎ Corregir" que ya abre texto+responsable
  // (`EditarAcuerdo`, controlado desde aquí vía `editando`/
  // `onEditandoChange` — ver su cabecera): un solo gesto deliberado abre EL
  // EDITOR COMPLETO, y en reposo la fila vuelve a ser una lista que se LEE.
  const [editando, setEditando] = useState(false)

  const [pendienteSala, empezarSala] = useTransition()
  const [errorSala, setErrorSala] = useState<string | null>(null)
  // Fuerza el remonte del `<select>` de sala tras un error (ver su uso más
  // abajo): es un control NO CONTROLADO (`defaultValue`, no `value`) a
  // propósito —moverDeSala ya revalida la página entera, y controlarlo
  // reintroduciría la carrera que `defaultValue` evita en `AcuerdoControles`—,
  // así que si el POST falla el navegador se queda mostrando el destino que
  // el usuario tocó, no el real. Cambiar la `key` es la única forma de que
  // React vuelva a aplicar `defaultValue` sobre el valor que sí quedó guardado.
  const [intentoSala, setIntentoSala] = useState(0)

  // LA PROPIA SALA, SIEMPRE ENTRE LAS OPCIONES. `salas` (prop) son las
  // VIVAS —a quien está en freeze no se le encarga trabajo nuevo, así que la
  // congelada nunca es un DESTINO—, pero eso no significa que no pueda ser el
  // ORIGEN: un acuerdo de una sala en pausa también puede estar mal
  // capturado. Sin este parche, el `<select>` de un congelado se abriría sin
  // su propia sala en la lista y `defaultValue` no encontraría con qué
  // coincidir — el navegador cae al primer `<option>`, mostrando una sala
  // que NO es la del acuerdo. Se antepone solo si de verdad falta.
  const opcionesSala = moverDeSala
    ? (salas ?? []).some((s) => s.slug === acuerdo.salaSlug)
      ? (salas ?? [])
      : [{ slug: acuerdo.salaSlug, nombre: acuerdo.salaNombre }, ...(salas ?? [])]
    : []

  return (
    <li className={estilos.fila} style={estiloFila}>
      <div className={estilos.cuerpo}>
        {/* EL MISMO EDITOR QUE LA SALA, no uno parecido: `EditarAcuerdo` ya
            resuelve corregir el texto y el responsable en sitio, con su lápiz
            y su cancelar. Escribir aquí otro sería tener dos sitios donde
            arreglar el mismo defecto —la lección que dejó la ronda 12 con la
            sección del Home y la de la sala.

            `editando`/`onEditandoChange`: el abrir/cerrar se LEVANTA a esta
            fila (ver el porqué arriba) para que "✎ Corregir" abra, en el
            mismo gesto, también estatus/fecha/sala más abajo — no serían tres
            aperturas independientes, es UN editor completo. */}
        {editar ? (
          <EditarAcuerdo
            acuerdoId={acuerdo.id}
            queInicial={acuerdo.que}
            responsableInicial={acuerdo.responsable}
            personas={personas ?? []}
            equipos={equipos}
            siempreVisible
            editarAction={editar}
            editando={editando}
            onEditandoChange={setEditando}
          />
        ) : (
          <p className={estilos.que}>{acuerdo.que}</p>
        )}
        <div className={estilos.meta}>
          {/* EN REPOSO, LA SALA ES UN ENLACE — como toda esta franja de meta.
              Antes de este ajuste el `<select>` de mover de sala vivía AQUÍ,
              sustituyendo al enlace siempre que llegaba `moverDeSala`: medido
              por la revisión, eso —sumado a estatus/fecha sueltos en
              `filaDcha`, más abajo— le costaba a esta columna ~225px en TODAS
              las filas (de ~700 a ~475), para todo el que puede editar. La
              fila se CONSULTA a diario y se corrige de vez en cuando —la
              misma regla de la ronda 12 que ya pagó este repo con el
              arrastre—, así que el peso de "corregir" no puede vivir en el
              estado de reposo. El `<select>` se mudó dentro del editor
              completo, más abajo. */}
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

        {/* EL EDITOR COMPLETO: estatus, fecha, sala y eliminar, detrás del
            MISMO "✎ Corregir" que abre texto/responsable arriba —comparten
            `editando`—. Antes vivían sueltos y siempre visibles (estatus+
            fecha+eliminar en `filaDcha`, sala en `.meta`); ahora solo se
            pintan cuando se pidió corregir, de propósito: mover de sala deja
            de ser un `onChange` que cualquier roce dispara, y pasa a ser un
            gesto deliberado (abrir el editor primero) — sin inventar una
            confirmación nueva que igualaría mover con borrar (ver la
            cabecera del `<select>`, más abajo, sobre por qué NO se pide
            confirmación aun así). */}
        {editando && (cambiarEstatus || moverDeSala) && (
          <div className={estilos.edicionExtra}>
            {/* ESTATUS, FECHA Y ELIMINAR, JUNTOS EN `AcuerdoControles` — el
                mismo componente que ya usa la sala
                (`src/app/cliente/[slug]/page.tsx`), no uno nuevo: es la
                lección de `EditarAcuerdo`, repetida. `eliminar` pasa
                derecho, y `AcuerdoControles` ya sabe no pintar su × cuando no
                llega. Se monta solo si llegan las DOS acciones que necesita
                de verdad —estatus y fecha—: en la práctica `eliminar` nunca
                llega sin ellas (`esAdmin()` implica `esEditor()`, ver
                src/auth/roles.ts), así que esta condición no le quita el
                botón de borrar a nadie que deba tenerlo. */}
            {cambiarEstatus && editarFecha && (
              <AcuerdoControles
                acuerdoId={acuerdo.id}
                estatusInicial={acuerdo.estatus}
                fechaInicial={acuerdo.fechaCompromiso ?? null}
                cambiarEstatusAction={cambiarEstatus}
                editarFechaAction={editarFecha}
                eliminarAction={eliminar}
              />
            )}
            {/* MOVER DE SALA (tarea 3, ronda 14): un acuerdo capturado bajo
                el cliente equivocado solo se corregía borrándolo y creándolo
                de nuevo —perdía origen e historia—.

                SIN CONFIRMACIÓN, a propósito, y no por descuido: la app
                reserva la confirmación en dos tiempos para lo IRREVERSIBLE —
                ver el comentario de `AcuerdoControles` sobre borrar—, y
                mueve en el acto lo reversible (el `<select>` de estatus, dos
                líneas arriba, también dispara al cambiar sin preguntar).
                Mover un acuerdo se deshace moviéndolo de vuelta y queda
                registrado en `historia` (`moverAcuerdoDeSala`,
                src/db/acuerdos.ts) — **salvo cuando el ORIGEN era una sala
                PAUSADA**: `salas` (prop) solo ofrece destinos VIVOS, así que
                en cuanto un congelado se mueve a una sala viva, la pausada de
                la que salió ya no vuelve a estar entre las opciones de
                ningún `<select>`. La vuelta atrás en ESE caso concreto es
                manual (por base, o pidiendo a un admin que reactive la sala
                antes). Y no es un movimiento inocuo para un congelado en
                ningún caso: sacarlo de una sala en pausa lo DESCONGELA en el
                acto —`estatusEfectivo` (src/db/consultas.ts) recalcula con
                la sala nueva (VIVA), así que un `abierto` con fecha ya
                pasada puede aparecer `vencido` de inmediato y volver a
                contar en el Home—. Ponerle confirmación de todos modos
                igualaría mover con borrar y desdibujaría una distinción que
                la app defiende a propósito; en vez de eso, se pidió que
                abrir el editor fuera ya el gesto deliberado (este bloque
                entero solo se pinta tras pulsar "Corregir"). */}
            {moverDeSala && (
              <label className={estilos.edicionSalaEtiqueta}>
                <span className="micro" data-sinpunto>Sala</span>
                <select
                  key={`${acuerdo.salaSlug}-${intentoSala}`}
                  className={estilos.selectSala}
                  aria-label={`Sala del acuerdo ${acuerdo.que}`}
                  defaultValue={acuerdo.salaSlug}
                  disabled={pendienteSala}
                  onChange={(e) => {
                    const destino = e.target.value
                    setErrorSala(null)
                    empezarSala(async () => {
                      const r = await moverDeSala(acuerdo.id, destino)
                      if (r.error) {
                        setErrorSala(r.error)
                        setIntentoSala((n) => n + 1)
                      }
                    })
                  }}
                >
                  {opcionesSala.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.nombre}</option>
                  ))}
                </select>
              </label>
            )}
            {errorSala && <p className={estilos.errorSala} role="alert">{errorSala}</p>}
          </div>
        )}
      </div>

      <div className={estilos.filaDcha}>
        <span className="pildora" data-tono={congelado ? undefined : TONO_ESTATUS[acuerdo.estatus]}>
          {congelado ? 'Congelado' : ETIQUETA_ESTATUS[acuerdo.estatus]}
        </span>
        <Estrella acuerdoId={acuerdo.id} destacado={acuerdo.destacado} destacar={destacar} />
      </div>
    </li>
  )
}
