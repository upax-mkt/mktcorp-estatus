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
 * distinguen entre sí sin "pelearse" visualmente. Es la construcción de rueda
 * de color más citada para sacar una paleta de tres tonos de un solo color de
 * partida: separa lo suficiente para no confundirse con el primario, sin
 * llegar al choque máximo de un complementario puro.
 *
 * CORRECCIÓN (revisión, 30-jul): esta nota citaba antes un respaldo empírico
 * que no resistió la comprobación ("la distancia entre primario y secundario
 * va de ~85° a ~177° entre las nueve UDN reales; 150 queda cómodo en medio").
 * Medido de verdad con `hexAHsl` sobre las nueve marcas (tabla completa en el
 * reporte de esta tarea): el rango real es 13° (House of Films) a 172°
 * (Promo Espacio), con mediana ~78°. 150° cae del lado ALTO de ese rango, no
 * en medio — cuatro marcas están por debajo de 35° (primario y secundario
 * casi análogos) y solo cuatro superan los 90°. La elección de 150°/210° no
 * se apoya en ese dato: se apoya en la construcción de rueda de color del
 * párrafo de arriba, que sigue siendo válida por sí sola.
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
 * CORRECCIÓN (revisión, 30-jul): con un primario acromático extremo
 * (`#000000` o `#FFFFFF`) los dos clamps de arriba chocaban contra el MISMO
 * tope del rango —los dos caían en 12, o los dos en 88— y con saturación 0 el
 * matiz no salva nada (girar 150° o 210° un gris sigue dando el mismo gris):
 * secundario y acento salían literalmente idénticos. `separarSiChocan` (más
 * abajo) repara esto DESPUÉS del clamp individual, solo cuando hace falta:
 * si los dos valores quedan a menos de esta distancia, los reparte alrededor
 * de su punto medio sin sacarlos de [12,88]. 16 es bastante menos que el
 * ancho total del rango (76), así que la ventana de separación siempre cabe
 * sin tener que tocar los dos topes a la vez. Se reutiliza el mismo número
 * para la segunda parada del degradado, más abajo: es la misma pregunta
 * ("¿esto se nota distinto?"), no dos reglas separadas.
 */
const SEPARACION_MINIMA_L = 16

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
 * una transición a un color distinto.
 *
 * La excepción, tratada donde se calcula la segunda parada (`derivarMarca`,
 * más abajo): un primario ya pegado al negro no deja margen para oscurecer
 * lo bastante —en el caso extremo, un primario `#000000` no tiene "más
 * oscuro" posible, y las dos paradas salían IDÉNTICAS—, así que ahí, y solo
 * ahí, se aclara en su lugar. Para cualquier primario con l ≥ 16 (la enorme
 * mayoría de colores de marca reales) esto no aplica: el degradado es
 * exactamente "primario → -25 de luminosidad", sin excepción.
 */
const DELTA_L_GRADIENTE = 25

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor))
}

/**
 * Si `lo` y `hi` (cada uno ya clampeado a [minimo,maximo] por su cuenta)
 * quedaron a menos de `separacionMinima` de distancia, los reparte alrededor
 * de su propio punto medio y desliza la ventana resultante hacia dentro del
 * rango si se sale por algún lado — sin perder ancho de separación por
 * deslizarse: `separacionMinima` se topa a `maximo - minimo` primero, así que
 * la ventana siempre cabe entera en algún punto del rango. Si ya venían
 * separados, no los toca.
 *
 * Asume `lo <= hi` a la entrada. Vale aquí porque el delta de secundario
 * siempre es menor que el de acento (-8 contra +10) y `acotar` es una función
 * no decreciente: no puede invertir el orden de dos valores que ya estaban
 * ordenados.
 */
