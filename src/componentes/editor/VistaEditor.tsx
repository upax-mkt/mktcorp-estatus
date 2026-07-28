'use client'

import { useState, type ReactNode } from 'react'
import { LienzoPrevio, type SeccionEnLienzo } from './LienzoPrevio'
import type { Tema } from '@/temas/tipos'
import estilos from './lienzo.module.css'

/**
 * DOS FORMAS DE MIRAR LA MISMA SESIÓN: los formularios o el previsualizador.
 *
 * Franco: "la edición de la ppt también debería ser en drag & drop desde un
 * previsualizador".
 *
 * No sustituye a la lista de formularios, convive con ella, y la razón es que
 * sirven para cosas distintas: se escribe en el formulario —ahí están los
 * campos— y se DECIDE EL ORDEN en el previsualizador, que es donde se ve qué
 * hay dentro de cada sección. Sustituir una por otra obligaría a elegir entre
 * poder escribir y poder ver.
 *
 * El estado vive aquí, en el cliente, y no en la URL: cambiar de vista no es
 * navegar a otro sitio, y meterlo en la URL haría que el botón de atrás del
 * navegador —que en un editor debería devolverte a donde estabas antes de
 * entrar— te devolviera a la otra pestaña.
 */

interface Props {
  /** La lista de formularios, ya renderizada en el servidor. */
  formularios: ReactNode
  secciones: SeccionEnLienzo[]
  tema: Tema
  reordenarAction: (idsEnOrden: string[]) => Promise<void>
}

export function VistaEditor({ formularios, secciones, tema, reordenarAction }: Props) {
  const [vista, setVista] = useState<'formularios' | 'previa'>('formularios')

  /**
   * Del previsualizador al formulario de esa sección.
   *
   * Cambia de vista y se desplaza hasta ella, en ese orden y con un cuadro de
   * espera: el nodo destino no existe todavía cuando se pulsa —está en la
   * vista que se va a montar— así que buscarlo antes no encontraría nada.
   */
  function abrir(id: string) {
    setVista('formularios')
    requestAnimationFrame(() => {
      const nodo = document.getElementById(`seccion-${id}`) ?? document.querySelector(`[data-seccion="${id}"]`)
      nodo?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <>
      <div className={estilos.conmutador} role="tablist" aria-label="Cómo mirar la sesión">
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'formularios'}
          data-activo={vista === 'formularios' ? 'true' : undefined}
          onClick={() => setVista('formularios')}
        >
          Escribir
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'previa'}
          data-activo={vista === 'previa' ? 'true' : undefined}
          onClick={() => setVista('previa')}
        >
          Ver y ordenar
        </button>
      </div>

      {/* Los formularios se OCULTAN, no se desmontan: dentro hay borradores a
          medio escribir con autoguardado pendiente, y desmontarlos para volver
          a montarlos al cambiar de pestaña es la forma más rápida de perder lo
          que alguien acababa de teclear. */}
      <div hidden={vista !== 'formularios'}>{formularios}</div>

      {vista === 'previa' && (
        <LienzoPrevio
          secciones={secciones}
          tema={tema}
          reordenarAction={reordenarAction}
          alAbrir={abrir}
        />
      )}
    </>
  )
}
