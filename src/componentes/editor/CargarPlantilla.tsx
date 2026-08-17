'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/deck/deck.module.css'
import { PLANTILLAS, obtenerPlantilla } from '@/secciones/plantillas'

/**
 * CARGAR UNA PLANTILLA SOBRE EL DOCUMENTO YA EXISTENTE — la pieza que le
 * faltaba al editor (Franco: *"estoy en el editor de presentaciones pero no
 * veo dónde cargar el template"*). `crearDocumentoConPlantilla`
 * (`src/db/documentos.ts`) solo sembraba secciones AL NACER el documento; una
 * vez dentro no había ninguna puerta para traer otra estructura sin borrar el
 * documento entero y volver a entrar. Este componente es esa puerta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO REUSA `SelectorClaseDeJunta` (`src/componentes/comunes/`), y es una
 * decisión, no un descuido — se consideró, porque es el componente
 * compartido de este mismo catálogo. No encaja: contesta "¿qué junta es?"
 * — la clase de la REUNIÓN, con un `''` que significa "sin clasificar" y un
 * rótulo ("¿Qué junta es?") que describe esa pregunta — y aquí la pregunta es
 * otra, la que distingue el brief: "¿con qué secciones armo el deck de esta
 * reunión AHORA?". Forzar ese componente aquí sería exactamente la clase de
 * divergencia que su propio comentario de cabecera existe para evitar —un
 * tercer llamador doblando su copy a una pregunta que no es la suya—, así
 * que en vez de reusarlo entero se reusa lo que SÍ es del catálogo y no de
 * esa pregunta: el filtro por `esClaseDeJunta` de `PLANTILLAS`.
 *
 * SOLO SE OFRECEN LAS PLANTILLAS DE PRESENTACIÓN (ronda 16, corrección sobre
 * la ronda 14.2, que ofrecía las siete): la clase de una junta —Estatus de
 * UDN, Sync Comercial, Comité, Arranque, Seguimiento— ya la decidió la
 * reunión al nacer (`SelectorClaseDeJunta`, en las cuatro pantallas de
 * creación) y responde otra pregunta ("¿qué junta es?"). Lo que este panel
 * pregunta es "¿con qué secciones armo el deck AHORA?", y ahí las cinco
 * clases de junta no pintan nada: son la respuesta a una pregunta que este
 * documento ya tiene contestada, no una estructura de partida más entre
 * otras. Ofrecerlas aquí fue lo que hizo que Franco, mirando el editor,
 * viera siete plantillas donde había pedido una — mezclaba "qué junta es"
 * (fija, decidida al crear la sala) con "qué secciones trae el deck"
 * (editable en cualquier momento, que es lo que esta puerta abre). Por eso
 * el filtro es el mismo `esClaseDeJunta` del catálogo, pero invertido: aquí
 * solo entra lo que NO es clase de junta — hoy "Plantilla completa" y "En
 * blanco" — nunca comparando un id contra `'en-blanco'` o `'estatus-udn'` a
 * mano, para que una plantilla de presentación nueva caiga aquí sola.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONFIRMACIÓN: DOS PATRONES YA EXISTENTES, NINGUNO NUEVO.
 *
 * - Documento INTACTO (`intacto`, calculado por quien monta esto con el
 *   MISMO conteo que ya enseña la barra de avance — `itemsLlenados === 0`,
 *   ver `src/app/deck/[id]/page.tsx`): no hay nada que perder, así que se
 *   aplica AL VUELO, sin preguntar — la regla que este repo ya aplica a lo
 *   reversible.
 * - Documento CON CONTENIDO: confirmación en dos tiempos, EN LÍNEA, sin
 *   `confirm()` del navegador — el mismo patrón que ya usa `EliminarSeccion`
 *   (`src/componentes/editor/EliminarSeccion.tsx`, quitar una sección con
 *   contenido) y `DescartarPresentacion` (`src/componentes/`, tirar el
 *   documento entero) EN ESTA MISMA PANTALLA. No el de "escribe ELIMINAR"
 *   de `BorrarReunion` (`src/componentes/ReunionesSala.tsx`): ese está
 *   reservado para cuando se pierde algo que no se puede rehacer NUNCA —la
 *   transcripción de una reunión que ya se dio, de la que salió el acta—;
 *   aquí se pierden secciones de un deck, que es justo lo que
 *   `EliminarSeccion` ya trata con dos clics dentro de este mismo editor. Un
 *   tercer estilo de confirmación no hacía falta: los dos que ya existen
 *   cubren los dos casos.
 */

