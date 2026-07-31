/**
 * UNA MARCA COMPLETA A PARTIR DE UN SOLO COLOR.
 *
 * Cuando alguien crea una sala nueva (src/app/salas, ronda 8) escribe un
 * nombre, sube un logo y elige UN color — el primario, el que ya está en su
 * brandbook. Todo lo demás que pide un `Tema` (src/temas/tipos.ts) —
 * secundario, acento, las dos superficies, los dos colores de texto y el
 * degradado — sale de aquí. Lo que NO sale de aquí es `slug` (lo propone
 * `slugDesdeNombre`, pero como función aparte: el formulario la usa para
 * sugerir un identificador que todavía se puede corregir a mano) ni
 * `familiaDisplay`/`familiaTexto` (se eligen, no se derivan de un color).
 *
 * LA REGLA QUE NO SE NEGOCIA: el texto siempre se lee sobre su superficie.
 * `textoSobreClara` y `textoSobreOscura` no son "un color parecido al
 * primario": son el resultado de `ajustarColorParaContraste`
 * (superficie-texto.ts), que matemáticamente siempre encuentra un punto que
 * cumple el mínimo contra la superficie que se le pase — su propio
 * comentario lo dice: "nunca falla". Todo lo demás en este archivo (girar el
 * matiz, desaturar) es composición sobre esa garantía, no un sustituto de
 * ella.
 */

import { hexARgb, hexAHsl, hslAHex } from './color'
import { ajustarColorParaContraste } from './superficie-texto'

/**
 * Los mismos campos que `Tema` menos `slug`, `familiaDisplay` y
 * `familiaTexto`: esos tres no salen de un color, los decide quien crea la
 * sala. No se importa `Tema` de `src/temas/tipos` aquí a propósito: en este
 * código `src/temas` depende de `src/lib` (por ejemplo, de
 * `ajustarColorParaContraste`), nunca al revés — repetir estos nueve campos
 * sale más barato que invertir esa dependencia.
 */
export interface MarcaDerivada {
  nombre: string
  primario: string
  secundario: string
  acento: string
  superficieClara: string
  superficieOscura: string
  textoSobreClara: string
  textoSobreOscura: string
  gradiente: string[]
}

/** WCAG AA para texto normal: el mismo mínimo que ya usa el resto de la app (temas.test.ts, colorDeTextoDeMarca en src/temas/index.ts). */
const CONTRASTE_MINIMO_TEXTO = 4.5

/**
 * SECUNDARIO Y ACENTO: split-complementario clásico. En vez de un
 * complementario puro (180°, el choque máximo entre dos colores) se usan los
 * dos matices a 180° ± 30° = 150° y 210°: un triángulo de tres tonos que se
 * distinguen entre sí sin "pelearse" visualmente. No es un número inventado
 * para esta tarea — es la construcción de rueda de color más citada para
 * sacar una paleta de tres colores de un solo tono de partida — y cae dentro
 * de lo que ya usan las marcas reales de UPAX: la distancia de matiz entre
 * primario y secundario va de ~85° (Zeus, morado→rosa) a ~177° (Promo
 * Espacio, naranja→teal) entre las nueve UDN; 150 queda cómodo en medio.
 */
const ROTACION_SECUNDARIO_GRADOS = 150
const ROTACION_ACENTO_GRADOS = 210

/**
 * Además de girar el matiz, secundario y acento se separan un poco en
 * luminosidad: dos colores del mismo "peso" visual, distinguibles solo por
 * matiz, se leen más como una variación accidental que como dos colores de
 * marca a propósito. No son simétricos: el acento es la voz que se usa para
 * resaltar (un botón, un dato marcado — ver `--acento` en deck.module.css) y
 * se aclara para sentirse más vívido; el secundario acompaña al primario un
 * paso por detrás, y se oscurece. El rango [12,88] evita que un primario ya
 * muy claro o muy oscuro empuje a cualquiera de los dos hasta un blanco o
 * negro sin matiz reconocible — ahí ya no se leerían como "derivados del
 * color", se leerían como ruido.
 */
const DELTA_L_SECUNDARIO = -8
const DELTA_L_ACENTO = 10
const L_MINIMA_SECUNDARIO_ACENTO = 12
const L_MAXIMA_SECUNDARIO_ACENTO = 88

/**
 * SUPERFICIES: el primario "muy desaturado". La saturación se topa en 10 —o
 * menos, si el primario tiene menos: nunca se inventa más color del que el
 * primario ya tenía. Un primario gris (s=0, sin matiz definido — el caso
 * `#111111` del test) debe dar una superficie gris, no un tinte rojo
 * inventado en h=0, que es el matiz que devuelve `hexAHsl` por convención
 * cuando no hay ninguno real (ver su código: con d===0, h se queda en 0).
 * La luminosidad se lleva casi al extremo (97 en la clara, 12 en la oscura):
 * es el mismo patrón que ya usa UiX a mano (`superficieClara: '#F0F0F3'`, un
 * blanco con el pelo justo de morado) en vez del blanco puro que usan las
 * otras ocho marcas.
 */
