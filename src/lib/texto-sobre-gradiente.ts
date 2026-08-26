import { contraste, hexARgb, luminancia, rgbAHex } from './color'

/**
 * EL MÍNIMO LEGIBLE, WCAG AA. Es el mismo 4,5:1 que usa `CONTRASTE_MINIMO_TEXTO`
 * en `marca.ts` para las superficies sólidas; se importa de allí para que no
 * haya dos umbrales que puedan separarse con el tiempo.
 */
export { CONTRASTE_MINIMO_TEXTO as CONTRASTE_MINIMO_GRADIENTE } from './marca'
import { CONTRASTE_MINIMO_TEXTO } from './marca'

/**
 * El punto de equilibrio entre blanco y negro: la luminancia a la que un color
 * contrasta IGUAL contra el blanco puro y contra el negro puro
 * (√(1,05 × 0,05) − 0,05). Por encima, un texto se defiende mejor con un fondo
 * oscuro debajo; por debajo, con uno claro. Sale de la propia fórmula de
 * contraste de WCAG, no de una preferencia.
 */
const LUMINANCIA_DE_EQUILIBRIO = Math.sqrt(1.05 * 0.05) - 0.05

/**
 * La finura con la que se busca el velo. 0,005 en opacidad es invisible a
 * simple vista y evita quedarse a una centésima por debajo del mínimo.
 */
const PASO_DE_BUSQUEDA = 0.005

const RGBA = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/

/**
 * COMPONE UN VELO SEMITRANSPARENTE SOBRE UN FONDO SÓLIDO, igual que lo hace el
 * navegador al apilar dos capas: `resultado = velo × α + fondo × (1 − α)`.
 *
 * Se necesita porque el contraste no se puede medir contra una capa con alfa:
 * hay que saber primero de qué color queda el fondo una vez compuesto.
 */
export function componerSobre(velo: string, fondo: string): string {
  const partes = RGBA.exec(velo.trim())
  if (!partes) throw new Error(`velo inválido, se esperaba rgba(): ${velo}`)
  const [, r, g, b, a] = partes
  const alfa = Number(a)
  const capa = { r: Number(r), g: Number(g), b: Number(b) }
  const debajo = hexARgb(fondo)
  const mezclar = (arriba: number, abajo: number) => Math.round(arriba * alfa + abajo * (1 - alfa))
  return rgbAHex(mezclar(capa.r, debajo.r), mezclar(capa.g, debajo.g), mezclar(capa.b, debajo.b))
}

/**
 * UN PUNTO CUALQUIERA DEL RECORRIDO DE UN DEGRADADO, con `avance` entre 0 y 1.
 * Interpola en sRGB componente a componente, que es exactamente lo que hace
 * `linear-gradient` por omisión.
 */
export function puntoDelGradiente(paradas: string[], avance: number): string {
  if (paradas.length === 1) return paradas[0]
  const tramos = paradas.length - 1
  const escalado = Math.min(Math.max(avance, 0), 1) * tramos
  const i = Math.min(Math.floor(escalado), tramos - 1)
  const f = escalado - i
  const desde = hexARgb(paradas[i])
  const hasta = hexARgb(paradas[i + 1])
  const mezclar = (a: number, b: number) => Math.round(a + (b - a) * f)
  return rgbAHex(mezclar(desde.r, hasta.r), mezclar(desde.g, hasta.g), mezclar(desde.b, hasta.b))
}

/**
 * CUÁNTOS PUNTOS DEL RECORRIDO SE MIRAN. Las paradas solas NO bastan, y esto
 * no es teoría: la primera versión de este módulo validaba solo los extremos y
 * dio por buena a Mexa Creativa, cuyas cifras se quedaban en 4,08:1 a 390 px.
 * Un degradado interpola en sRGB y el camino entre dos colores puede pasar por
 * sitios más oscuros que sus dos puntas —el magenta y el azul de Mexa se
 * cruzan por morados que ninguno de los dos anticipa—. El paso es del 1% del
 * recorrido: más fino que cualquier diferencia que un ojo pueda notar, y son
 * cien multiplicaciones por sala.
 */
const MUESTRAS_DEL_RECORRIDO = 101

/**
 * El contraste del texto contra el PEOR punto de todo el recorrido, ya
 * compuesto con el velo. No contra las paradas: contra el camino entero.
 */
function peorContraste(texto: string, paradas: string[], velo: string | null): number {
  let peor = Infinity
  for (let i = 0; i < MUESTRAS_DEL_RECORRIDO; i++) {
    const punto = puntoDelGradiente(paradas, i / (MUESTRAS_DEL_RECORRIDO - 1))
    const fondo = velo ? componerSobre(velo, punto) : punto
    peor = Math.min(peor, contraste(texto, fondo))
  }
  return peor
}

