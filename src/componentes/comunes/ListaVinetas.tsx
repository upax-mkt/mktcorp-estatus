import type { Vineta } from '@/decision/esquema'
import estilos from './vinetas.module.css'

/**
 * Una lista de viñetas que puede colgar de sí misma.
 *
 * Existe porque un estatus real no tiene listas planas: un servicio abre en las
 * industrias donde se vende, y esas industrias abren en cuentas. En el deck de
 * referencia (Mexa Creativa, junio 2026) la jerarquía llega a tres niveles. Antes
 * `puntos` era `string[]` y esa estructura se perdía: todo se aplanaba a un mismo
 * nivel y el lector no podía saber qué dependía de qué.
 *
 * La usan los tres sitios que pintan viñetas —los dos layouts de deck y la
 * sección de documento— para que la jerarquía se vea igual en los tres.
 *
 * DE QUIÉN ES EL ESTILO: del consumidor, no de aquí. El deck mide en `cqw`
 * (se escala con el slide) y el documento en `rem`; un tamaño propio rompería
 * uno de los dos. Por eso el `<ul>` raíz recibe la clase del consumidor y sus
 * reglas de descendencia (`.columnas li`, `.columnaPuntos li::before`) visten
 * también los niveles anidados. Este módulo solo aporta lo que el consumidor no
 * puede saber: la sangría de cada nivel y el enlace.
 */

interface Props {
  vinetas: Vineta[]
  /** Clase del <ul> raíz: es la que fija tipografía y viñeta. */
  className?: string
  /** Prefijo de key, único dentro de la sección que la monta. */
  prefijo: string
  /** Profundidad actual — la fija la recursión, no el consumidor. */
  nivel?: number
}

/** Cortafuegos: una jerarquía más honda que esto no se lee, se sufre. */
const NIVEL_MAXIMO = 3

export function ListaVinetas({ vinetas, className, prefijo, nivel = 1 }: Props) {
  return (
    <ul className={className} data-nivel={nivel}>
      {vinetas.map((v, i) => {
        // La clave usa el índice: el texto es contenido de negocio libre y dos
        // viñetas hermanas pueden repetirlo sin que eso sea un error.
        const key = `${prefijo}-${i}`
        return (
          <li key={key}>
            {/* `enlace` ya viene restringido por el esquema a https o ruta
                relativa — nunca javascript: ni data:. */}
            {v.enlace ? (
              <a href={v.enlace} className={estilos.enlace} target="_blank" rel="noopener noreferrer">
                {v.texto}
              </a>
            ) : (
              v.texto
            )}
            {v.hijos && v.hijos.length > 0 && nivel < NIVEL_MAXIMO && (
              <ListaVinetas
                vinetas={v.hijos}
                prefijo={key}
                nivel={nivel + 1}
                className={`${className ?? ''} ${estilos.anidada}`.trim()}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
