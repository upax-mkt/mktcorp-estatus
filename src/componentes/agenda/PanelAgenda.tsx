'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendario, type SesionEnCalendario } from './Calendario'
import { FormularioSesion, type DatosFormulario, type SalaElegible } from './FormularioSesion'
import { fechaCompleta, horaBreve, diaCivil } from '@/lib/fecha'
import estilos from '@/app/agenda/agenda.module.css'
// Para "Próximas" (ronda 11, tarea 4) — las mismas clases que ya usan "Por
// confirmar"/"Falta su minuta"/"Cerradas" en `/reuniones`, para el "mismo
// tratamiento" que pidió Franco — Y para la cabecera (título/subtítulo/
// "agendar"), subida aquí en el arreglo del hueco muerto de la auditoría
// UX/UI (ronda 11: ver el comentario de archivo, más abajo). `agenda.
// module.css` (arriba) se queda con el calendario y el formulario en sí,
// que no se tocan.
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
 *
 * AUDITORÍA UX/UI (ronda 11) — EL HUECO MUERTO Y POR QUÉ LA CABECERA VIVE
 * AQUÍ: con "Próximas" ya en el flujo (arriba), el <aside> de 22rem junto al
 * calendario se quedó con un solo botón —"+ Agendar una reunión"— y el
 * resto vacío: un tercio de la pantalla reservado para nada. El botón subió
 * a la cabecera de `/reuniones` (mismo sitio y misma pinta que "+ Nueva
 * reunión" en `/deck` — ver `.encabezado`/`.boton`/`.botonAcento` en
 * `reuniones.module.css`, copiadas letra por letra de `deck.module.css`).
 * Esa cabecera —título, subtítulo y el botón— la pinta ESTE componente y no
 * `page.tsx` (que sigue siendo Server Component, sin hooks): el botón y el
 * calendario comparten el mismo estado (`agendando`/`editando`), así que los
 * dos tienen que vivir del mismo lado del límite cliente/servidor —
 * separarlos habría exigido duplicar ese estado en dos componentes, con el
 * riesgo de que se desincronicen. `titulo`/`subtitulo` llegan como prop
 * opcionales con la copia real de `/reuniones` como default (este componente
 * es de un solo uso): así seguía habiendo un solo lugar con el texto, sin
 * forzar a cada test de este archivo a repetirlo.
 *
 * El <aside> de 22rem (calendario + formulario lado a lado) SOLO existe
 * mientras `agendando`/`editando` sea verdad — `data-activo` en `.panel`,
 * ver su comentario en `agenda.module.css`. En reposo el panel es de una
 * sola columna, con el calendario capado a su ancho de siempre (56rem):
 * nunca se estiró a los 79rem completos de `.main` —eso hubiera dejado
 * celdas de calendario enormes y vacías la mayoría de los días del mes, el
 * mismo defecto que el hueco muerto, solo que adentro— y por eso el arreglo
 * fue soltar la columna vacía, no ensanchar el cuadro.
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
  /**
   * Qué clase de junta es (`src/secciones/plantillas.ts`) — `null` cuando la
   * reunión no tiene clase (las 6 reales sin clasificar). AÑADIDO EN EL
   * ARREGLO DEL CRÍTICO C2 (ronda 14-2, fix 3/4): sin este campo, el
   * `inicial={{...}}` de "Editar" (más abajo) no podía distinguir "esta
   * junta no tiene clase" de "no sé qué clase tiene" — y `plantillaInicial`
   * (`FormularioSesion.tsx`), que usa el operador `in` para esa misma
   * distinción, caía SIEMPRE al valor por defecto del catálogo
   * (`PLANTILLA_POR_DEFECTO`) por falta de la clave, sin importar la clase
   * real de la reunión. `string | null`, no opcional: `page.tsx` (`paraElPanel`)
   * siempre la manda, normalizada con `?? null` desde el campo opcional de
   * `ReunionResumen` — mismo criterio que `lugar`, dos líneas abajo.
   */
  plantilla: string | null
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
  /**
   * Título y subtítulo de la cabecera (auditoría UX/UI, ronda 11) —
   * opcionales, con la copia real de `/reuniones` como default: ver el
   * comentario de archivo, arriba, para el porqué la cabecera se pinta aquí
   * y no en `page.tsx`. Quedan como prop (no texto fijo) para que
   * `PanelAgenda.test.tsx` no tenga que repetirlos en cada `render(...)`.
   */
  titulo?: string
  subtitulo?: string
}

const TITULO_POR_DEFECTO = 'Reuniones'
const SUBTITULO_POR_DEFECTO =
  'El calendario del mes, agendar rápido, y las próximas — más el ciclo completo de las que ya pasaron su día: por confirmar, con la minuta pendiente, y cerradas.'

export function PanelAgenda({
  sesiones, salas, hoy, idsProximas, agendarAction, editarAction,
  titulo = TITULO_POR_DEFECTO, subtitulo = SUBTITULO_POR_DEFECTO,
}: Props) {
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

  // Un solo booleano para las dos cosas que dependen de "¿hay formulario
  // abierto?": el atributo `data-activo` de `.panel` (agenda.module.css,
  // decide si el calendario comparte fila con el lateral) y si el <aside>
  // existe siquiera. `agendando`/`editando` no bastan cada uno por su cuenta
  // porque son mutuamente excluyentes, no una OR ya calculada.
  const formularioAbierto = Boolean(agendando || editando)

  return (
    <>
      {/* CABECERA: ver el comentario de archivo, arriba, para el porqué vive
          aquí (mismo estado que el calendario/formulario) y no en
          `page.tsx`. */}
      <div className={estilosCiclo.encabezado}>
        <div>
          <h1 className={estilosCiclo.titulo}>{titulo}</h1>
          <p className={estilosCiclo.subtitulo}>{subtitulo}</p>
        </div>
        <button
          type="button"
          className={`${estilosCiclo.boton} ${estilosCiclo.botonAcento}`}
          onClick={() => {
            setEditando(null)
            setAgendando({})
          }}
        >
          + Agendar una reunión
        </button>
      </div>

      <div className={estilos.panel} data-activo={formularioAbierto ? 'true' : undefined}>
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

        {/* El <aside> SOLO existe con formulario abierto (ver el comentario
            de archivo): sin él, esta columna no tiene nada que mostrar —el
            botón que solía vivir aquí subió a la cabecera— y reservarle
            22rem vacíos es justo el hueco que esta ronda vino a cerrar. */}
        {formularioAbierto && (
          <aside className={estilos.lateral}>
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
                    // CRÍTICO C2 (ronda 14-2, fix 3/4): faltaba esta línea.
                    // `editando.plantilla` YA es `string | null` (nunca
                    // `undefined` — ver el comentario de `SesionAgendada`,
                    // arriba), así que se pasa TAL CUAL: la prop `inicial`
                    // de `FormularioSesion` acepta `plantilla?: string | null`
                    // justo para poder distinguir "vino `null`" (sin clase,
                    // se respeta) de "no vino la clave" (reunión nueva, cae
                    // al default) — ver `plantillaInicial`, en ese archivo.
                    // Ponerla aquí, aunque sea `null`, es lo que hace que la
                    // clave SIEMPRE "venga".
                    plantilla: editando.plantilla,
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
          </aside>
        )}
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
