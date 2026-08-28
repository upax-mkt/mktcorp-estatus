import estilos from '@/app/concurso/concurso.module.css'
import type { Pase } from '@/concurso/pase'

/**
 * EL PASE DE UNA PERSONA, dibujado como una entrada de concierto.
 *
 * La forma no es decorativa: un pase se reconoce por su silueta —el troquel de
 * los lados, el talón perforado, el código en monoespaciada— y esa silueta es
 * lo que hace que se entienda sin leer una palabra. Es la misma razón por la
 * que el cartel es un collage y no una tarjeta.
 *
 * El dorado es el de quien subió propuesta. Es la única señal en toda la app de
 * que alguien dio el paso de competir, así que se ve de lejos.
 */
export function PaseConcurso({ pase, nombre }: { pase: Pase; nombre: string }) {
  const dorado = pase.estado === 'dorado'
  return (
    <section className={`${estilos.ticket} ${dorado ? estilos.ticketDorado : ''}`} aria-label="Tu pase del concurso">
      <div className={estilos.ticketCuerpo}>
        <p className={estilos.ticketEtiqueta}>{dorado ? '★ GOLDEN TICKET' : 'PASE DEL EQUIPO'}</p>
        <p className={estilos.ticketNombre}>{nombre}</p>
        {/* El código, en monoespaciada y con el espaciado abierto: está pensado
            para leerse en voz alta y teclearse desde una captura. */}
        <p className={estilos.ticketCodigo}>{pase.codigo}</p>
      </div>
      {/* El talón, separado por el troquel. Lleva el estado, que es lo que
          cambia: si compites y si ya votaste. */}
      <div className={estilos.ticketTalon}>
        {dorado && pase.propuesta && (
          <p className={estilos.ticketDato}><small>TU PROPUESTA</small>{pase.propuesta}</p>
        )}
        <p className={estilos.ticketDato}>
          <small>TU VOTO</small>
          {pase.votadoA ? pase.votadoA : 'Sin usar todavía'}
        </p>
        {/* Se dice aquí y no en la letra chica: es la duda que tiene cualquiera
            al votar, y la respuesta cambia si se lee antes o después. */}
        <p className={estilos.ticketNota}>
          {pase.votadoA
            ? 'Puedes moverlo a otra propuesta mientras la votación siga abierta.'
            : 'Tienes un voto. Podrás cambiarlo hasta que cierre la votación.'}
        </p>
      </div>
    </section>
  )
}
