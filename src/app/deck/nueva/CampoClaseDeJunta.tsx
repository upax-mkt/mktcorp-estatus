'use client'

import { useState } from 'react'
import { SelectorClaseDeJunta } from '@/componentes/comunes/SelectorClaseDeJunta'
import estilos from '../deck.module.css'

/**
 * PUENTE entre `SelectorClaseDeJunta` (controlado, `value`/`onChange`, sin
 * `name`) y el `<form action={crear}>` de `page.tsx`, que es un Server
 * Component y envía `FormData` nativo. `SelectorClaseDeJunta` no acepta
 * `name` a propósito —lo usan también `NuevaSesionSala` y `FormularioSesion`,
 * dos componentes de cliente con estado propio que nunca lo necesitaron—, así
 * que en vez de ensancharlo para un tercer caso de uso (un `name` que los
 * otros dos ignorarían) el puente vive aquí: un `<input type="hidden">`
 * sincronizado con el estado local, que SÍ viaja en el `FormData` porque está
 * dentro del mismo `<form>`, sin que a `SelectorClaseDeJunta` le importe cómo
 * se envía lo que elige.
 *
 * ARRANCA VACÍO ("" = sin clasificar) porque esta pantalla SOLO CREA — no hay
 * una reunión previa cuya clase haya que respetar al editar, al contrario de
 * `FormularioSesion`. Ver el comentario de "¿Qué junta es?" en
 * `AgendarRapido.tsx` para el mismo criterio aplicado a la otra pantalla que
 * crea reuniones.
 */
export function CampoClaseDeJunta() {
  const [valor, setValor] = useState('')

  return (
    <>
      <input type="hidden" name="plantilla" value={valor} />
      <SelectorClaseDeJunta
        value={valor}
        onChange={setValor}
        className={estilos.campo}
        etiquetaClassName={estilos.campoTitulo}
        selectClassName={estilos.select}
        pistaClassName={estilos.subtitulo}
      />
    </>
  )
}
