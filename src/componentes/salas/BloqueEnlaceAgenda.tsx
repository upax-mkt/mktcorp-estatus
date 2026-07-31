'use client'

import { useState, useTransition } from 'react'
import { CopiarBoton } from '@/componentes/CopiarBoton'
import estilos from '@/app/salas/salas.module.css'

/**
 * EL ENLACE PÚBLICO DE LA AGENDA (tarea 1, ronda 8) — se GENERA aquí, en
 * `/salas`, porque es la misma pregunta que el resto de esta pantalla: "qué
 * puede ver alguien de fuera". El enlace en sí (`/agenda/<token>`) es la
 * única puerta de la app que se abre sin sesión; ver `src/db/enlace-agenda.ts`
 * y `src/auth/politica.ts` para el porqué y las dos direcciones que se
 * comprueban ahí.
 *
 * Mismo patrón que `ClaveDeSala`: la acción de generar devuelve el valor
 * fresco (aquí, la URL completa) para enseñarlo AL INSTANTE, sin esperar a
 * que la página entera se vuelva a pedir al servidor — a diferencia de una
 * clave, este enlace no es tan sensible como para forzar "cópialo ahora, no
 * se puede volver a ver", así que se queda en pantalla mientras siga siendo
 * el vigente.
 *
 * REVOCAR Y REGENERAR piden la MISMA confirmación en el sitio (mismo criterio
 * que `ClaveDeSala`/`PausaSala`): las dos dejan sin servir al instante el
 * enlace que alguien de fuera pueda tener guardado — revocar porque deja de
 * haber ninguno, regenerar porque el viejo deja de coincidir. Ninguna de las
 * dos es "generar el primero", que no tiene nada que confirmar.
 */

interface Props {
  enlace: string | null
  generarAction: () => Promise<{ enlace?: string; error?: string }>
  revocarAction: () => Promise<{ error?: string }>
}

type AccionPendiente = 'generar' | 'revocar' | null

export function BloqueEnlaceAgenda({ enlace: enlaceInicial, generarAction, revocarAction }: Props) {
  const [enlace, setEnlace] = useState(enlaceInicial)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<AccionPendiente>(null)
  const [pendiente, empezar] = useTransition()

  /**
   * Las dos acciones se llaman SIEMPRE dentro de un try/catch (mismo criterio
   * que `PausaSala.ejecutar`) — no basta con mirar `r.error`: `generarAction`/
   * `revocarAction` empiezan con `exigirEquipo()`, y si la sesión ya venció
   * mientras esta pestaña seguía abierta (la cookie de equipo dura 7 días),
   * eso LANZA en vez de devolver `{error}`. Sin el catch, esa promesa
   * rechazada no tenía dónde aterrizar y la pantalla reventaba sin decir por
   * qué — exactamente lo que este bloque existe para evitar en el enlace
   * mismo.
   */
  function generar() {
    setError(null)
    setConfirmando(null)
    empezar(async () => {
      try {
        const r = await generarAction()
        if (r.error) setError(r.error)
        else setEnlace(r.enlace ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  function revocar() {
    setError(null)
    setConfirmando(null)
    empezar(async () => {
      try {
        const r = await revocarAction()
        if (r.error) setError(r.error)
        else setEnlace(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className={`tarjeta ${estilos.enlaceAgenda}`}>
      <div className={estilos.enlaceTexto}>
        <div className={estilos.enlaceTitulo}>Enlace público de la agenda</div>
        <p className={estilos.enlaceNota}>
          {/* Revisión final de la rama, punto 6: decía "el logo y el color de
              cada marca" — CalendarioPublico (src/componentes/agenda/CalendarioPublico.tsx)
              solo pinta el color (`--sala`, en el punto de cada día y en el
              filo de cada fila de la lista); no hay ningún <img> ahí.
              Añadir el logo queda para otra ronda: no es un ajuste de texto,
              es una fila más en `sesionesPublicasDelMes` (src/db/sesiones.ts,
              que hoy solo trae sala/fecha/hora/color) y una etiqueta nueva en
              el componente. */}
          Quien lo tenga ve el mes con sus reuniones —sala, día y hora, con el color de cada marca—
          sin entrar a la app y sin clave. Nada de acuerdos, minutas, participantes ni contenido de
          ninguna reunión.
        </p>
        {error && <p className={estilos.formularioError}>{error}</p>}
      </div>

      {enlace ? (
        <div className={estilos.enlaceAcciones}>
          <div className={estilos.enlaceFila}>
            <code className={estilos.enlaceCodigo}>{enlace}</code>
            <CopiarBoton texto={enlace} className="boton" />
          </div>

          {confirmando ? (
            <span className={estilos.confirmarFila}>
              <span className={estilos.enlacePista}>
                {confirmando === 'generar'
                  ? 'El enlace de arriba deja de servir en el acto; quien lo tenga guardado se queda fuera.'
                  : 'Nadie va a poder ver la agenda pública hasta que generes uno nuevo.'}
              </span>
              <button
                type="button"
                className="boton"
                disabled={pendiente}
                onClick={confirmando === 'generar' ? generar : revocar}
              >
                {pendiente
                  ? (confirmando === 'generar' ? 'Generando…' : 'Revocando…')
                  : (confirmando === 'generar' ? 'Sí, generar otro' : 'Sí, revocar')}
              </button>
              <button type="button" className="boton" data-tono="fantasma" onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
            </span>
          ) : (
            <span className={estilos.confirmarFila}>
              <button type="button" className="boton" data-tono="suave" disabled={pendiente} onClick={() => setConfirmando('generar')}>
                Generar uno nuevo
              </button>
              <button type="button" className="boton" data-tono="fantasma" disabled={pendiente} onClick={() => setConfirmando('revocar')}>
                Revocar
              </button>
            </span>
          )}
        </div>
      ) : (
        <button type="button" className="boton" disabled={pendiente} onClick={generar}>
          {pendiente ? 'Generando…' : 'Generar enlace'}
        </button>
      )}
    </div>
  )
}
