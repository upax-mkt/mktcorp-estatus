'use client'

import { PLANTILLAS, obtenerPlantilla } from '@/secciones/plantillas'

/**
 * "¿Qué junta es?" — el desplegable de CLASE DE JUNTA.
 *
 * Lo preguntan dos formularios: crear una reunión desde la sala
 * (`NuevaSesionSala`) y agendar/corregir desde el calendario de `/reuniones`
 * (`FormularioSesion`, `src/componentes/agenda`). Se construyeron en
 * paralelo A PROPÓSITO —dos agentes montando el mismo `<select>` a la vez
 * habrían colisionado— y por eso divergieron exactamente como predice la
 * regla de este repo, pagada ya dos veces: *"un patrón que se comparte va en
 * un componente, no copiado en dos hojas"*. `NuevaSesionSala` traía el
 * `<optgroup>` de las clases, la línea de ayuda con el `paraQue` de lo
 * elegido y el `aria-label`; `FormularioSesion` no traía ninguna de las tres.
 * Ahora que existen los DOS llamadores de verdad —que es cuando extraer está
 * justificado, no antes (ronda 14.2)— la pregunta vive aquí una sola vez, y
 * las tres divergencias se cierran de un solo golpe para los dos.
 *
 * "EN BLANCO" NO ES UNA CLASE DE JUNTA, y eso está MODELADO, no adivinado:
 * se filtra por `p.esClaseDeJunta` (`src/secciones/plantillas.ts`), la
 * propiedad del catálogo — nunca comparando el `id` contra `'en-blanco'` a
 * mano. Comparar contra un id escrito aquí era frágil por partida doble: el
 * compilador no protegía nada (`Plantilla` no distinguía una clase de junta
 * de una plantilla de deck) y, si ese id cambiara, la entrada aparecería
 * duplicada como clase real Y como salida de emergencia, con la línea de
 * ayuda mostrando el `paraQue` de otra por el fallback de `obtenerPlantilla`.
 *
 * DE QUIÉN ES EL ESTILO: del consumidor, no de aquí (mismo criterio que
 * `ListaVinetas`, en esta misma carpeta) — `NuevaSesionSala` pinta con
 * `cliente.module.css` y `FormularioSesion` con `agenda.module.css`, dos
 * hojas que ni comparten variables. Este componente solo aporta lo que el
 * consumidor no puede saber: qué es una clase de junta, en qué orden va, y
 * cuándo se le enseña su `paraQue`.
 */

interface Props {
  /**
   * El id elegido, o `''` para "sin clasificar".
   *
   * LA REGLA ÚNICA, EN UN SOLO SITIO (para no volver a divergir, ver el
   * comentario de archivo de arriba): TODA JUNTA QUE NACE ARRANCA SIN
   * CLASIFICAR (`''`) — nunca en la primera clase del catálogo. Vale por
   * igual para los CUATRO sitios que crean una reunión: Home
   * (`AgendarRapido.tsx`), `/deck/nueva` (`CampoClaseDeJunta.tsx`),
   * `/reuniones` al agendar (`FormularioSesion.tsx`) y la sala, "+ Crear
   * reunión" (`NuevaSesionSala.tsx`). Antes de esta ronda solo los dos
   * primeros lo cumplían; los otros dos arrancaban en `PLANTILLA_POR_DEFECTO`
   * ("Estatus de UDN") por costumbre, no por decisión — un dato que falta es
   * un hecho, y convertirlo en un dato inventado porque esa fila iba primero
   * en el `<select>` es peor que dejarlo vacío.
   *
   * EDITAR una reunión que YA EXISTE es una pregunta distinta, y solo
   * `FormularioSesion` la responde (es el único de los cuatro que también
   * edita): ahí `value` puede llegar en `''` porque la reunión de verdad no
   * tiene clase —y entonces se respeta, no se rellena de rebote— o con un id
   * real, y entonces arranca en SU clase. Ver `plantillaInicial`, en ese
   * archivo, para el porqué completo de esa distinción.
   *
   * Mientras el valor sea `''` se enseña la opción "Sin clasificar" arriba
   * del todo y NO se enseña ninguna línea de ayuda — mostrar el `paraQue` de
   * "Estatus de UDN" bajo "Sin clasificar" (el fallback de `obtenerPlantilla`
   * para un id vacío) sería la misma trampa que este componente existe para
   * cerrar, solo que sobre `''` en vez de sobre `'en-blanco'`.
   */
  value: string
  onChange: (id: string) => void
  /** Clase del `<label>` raíz. */
  className?: string
  /** Clase del rótulo visible ("¿Qué junta es?"). */
  etiquetaClassName?: string
  /** Clase del `<select>`. */
  selectClassName?: string
  /** Clase de la línea de ayuda (el `paraQue` de lo elegido). */
  pistaClassName?: string
}

const CLASES_DE_JUNTA = PLANTILLAS.filter((p) => p.esClaseDeJunta)
const OTRAS = PLANTILLAS.filter((p) => !p.esClaseDeJunta)

export function SelectorClaseDeJunta({
  value,
  onChange,
  className,
  etiquetaClassName,
  selectClassName,
  pistaClassName,
}: Props) {
  const paraQue = value === '' ? null : obtenerPlantilla(value).paraQue

  return (
    <label className={className}>
      <span className={etiquetaClassName}>¿Qué junta es?</span>
      <select
        className={selectClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="¿Qué junta es?"
      >
        {/* Solo se enseña mientras el valor siga vacío: es el estado de una
            reunión ya existente sin clase, no una opción para
            "desclasificar" una que ya la tiene — ofrecerla siempre invitaría
            a eso por accidente. Fuera de los dos `optgroup`: no es una clase
            real ni la salida de emergencia, es la ausencia de las dos. */}
        {value === '' && <option value="">Sin clasificar</option>}
        {/* `optgroup`, no un separador de guiones dibujado a mano: es el
            mecanismo nativo del `<select>` para agrupar opciones, y el que
            un lector de pantalla anuncia como grupo en vez de leer texto
            suelto. Las clases van en el orden del catálogo. */}
        <optgroup label="Clases de junta">
          {CLASES_DE_JUNTA.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </optgroup>
        {/* "En blanco" vive en su propio grupo, al final, con una etiqueta
            que dice las dos cosas: que no es una clase, y qué hace si se
            elige. */}
        <optgroup label="Otra">
          {OTRAS.map((p) => (
            <option key={p.id} value={p.id}>
              Otra (deck en blanco)
            </option>
          ))}
        </optgroup>
      </select>
      {/* La línea que hasta esta ronda solo enseñaba `NuevaSesionSala`: el
          catálogo ya trae un `paraQue` por plantilla —una frase de cuándo
          elegir esa y no otra— y sin esto elegir era adivinar por el
          nombre. */}
      {paraQue && <p className={pistaClassName}>{paraQue}</p>}
    </label>
  )
}
