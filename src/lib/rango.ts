/**
 * PETICIONES POR RANGO (`Range: bytes=...`), para servir vídeo desde
 * `/api/archivo/[id]` (revisión post-entrega, ronda 9 tarea 7).
 *
 * Sin esto, saltar al minuto tres de un vídeo de 150 MB en vivo se cuelga o
 * reinicia la descarga entera: el navegador no tiene forma de pedir "dame
 * solo estos bytes", y si el archivo no viene optimizado para streaming web
 * (una exportación de móvil o de Zoom — justo lo que va a subir el equipo),
 * ni siquiera puede EMPEZAR a reproducir sin bajarlo completo.
 *
 * Dos piezas puras, pensadas para probarse sin un `Request`/`fetch` real:
 * `interpretarRango` decide QUÉ bytes hay que servir; `recortarStream` los
 * recorta de un `ReadableStream` que ya trae el archivo entero, sin cargarlo
 * completo en memoria.
 *
 * Recorta el stream EN ESTE SERVIDOR, no reenvía `Range` a Vercel Blob: la
 * respuesta de `get()` (`@vercel/blob`) siempre reporta `statusCode: 200`
 * aunque el origen honrara un `Range` que se le mandara — colapsa esa
 * distinción (ver su código fuente, `dist/index.js`), así que confiar en que
 * el stream YA viene recortado sería una suposición no verificable. Cortar
 * aquí es más lento para saltar muy adentro de un archivo grande (los bytes
 * de antes del rango se siguen bajando de Blob, aunque no se reenvían), pero
 * es correcto siempre, sin depender de un comportamiento del origen que no
 * se puede confirmar desde este entorno.
 */

export type Rango =
  | { ok: true; inicio: number; fin: number }
  | { ok: false; motivo: 'sin-cabecera' | 'invalida' | 'no-satisfacible' }

const FORMATO_RANGO = /^bytes=(\d*)-(\d*)$/

/**
 * Interpreta UNA cabecera `Range` de un solo tramo contra el tamaño total ya
 * conocido del archivo. Formas admitidas, las que manda un navegador de
 * verdad al reproducir vídeo: `bytes=A-B`, `bytes=A-` (hasta el final),
 * `bytes=-N` (los últimos N bytes). Un rango de varios tramos
 * (`bytes=0-10,20-30`) no lo pide ningún reproductor de vídeo real — no se
 * admite, se trata como si no hubiera cabecera.
 *
 * `sin-cabecera`/`invalida` → servir el archivo entero con 200 (es lo que
 * pide el RFC 7233 ante un Range que no se entiende: ignorarlo, no rechazar
 * la petición). `no-satisfacible` → 416: se pidieron bytes que no existen.
 */
export function interpretarRango(cabecera: string | null | undefined, tamanoTotal: number): Rango {
  if (!cabecera) return { ok: false, motivo: 'sin-cabecera' }
  if (tamanoTotal <= 0) return { ok: false, motivo: 'invalida' }

  const coincidencia = FORMATO_RANGO.exec(cabecera.trim())
  if (!coincidencia) return { ok: false, motivo: 'invalida' }
  const [, inicioTexto, finTexto] = coincidencia
  if (inicioTexto === '' && finTexto === '') return { ok: false, motivo: 'invalida' }

  let inicio: number
  let fin: number
  if (inicioTexto === '') {
    // "bytes=-N": los últimos N bytes del archivo.
    const n = Number(finTexto)
    if (!Number.isInteger(n) || n <= 0) return { ok: false, motivo: 'invalida' }
    inicio = Math.max(0, tamanoTotal - n)
    fin = tamanoTotal - 1
  } else {
    inicio = Number(inicioTexto)
    fin = finTexto === '' ? tamanoTotal - 1 : Number(finTexto)
  }

  if (!Number.isInteger(inicio) || !Number.isInteger(fin)) return { ok: false, motivo: 'invalida' }
  if (inicio >= tamanoTotal || inicio > fin) return { ok: false, motivo: 'no-satisfacible' }

  // Un `fin` que se pasa del archivo se recorta al último byte real — pedir
  // de más no es un error, el servidor sirve lo que hay (mismo criterio que
  // el resto de servidores HTTP).
  return { ok: true, inicio, fin: Math.min(fin, tamanoTotal - 1) }
}

/**
 * Deja pasar SOLO los bytes `[inicio, fin]` (los dos inclusive) de `origen`,
 * sin acumular el archivo completo en memoria: lee de a un trozo, descarta
 * lo que va antes del rango, recorta el trozo que cruza un borde, y CIERRA
 * la fuente en cuanto se sirvió el último byte pedido — seguir leyendo un
 * archivo de 200 MB para servir sus primeros 500 bytes sería quemar tiempo
 * de función y ancho de banda por nada.
 */
export function recortarStream(
  origen: ReadableStream<Uint8Array>,
  inicio: number,
  fin: number,
): ReadableStream<Uint8Array> {
  const lector = origen.getReader()
  let posicion = 0

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // EN BUCLE dentro de la MISMA llamada a `pull` — no basta con
      // descartar un trozo y volver: nada garantiza que el stream vuelva a
      // invocar `pull` solo porque la vez anterior no encoló nada (el
      // trozo que se descarta, antes del rango pedido, es exactamente ese
      // caso). Se sigue leyendo hasta encolar algo de verdad, cerrar o
      // agotar la fuente.
      for (;;) {
        const { done, value } = await lector.read()
        if (done) {
          controller.close()
          return
        }

        const inicioTrozo = posicion
        const finTrozo = posicion + value.length // exclusivo
        posicion = finTrozo

        if (finTrozo <= inicio) continue // todavía no se llega al rango: se descarta y se sigue leyendo

        if (inicioTrozo > fin) {
          controller.close()
          await lector.cancel().catch(() => {})
          return
        }

        const desde = Math.max(0, inicio - inicioTrozo)
        const hasta = Math.min(value.length, fin - inicioTrozo + 1)
        controller.enqueue(value.subarray(desde, hasta))

        if (finTrozo > fin) {
          controller.close()
          await lector.cancel().catch(() => {})
        }
        return
      }
    },
    async cancel(razon) {
      await lector.cancel(razon)
    },
  })
}
