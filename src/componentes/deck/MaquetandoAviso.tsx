import estilos from './maquetando.module.css'

/**
 * Lo que se ve mientras el motor trabaja (~25 s: dos llamadas a Claude en
 * serie). Antes la página se quedaba en blanco todo ese rato y parecía colgada.
 *
 * Es un esqueleto con la forma real de un slide, no un spinner: comunica qué
 * se está construyendo y cuánto va a ocupar, y evita el salto de layout cuando
 * llega el contenido de verdad.
 */
export function MaquetandoAviso({ slides = 4 }: { slides?: number }) {
  return (
    <div className={estilos.envoltura}>
      <div className={estilos.aviso}>
        <span className={estilos.pulso} />
        <div>
          <div className={estilos.avisoTitulo}>Maquetando con IA</div>
          <p className={estilos.avisoNota}>
            El motor reparte tu contenido en el layout que mejor comunica cada slide. Tarda
            alrededor de medio minuto: no cierres esta pestaña.
          </p>
        </div>
      </div>

      <div className={estilos.slides}>
        {Array.from({ length: slides }, (_, i) => (
          <div key={i} className={estilos.slide} aria-hidden="true">
            <div className={estilos.barraTitulo} />
            <div className={estilos.kpis}>
              {Array.from({ length: 4 }, (_, k) => (
                <div key={k} className={estilos.kpi} />
              ))}
            </div>
            <div className={estilos.lineas}>
              <div className={estilos.linea} />
              <div className={`${estilos.linea} ${estilos.lineaCorta}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
