import type { Tema } from './tipos'
import { grupoUpax } from './grupo-upax'
import { ajustarColorParaContraste } from '@/lib/superficie-texto'

export type { Tema } from './tipos'

/**
 * EL TEMA CON EL QUE SE VISTE UNA REUNIÓN, tenga sala o no.
 *
 * Desde el 30-jul (ronda 8, tarea 5) las nueve salas ya no viven en código —
 * `TEMAS` y `obtenerTema` se fueron con ellas—: la fuente es la tabla
 * `salas`, y `cargarTemas()` (`src/db/temas.ts`) es quien la lee. Esta
 * función se queda como la única PURA: recibe el registro YA CARGADO y
 * resuelve qué tema le toca a un slug, sin volverse asíncrona ella misma —
 * el código que pinta (páginas, `maquetarSesion`, los editores) no necesita
 * saber de dónde salió el tema, solo pedirlo una vez arriba con
 * `await cargarTemas()` y pasarlo hacia abajo.
 *
 * Una reunión que no pertenece a ninguna sala —un comité, un arranque de
 * campaña— se viste con la identidad de Grupo UPAX, que es la de quien la
 * convoca: Marketing Corp es parte del grupo y no tiene identidad propia. Lo
 * mismo si el slug no aparece en el registro (no debería —una sala real
 * siempre tiene su fila, y `cargarTemas()` nunca deja el registro vacío
 * mientras haya semilla o base—, pero un tema prestado es más barato que la
 * página entera sin pintarse).
 */
export function temaDeSala(slug: string | null | undefined, registro: Record<string, Tema>): Tema {
  return (slug && registro[slug]) || registro[grupoUpax.slug] || grupoUpax
}

/**
 * EL COLOR DE MARCA, PERO LEGIBLE COMO TEXTO.
 *
 * Franco: "el verde de MU no tiene buena lectura en textos, es muy flúor".
 * Medido: el #DCFF00 de Marketing United da **1,14:1 sobre blanco** — no es
 * poco contraste, es invisible. Y no es el único: seis de las nueve marcas
 * bajan de 4,5:1, el mínimo para texto corrido.
 *
 * Dentro del documento esto ya estaba resuelto (`--primario-sobre-superficie`
 * de `ProveedorTema`), pero el Home, la agenda y el espacio del cliente pintan
 * texto con `--marca` a secas, que es el color CRUDO.
 *
 * Así que hay dos tokens y hacen cosas distintas:
 *
 * - `--marca` — el color exacto del brandbook. Para rellenos, filos, puntos y
 *   barras: ahí la fidelidad manda y no hay nada que leer.
 * - `--marca-texto` — el mismo matiz, oscurecido lo justo para alcanzar 4,5:1.
 *   Solo para texto.
 *
 * Se DERIVA, no se guarda en el tema: un valor guardado se desincroniza el día
 * que alguien corrija un hex del brandbook.
 */
export function colorDeTextoDeMarca(color: string): string {
  return ajustarColorParaContraste(color, '#ffffff', 4.5)
}
