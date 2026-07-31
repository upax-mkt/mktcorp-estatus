'use client'

import { CATALOGO_DE_FUENTES, CLASES_DE_FUENTES, familiaCss } from '@/temas/fuentes'
import estilos from '@/app/salas/salas.module.css'

/**
 * EL SELECTOR DE TIPOGRAFÍA (tarea 7, ronda 8).
 *
 * Franco, literal: "el tema de la tipografía fue una mala decisión, ya que
 * se ven mal, debemos poder seleccionar tipos". Revierte su propia regla de
 * que cada deck se vistiera con la tipografía del brandbook de su unidad
 * (commit 106e622) — al verla pintada no funcionaba.
 *
 * EL PUNTO QUE MÁS IMPORTA, y es de producto, no de código: una lista de
 * nombres no dice cómo se ve. Por eso esto no es un `<select>` con veinte
 * `<option>` — cada opción se PINTA con su propia fuente, para comparar de
 * un vistazo. Es también la razón de que este componente cargue las
 * variables del catálogo ENTERO (`CLASES_DE_FUENTES`) en su propia raíz: es
 * el único lugar de la app que necesita las veinte a la vez —el resto pinta
 * como mucho dos, las que elige cada sala (ver `ProveedorTema`)— así que
 * carga las suyas aquí mismo, sin pedirle nada a la página que lo monta.
 *
 * UN MISMO COMPONENTE sirve para las dos preguntas del formulario —títulos y
 * texto— y decide su propia muestra según cuál sea: `nombre` ya es la clave
 * de `Tema` (`familiaDisplay`/`familiaTexto`) que se está editando, así que
 * no hace falta una prop aparte para saber si mostrar un título o un
 * párrafo. El catálogo se ofrece COMPLETO en los dos casos —`registro` es
 * una ayuda para elegir, no un filtro: una condensada puede servir de
 * título aunque su registro diga "para texto", y Franco es quien decide.
 */

interface Props {
  /** La clave de `Tema` que se está eligiendo — también decide si la muestra es un título o un párrafo. */
  nombre: 'familiaDisplay' | 'familiaTexto'
  /** La clave de fuente elegida ahora mismo. Si no está en el catálogo (un alias heredado, un dato viejo) ningún radio queda marcado — ver el aviso más abajo. */
  valor: string
  alCambiar: (clave: string) => void
}

const MUESTRA_TITULO = 'Estatus del mes'
const MUESTRA_PARRAFO = 'Así se lee un párrafo de texto corrido en esta familia, con mayúsculas y minúsculas.'

const ETIQUETA_REGISTRO: Record<string, string> = {
  display: 'para títulos',
  texto: 'para texto',
  ambos: 'títulos y texto',
}

export function SelectorTipografia({ nombre, valor, alCambiar }: Props) {
  const esDisplay = nombre === 'familiaDisplay'
  const valorEnElCatalogo = CATALOGO_DE_FUENTES.some((f) => f.clave === valor)

  return (
    <div className={CLASES_DE_FUENTES}>
      <div
        className={estilos.selectorFuentes}
        role="radiogroup"
        aria-label={esDisplay ? 'Tipografía de títulos' : 'Tipografía de texto'}
      >
        {CATALOGO_DE_FUENTES.map((f) => (
          <label key={f.clave} className={estilos.opcionFuente}>
            <input
              type="radio"
              name={nombre}
              value={f.clave}
              checked={valor === f.clave}
              onChange={() => alCambiar(f.clave)}
            />
            <span className={estilos.opcionFuenteCabecera}>
              <span className={estilos.opcionFuenteNombre}>{f.nombre}</span>
              <span className={estilos.opcionFuenteRegistro}>{ETIQUETA_REGISTRO[f.registro]}</span>
            </span>
            {/* La muestra de verdad: pintada CON la fuente de esta opción, no
                descrita. `data-muestra` es el gancho del test — ver
                SelectorTipografia.test.tsx. */}
            <span
              data-muestra
              className={esDisplay ? estilos.muestraTitulo : estilos.muestraParrafo}
              style={{ fontFamily: familiaCss(f.clave) }}
            >
              {esDisplay ? MUESTRA_TITULO : MUESTRA_PARRAFO}
            </span>
          </label>
        ))}
      </div>

      {!valorEnElCatalogo && valor.length > 0 && (
        <p className={estilos.pista}>
          La familia guardada ahora mismo (&quot;{valor}&quot;) ya no está en este catálogo — se sigue
          viendo igual que hoy; para cambiarla, elige una nueva de la lista.
        </p>
      )}
    </div>
  )
}
