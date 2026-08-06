'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'

/**
 * QUÉ SE PUEDE HACER CON UNA REUNIÓN YA CERRADA, desde la propia lista.
 *
 * Franco: "la lista debería poder desde allí eliminar o descargar la minuta o
 * la presentación en pdf".
 *
 * TRES DECISIONES:
 *
 * 1. **La minuta se descarga como `.txt`.** Es un texto de correo: se pega en
 *    Gmail y se manda. Envolverlo en un PDF lo convertiría en un adjunto que
 *    hay que abrir, copiar y limpiar — más trabajo para el mismo texto.
 *
 * 2. **La presentación se descarga en PDF por el navegador.** Se abre su
 *    documento en una pestaña con `?imprimir` y el navegador lanza su propio
 *    diálogo, donde "Guardar como PDF" ya existe. Es la vía honesta: el PDF
 *    sale del MISMO render que se proyecta, con sus fuentes y sus gráficos
 *    vectoriales. Generarlo en el servidor exigiría un Chrome headless de
 *    ~200 MB para producir un resultado peor.
 *
 * 3. **Eliminar pide confirmación y dice qué se lleva.** Borra la reunión, su
 *    documento y su minuta; los acuerdos ya publicados NO se van, porque
 *    cuelgan del cliente y llevan semanas moviéndose.
 */

interface Props {
  reunionId: string
  titulo: string
  /** El texto de la minuta, si la hay. Sin él no hay nada que descargar. */
  textoMinuta?: string | null
  /** Si tiene documento maquetado. Sin él no hay nada que imprimir. */
  hayDocumento: boolean
  eliminarAction: (id: string) => Promise<{ error?: string }>
}

/** Un nombre de archivo que sobreviva a cualquier sistema. */
function comoArchivo(titulo: string): string {
  return titulo
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'minuta'
}

export function AccionesReunion({
  reunionId, titulo, textoMinuta, hayDocumento, eliminarAction,
}: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  function descargarMinuta() {
    if (!textoMinuta) return
    // Blob y `URL.createObjectURL`: el archivo se arma en el navegador, sin
    // pedirle nada al servidor y sin dejar el texto en ninguna URL.
    const blob = new Blob([textoMinuta], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${comoArchivo(titulo)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (confirmando) {
    return (
      <span className={estilos.accionesReunion}>
        <span className={estilos.accionesAviso}>
          Se borran la reunión, su documento y su minuta. Los acuerdos ya publicados se quedan.
        </span>
        <button
          type="button"
          className={`${estilos.boton} ${estilos.botonPeligro} ${estilos.botonChico}`}
          disabled={pendiente}
          onClick={() => empezar(async () => {
            const r = await eliminarAction(reunionId)
            if (r.error) { setError(r.error); setConfirmando(false) }
          })}
        >
          {pendiente ? 'Borrando…' : 'Sí, borrar'}
        </button>
        <button
          type="button"
          className={estilos.botonTexto}
          disabled={pendiente}
          onClick={() => setConfirmando(false)}
        >
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <span className={estilos.accionesReunion}>
      {error && <span className={estilos.accionesAviso}>{error}</span>}

      {hayDocumento && (
        <a
          href={`/deck/${reunionId}/documento?imprimir=1`}
          target="_blank"
          rel="noopener"
          className={estilos.accionEnlace}
          title="Abre el documento y lanza el diálogo de impresión: ahí está «Guardar como PDF»"
        >
          Presentación PDF
        </a>
      )}

      {textoMinuta ? (
        <button type="button" className={estilos.accionEnlace} onClick={descargarMinuta}>
          Minuta .txt
        </button>
      ) : (
        <span className={estilos.accionAusente}>Sin minuta</span>
      )}

      <button
        type="button"
        className={estilos.accionBorrar}
        onClick={() => setConfirmando(true)}
        aria-label={`Eliminar ${titulo}`}
      >
        Eliminar
      </button>
    </span>
  )
}
