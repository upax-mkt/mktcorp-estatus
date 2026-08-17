import type { DecisionSlide } from '@/decision/esquema'
import type { Acuerdo } from '@/db/consultas'
import type { Tema } from '@/temas/tipos'
import type { PersonaMonday } from '@/monday/personas'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { SeccionDocumento, anclaDeSeccion } from './SeccionDocumento'
import { papelDe } from '@/secciones/catalogo'
import { ModoPresentar } from './ModoPresentar'
import { fechaBreve } from '@/lib/fecha'
import estilos from './documento.module.css'
import estilosAcuerdos from './acuerdos-vivos.module.css'

export interface SeccionSesion {
  decision: DecisionSlide
  degradado?: boolean
  motivo?: string
}

interface Props {
  tema: Tema
  secciones: SeccionSesion[]
  /**
   * Acuerdos de la sala TAL COMO ESTÁN HOY. No son una copia congelada del día
   * de la sesión: es la diferencia de fondo con un archivo de PowerPoint, que
   * envejece desde el momento en que se exporta.
   */
  acuerdos: Acuerdo[]
  encabezado?: React.ReactNode
  /** De qué reunión es. Lo necesita el modo presentación para poder minutarla. */
  reunionId?: string
  /** Si quien mira es del equipo: solo el equipo levanta el acta. */
  equipo?: boolean
  /** La gente viva de Mkt Corp, para el selector de responsable del modo presentación. */
  personas: PersonaMonday[]
  /** Ver `ModoPresentar` — registra quién abrió el modo presentación (ronda 9, tarea 4). */
  registrarPresentacionAction?: (reunionId: string) => Promise<void>
  /**
   * El logo de la sala subido desde `/salas` (revisión final de la rama,
   * punto 3) — se pasa a `ProveedorTema` para la portada. `undefined`/`null`
   * (una reunión sin sala, o una de las nueve reales que aún no ha subido el
   * suyo) cae al archivo estático de siempre.
   */
  logoUrl?: string | null
}

const ETIQUETA: Record<Acuerdo['estatus'], string> = {
  abierto: 'abierto',
  cumplido: 'cumplido',
  vencido: 'vencido',
}

export function DocumentoSesion({
  tema, secciones, acuerdos, encabezado, reunionId, equipo, personas, logoUrl, registrarPresentacionAction,
}: Props) {
  // El índice se arma con las secciones que tienen entidad propia: la portada
  // es el encabezado del documento, el cierre es el final —no un destino al
  // que saltar— y el propio índice no se lista a sí mismo.
  //
  // Los divisores SÍ entran: son los bloques de la sesión, y saltar a
  // "Outbound & pipeline" es lo que alguien quiere hacer desde aquí. Pero un
  // divisor cuyo título REPITE el de la sección que le sigue se salta: la
  // agenda enseñaba dos veces la misma línea, con dos anclas distintas, en la
  // primera página que lee un director.
  const indiceGeneral = secciones
    .map((s, i) => ({
      titulo: s.decision.titulo,
      ancla: anclaDeSeccion(i),
      layout: s.decision.layout,
      repiteALaSiguiente:
        papelDe(s.decision.layout) === 'hito' &&
        secciones[i + 1]?.decision.titulo.trim().toLowerCase() === s.decision.titulo.trim().toLowerCase(),
    }))
    .filter(
      (e) =>
        e.layout !== 'portada' &&
        e.layout !== 'cierre' &&
        papelDe(e.layout) !== 'indice' &&
        !e.repiteALaSiguiente,
    )

  return (
    <ProveedorTema tema={tema} superficie="clara" logoUrl={logoUrl}>
      <ModoPresentar
        reunionId={reunionId}
        equipo={equipo}
        personas={personas}
        registrarPresentacionAction={registrarPresentacionAction}
      >
        <div className={estilos.documento}>
          <div className={estilos.contenido}>
            {encabezado}

            {secciones.map((seccion, i) => (
              <SeccionDocumento
                key={`${seccion.decision.layout}-${i}`}
                decision={seccion.decision}
                indice={i}
                indice_general={
                  acuerdos.length > 0
                    ? [...indiceGeneral, { titulo: 'Acuerdos', ancla: 'acuerdos-vivos' }]
                    : indiceGeneral
                }
                degradado={seccion.degradado}
                motivo={seccion.motivo}
                // Solo para decidir quién ve el aviso de "requiere revisión":
                // es control de calidad de Mkt Corp, no algo que un director
                // deba encontrarse en su estatus. Ver la nota en SeccionDocumento.
                equipo={equipo}
              />
            ))}

            {/* Los acuerdos son la única sección VIVA del documento y no
                estaban en el índice: la agenda listaba los divisores vacíos y
                omitía esto. */}
            {acuerdos.length > 0 && (
              <section
                id="acuerdos-vivos"
                className={estilos.seccion}
                data-layout="acuerdos-vivos"
                aria-label="Acuerdos"
              >
                <h2 className={estilos.titulo}>Acuerdos</h2>
                <p className={estilos.subtitulo}>
                  Estado de hoy, no del día de la reunión: si alguien mueve un acuerdo, esta página
                  cambia sola.
                </p>

                <ul className={estilosAcuerdos.lista}>
                  {acuerdos.map((a) => (
                    <li key={a.id} className={estilosAcuerdos.item} data-estatus={a.estatus}>
                      <span className={estilosAcuerdos.punto} aria-hidden="true" />
                      <div className={estilosAcuerdos.texto}>
                        <span className={estilosAcuerdos.que}>{a.que}</span>
                        <span className={estilosAcuerdos.meta}>
                          {a.responsable === 'por asignar' ? 'sin dueño' : a.responsable}
                          {a.squad && ` · ${a.squad}`}
                          {' · '}
                          {a.fechaCompromiso ? fechaBreve(a.fechaCompromiso) : 'sin fecha'}
                        </span>
                      </div>
                      <span className={estilosAcuerdos.estado}>{ETIQUETA[a.estatus]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </ModoPresentar>
    </ProveedorTema>
  )
}
