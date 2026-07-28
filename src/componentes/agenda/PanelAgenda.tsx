'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendario, type SesionEnCalendario } from './Calendario'
import { FormularioSesion, type DatosFormulario, type SalaElegible } from './FormularioSesion'
import { fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import estilos from '@/app/agenda/agenda.module.css'

/**
 * La agenda del equipo: el mes en cuadro y lo que viene en lista.
 *
 * Las dos vistas miran las mismas sesiones porque responden a preguntas
 * distintas: el cuadro contesta "¿cómo viene el mes?" y la lista, "¿qué es lo
 * siguiente y quién va?". Con solo una de las dos, media pregunta se contesta
 * contando cuadraditos.
 */

export interface SesionAgendada extends SesionEnCalendario {
  alcance: string
  tipo: 'semanal' | 'mensual'
  lugar: string | null
  participantes: string[]
  itemsLlenados: number
  totalItems: number
}

interface Props {
  sesiones: SesionAgendada[]
  salas: SalaElegible[]
  hoy: string
  agendarAction: (datos: DatosFormulario) => Promise<{ error?: string }>
  editarAction: (id: string, datos: DatosFormulario) => Promise<{ error?: string }>
}

const ETIQUETA_ESTADO: Record<string, string> = {
  agendada: 'agendada',
  borrador: 'preparándose',
  lista: 'lista para presentar',
  presentada: 'ya se dio',
  minutada: 'minutada',
}

export function PanelAgenda({ sesiones, salas, hoy, agendarAction, editarAction }: Props) {
  const router = useRouter()
  const [agendando, setAgendando] = useState<{ dia?: string } | null>(null)
  const [editando, setEditando] = useState<SesionAgendada | null>(null)
  // El mes que enseña el calendario. Cambia al agendar: si no, se agenda algo
  // para agosto, se cierra el formulario y el cuadro sigue en julio como si
  // no hubiera pasado nada. Se aplica remontando el calendario con `key`,
  // que es cómo se reinicia estado en React sin un efecto que lo sincronice.
  const [mesFoco, setMesFoco] = useState<string | null>(null)

  // Lo que todavía no ha pasado, lo primero arriba. Una sesión ya presentada
  // NO es "lo que viene" aunque sea de hoy: su sitio es la sala de su UDN.
  const proximas = sesiones
    .filter((s) => s.estado !== 'presentada' && s.estado !== 'minutada')
    .filter((s) => diaCivil(s.fecha) >= diaCivil(hoy))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  function cerrar() {
    setAgendando(null)
    setEditando(null)
    router.refresh()
  }

  return (
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
              {editando ? 'Corregir la sesión' : 'Agendar una sesión'}
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
            + Agendar una sesión
          </button>
        )}

        <section>
          <h2 className={estilos.lateralTitulo}>
            Lo que viene
            <span className={estilos.conteo}>{proximas.length}</span>
          </h2>

          {proximas.length === 0 ? (
            <p className={estilos.vacio}>
              No hay ninguna sesión agendada. Elige un día en el calendario para poner la primera.
            </p>
          ) : (
            <ul className={estilos.proximas}>
              {proximas.map((s) => (
                <li
                  key={s.id}
                  className={estilos.proxima}
                  style={{ '--sala': s.salaColor } as React.CSSProperties}
                >
                  <div className={estilos.proximaCabecera}>
                    <span className={estilos.proximaSala}>{s.salaNombre}</span>
                    <span className={estilos.proximaEstado} data-estado={s.estado}>
                      {ETIQUETA_ESTADO[s.estado] ?? s.estado}
                    </span>
                  </div>
                  <div className={estilos.proximaTitulo}>{s.titulo}</div>
                  <div className={estilos.proximaCuando}>
                    {fechaCompleta(s.fecha)} · {horaBreve(s.fecha)}
                    {s.lugar && <> · {s.lugar}</>}
                  </div>
                  {s.participantes.length > 0 && (
                    <div className={estilos.proximaGente}>{s.participantes.join(' · ')}</div>
                  )}
                  {s.estado === 'borrador' && s.totalItems > 0 && (
                    <div className={estilos.proximaAvance}>
                      {s.itemsLlenados} de {s.totalItems} secciones escritas
                    </div>
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
                    <Link href={`/preparar/${s.id}`} className={estilos.proximaEnlace}>
                      Preparar →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}
