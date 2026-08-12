'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AcuerdoConSala, EstatusAcuerdo } from '@/db/consultas'
import { fechaBreve } from '@/lib/fecha'
import { Estrella } from '@/componentes/acuerdos/Estrella'
import { Seccion } from '@/componentes/Seccion'
import estilos from '@/app/hub.module.css'
import { FilaAcuerdo } from '@/componentes/acuerdos/FilaAcuerdo'

/**
 * Acuerdos y pendientes, dentro del Home y EDITABLES ahí mismo.
 *
 * Antes era una sola lista de "en riesgo" (vencidos + sin fecha). Ahora son
 * DOS preguntas distintas, con la estrella de la tarea 11 como bisagra entre
 * ellas (tarea 12):
 *
 * - Destacados: lo que el equipo decidió que vale la pena tener a la vista,
 *   cruzando las diez salas — sea cual sea su estatus. Es curaduría, no un
 *   cálculo.
 * - Vencidos: lo que objetivamente se pasó de fecha. No hace falta
 *   destacarlo para que aparezca aquí; es la señal que no se cura, se
 *   resuelve. (Una sala en freeze no aporta nada a este bloque — sus
 *   acuerdos están congelados, no vencidos: ver `estatusEfectivo`.)
 *
 * SOLAPAMIENTO (crítico de la auditoría UX/UI, ronda 11): `destacados` y
 * `vencidos` llegan como dos filtros INDEPENDIENTES sobre la misma lista
 * (`src/app/page.tsx`, `todosLosAcuerdos()`) y a propósito no son
 * excluyentes — cada uno contesta su propia pregunta completa ("todo lo
 * destacado", "todo lo vencido"), así que un acuerdo destacado que además
 * venció cumple los dos y llega aquí en las DOS listas. Hasta esta ronda
 * este componente lo pintaba entero en los dos bloques: mismo texto, misma
 * fecha, mismo botón, misma estrella.
 *
 * VENCIDOS MANDA — decisión de diseño, no accidente:
 * - Vencido es un hecho del calendario ("esto se pasó de fecha"); no deja de
 *   ser cierto porque alguien también lo haya destacado. Destacado es
 *   curaduría ("esto importa ahora"), una preferencia puesta a mano.
 * - La píldora roja de la cabecera, aquí abajo, cuenta sobre `vencidos` TAL
 *   CUAL llega, sin dedupear — si Destacados ganara el empate esa cuenta
 *   escondería acuerdos de verdad vencidos detrás de una curaduría manual, y
 *   es precisamente la cifra que Franco mira primero cada mañana.
 * - Nada se pierde: `Fila`, más abajo, ya pinta la estrella rellena cuando
 *   `acuerdo.destacado` es cierto y la píldora de fecha en rojo cuando
 *   `acuerdo.estatus` es 'vencido' — LAS DOS señales, sin importar en qué
 *   bloque caiga la fila. Un destacado que vence se sigue viendo destacado;
 *   solo cambia de vecindario, hacia el que se resuelve.
 *
 * LOS VACÍOS, que en este componente son la parte delicada: decir el texto
 * equivocado sobre un conjunto vacío ya pasó una vez aquí (una app recién
 * estrenada saludaba con "todo lo abierto tiene dueño y día"), y el test de
 * este archivo existe por eso.
 *
 * Destacados podía quedarse vacío por DOS motivos que no significan lo mismo
 * —"nadie ha destacado nada" y "lo único destacado venció y está abajo"— y
 * durante una ronda cada uno tuvo su frase. La segunda se retiró en la ronda
 * 12: era una nota al pie explicando la partición de esta misma tarjeta, y el
 * acuerdo en cuestión estaba dos centímetros más abajo con su estrella
 * dorada, diciéndolo sin gastar una línea. Ahora, en ese caso, el bloque
 * entero no se pinta (`hayDestacados`). Lo que sigue prohibido es lo de
 * siempre: decir "nada destacado todavía" habiéndolos.
 */

interface Props {
  destacados: AcuerdoConSala[]
  vencidos: AcuerdoConSala[]
  /**
   * Cuántos acuerdos hay EN TOTAL, de cualquier sala y estatus. Es el único
   * dato que distingue "todavía no hay ni uno" de "los hay, pero ninguno cae
   * en estos dos bloques" — los dos bloques pueden estar vacíos a la vez sin
   * que eso signifique que no hay nada.
   */
  total: number
  destacarAction: (id: string, destacado: boolean) => Promise<void>
  cambiarEstatusAction: (id: string, estatus: EstatusAcuerdo) => Promise<void>
  ponerFechaAction: (id: string, fecha: string | null) => Promise<void>
}

