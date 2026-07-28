'use client'

import { useEffect } from 'react'

/**
 * Lanza el diálogo de impresión al abrir el documento con `?imprimir=1`.
 *
 * Es lo que hay detrás de «Presentación PDF» en la lista: el PDF lo genera el
 * NAVEGADOR, desde el mismo render que se proyecta —con sus fuentes, sus
 * gráficos vectoriales y su paginación—. Un Chrome headless en el servidor
 * costaría ~200 MB de dependencia para producir algo peor.
 *
 * Espera a que las fuentes estén listas: sin eso, Chrome mide la página con
 * las de sistema y el PDF sale con saltos de línea distintos a los de la
 * pantalla. `document.fonts.ready` es exactamente esa señal.
 */
export function AlImprimir() {
  useEffect(() => {
    let vivo = true
    const lanzar = () => { if (vivo) window.print() }
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setTimeout(lanzar, 250))
    } else {
      setTimeout(lanzar, 600)
    }
    return () => { vivo = false }
  }, [])
  return null
}
