'use client'

import { useState, useTransition } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { CATALOGO } from '@/secciones/catalogo'
import estilos from './editor.module.css'

/**
 * Añadir una sección (un bloque de la sesión) o una subsección dentro de uno.
 *
 * Se elige por lo que la sección HACE, no por su nombre técnico: cada opción
 * lleva su "para qué" al lado. Quien arma un estatus una vez al mes no tiene
 * por qué recordar la diferencia entre "grafico-y-tabla" y
 * "comparativa-periodos"; tiene que poder leerla en el momento.
 *
 * En una SUBSECCIÓN no se ofrecen portada, agenda ni divisor: son piezas de
 * la estructura de la reunión, no contenido que cuelgue de un bloque.
 */
const NO_VAN_DENTRO: Array<DecisionSlide['layout']> = ['portada', 'agenda', 'divisor-seccion']

export function AnadirSeccion({
  anadirAction,
  dentroDe,
}: {
  anadirAction: (layout: DecisionSlide['layout'], nombre: string) => Promise<void>
  /** Nombre del bloque al que se añade. Ausente = se añade un bloque nuevo. */
  dentroDe?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, empezar] = useTransition()

  const esSub = dentroDe !== undefined
  const opciones = esSub ? CATALOGO.filter((t) => !NO_VAN_DENTRO.includes(t.layout)) : CATALOGO

  if (!abierto) {
    return (
      <button
        type="button"
        className={esSub ? estilos.botonAnadirSub : estilos.botonAnadirSeccion}
        onClick={() => setAbierto(true)}
      >
        + Añadir {esSub ? 'subsección' : 'sección'}
      </button>
    )
  }

  return (
    <div className={estilos.menuSecciones}>
      <div className={estilos.asistenteCabecera}>
        <span className={estilos.grupoTitulo}>
          {esSub ? `¿Qué subsección añades a «${dentroDe}»?` : '¿Qué sección añades?'}
        </span>
        <button type="button" className={estilos.botonIcono} onClick={() => setAbierto(false)} aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className={estilos.opcionesSeccion}>
        {opciones.map((tipo) => (
          <button
            key={tipo.layout}
            type="button"
            className={estilos.opcionSeccion}
            disabled={pendiente}
            onClick={() =>
              empezar(async () => {
                await anadirAction(tipo.layout, tipo.nombre)
                setAbierto(false)
              })
            }
          >
            <span className={estilos.opcionNombre}>{tipo.nombre}</span>
            <span className={estilos.opcionParaQue}>{tipo.paraQue}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
