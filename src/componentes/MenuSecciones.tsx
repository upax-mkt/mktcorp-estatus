'use client'

import { useEffect, useState } from 'react'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * EL ÍNDICE DE UNA SALA — un riel de secciones bajo la cabecera.
 *
 * Franco: *"las salas, ahora que tienen varias secciones, tal vez necesitamos
 * un menú arriba para que las UDN puedan llegar rápido desde su sala a cada
 * sección"*.
 *
 * La sala pasó de tres módulos a seis sin ganar navegación: llegar a "Archivos
 * de Interés" son cuatro mil píxeles de scroll, y la única barra que había es
 * identidad y ajustes, no contenido.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ENLACES DE VERDAD, NO BOTONES. Cada entrada es un `<a href="#s-…">`: salta
 * sin JavaScript, se alcanza con Tab de balde y el navegador ya sabe lo que
 * significa. Lo que añade el JS es lo que el ancla nativa no puede hacer.
 *
 * Y ESO ES ABRIR EL DESTINO. Todas las secciones son `<details>` plegables
 * (Franco, en esta misma ronda: *"los módulos todos deben tener la opción de
 * colapsarse"*), así que un ancla puede aterrizar en una sección cerrada y no
 * enseñar nada. `abrirDestino` la abre —y a sus padres, HACIA ARRIBA— antes de
 * que el salto ocurra.
 *
 * DE PASO ARREGLA UN ANCLA QUE YA ESTABA ROTA: cada acuerdo enlaza a su
 * reunión de origen con `#r-<id>`, y ese destino cuelga DENTRO del plegable de
 * Reuniones. Con Reuniones cerrado, ese enlace no llevaba a ninguna parte
 * desde que las secciones se volvieron plegables. Por eso el `hashchange`
 * escucha cualquier hash, no solo los del menú.
 *
 * EL FOCO VIAJA CON EL SALTO. Tras abrir se enfoca el `<summary>` de la
 * sección: un lector de pantalla anuncia "Acuerdos, 5 abiertos, expandido" y
 * el siguiente Tab sigue DENTRO de la sección, no de vuelta al menú. Es el
 * defecto clásico de las anclas internas — el enlace salta la vista pero no el
 * foco, y quien navega con teclado se queda donde estaba.
 */

export interface EntradaDeMenu {
  /** El `id` de la sección a la que salta, ya prefijado con `s-`. */
  id: string
  titulo: string
  /** Lo que hace útil el chip: "2 vencidos", "6". Opcional. */
  conteo?: string
}

/**
 * Abre el destino y todo lo que lo contenga, y le pasa el foco.
 *
 * HACIA ARRIBA y no solo el propio: `#r-<id>` es una reunión DENTRO del
 * plegable de Reuniones, así que abrir solo el destino lo dejaría invisible.
 */
function abrirDestino(id: string) {
  const destino = document.getElementById(id)
  if (!destino) return

  let plegable =
    destino.querySelector<HTMLDetailsElement>(':scope > details') ?? destino.closest('details')
  while (plegable) {
    plegable.open = true
    plegable = plegable.parentElement?.closest('details') ?? null
  }

  const foco = destino.querySelector('summary') ?? destino
  // `preventScroll`: el salto lo hace el ancla nativa, y enfocar además movería
  // la página dos veces.
  if (foco.tagName !== 'SUMMARY') foco.setAttribute('tabindex', '-1')
  ;(foco as HTMLElement).focus({ preventScroll: true })
}

export function MenuSecciones({ entradas }: { entradas: EntradaDeMenu[] }) {
  const [activa, setActiva] = useState<string | null>(entradas[0]?.id ?? null)

  /**
   * Qué sección se está mirando. `IntersectionObserver` es del navegador —
   * cero librerías— y el margen recorta la ventana a una banda bajo las dos
   * barras: sin él, la sección "visible" sería la que asoma por abajo.
   */
  useEffect(() => {
    const observador = new IntersectionObserver(
      (registros) => {
        const visible = registros.find((r) => r.isIntersecting)
        if (visible) setActiva(visible.target.id)
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0 },
    )
    for (const e of entradas) {
      const nodo = document.getElementById(e.id)
      if (nodo) observador.observe(nodo)
    }
    return () => observador.disconnect()
  }, [entradas])

  /**
   * Un enlace COMPARTIDO que trae hash (`/cliente/zeus#s-acuerdos`) llega con
   * la sección cerrada y el navegador ya intentó —y falló— el salto antes de
   * que este código exista. Por eso al montar se abre y se desplaza a mano.
   */
  useEffect(() => {
    const alCambiarElHash = () => {
      const id = decodeURIComponent(location.hash.slice(1))
      if (!id) return
      abrirDestino(id)
      setActiva(id)
      document.getElementById(id)?.scrollIntoView()
    }
    if (location.hash.length > 1) alCambiarElHash()
    window.addEventListener('hashchange', alCambiarElHash)
    return () => window.removeEventListener('hashchange', alCambiarElHash)
  }, [])

  return (
    // El nombre lo distingue del menú global (`Secciones de Marketing Corp`):
    // dos landmarks con el mismo nombre son un laberinto en lector de pantalla.
    <nav className={estilos.menuSecciones} aria-label="Secciones de esta sala">
      <ul className={estilos.menuLista}>
        {entradas.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              className={estilos.menuEnlace}
              // `location` y no `page`: no es "la página en la que estás" sino
              // el punto de ESTA página en el que estás.
              aria-current={activa === e.id ? 'location' : undefined}
              onClick={() => {
                // Se marca al instante, sin esperar al observador: la respuesta
                // al clic no puede depender de que termine un scroll.
                setActiva(e.id)
                abrirDestino(e.id)
              }}
            >
              {e.titulo}
              {e.conteo && <span className={estilos.menuConteo}>{e.conteo}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
