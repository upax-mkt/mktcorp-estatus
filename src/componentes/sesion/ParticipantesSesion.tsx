import { resumirParticipacion, type Participante } from '@/db/participacion'
import estilos from '@/app/deck/deck.module.css'

interface Props {
  participantes: Participante[]
}

/**
 * «Cargada por: Iris, César» — un crédito simple, no un reporte de asistencia.
 *
 * Franco, sobre el mensaje que vivía aquí ("Registra quién tocó la
 * presentación y quién abrió el modo presentación — no quién habló, cuánto
 * participó ni si estuvo atento"): "ELIMÍNALO, solo deja una leyenda 'Cargada
 * por: PERSONA'" — explicaba una preocupación que nadie tenía (ronda 11,
 * tarea 3, paso 2). Se fue el aviso Y la distinción "Preparó/Prepararon ·
 * Presentó/Presentaron": queda una sola línea de autoría, sin conjugar verbo
 * alguno (por eso "Cargada por" sirve igual para uno que para varios).
 *
 * `prepararon`, no `presentaron`: quien tocó el CONTENIDO (`ediciones > 0` en
 * `resumirParticipacion`, `src/db/participacion.ts`) es quien de verdad
 * "cargó" la presentación. Presentar —abrir el modo presentación— no es
 * cargar, aunque lo haga la misma persona: mismo criterio que ya separaba
 * `resumirParticipacion`, ahora también en lo que se pinta.
 *
 * Sin nadie que haya tocado el contenido todavía —una recién agendada, o una
 * en borrador que nadie ha guardado— no pinta nada: no hay de quién dar
 * crédito.
 */
export function ParticipantesSesion({ participantes }: Props) {
  const { prepararon } = resumirParticipacion(participantes)
  if (prepararon.length === 0) return null

  return (
    <div className={estilos.participacion}>
      <p className={estilos.participacionLinea}>Cargada por: {prepararon.join(', ')}</p>
    </div>
  )
}
