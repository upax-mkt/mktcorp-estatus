import { resumirParticipacion, type Participante } from '@/db/participacion'
import estilos from '@/app/deck/deck.module.css'

interface Props {
  participantes: Participante[]
}

/**
 * «Prepararon: Iris, César · Presentó: Iris» — y lo que este dato NO sabe.
 *
 * Franco: «así puedo ver quién de mis gerentes participó en el desarrollo de
 * la presentación». Pero lo que hay detrás es un contador de toques a la
 * base, no un pase de lista: no distingue quién habló, cuánto participó, ni
 * si estuvo atento — solo quién tocó el contenido y quién abrió el modo
 * presentación (ver `src/db/participacion.ts`). Decirlo aquí, en letra
 * pequeña y siempre que se pinta algo, es lo que separa esto de vender más de
 * lo que el dato sabe.
 *
 * Sin nadie que haya tocado la sesión todavía —una recién agendada, o una en
 * borrador que nadie ha guardado— no pinta nada: no hay de qué presumir ni
 * nada que aclarar.
 */
export function ParticipantesSesion({ participantes }: Props) {
  const { prepararon, presentaron } = resumirParticipacion(participantes)
  if (prepararon.length === 0 && presentaron.length === 0) return null

  const partes: string[] = []
  if (prepararon.length > 0) {
    partes.push(`${prepararon.length === 1 ? 'Preparó' : 'Prepararon'}: ${prepararon.join(', ')}`)
  }
  if (presentaron.length > 0) {
    partes.push(`${presentaron.length === 1 ? 'Presentó' : 'Presentaron'}: ${presentaron.join(', ')}`)
  }

  return (
    <div className={estilos.participacion}>
      <p className={estilos.participacionLinea}>{partes.join(' · ')}</p>
      <p className={estilos.participacionAviso}>
        Registra quién tocó la presentación y quién abrió el modo presentación — no quién habló,
        cuánto participó ni si estuvo atento.
      </p>
    </div>
  )
}
