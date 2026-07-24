import type { DecisionSlide } from '@/decision/esquema'
import estilos from '../deck.module.css'

/** "01", "02"... nunca un dígito solo, para que la columna de números quede alineada. */
function numeroDeOrden(indice: number): string {
  return String(indice + 1).padStart(2, '0')
}

export function Agenda({ decision }: { decision: DecisionSlide }) {
  return (
    <section
      className={estilos.slide}
      data-layout="agenda"
      role="region"
      aria-label={decision.titulo}
    >
      <h2 className={estilos.titulo}>{decision.titulo}</h2>
      {decision.cuerpo && (
        <ol className={estilos.agendaLista}>
          {decision.cuerpo.map((punto, indice) => (
            // La clave usa el índice: el punto es texto de negocio libre, sin
            // garantía de unicidad entre renglones de la agenda.
            <li key={`agenda-${indice}`} className={estilos.agendaItem}>
              <span className={estilos.agendaNumero} aria-hidden="true">{numeroDeOrden(indice)}</span>
              <span className={estilos.agendaTexto}>{punto}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