/**
 * EL VELO MÍNIMO QUE HACE LEGIBLE UN TEXTO SOBRE TODO EL RECORRIDO DE UN
 * DEGRADADO. `null` cuando no hace ninguna falta.
 *
 * POR QUÉ UN VELO Y NO OTRO COLOR DE TEXTO. La barra de un módulo plegado no
 * tiene UN fondo: tiene un degradado de 120° a lo ancho de mil píxeles, con el
 * título pegado al borde izquierdo y la cifra al 96%. Cuando las dos paradas
 * están lejos en luminancia —el naranja y el negro de Promo Espacio, el azul y
 * el turquesa de NeraCode— **no existe ningún color plano que se lea sobre
 * todo el trayecto**: el que gana en un extremo pierde en el otro. Está en la aritmética,
 * no en la elección. La única salida que conserva el degradado es acercar sus
 * paradas entre sí, y eso es exactamente lo que hace una capa uniforme encima.
 *
 * Y POR QUÉ EL MÍNIMO. Cada décima de velo apaga la marca de una sala, que es
 * lo único que la barra plegada está ahí para enseñar ("cada sala reconoce su
 * casa", PRODUCT.md). Se busca el α más pequeño que cumpla, no uno cómodo.
 */
export function veloParaGradiente(
  texto: string,
  paradas: string[],
  minimo: number = CONTRASTE_MINIMO_TEXTO,
): string | null {
  if (peorContraste(texto, paradas, null) >= minimo) return null

  // Un texto claro se defiende oscureciendo lo que tiene debajo, y uno oscuro
  // aclarándolo. La dirección la decide la luminancia del texto contra el
  // punto de equilibrio; probar ambas y quedarse con la mejor daría lo mismo
  // y costaría el doble.
  const capa = luminancia(texto) > LUMINANCIA_DE_EQUILIBRIO ? '0, 0, 0' : '255, 255, 255'
  const conAlfa = (alfa: number) => `rgba(${capa}, ${alfa.toFixed(3)})`

  // Con el velo opaco el fondo ES la capa —blanco o negro puros— así que si ni
  // ahí se cumple, no hay más que dar: se devuelve el opaco y no se falla.
  // Mismo criterio que `ajustarColorParaContraste` con sus extremos.
  if (peorContraste(texto, paradas, conAlfa(1)) < minimo) return conAlfa(1)

  // Búsqueda binaria del α más pequeño que cumple. El contraste crece de forma
  // monótona con α —cada paso acerca el fondo a la capa y la capa es el
  // extremo opuesto al texto—, así que la bisección es válida.
  let noCumple = 0
  let cumple = 1
  while (cumple - noCumple > PASO_DE_BUSQUEDA) {
    const medio = (noCumple + cumple) / 2
    if (peorContraste(texto, paradas, conAlfa(medio)) >= minimo) cumple = medio
    else noCumple = medio
  }
  return conAlfa(Math.ceil(cumple * 1000) / 1000)
}

/**
 * EL COLOR DEL TÍTULO DE UN MÓDULO PLEGADO Y EL VELO QUE LO SOSTIENE.
 *
 * Tres reglas, en este orden:
 *
 * 1. **Lo escrito manda** (decisión de Franco del 20-ago-2026). Un color
 *    elegido a mano en los ajustes de la sala no se sustituye nunca; se le
 *    calcula el velo que necesite y punto.
 * 2. **Lo derivado que ya se lee, se respeta.** Si el color que venía saliendo
 *    cumple en todo el recorrido, se queda tal cual: las salas que hoy
 *    están bien no cambian ni un píxel.
 * 3. **Lo derivado que no se lee se sustituye por el extremo que menos velo
 *    pida** — porque menos velo es más marca a la vista. Aquí es donde muere
 *    el defecto que reportó Franco: el derivado partía del blanco y, cuando el
 *    blanco no llegaba, se iba al negro mirando UNA sola parada. Sobre el
 *    naranja de Promo Espacio devolvía un casi negro que cumplía por los pelos
 *    a la izquierda y desaparecía a la derecha.
 */
export function textoYVeloSobreGradiente(
  paradas: string[],
  derivado: string,
  escritoAMano?: string | null,
  minimo: number = CONTRASTE_MINIMO_TEXTO,
): { texto: string; velo: string | null } {
  if (escritoAMano) {
    return { texto: escritoAMano, velo: veloParaGradiente(escritoAMano, paradas, minimo) }
  }
  if (peorContraste(derivado, paradas, null) >= minimo) {
    return { texto: derivado, velo: null }
  }

  const blanco = { texto: '#ffffff', velo: veloParaGradiente('#ffffff', paradas, minimo) }
  const negro = { texto: '#000000', velo: veloParaGradiente('#000000', paradas, minimo) }

  // EL BLANCO ES LA CONVENCIÓN DE LA CASA —nueve de las diez marcas reales lo
  // usan sobre su franja— y no se abandona por una diferencia que nadie va a
  // ver. Solo cuando conservarlo cuesta un velo NOTABLEMENTE mayor gana el
  // negro: ahí lo que está en juego ya no es la convención sino cuánta marca
  // queda encendida. El caso que fija el umbral es NeraCode, cuyo degradado
  // cruza de un azul oscuro a un turquesa brillante: mantener el blanco pide
  // 0,415 de velo y apaga el turquesa entero; el negro se conforma con 0,250.
  const ventajaDelNegro = alfaDe(blanco.velo) - alfaDe(negro.velo)
  return ventajaDelNegro > VENTAJA_PARA_ABANDONAR_EL_BLANCO ? negro : blanco
}

/** Cuánto velo de más tiene que costar el blanco para que valga la pena dejarlo. */
const VENTAJA_PARA_ABANDONAR_EL_BLANCO = 0.1

function alfaDe(velo: string | null): number {
  return velo ? Number(RGBA.exec(velo)![4]) : 0
}
