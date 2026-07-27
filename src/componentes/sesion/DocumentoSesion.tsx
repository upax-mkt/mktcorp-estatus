import type { DecisionSlide } from '@/decision/esquema'
import type { Acuerdo } from '@/db/consultas'
import type { Tema } from '@/temas/tipos'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import { SeccionDocumento, anclaDeSeccion } from './SeccionDocumento'
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
}

const ETIQUETA: Record<Acuerdo['estatus'], string> = {
  abierto: 'abierto',
  cumplido: 'cumplido',
  vencido: 'vencido',
}

export function DocumentoSesion({ tema, secciones, acuerdos, encabezado }: Props) {
  // El índice se arma con las secciones que tienen entidad propia: la portada
  // es el encabezado del documento y el propio índice no se lista a sí mismo.
  const indiceGeneral = secciones
    .map((s, i) => ({ titulo: s.decision.titulo, ancla: anclaDeSeccion(i), layout: s.decision.layout }))
    .filter((e) => e.layout !== 'portada' && e.layout !== 'agenda')

  return (
    <ProveedorTema tema={tema} superficie="clara">
      <ModoPresentar>
        <div className={estilos.documento}>
          <div className={estilos.contenido}>
            {encabezado}

            {secciones.map((seccion, i) => (
              <SeccionDocumento
                key={`${seccion.decision.layout}-${i}`}
                decision={seccion.decision}
                indice={i}
                indice_general={indiceGeneral}
                degradado={seccion.degradado}
                motivo={seccion.motivo}
              />
            ))}

            {acuerdos.length > 0 && (
              <section
                id="acuerdos-vivos"
                className={estilos.seccion}
                data-layout="acuerdos-vivos"
                aria-label="Acuerdos"
              >
                <h2 className={estilos.titulo}>Acuerdos</h2>
                <p className={estilos.subtitulo}>
                  Estado de hoy, no del día de la sesión: si alguien mueve un acuerdo, esta página
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
