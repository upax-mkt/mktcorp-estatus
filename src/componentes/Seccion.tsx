import type { ReactNode } from 'react'
import { IconoSeccion, type NombreIcono } from './IconoSeccion'
import estilos from './Seccion.module.css'

/**
 * UNA SECCIÓN. La misma en la sala y en el Home.
 *
 * Franco: *"el home sigo percibiéndolo sin lógica y desconectado, al menos
 * del UX/UI de las salas"*.
 *
 * Y tenía razón en algo comprobable: las dos pantallas dibujaban una sección
 * con dos gramáticas distintas.
 *
 * - La SALA: la sección ES la tarjeta, y su cabecera es `icono · título ·
 *   conteo a la derecha`. Cinco veces seguidas, todas iguales.
 * - El HOME: unas secciones eran tarjeta (Acuerdos, Minutas, el calendario) y
 *   otras eran un título suelto sobre el lienzo con tarjetas sueltas dentro
 *   (Por confirmar, Los clientes, En pausa). Ninguna llevaba icono, y a la
 *   derecha del título no había un conteo sino una frase en minúsculas
 *   —"ordenados por próxima reunión"—, que ocupa el mismo sitio y dice otra
 *   cosa.
 *
 * Lo curioso es que la sala YA había aprendido la lección; el comentario que
 * estaba en su CSS lo decía con todas las letras: *"la sección ES la tarjeta,
 * como los módulos del Home. Antes cada bloque era texto suelto sobre el
 * lienzo con tarjetas sueltas dentro: dos niveles de elevación discutiendo
 * cuál es el contenedor"*. El arreglo se quedó en la sala y el Home siguió
 * con el problema viejo — que es exactamente lo que pasa cuando el patrón
 * vive copiado en dos hojas de estilo en vez de en un componente.
 *
 * Por eso esto es un componente y no una clase más: una gramática que se
 * comparte tiene que tener un solo sitio donde cambiarla. `Seccion.module.css`
 * salió tal cual de `cliente.module.css` — no hay rediseño aquí, hay una
 * mudanza.
 *
 * `plegable` existe porque Acuerdos, en la sala, se colapsa (Franco: *"el
 * módulo acuerdos debería ser colapsable dentro de la sala"*). Un `<details>`
 * nativo, no un `useState`: se abre y se cierra sin JavaScript, y el
 * navegador ya sabe hacerlo accesible.
 */

interface Props {
  /** El icono de la izquierda. Sin icono, la cabecera no es la de la sala. */
  icono: NombreIcono
  titulo: string
  /**
   * Lo de la derecha: un conteo, no una explicación. "6", "2 vencidos · 4
   * abiertos". Si no hay nada que contar, se omite — un conteo en cero ocupa
   * el mismo sitio que uno útil y no añade nada.
   */
  conteo?: ReactNode
  /** `<details>` en vez de `<h2>`: la sección se puede colapsar. */
  plegable?: boolean
  /** Solo con `plegable`. Por defecto abierta: se colapsa quien quiera. */
  abierta?: boolean
  /** Para el ancho/columna que le toque en la rejilla de quien la usa. */
  className?: string
  /** Ancla, para que algo de la misma página pueda apuntar aquí. */
  id?: string
  children: ReactNode
}

export function Seccion({
  icono,
  titulo,
  conteo,
  plegable = false,
  abierta = true,
  className,
  id,
  children,
}: Props) {
  const clase = className ? `${estilos.seccion} ${className}` : estilos.seccion

  const cabecera = (
    <>
      <IconoSeccion nombre={icono} />
      {titulo}
      {conteo != null && conteo !== false && <span className={estilos.conteo}>{conteo}</span>}
    </>
  )

  if (plegable) {
    return (
      <section className={clase} id={id}>
        <details className={estilos.plegable} open={abierta}>
          <summary className={estilos.titulo}>{cabecera}</summary>
          {children}
        </details>
      </section>
    )
  }

  return (
    <section className={clase} id={id}>
      <h2 className={estilos.titulo}>{cabecera}</h2>
      {children}
    </section>
  )
}
