/**
 * LA MEDICIÓN DE TINTA DE UN LOGO (tarea 6, ronda 8).
 *
 * `src/temas/logos.ts` normaliza el alto de cada logotipo por MANCHA, no por
 * altura de archivo: los diez lockups van de 1,64:1 a 6,80:1 de proporción, y
 * a la misma altura uno ocupa hasta cuatro veces más superficie que otro — el
 * ojo no compara alturas, compara mancha. Hasta el 30-jul esa medición se
 * hacía con un script fuera de la app, a mano, sala por sala. Un logo subido
 * desde `/salas` no puede esperar a que alguien corra un script: se mide
 * aquí, en el propio navegador, en el instante en que se elige el archivo.
 *
 * Dos funciones, separadas a propósito:
 *
 * - `proporcionDeTinta` es PURA: opera sobre los bytes RGBA crudos que ya
 *   salieron de un canvas. Es lo único de este archivo que un test puede
 *   ejercitar sin DOM — ver `tinta.test.ts`.
 * - `medirTinta` es el ayudante IMPURO que pinta la imagen real en un
 *   `<canvas>` (usa `document`, `HTMLCanvasElement`) y le pasa los datos a
 *   `proporcionDeTinta`. Vive del lado del navegador — lo llama
 *   `FormularioSala` al elegir el archivo del logo, antes de subirlo — y no
 *   lo cubre un test unitario por eso mismo: jsdom no implementa `<canvas>`
 *   de verdad, y no vale la pena la dependencia de un paquete de canvas nativo
 *   solo para probar una función que ya delega toda su lógica a la otra.
 */

/**
 * Qué fracción de `datos` (bytes RGBA de un `ImageData`, cuatro por píxel)
 * tiene ALGO de tinta: el canal alfa por encima de cero.
 *
 * "No transparente" se decide por umbral, no por intensidad: un píxel de
 * antialiasing con alfa=40 sigue siendo tinta, aunque tenue. Contar en vez de
 * sumar intensidades es la lectura más simple de "se cuentan los píxeles no
 * transparentes" (spec de la ronda 8) y es la que hace que un logo con
 * bastante aire alrededor —la mayoría de los lockups reales— dé una
 * proporción baja, que es justo la señal que la fórmula de `src/temas/logos.ts`
 * espera para agrandar el logo.
 *
 * `1` es el caso límite: SIN transparencia, todo el lienzo es tinta. No es un
 * error de esta función —es la lectura correcta de esos bytes— pero sí es la
 * señal de que el archivo no trae la forma recortada que un logo necesita
 * (un JPG, o un PNG exportado con fondo blanco sólido). Avisar de eso es
 * trabajo de quien llama (`FormularioSala`), no de esta función.
 *
 * `0` para un lienzo vacío (ancho o alto cero → `datos.length === 0`): "0 de
 * 0" no es una proporción, y dividir por cero daría `NaN`, que arruinaría
 * cualquier cálculo posterior sin avisar.
 */
export function proporcionDeTinta(datos: Uint8ClampedArray): number {
  const totalPixeles = datos.length / 4
  if (totalPixeles === 0) return 0

  let conTinta = 0
  for (let i = 3; i < datos.length; i += 4) {
    if (datos[i] > 0) conTinta++
  }
  return conTinta / totalPixeles
}

/**
 * Pinta `imagen` (ya cargada — `naturalWidth`/`naturalHeight` deben venir
 * resueltos, típicamente desde el `onload` de un `<img>`) en un `<canvas>`
 * del mismo tamaño y mide su tinta con `proporcionDeTinta`.
 *
 * Sin contexto 2D (no debería pasar en un navegador real) no hay nada que
 * medir: devuelve 1, la lectura más conservadora — la misma señal que un
 * archivo sin transparencia, así que `FormularioSala` avisa en vez de
 * guardar un tamaño de logo silenciosamente equivocado.
 */
export function medirTinta(imagen: HTMLImageElement): number {
  const lienzo = document.createElement('canvas')
  lienzo.width = imagen.naturalWidth
  lienzo.height = imagen.naturalHeight

  const ctx = lienzo.getContext('2d')
  if (!ctx) return 1

  ctx.drawImage(imagen, 0, 0)
  const { data } = ctx.getImageData(0, 0, lienzo.width, lienzo.height)
  return proporcionDeTinta(data)
}
