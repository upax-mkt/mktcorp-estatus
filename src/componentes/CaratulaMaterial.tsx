import {
  familiaDeFormato, inicialDeDominio, tonoDeDominio,
  type MaterialParaVista,
} from '@/lib/materiales'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LA CARÁTULA DE UN MATERIAL QUE NO TIENE MINIATURA.
 *
 * Franco: *"las miniaturas preview de los materiales cargados como un pdf o un
 * link o un excel se ven sin diseño, una imagen gris y ya; dale amor y que se
 * vea bonito"*.
 *
 * Y era literal: un rectángulo gris con la palabra «PDF» centrada. Ocho
 * materiales de una sala se veían como ocho rectángulos iguales con tres
 * letras distintas, y había que LEER cada uno para saber qué era.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TRES CARAS, porque son tres cosas distintas:
 *
 * 1. **UN DOCUMENTO ES UNA HOJA.** Se dibuja como lo que es —papel con la
 *    esquina doblada, con sus renglones— y su extensión va en una banda de
 *    color abajo. La forma se reconoce antes de leer; la banda dice cuál es.
 * 2. **UN ENLACE ES UN SITIO.** Monograma con la inicial del dominio, en un
 *    color CALCULADO a partir del propio dominio (`tonoDeDominio`), así que
 *    `sharepoint.com` y `vercel.app` dejan de ser el mismo gris. Estable: el
 *    mismo dominio da siempre el mismo color, sin guardar nada.
 * 3. **UN VÍDEO SIN PORTADA** (un mp4 subido, del que no se puede sacar
 *    fotograma sin decodificarlo en el servidor) va oscuro, que es como se ve
 *    un reproductor antes de arrancar. El triángulo lo pone quien la usa.
 *
 * EL COLOR DE FAMILIA VA EN LA BANDA, NO EN EL FONDO. La sala entera se viste
 * con la identidad de su UDN —regla dura de Franco—, y ocho carátulas en rojo,
 * verde y naranja convertirían el módulo en un explorador de archivos
 * genérico. La hoja es de marca; solo la etiqueta lleva el color del formato,
 * que es donde hace falta.
 *
 * SIGUE SIN GENERARSE UNA MINIATURA REAL de un PDF o un PPT: haría falta
 * renderizar su primera página en el servidor —una dependencia pesada, tiempo
 * de función y un binario más que guardar y caducar— para media docena de
 * elementos. Ver la cabecera de `src/lib/materiales.ts`.
 */

export function CaratulaMaterial({
  vista,
  nombreOriginal,
}: {
  vista: MaterialParaVista
  nombreOriginal: string | null
}) {
  if (vista.tipo === 'enlace') {
    const tono = tonoDeDominio(vista.distintivo)
    return (
      <span
        className={estilos.caratulaEnlace}
        // El tono viaja como variable: el CSS compone con él la superficie y
        // el texto, y así el contraste se calcula en un solo sitio.
        style={{ '--tono': tono } as React.CSSProperties}
      >
        <span className={estilos.caratulaMonograma} aria-hidden="true">
          {inicialDeDominio(vista.distintivo)}
        </span>
        <span className={estilos.caratulaDominio}>{vista.distintivo}</span>
      </span>
    )
  }

  if (vista.tipo === 'video') {
    // Oscura y sin nada más: encima va el triángulo de reproducir, que es la
    // señal, y cualquier cosa que se dibuje debajo compite con él.
    return <span className={estilos.caratulaVideo} aria-hidden="true" />
  }

  const familia = familiaDeFormato(nombreOriginal)
  return (
    <span className={estilos.caratulaDoc} data-familia={familia}>
      {/* La hoja. `viewBox` de 64×80 —proporción de un folio— y no un cuadrado:
          un documento se reconoce por ser más alto que ancho. */}
      <svg
        viewBox="0 0 64 80"
        className={estilos.caratulaHoja}
        aria-hidden="true"
        role="presentation"
      >
        {/* El papel, con la esquina superior derecha recortada. */}
        <path
          d="M6 4a4 4 0 014-4h28l20 20v56a4 4 0 01-4 4H10a4 4 0 01-4-4z"
          className={estilos.hojaPapel}
        />
        {/* El doblez: el triángulo que falta arriba, en un tono más oscuro. */}
        <path d="M38 0l20 20H42a4 4 0 01-4-4z" className={estilos.hojaDoblez} />
        {/* LO QUE HAY DENTRO DE LA HOJA, según la familia. Un Excel y un PPT
            con el mismo dibujo se distinguen solo por la etiqueta, y entonces
            hay que LEER — que es justo lo que esta carátula viene a evitar. */}
        <g className={estilos.hojaRenglones}>
          <Interior familia={familia} />
        </g>
      </svg>
      {/* La extensión, en la banda de color de su familia. */}
      <span className={estilos.caratulaEtiqueta}>{vista.distintivo}</span>
    </span>
  )
}

/**
 * El contenido de la hoja. Cada forma es lo que ese formato ES: una hoja de
 * cálculo son celdas, una presentación es una diapositiva con su pie, un
 * comprimido son cosas apiladas. Un texto son renglones — y ese es también el
 * caso por defecto, porque es el dibujo que no afirma nada de más.
 */
function Interior({ familia }: { familia: ReturnType<typeof familiaDeFormato> }) {
  if (familia === 'hoja') {
    // Celdas: tres columnas por tres filas, con la primera más marcada (la de
    // encabezados).
    return (
      <>
        <rect x="15" y="31" width="34" height="6" rx="1.5" />
        {[40, 48, 56].map((y) => (
          <g key={y}>
            <rect x="15" y={y} width="9" height="5" rx="1.2" />
            <rect x="27.5" y={y} width="9" height="5" rx="1.2" />
            <rect x="40" y={y} width="9" height="5" rx="1.2" />
          </g>
        ))}
      </>
    )
  }

  if (familia === 'presentacion') {
    // La diapositiva y su pie de página.
    return (
      <>
        <rect x="15" y="30" width="34" height="20" rx="2" />
        <rect x="15" y="55" width="22" height="3" rx="1.5" />
      </>
    )
  }

  if (familia === 'comprimido') {
    // Tres piezas apiladas y desplazadas: algo metido dentro de otra cosa.
    return (
      <>
        <rect x="18" y="30" width="28" height="9" rx="2" />
        <rect x="15" y="42" width="28" height="9" rx="2" />
        <rect x="21" y="54" width="28" height="9" rx="2" />
      </>
    )
  }

  // Renglones. Uno más corto al final, como acaba un párrafo.
  return (
    <>
      <rect x="16" y="32" width="32" height="3" rx="1.5" />
      <rect x="16" y="41" width="32" height="3" rx="1.5" />
      <rect x="16" y="50" width="20" height="3" rx="1.5" />
    </>
  )
}