/**
 * Solo las plantillas de PRESENTACIÓN, nunca las clases de junta — ver el
 * comentario de cabecera, arriba. Mismo filtro que separa los dos grupos en
 * `SelectorClaseDeJunta`, pero este panel solo se queda con la mitad que le
 * toca.
 */
const PLANTILLAS_DE_PRESENTACION = PLANTILLAS.filter((p) => !p.esClaseDeJunta)

interface Props {
  /** Con qué plantilla está armado el documento ahora mismo — `documentos.plantilla`. Solo para el valor inicial del selector; no bloquea volver a elegir la misma (recargarla "resetea" su contenido a la plantilla, un uso legítimo). */
  plantillaActual: string | null
  /**
   * Si el documento no tiene una sola sección con contenido real — mismo
   * `itemsLlenados === 0` que ya calcula y enseña `page.tsx`. Decide qué
   * camino de confirmación se usa (ver el comentario de archivo, arriba).
   */
  intacto: boolean
  cargarAction: (idPlantilla: string) => Promise<{ error?: string }>
}

export function CargarPlantilla({ plantillaActual, intacto, cargarAction }: Props) {
  // Arranca vacío A PROPÓSITO, aunque el documento ya tenga una plantilla:
  // esto no es "¿qué es este documento?" (eso ya lo dice `plantillaActual`
  // en el resto de la pantalla, por ejemplo en qué secciones se pueden
  // borrar) sino "¿qué querés cargar?" — dejarlo preseleccionado invitaría a
  // pulsar "Cargar" sin haber elegido nada, sobre todo en el camino que
  // aplica al vuelo.
  const [elegida, setElegida] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const plantilla = elegida ? obtenerPlantilla(elegida) : null
  // Con qué está armado el documento AHORA MISMO — no decide nada aquí (no
  // bloquea recargarla, ver el comentario de `plantillaActual` en `Props`),
  // es solo la orientación que le faltaba a Franco: quien llega no sabía ni
  // que había una plantilla puesta, mucho menos cuál.
  const actual = plantillaActual ? PLANTILLAS.find((p) => p.id === plantillaActual) : null

  function ejecutar() {
    setError(null)
    empezar(() => {
      cargarAction(elegida).then((r) => {
        if (r?.error) setError(r.error)
        else setConfirmando(false)
      })
    })
  }

  return (
    <div className={estilos.panelPlantilla}>
      <div className={estilos.panelPlantillaFila}>
        <label className={estilos.panelPlantillaEtiqueta} htmlFor="cargar-plantilla-select">
          Cargar una plantilla{actual && <> — ahora: {actual.nombre}</>}
        </label>
        <select
          id="cargar-plantilla-select"
          className={`${estilos.select} ${estilos.panelPlantillaSelect}`}
          value={elegida}
          disabled={pendiente}
          onChange={(e) => {
            setElegida(e.target.value)
            setConfirmando(false)
            setError(null)
          }}
          aria-label="Con qué secciones rearmar este documento"
        >
          <option value="">Elige una plantilla…</option>
          {PLANTILLAS_DE_PRESENTACION.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>

        {plantilla && !confirmando && (
          <button
            type="button"
            className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
            disabled={pendiente}
            onClick={() => (intacto ? ejecutar() : setConfirmando(true))}
          >
            {pendiente ? 'Cargando…' : `Cargar «${plantilla.nombre}»`}
          </button>
        )}
      </div>

      {plantilla && <p className={estilos.zonaPeligroTexto}>{plantilla.paraQue}</p>}

      {/* Solo aparece sobre un documento CON contenido — sobre uno intacto el
          botón de arriba ya ejecutó. */}
      {plantilla && !intacto && confirmando && (
        <>
          <p className={estilos.zonaPeligroTexto}>
            Este documento ya tiene contenido. Cargar «{plantilla.nombre}» lo reemplaza por completo — se
            pierden todas sus secciones actuales y lo que tengan escrito, sin papelera.
          </p>
          <div className={estilos.minutaAcciones}>
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonPeligro} ${estilos.botonChico}`}
              disabled={pendiente}
              onClick={ejecutar}
            >
              {pendiente ? 'Reemplazando…' : 'Sí, reemplazar el contenido'}
            </button>
            <button
              type="button"
              className={`${estilos.boton} ${estilos.botonSecundario} ${estilos.botonChico}`}
              disabled={pendiente}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {error && (
        <p className={estilos.avisoError} role="alert">{error}</p>
      )}
    </div>
  )
}
