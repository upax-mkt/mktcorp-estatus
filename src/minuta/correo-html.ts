/**
 * EL MISMO CORREO, EN HTML, para que al pegarlo en Gmail se vea como un correo.
 *
 * Franco: "el resultado debería venir con algo de formato para copiar y pegar
 * en mail, sobre todo las tablas, poner algo en bold".
 *
 * El problema real es la tabla. Se arma alineada con barras —`Acción | Owner |
 * Fecha`— y eso solo se lee en tipografía monoespaciada. Gmail compone en
 * Arial: al pegarla, las columnas dejan de existir y quedan tres frases
 * seguidas separadas por palotes. Los encabezados de bloque tienen el mismo
 * problema al revés: son la estructura del correo y llegan como una línea más.
 *
 * SE CONVIERTE EL TEXTO, NO SE GENERA APARTE. La minuta la redacta el modelo
 * una vez y se guarda como texto; tener una segunda versión en HTML guardada
 * al lado significaría dos verdades que se pueden separar. Aquí se lee la que
 * hay y se le devuelve su forma: lo que se copia y lo que se archiva siguen
 * siendo el mismo correo.
 *
 * POR QUÉ SE PUEDE ANALIZAR SIN ADIVINAR: este texto no es cualquier texto —
 * lo arma `ensamblarCorreo` con el molde, así que su forma la ponemos
 * nosotros. Aun así, cada regla falla hacia el lado seguro: lo que no se
 * reconoce sale como párrafo. Un encabezado sin negritas es un correo feo; una
 * tabla mal partida es un correo ilegible.
 *
 * ESTILOS EN LÍNEA, sin excepción: Gmail borra el `<style>` de la cabecera al
 * pegar, y una clase sin hoja de estilos no pinta nada.
 */

const ESTILOS = {
  cuerpo: 'font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a',
  parrafo: 'margin:0 0 12px',
  encabezado: 'margin:0 0 6px;font-size:14px',
  lista: 'margin:0 0 12px;padding-left:22px',
  item: 'margin:0 0 5px',
  tabla: 'border-collapse:collapse;margin:2px 0 14px;font-size:13px',
  th: 'text-align:left;padding:7px 12px 7px 0;border-bottom:2px solid #1a1a1a;font-weight:bold',
  td: 'text-align:left;padding:7px 12px 7px 0;border-bottom:1px solid #dcdcdc;vertical-align:top',
} as const

const VINETA = /^\s*[*\-•]\s+/
/** Una fila de tabla: dos celdas o más separadas por barra. */
const CELDAS = / \| /

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function celdas(linea: string): string[] {
  return linea.split('|').map((c) => c.trim())
}

/**
 * ¿Es esta línea el encabezado de su bloque?
 *
 * Solo la primera de un bloque que tiene más cosas debajo. Un bloque de una
 * sola línea es el saludo, la entradilla o la despedida — texto, no estructura.
 * Y una línea que termina en punto es una frase, por corta que sea.
 */
function esEncabezado(linea: string, lineasDelBloque: number): boolean {
  if (lineasDelBloque < 2) return false
  if (VINETA.test(linea) || CELDAS.test(linea)) return false
  if (linea.length > 90) return false
  return !/[.,;]$/.test(linea.trim())
}

/** El enlace del pie: relativo en el texto, absoluto y pinchable en el correo. */
function comoEnlace(linea: string, base: string): string | null {
  const t = linea.trim()
  if (/^https?:\/\/\S+$/.test(t)) return t
  if (/^\/[\w\-/]*$/.test(t)) return base ? `${base}${t}` : null
  return null
}

function bloqueDeTabla(lineas: string[]): string {
  const [cabecera, ...cuerpo] = lineas.map(celdas)
  const th = cabecera.map((c) => `<th style="${ESTILOS.th}">${escapar(c)}</th>`).join('')
  const filas = cuerpo
    .map((fila) => {
      // Se rellena hasta el ancho de la cabecera: una fila corta desalinearía
      // la tabla entera, y prefiero una celda vacía a una columna corrida.
      const celdasFila = Array.from({ length: cabecera.length }, (_, i) => fila[i] ?? '')
      return `<tr>${celdasFila.map((c) => `<td style="${ESTILOS.td}">${escapar(c)}</td>`).join('')}</tr>`
    })
    .join('')
  return `<table style="${ESTILOS.tabla}"><thead><tr>${th}</tr></thead><tbody>${filas}</tbody></table>`
}

/**
 * Convierte el correo de la minuta a HTML listo para pegar.
 *
 * @param base El origen de la app (`location.origin`), para dejar el enlace del
 *   pie absoluto. Vacío = el enlace se queda como texto, que es lo honesto: un
 *   `href` a una ruta relativa dentro de un correo no lleva a ningún sitio.
 */
export function correoAHtml(texto: string, base = ''): string {
  const bloques = texto
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.split('\n').filter((l) => l.trim().length > 0))
    .filter((b) => b.length > 0)

  const partes: string[] = []

  for (const bloque of bloques) {
    let i = 0
    while (i < bloque.length) {
      const linea = bloque[i]

      if (i === 0 && esEncabezado(linea, bloque.length)) {
        partes.push(`<p style="${ESTILOS.encabezado}"><strong>${escapar(linea.trim())}</strong></p>`)
        i++
        continue
      }

      if (CELDAS.test(linea)) {
        const fin = bloque.findIndex((l, j) => j >= i && !CELDAS.test(l))
        const hasta = fin === -1 ? bloque.length : fin
        partes.push(bloqueDeTabla(bloque.slice(i, hasta)))
        i = hasta
        continue
      }

      if (VINETA.test(linea)) {
        const items: string[] = []
        while (i < bloque.length && VINETA.test(bloque[i])) {
          items.push(`<li style="${ESTILOS.item}">${escapar(bloque[i].replace(VINETA, '').trim())}</li>`)
          i++
        }
        partes.push(`<ul style="${ESTILOS.lista}">${items.join('')}</ul>`)
        continue
      }

      const enlace = comoEnlace(linea, base)
      if (enlace) {
        partes.push(`<p style="${ESTILOS.parrafo}"><a href="${escapar(enlace)}">${escapar(enlace)}</a></p>`)
        i++
        continue
      }

      partes.push(`<p style="${ESTILOS.parrafo}">${escapar(linea.trim())}</p>`)
      i++
    }
  }

  return `<div style="${ESTILOS.cuerpo}">${partes.join('')}</div>`
}