export function ModuloAcuerdos({
  destacados, vencidos, total, destacarAction, cambiarEstatusAction, ponerFechaAction,
}: Props) {
  if (total === 0) {
    return (
      <Seccion icono="acuerdos" titulo="Acuerdos y pendientes">
        <p className={estilos.moduloVacio}>
          Todavía no hay acuerdos. Se levantan en el espacio del cliente o al cerrar una minuta.
        </p>
      </Seccion>
    )
  }

  // EL MISMO ACUERDO SE PINTABA DOS VECES (crítico de la auditoría UX/UI,
  // ronda 11) — dedupe AQUÍ, al pintar, en vez de confiar en que quien arma
  // las dos listas (`src/app/page.tsx`) nunca las solape: es esta pantalla,
  // no la de origen, la que sabe qué significa "pintar" un acuerdo dos
  // veces. VENCIDOS MANDA (razonamiento completo arriba, en la cabecera del
  // archivo): un acuerdo presente en las dos listas se pinta SOLO en el
  // bloque de Vencidos.
  const idsVencidos = new Set(vencidos.map((a) => a.id))
  const destacadosSinVencer = destacados.filter((a) => !idsVencidos.has(a.id))
  // Cuántos destacados quedaron FUERA del bloque de arriba solo porque
  // vencieron — sin este número, un destacado vencido en solitario deja
  // "Destacados" vacío exactamente igual que "nadie destacó nada todavía", y
  // son dos mensajes distintos: uno invita a elegir algo, el otro señala
  // dónde mirar. Se deriva de `destacados` (no se pierde nada: ver arriba).
  const destacadosVencidos = destacados.length - destacadosSinVencer.length
  /**
   * SI EL BLOQUE «DESTACADOS» APARECE (ronda 12) — y con él, la partición en
   * dos que da sentido a los rótulos de abajo.
   *
   * Aparece cuando tiene algo que decir: filas destacadas que enseñar, o la
   * invitación a destacar la primera. NO aparece en el único caso en que
   * quedaría vacío por un tecnicismo —todo lo destacado venció y se fue al
   * otro bloque—, porque ahí lo que salía era una nota explicando la propia
   * partición de la pantalla, y el acuerdo estaba dos centímetros más abajo
   * con su estrella dorada puesta, diciendo lo mismo sin gastar una línea.
   */
  const hayDestacados = destacadosSinVencer.length > 0 || destacadosVencidos === 0

  return (
    <Seccion
      icono="acuerdos"
      titulo="Acuerdos y pendientes"
      /* La píldora ROJA y no el texto plano que usa la sala: es la cifra que
         se mira primero cada mañana, y el color es la mitad del mensaje. */
      conteo={
        vencidos.length > 0 && (
          <span className="pildora" data-tono="mal">
            {vencidos.length} vencido{vencidos.length > 1 ? 's' : ''}
          </span>
        )
      }
    >

      {/* UN BLOQUE QUE SE DISCULPA POR ESTAR VACÍO SOBRA (ronda 12).
          Cuando lo único destacado había vencido, aquí salía el rótulo
          "DESTACADOS" y debajo "El destacado está vencido: lo ves abajo, en
          Vencidos" — una nota al pie sobre la propia partición de la pantalla,
          en el sitio donde debería ir trabajo. Y sobraba: el acuerdo está dos
          centímetros más abajo, con SU ESTRELLA DORADA puesta, que es
          exactamente lo que la nota venía a explicar.
          El bloque solo aparece, entonces, cuando tiene algo que decir: filas
          destacadas, o la invitación a destacar la primera. Lo que NO puede
          volver a pasar es decir "nada destacado todavía" habiéndolos —esa
          frase mentiría, y es la razón de ser de esta partición—; ver el test
          de este componente, que lo sigue vigilando. */}
      {hayDestacados && (
        <div className={estilos.moduloBloque}>
          <h3 className={estilos.moduloSubtitulo}>Destacados</h3>
          {destacadosSinVencer.length === 0 ? (
            <p className={estilos.moduloVacio}>
              Nada destacado todavía.{' '}
              <Link href="/acuerdos" className={estilos.enlaceSuave}>Elegir en el espacio de acuerdos →</Link>
            </p>
          ) : (
            <ul className={estilos.acuerdos}>
              {destacadosSinVencer.map((a) => (
                <Fila
                  key={a.id}
                  acuerdo={a}
                  destacarAction={destacarAction}
                  cambiarEstatusAction={cambiarEstatusAction}
                  ponerFechaAction={ponerFechaAction}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={estilos.moduloBloque}>
        {/* El rótulo solo cuando hay DOS bloques que distinguir. Con
            Destacados fuera, "VENCIDOS" etiqueta la única lista de una tarjeta
            cuya cabecera ya dice "2 vencidos": la misma palabra tres veces en
            cuatro centímetros. */}
        {hayDestacados && <h3 className={estilos.moduloSubtitulo}>Vencidos</h3>}
        {vencidos.length === 0 ? (
          <p className={estilos.moduloVacio}>Todo lo abierto está en fecha.</p>
        ) : (
          <ul className={estilos.acuerdos}>
            {vencidos.map((a) => (
              <Fila
                key={a.id}
                acuerdo={a}
                destacarAction={destacarAction}
                cambiarEstatusAction={cambiarEstatusAction}
                ponerFechaAction={ponerFechaAction}
              />
            ))}
          </ul>
        )}
      </div>
    </Seccion>
  )
}

/**
 * LA MISMA FILA QUE LA SALA (ronda 12). Franco, dos veces: *"en el home es
 * otra versión"* y *"te dije que no es lo mismo que vemos en las salas"*.
 *
 * Y no lo era: aquí faltaban el punto de estado, la etiqueta de estatus y de
 * qué reunión salía el acuerdo, y la fecha era un botón que abría un selector.
 * Ahora la pinta `FilaAcuerdo` —el componente que se extrajo de la sala— y lo
 * único propio de esta pantalla son los controles de la derecha, que van como
 * `children`: aquí se alterna Cumplido/Reabrir y se pone fecha, porque es el
 * tablero desde el que se resuelve; en la sala se mueve el estatus con su
 * desplegable.
 */
function Fila({
  acuerdo,
  destacarAction,
  cambiarEstatusAction,
  ponerFechaAction,
}: {
  acuerdo: AcuerdoConSala
  destacarAction: Props['destacarAction']
  cambiarEstatusAction: Props['cambiarEstatusAction']
  ponerFechaAction: Props['ponerFechaAction']
}) {
  const [pendiente, empezar] = useTransition()
  const [editandoFecha, setEditandoFecha] = useState(false)

  return (
    <FilaAcuerdo
      acuerdo={acuerdo}
      // El Home cruza nueve salas: aquí SÍ hace falta decir de quién es.
      sala={{ slug: acuerdo.salaSlug, nombre: acuerdo.salaNombre, color: acuerdo.salaColor }}
      // El ancla de la reunión de origen, con la URL completa de SU sala: la
      // de la sala es local (`#r-<id>`) porque el acuerdo ya está allí.
      origen={
        acuerdo.reunionOrigenId && acuerdo.reunionOrigenFecha
          ? {
              href: `/cliente/${acuerdo.salaSlug}#r-${acuerdo.reunionOrigenId}`,
              fecha: acuerdo.reunionOrigenFecha,
            }
          : undefined
      }
    >
      <>
        {/* La fecha se pone AQUÍ. "Sin fecha" es la mitad de lo que pone a un
            acuerdo en riesgo, y resolverlo tiene que costar un clic. */}
        {editandoFecha ? (
          <input
            type="date"
            className={estilos.campoFecha}
            defaultValue={acuerdo.fechaCompromiso ?? ''}
            autoFocus
            disabled={pendiente}
            onBlur={(e) => {
              const v = e.target.value
              empezar(async () => {
                await ponerFechaAction(acuerdo.id, v || null)
                setEditandoFecha(false)
              })
            }}
          />
        ) : (
          <button
            type="button"
            className="pildora"
            data-tono={acuerdo.estatus === 'vencido' ? 'mal' : acuerdo.fechaCompromiso ? undefined : 'ojo'}
            onClick={() => setEditandoFecha(true)}
          >
            {acuerdo.fechaCompromiso ? fechaBreve(acuerdo.fechaCompromiso) : 'sin fecha'}
          </button>
        )}

        {/* MARCAR Y DESMARCAR, no solo marcar.
            Franco: *"aparece un acuerdo como cumplido y no recuerdo haberlo
            marcado… además no veo el botón"*. Al cumplirse, el botón
            desaparecía: era de ida y no de vuelta, así que un cumplido por
            error se quedaba cumplido para siempre desde esta pantalla —había
            que ir a la sala del cliente a buscar el desplegable de estatus.
            Toda acción que cambia un dato tiene que poder deshacerse donde se
            hizo. */}
        <button
          type="button"
          className="boton"
          data-tono="suave"
          disabled={pendiente}
          onClick={() => empezar(async () => {
            await cambiarEstatusAction(acuerdo.id, acuerdo.estatus === 'cumplido' ? 'abierto' : 'cumplido')
          })}
        >
          {pendiente ? '…' : acuerdo.estatus === 'cumplido' ? 'Reabrir' : 'Cumplido'}
        </button>

        <Estrella acuerdoId={acuerdo.id} destacado={acuerdo.destacado} destacar={destacarAction} />
      </>
    </FilaAcuerdo>
  )
}
