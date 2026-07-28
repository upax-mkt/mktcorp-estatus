import type { DecisionSlide } from '@/decision/esquema'
import { ListaVinetas } from '@/componentes/comunes/ListaVinetas'
import estilos from './piezas.module.css'

type Bloques = NonNullable<DecisionSlide['bloques']>

/**
 * Bloques numerados de igual peso: los "focos" del trimestre.
 *
 * Cada uno lleva su título, su planteamiento, su detalle y una línea de cierre
 * rotulada (en el deck real, la "Oferta gancho"). La numeración la pone el CSS
 * con un contador: nadie la escribe a mano, así que insertar un foco en medio
 * no obliga a renumerar el resto.
 */
export function BloquesSeccion({ bloques }: { bloques: Bloques }) {
  return (
    <ol className={estilos.bloques}>
      {bloques.map((bloque, i) => (
        <li key={`bloque-${i}`} className={estilos.bloque}>
          <div className={estilos.bloqueCabecera}>
            <h3 className={estilos.bloqueTitulo}>{bloque.titulo}</h3>
            {bloque.etiqueta && <span className={estilos.bloqueEtiqueta}>{bloque.etiqueta}</span>}
          </div>
          {bloque.parrafo && <p className={estilos.bloqueParrafo}>{bloque.parrafo}</p>}
          {bloque.puntos && bloque.puntos.length > 0 && (
            <ListaVinetas
              vinetas={bloque.puntos}
              className={estilos.bloquePuntos}
              prefijo={`bloque-${i}`}
            />
          )}
          {bloque.pie && (
            <p className={estilos.bloquePie}>
              <span className={estilos.bloquePieRotulo}>{bloque.pie.rotulo}</span>
              {bloque.pie.texto}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
