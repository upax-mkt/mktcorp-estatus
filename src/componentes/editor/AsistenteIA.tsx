'use client'

import { useState, useTransition } from 'react'
import type { BorradorSeccion } from '@/secciones/borrador'
import estilos from './editor.module.css'

/**
 * El atajo: pega texto crudo y la IA propone un relleno para los campos de la
 * sección.
 *
 * TRES DECISIONES que lo mantienen en su sitio de atajo y no de camino:
 *
 * - **Viene plegado.** Quien no lo abre no se entera de que existe, y el
 *   editor manual funciona igual de bien.
 * - **Propone, no aplica.** Lo que devuelve cae en los campos del formulario y
 *   ahí se corrige. Nadie presenta algo que no revisó.
 * - **Si falla, lo dice y ya.** Sin API key, sin red o con un modelo que
 *   devuelve basura, la sección sigue estando a un formulario de distancia.
 *   Un asistente caído no puede bloquear una sesión.
 */

interface Props {
  textoInicial?: string
  proponerAction: (texto: string) => Promise<BorradorSeccion | { error: string }>
  onPropuesta: (borrador: BorradorSeccion) => void
}

export function AsistenteIA({ textoInicial, proponerAction, onPropuesta }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(textoInicial ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  if (!abierto) {
    return (
      <button type="button" className={estilos.asistenteAbrir} onClick={() => setAbierto(true)}>
        ¿Prefieres pegar el texto y que la IA proponga? Ábrelo aquí
      </button>
    )
  }

  return (
    <div className={estilos.asistente}>
      <div className={estilos.asistenteCabecera}>
        <span className={estilos.grupoTitulo}>Proponer con IA</span>
        <button type="button" className={estilos.botonIcono} onClick={() => setAbierto(false)} aria-label="Cerrar el asistente">
          ✕
        </button>
      </div>
      <p className={estilos.pista}>
        Pega el material en bruto: cifras, hallazgos, lo que tengas. La propuesta cae en los campos de
        arriba y la corriges a mano antes de presentar.
      </p>
      <textarea
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Pega aquí las cifras y el análisis en bruto…"
        aria-label="Texto crudo para el asistente"
      />
      {error && <p className={estilos.aviso}>{error}</p>}
      <button
        type="button"
        className={estilos.botonGuardar}
        disabled={pendiente || texto.trim().length === 0}
        onClick={() =>
          empezar(async () => {
            setError(null)
            const resultado = await proponerAction(texto)
            if ('error' in resultado) {
              setError(resultado.error)
              return
            }
            onPropuesta(resultado)
            setAbierto(false)
          })
        }
      >
        {pendiente ? 'Pensando…' : 'Proponer'}
      </button>
    </div>
  )
}