const SATURACION_MAXIMA_SUPERFICIE = 10
const L_SUPERFICIE_CLARA = 97
const L_SUPERFICIE_OSCURA = 12

/**
 * GRADIENTE: primario → una variante más oscura de sí mismo (mismo matiz y
 * saturación, -25 de luminosidad), no una mezcla con el secundario — así lo
 * pide el brief, y así queda como un "duotono" de una sola marca en vez de
 * una transición a un color distinto. Sin piso propio: si el primario ya es
 * casi negro, `acotar` evita bajar de 0 y la segunda parada es, como mucho,
 * negro puro — que sigue siendo "una variante más oscura".
 */
const DELTA_L_GRADIENTE = 25

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor))
}

/**
 * `hslAHex` devuelve hex en MAYÚSCULAS (ver `rgbAHex` en color.ts); esto lo
 * baja a minúsculas para que todo el objeto que arma `derivarMarca` use el
 * mismo caso que `primario` — ver el test "conserva el color de marca tal
 * cual". Mezclar mayúsculas y minúsculas dentro del mismo tema no cambia
 * ningún color (el hex no distingue caso), pero se lee como descuido.
 */
function colorDerivado(h: number, s: number, l: number): string {
  return hslAHex(h, s, l).toLowerCase()
}

/**
 * Valida — reutilizando `hexARgb`, que ya lanza en formato inválido, sin
 * repetir esa regla aquí — y normaliza a `#` + 6 dígitos en minúsculas: la
 * forma canónica que usa el resto de este archivo.
 */
function normalizarHex(hex: string): string {
  const limpio = hex.trim()
  hexARgb(limpio)
  return `#${limpio.replace(/^#/, '').toLowerCase()}`
}

/**
 * EL IDENTIFICADOR DE UNA SALA, A PARTIR DE SU NOMBRE.
 *
 * Minúsculas, sin acentos (NFD separa cada letra acentuada en letra base +
 * marca diacrítica; `\p{Diacritic}` con el flag `u` pide "cualquier marca
 * diacrítica" sin enumerar el rango Unicode a mano) y con un guion donde
 * había cualquier cosa que no sea letra o número. Un solo reemplazo colapsa
 * de paso los guiones repetidos y los que vendrían de puntuación consecutiva
 * (espacios dobles, "/ "): una racha de caracteres no alfanuméricos —sea cual
 * sea su origen— se convierte en un único guion.
 */
export function slugDesdeNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * LA DERIVACIÓN. Un solo color de entrada (el primario, tal como está en el
 * brandbook: no se le toca ni el matiz ni la saturación) produce los otros
 * ocho campos de una marca completa.
 */
export function derivarMarca(nombre: string, primario: string): MarcaDerivada {
  const primarioNormalizado = normalizarHex(primario)
  const { h, s, l } = hexAHsl(primarioNormalizado)

  const secundario = colorDerivado(
    h + ROTACION_SECUNDARIO_GRADOS,
    s,
    acotar(l + DELTA_L_SECUNDARIO, L_MINIMA_SECUNDARIO_ACENTO, L_MAXIMA_SECUNDARIO_ACENTO),
  )
  const acento = colorDerivado(
    h + ROTACION_ACENTO_GRADOS,
    s,
    acotar(l + DELTA_L_ACENTO, L_MINIMA_SECUNDARIO_ACENTO, L_MAXIMA_SECUNDARIO_ACENTO),
  )

  const saturacionSuperficie = Math.min(SATURACION_MAXIMA_SUPERFICIE, s)
  const superficieClara = colorDerivado(h, saturacionSuperficie, L_SUPERFICIE_CLARA)
  const superficieOscura = colorDerivado(h, saturacionSuperficie, L_SUPERFICIE_OSCURA)

  // Texto sobre superficie clara: parte del primario mismo — mismo patrón que
  // `colorDeTextoDeMarca` (src/temas/index.ts) para el mismo problema, un
  // color de marca que debe volverse legible sin dejar de ser él.
  // `ajustarColorParaContraste` lo deja intacto si ya se lee, o lo oscurece
  // conservando su matiz hasta cumplir el mínimo.
  const textoSobreClara = ajustarColorParaContraste(
    primarioNormalizado,
    superficieClara,
    CONTRASTE_MINIMO_TEXTO,
  ).toLowerCase()

  // Texto sobre superficie oscura: parte de blanco puro, no del primario
  // aclarado, porque las nueve marcas reales de src/temas —sin ninguna
  // excepción— usan blanco ahí. No hay motivo para que la derivación
  // automática invente una variante que ninguna marca a mano eligió.
  const textoSobreOscura = ajustarColorParaContraste(
    '#ffffff',
    superficieOscura,
    CONTRASTE_MINIMO_TEXTO,
  ).toLowerCase()

  const gradienteOscuro = colorDerivado(h, s, acotar(l - DELTA_L_GRADIENTE, 0, 100))

  return {
    nombre: nombre.trim(),
    primario: primarioNormalizado,
    secundario,
    acento,
    superficieClara,
    superficieOscura,
    textoSobreClara,
    textoSobreOscura,
    gradiente: [primarioNormalizado, gradienteOscuro],
  }
}