function separarSiChocan(
  lo: number,
  hi: number,
  separacionMinima: number,
  minimo: number,
  maximo: number,
): [number, number] {
  const separacion = Math.min(separacionMinima, maximo - minimo)
  if (hi - lo >= separacion) return [lo, hi]

  const centro = (lo + hi) / 2
  let loNuevo = centro - separacion / 2
  let hiNuevo = centro + separacion / 2
  if (loNuevo < minimo) {
    hiNuevo += minimo - loNuevo
    loNuevo = minimo
  }
  if (hiNuevo > maximo) {
    loNuevo -= hiNuevo - maximo
    hiNuevo = maximo
  }
  return [loNuevo, hiNuevo]
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
 *
 * CONTRATO (revisión, 30-jul): si `nombre` no tiene NINGÚN carácter
 * alfanumérico latino sin acento —vacío, solo espacios, solo símbolos, solo
 * guiones, solo emoji— esta función devuelve `''`. No lanza ni inventa un
 * valor de relleno: es una transformación de texto, no un validador. Este
 * slug termina como identificador de una sala (clave primaria, segmento de
 * URL — ver la tarea 6, `FormularioSala`/`crearSalaAction`); quien lo
 * consuma es responsable de rechazar `''` antes de guardarlo. Se documenta
 * aquí a propósito para que esa responsabilidad no dependa de leer esta
 * implementación.
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

  const lSecundarioObjetivo = acotar(
    l + DELTA_L_SECUNDARIO, L_MINIMA_SECUNDARIO_ACENTO, L_MAXIMA_SECUNDARIO_ACENTO,
  )
  const lAcentoObjetivo = acotar(
    l + DELTA_L_ACENTO, L_MINIMA_SECUNDARIO_ACENTO, L_MAXIMA_SECUNDARIO_ACENTO,
  )
  const [lSecundario, lAcento] = separarSiChocan(
    lSecundarioObjetivo,
    lAcentoObjetivo,
    SEPARACION_MINIMA_L,
    L_MINIMA_SECUNDARIO_ACENTO,
    L_MAXIMA_SECUNDARIO_ACENTO,
  )
  const secundario = colorDerivado(h + ROTACION_SECUNDARIO_GRADOS, s, lSecundario)
  const acento = colorDerivado(h + ROTACION_ACENTO_GRADOS, s, lAcento)

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

  // Objetivo: -25 de luminosidad (más oscura). `lGradienteObjetivo` siempre
  // es <= l (restar un delta positivo y clampear a [0,100] nunca puede subir
  // el valor por encima de donde partió), así que "l - lGradienteObjetivo"
  // sin valor absoluto ya es la distancia real. Si el primario está a menos
  // de SEPARACION_MINIMA_L de negro puro, ese objetivo se clampea a 0 y
  // queda MÁS CERCA de `l` de lo que hace falta para leerse como una
  // segunda parada de verdad — el caso extremo, primario `#000000`, no tiene
  // margen ninguno (0 de distancia: las dos paradas salían idénticas). Ahí
  // no existe "más oscura que negro", así que se aclara en su lugar.
  const lGradienteObjetivo = acotar(l - DELTA_L_GRADIENTE, 0, 100)
  const lGradienteSegundaParada =
    l - lGradienteObjetivo >= SEPARACION_MINIMA_L ? lGradienteObjetivo : l + SEPARACION_MINIMA_L
  const gradienteSegundaParada = colorDerivado(h, s, lGradienteSegundaParada)

  return {
    nombre: nombre.trim(),
    primario: primarioNormalizado,
    secundario,
    acento,
    superficieClara,
    superficieOscura,
    textoSobreClara,
    textoSobreOscura,
    gradiente: [primarioNormalizado, gradienteSegundaParada],
  }
}

/** Un hex de seis dígitos con almohadilla — lo único que aquí se acepta. */
const HEX_DE_SEIS = /^#[0-9a-fA-F]{6}$/

/**
 * LA MARCA, CON LO QUE SE ESCRIBIÓ A MANO ENCIMA DE LO DERIVADO.
 *
 * `derivarMarca` saca el secundario y el acento rotando el TONO del primario,
 * y eso solo funciona si el primario tiene tono: con negro, blanco o gris
 * —croma cero— rotar devuelve el mismo color, que es de donde salían las
 * escalas de gris que reportó Franco (*"cuando selecciono el negro solo me
 * hace combinaciones de grises, siendo que hoy tiene negro, azul y otros"*).
 *
 * Lo escrito manda; lo vacío se deriva. Las superficies, los textos legibles y
 * el degradado se siguen derivando siempre del primario: son cálculos de
 * legibilidad (contraste AA), no decisiones de marca.
 *
 * VIVE AQUÍ Y NO EN LA SERVER ACTION que la estrenó (`app/salas/acciones.ts`):
 * la vista previa del formulario tiene que enseñar EXACTAMENTE lo que se va a
 * guardar, y mientras esta función vivió solo del lado del servidor la previa
 * seguía derivando del primario — le enseñaba a quien acababa de escribir un
 * azul a mano el gris que venía a corregir.
 */
/**
 * EL TEXTO LEGIBLE SOBRE UNA SUPERFICIE OSCURA ESCRITA A MANO.
 *
 * Misma regla que usa `derivarMarca`: se parte del blanco puro —las nueve
 * marcas reales lo usan ahí, sin excepción— y se ajusta hasta cumplir el
 * contraste mínimo. Se expone aparte porque la franja de la sala ya se puede
 * escribir a mano (ver `editarSalaAction`), y cambiar el fondo sin recalcular
 * su texto es exactamente cómo una franja se vuelve ilegible.
 */
export function colorDeTextoSobre(superficie: string): string {
  return ajustarColorParaContraste('#ffffff', superficie, CONTRASTE_MINIMO_TEXTO).toLowerCase()
}

export function marcaConSobrescritos(
  nombre: string,
  primario: string,
  secundario?: string | null,
  acento?: string | null,
): MarcaDerivada {
  const base = derivarMarca(nombre, primario)
  return {
    ...base,
    ...(secundario && HEX_DE_SEIS.test(secundario) ? { secundario: secundario.toLowerCase() } : {}),
    ...(acento && HEX_DE_SEIS.test(acento) ? { acento: acento.toLowerCase() } : {}),
  }
}
