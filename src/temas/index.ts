import type { Tema } from './tipos'
import { neracode } from './neracode'
import { researchLand } from './research-land'
import { promoEspacio } from './promo-espacio'
import { mexaCreativa } from './mexa-creativa'
import { marketingUnited } from './marketing-united'
import { houseOfFilms } from './house-of-films'
import { uix } from './uix'
import { zeus } from './zeus'
import { ceci } from './ceci'
import { grupoUpax } from './grupo-upax'
import { ajustarColorParaContraste } from '@/lib/superficie-texto'

export type { Tema } from './tipos'

export const TEMAS: Record<string, Tema> = {
  [neracode.slug]: neracode,
  [researchLand.slug]: researchLand,
  [promoEspacio.slug]: promoEspacio,
  [mexaCreativa.slug]: mexaCreativa,
  [marketingUnited.slug]: marketingUnited,
  [houseOfFilms.slug]: houseOfFilms,
  [uix.slug]: uix,
  [zeus.slug]: zeus,
  [ceci.slug]: ceci,
  /**
   * GRUPO UPAX YA NO ES UNA SALA.
   *
   * Franco: "dejaste la sala de UPAX + Ceci y otra de UPAX sola, esta última
   * hay que eliminarla". Eran la misma habitación contada dos veces: Ceci es
   * quien dirige Grupo UPAX y su tarjeta ya lleva el logotipo de UPAX. Dos
   * tarjetas con el mismo logotipo y el mismo interlocutor no son dos
   * relaciones que atender: son una duplicada.
   *
   * Su TEMA sigue existiendo y se usa abajo, como identidad de lo que no es de
   * ninguna sala.
   */
}

export function obtenerTema(slug: string): Tema {
  const tema = TEMAS[slug]
  if (!tema) throw new Error(`No existe la sala "${slug}"`)
  return tema
}

/**
 * El tema con el que se viste una reunión, tenga sala o no.
 *
 * Una reunión que no pertenece a ninguna sala —un comité, un arranque de
 * campaña— se viste con la identidad de Grupo UPAX, que es la de quien la
 * convoca: Marketing Corp es parte del grupo y no tiene identidad propia.
 * `obtenerTema` sigue existiendo para cuando la sala es segura y un slug
 * inventado debe reventar.
 *
 * OJO CON EL POR DEFECTO: apuntaba a `TEMAS['grupo-upax']`, y al dejar UPAX de
 * ser una sala eso pasó a ser `undefined` — toda reunión sin sala se habría
 * quedado sin tema, sin colores y sin escala de datos, y su documento habría
 * reventado al pintarse. Ahora apunta al objeto, que no depende de qué haya en
 * el registro de salas.
 */
export function temaDeSala(slug: string | null | undefined): Tema {
  return slug ? obtenerTema(slug) : grupoUpax
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

export function slugsDeSalas(): string[] {
  return Object.keys(TEMAS)
}
