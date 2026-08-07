'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendario, type SesionEnCalendario } from './Calendario'
import { FormularioSesion, type DatosFormulario, type SalaElegible } from './FormularioSesion'
import { fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import estilos from '@/app/agenda/agenda.module.css'
// Solo para "Próximas" (ronda 11, tarea 4) — las mismas clases que ya usan
// "Por confirmar"/"Falta su minuta"/"Cerradas" en `/reuniones`, para el
// "mismo tratamiento" que pidió Franco. `agenda.module.css` (arriba) se
// queda para el calendario y "agendar", que no se tocan.
import estilosCiclo from '@/app/reuniones/reuniones.module.css'

/**
 * El mes en cuadro, "agendar" y "Próximas" — el calendario y sus preguntas
 * de lo que sigue.
 *
 * RONDA 10: mudado TAL CUAL desde la vieja `/agenda`, sin rediseñar. RONDA
 * 11, TAREA 4: "Lo que viene" —ahora "Próximas"— bajó de un panel lateral de
 * 22rem (al lado del calendario) a una sección de ancho completo, debajo de
 * él, con el mismo tratamiento visual que el resto del ciclo en
 * `/reuniones`. Franco, el 6-ago: "en la pestaña Reuniones 'lo que viene'
 * déjalo abajo del calendario al igual que las otras listas, se desarma todo
 * cuando hay muchas" — el panel lateral solo crecía hacia abajo sin límite
 * de ancho, así que con volumen real se desbordaba.
 *
 * "Próximas" SIGUE viviendo aquí (no se movió a `page.tsx`): aquí es donde
 * vive "editar" una reunión ya agendada —mismo estado, mismo formulario que
 * "agendar"— y sacarla de este componente habría exigido un componente
 * cliente nuevo solo para conservar esa capacidad. Lo que SÍ se movió es DE
 * DÓNDE sale la lista de ids: antes este componente filtraba `sesiones` por
 * su cuenta (`estado !== 'dada' && fecha >= hoy`); ahora recibe `idsProximas`
 * YA RESUELTO por `cicloDeReuniones` (`src/app/reuniones/page.tsx`), que
 * excluye lo que ya se quedó en "por confirmar"/"falta su minuta"/"cerradas"
 * — cerrando el solape que existía cuando una reunión de HOY, con
 * presentación lista pero sin confirmar, contaba a la vez como "próxima" y
 * como "falta su minuta". Este componente solo CRUZA esos ids contra su
 * propio `sesiones` (que sigue llegando COMPLETO, sin filtrar: el calendario
 * necesita verlas todas) para pintar cada fila con sus datos completos —no
 * vuelve a decidir quién es "próxima", solo la pinta.
 */

export interface SesionAgendada extends SesionEnCalendario {
  alcance: string
  /**
   * `TipoReunion` (`@/db/reuniones`) admite `'quincenal'` desde antes de esta
   * tarea (Research Land ya es quincenal) — este tipo se ensancha para
   * poder recibir esas reuniones sin reventar, aunque `FormularioSesion` de
   * abajo todavía no ofrezca la opción en su formulario ("Quincenal en la
   * interfaz" es trabajo de otra tarea, fuera de esta migración).
   */
  tipo: 'semanal' | 'quincenal' | 'mensual'
  lugar: string | null
  participantes: string[]
  itemsLlenados: number
  totalItems: number
}

interface Props {
  /** TODAS las reuniones, sin filtrar — el calendario del mes las necesita todas. */
  sesiones: SesionAgendada[]
  salas: SalaElegible[]
  hoy: string
  /**
   * Los ids que le tocan a "Próximas" (ronda 11, tarea 4), YA resueltos y en
   * orden (la más próxima primero) por `cicloDeReuniones`
   * (`src/app/reuniones/page.tsx`) — ahí se explica por qué el cálculo no
   * puede vivir aquí adentro sin repetir el mismo solape que ya cerraron
   * "falta su minuta"/"cerradas" contra "por confirmar".
   */
  idsProximas: string[]
  agendarAction: (datos: DatosFormulario) => Promise<{ error?: string }>
  editarAction: (id: string, datos: DatosFormulario) => Promise<{ error?: string }>
}

export function PanelAgenda({ sesiones, salas, hoy, idsProximas, agendarAction, editarAction }: Props) {
  const router = useRouter()
  const [agendando, setAgendando] = useState<{ dia?: string } | null>(null)
  const [editando, setEditando] = useState<SesionAgendada | null>(null)
  // El mes que enseña el calendario. Cambia al agendar: si no, se agenda algo
  // para agosto, se cierra el formulario y el cuadro sigue en julio como si
  // no hubiera pasado nada. Se aplica remontando el calendario con `key`,
  // que es cómo se reinicia estado en React sin un efecto que lo sincronice.
  const [mesFoco, setMesFoco] = useState<string | null>(null)

  // "Próximas" (ronda 11, tarea 4): `idsProximas` ya llega deduplicado y en
  // orden desde `cicloDeReuniones` — aquí solo se cruza contra `sesiones`
  // (por id, en un Map para no ser O(n²) con volumen) para recuperar los
  // datos completos de cada fila. El `.filter` final descarta un id que no
  // aparezca en `sesiones` en vez de reventar: no debería pasar en
  // producción (las dos listas salen de la misma consulta, en `page.tsx`),
  // pero un componente de UI no es el lugar para lanzar si pasa.
  const porId = new Map(sesiones.map((s) => [s.id, s]))
  const proximas = idsProximas
    .map((id) => porId.get(id))
    .filter((s): s is SesionAgendada => s != null)

  function cerrar() {
    setAgendando(null)
    setEditando(null)
    router.refresh()
  }

  return (
    <>
      <div className={estilos.panel}>
        <Calendario
          key={mesFoco ?? 'hoy'}
          sesiones={sesiones}
          hoy={hoy}
          mesInicial={mesFoco}
          alElegirDia={(dia) => {
            setEditando(null)
            setAgendando({ dia })
          }}
        />

        <aside className={estilos.lateral}>
          {agendando || editando ? (
            <section className={estilos.tarjetaFormulario}>
              <h2 className={estilos.lateralTitulo}>
                {editando ? 'Corregir la reunión' : 'Agendar una reunión'}
              </h2>
              {editando ? (
                <FormularioSesion
                  salas={salas}
                  etiquetaEnviar="Guardar cambios"
                  inicial={{
                    salaSlug: editando.salaSlug ?? '',
                    titulo: editando.titulo,
                    dia: diaCivil(editando.fecha),
                    hora: horaBreve(editando.fecha),
                    tipo: editando.tipo,
                    alcance: editando.alcance,
                    lugar: editando.lugar ?? '',
                    participantes: editando.participantes.join(', '),
                  }}
                  enviarAction={async (datos) => {
                    const r = await editarAction(editando.id, datos)
                    if (!r.error) setMesFoco(datos.dia.slice(0, 7))
                    return r
                  }}
                  alTerminar={cerrar}
                  alCancelar={cerrar}
                />
              ) : (
                <FormularioSesion
                  salas={salas}
                  etiquetaEnviar="Agendar"
                  inicial={{ dia: agendando?.dia }}
                  enviarAction={async (datos) => {
                    const r = await agendarAction(datos)
                    if (!r.error) setMesFoco(datos.dia.slice(0, 7))
                    return r
                  }}
                  alTerminar={cerrar}
                  alCancelar={cerrar}
                />
              )}
            </section>
          ) : (
            <button
              type="button"
              className={estilos.botonAgendar}
              onClick={() => setAgendando({})}
            >
              + Agendar una reunión
            </button>
          )}
        </aside>
      </div>

      {/* PRÓXIMAS (ronda 11, tarea 4): antes "Lo que viene", dentro del
          <aside> de arriba — bajó a una sección de ancho completo, con el
          mismo tratamiento (`estilosCiclo`) que "Por confirmar"/"Falta su
          minuta"/"Cerradas" en `/reuniones`. `idsProximas` ya llega
          deduplicado (ver el comentario del archivo) — aquí solo se pinta. */}
      <section className={estilosCiclo.cicloSeccion}>
        <h2 className={estilosCiclo.cicloTitulo}>
          Próximas
          <span className={estilosCiclo.conteo}>{proximas.length}</span>
        </h2>

        {proximas.length === 0 ? (
          <p className={estilosCiclo.vacio}>
            No hay ninguna reunión agendada. Elige un día en el calendario para poner la primera.
          </p>
        ) : (
          <div className={estilosCiclo.listaCiclo}>
            {proximas.map((s) => (
              <div
                key={s.id}
                className={estilosCiclo.filaCiclo}
                style={{ '--sala': s.salaColor } as React.CSSProperties}
              >
                <span className={estilosCiclo.filaCicloTitulo}>{s.titulo}</span>
                <span className={estilosCiclo.filaCicloMeta}>
                  <span>{s.salaNombre}</span>
                  <span className={estilosCiclo.sep}>·</span>
                  <span>
                    {fechaCompleta(s.fecha)} · {horaBreve(s.fecha)}
                    {s.lugar && <> · {s.lugar}</>}
                  </span>
                </span>
                {/* Sin condición de estado: por construcción, todo lo que
                    llega aquí ya es "no dada" (lo resolvió `cicloDeReuniones`
                    antes de mandar `idsProximas`) — no hace falta distinguir
                    nada para decidir si se enseña el avance. */}
                {s.totalItems > 0 && (
                  <span className={estilos.proximaAvance}>
                    {s.itemsLlenados} de {s.totalItems} secciones escritas
                  </span>
                )}
                <div className={estilos.proximaAcciones}>
                  <button
                    type="button"
                    className={estilos.botonTexto}
                    onClick={() => {
                      setAgendando(null)
                      setEditando(s)
                    }}
                  >
                    Editar
                  </button>
                  <Link href={`/deck/${s.id}`} className={estilosCiclo.filaCicloAccion}>
                    Preparar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
