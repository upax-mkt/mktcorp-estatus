import type { z } from 'zod'

/**
 * POR QUÉ NO SE PUDO MAQUETAR ESTA SECCIÓN, dicho a quien la escribió.
 *
 * Zod habla el idioma del esquema: `kpis: Too big: expected array to have <=4
 * items`. Eso es correcto y es inútil — nombra el campo por su clave interna,
 * en inglés, y no dice qué hacer. Quien acaba de escribir una sección y ve eso
 * no sabe si borrar una cifra, cambiar de tipo de sección o llamar a alguien.
 *
 * Aquí se traduce el primer problema —el único que importa: se arregla ese y
 * se vuelve a intentar— a una frase que nombra el campo como lo llama el
 * editor, en su sitio y con el número.
 *
 * LA GRAMÁTICA NO ES ADORNO. "Falta las líneas de la columnas 1" se lee como
 * un error del sistema, no como una instrucción, y quien lo lee deja de
 * confiar en el aviso siguiente. Por eso cada campo declara su género y sus
 * dos números, en vez de pegar cadenas y esperar.
 */

interface Campo {
  /** En singular, sin artículo: "columna". */
  uno: string
  /** En plural, sin artículo: "columnas". */
  varios: string
  /** Femenino. Decide el artículo. */
  f: boolean
  /** El campo es una colección: cuando falta, faltan varios. */
  lista?: boolean
}

/** Cómo llama el editor a cada campo del esquema. */
const CAMPO: Record<string, Campo> = {
  titulo: { uno: 'título', varios: 'títulos', f: false },
  subtitulo: { uno: 'subtítulo', varios: 'subtítulos', f: false },
  kpis: { uno: 'cifra', varios: 'cifras', f: true, lista: true },
  columnas: { uno: 'columna', varios: 'columnas', f: true, lista: true },
  graficos: { uno: 'gráfico', varios: 'gráficos', f: false, lista: true },
  tablas: { uno: 'tabla', varios: 'tablas', f: true, lista: true },
  matriz: { uno: 'matriz', varios: 'matrices', f: true },
  metaReal: { uno: 'bloque de meta contra real', varios: 'bloques de meta contra real', f: false },
  cifrasDesglosadas: { uno: 'cifra con desglose', varios: 'cifras con desglose', f: true, lista: true },
  bloques: { uno: 'bloque', varios: 'bloques', f: false, lista: true },
  cuerpo: { uno: 'punto', varios: 'puntos', f: false, lista: true },
  imagen: { uno: 'imagen', varios: 'imágenes', f: true },
  video: { uno: 'vídeo', varios: 'vídeos', f: false },
  url: { uno: 'URL', varios: 'URLs', f: true },
  anchoPorcentaje: { uno: 'ancho', varios: 'anchos', f: false },
  alineacion: { uno: 'alineación', varios: 'alineaciones', f: true },
  notaPie: { uno: 'nota al pie', varios: 'notas al pie', f: true },
  puntos: { uno: 'línea', varios: 'líneas', f: true, lista: true },
  filas: { uno: 'fila', varios: 'filas', f: true, lista: true },
  celdas: { uno: 'celda', varios: 'celdas', f: true, lista: true },
  series: { uno: 'serie', varios: 'series', f: true, lista: true },
  periodos: { uno: 'periodo', varios: 'periodos', f: false, lista: true },
  leyenda: { uno: 'leyenda', varios: 'leyendas', f: true, lista: true },
  partes: { uno: 'parte', varios: 'partes', f: true, lista: true },
  hijos: { uno: 'sub-línea', varios: 'sub-líneas', f: true, lista: true },
  valor: { uno: 'valor', varios: 'valores', f: false },
  rotulo: { uno: 'rótulo', varios: 'rótulos', f: false },
  etiqueta: { uno: 'etiqueta', varios: 'etiquetas', f: true },
  texto: { uno: 'texto', varios: 'textos', f: false },
  meta: { uno: 'meta', varios: 'metas', f: true },
  real: { uno: 'real', varios: 'reales', f: false },
  porcentaje: { uno: 'porcentaje', varios: 'porcentajes', f: false },
  delta: { uno: 'variación', varios: 'variaciones', f: true },
  enlace: { uno: 'enlace', varios: 'enlaces', f: false },
  parrafo: { uno: 'párrafo', varios: 'párrafos', f: false },
  pie: { uno: 'línea de cierre', varios: 'líneas de cierre', f: true },
  nota: { uno: 'nota', varios: 'notas', f: true },
  encabezado: { uno: 'encabezado', varios: 'encabezados', f: false },
  tipo: { uno: 'tipo de gráfico', varios: 'tipos de gráfico', f: false },
  destacada: { uno: 'marca de destacada', varios: 'marcas de destacada', f: true },
  estado: { uno: 'semáforo', varios: 'semáforos', f: false },
  valores: { uno: 'valor', varios: 'valores', f: false, lista: true },
  tono: { uno: 'tono', varios: 'tonos', f: false },
  forma: { uno: 'forma', varios: 'formas', f: true },
  eje: { uno: 'eje', varios: 'ejes', f: false },
}

const DESCONOCIDO = (clave: string): Campo => ({ uno: `campo «${clave}»`, varios: `campos «${clave}»`, f: false })

function campoDe(clave: string): Campo {
  return CAMPO[clave] ?? DESCONOCIDO(clave)
}

/** "la columna" / "el gráfico" / "las columnas" / "los gráficos". */
function conArticulo(c: Campo, plural: boolean): string {
  const art = plural ? (c.f ? 'las' : 'los') : c.f ? 'la' : 'el'
  return `${art} ${plural ? c.varios : c.uno}`
}

/** "la columna 2" — el elemento N de una colección. */
function elemento(clave: string, indice: number): string {
  const c = campoDe(clave)
  return `${c.f ? 'la' : 'el'} ${c.uno} ${indice + 1}`
}

/**
 * Dónde está el problema, leído de dentro hacia fuera.
 *
 * `["columnas", 0, "puntos"]` → `{ texto: "las líneas de la columna 1" }`.
 * Ese orden es el que sigue quien lo busca en pantalla: primero encuentra la
 * columna, después mira sus líneas.
 */
interface Sitio {
  /** Dónde está, de dentro hacia fuera: "las líneas de la columna 1". */
  texto: string
  hoja: Campo
  plural: boolean
  /** Qué contiene la hoja: "la tabla 1", "la matriz"… o null, si es la sección. */
  contenedor: string | null
}

function ubicar(ruta: PropertyKey[]): Sitio | null {
  const claves: Array<{ clave: string; indice: number | null }> = []
  for (let i = 0; i < ruta.length; i++) {
    const tramo = ruta[i]
    if (typeof tramo === 'number') continue
    const siguiente = ruta[i + 1]
    claves.push({ clave: String(tramo), indice: typeof siguiente === 'number' ? siguiente : null })
  }
  if (claves.length === 0) return null

  const ultima = claves[claves.length - 1]
  const hoja = campoDe(ultima.clave)
  // La hoja se nombra en plural solo si es una colección Y el problema es de
  // la colección entera (sin índice). Con índice, se habla de un elemento.
  const plural = ultima.indice === null && Boolean(hoja.lista)
  const nombreHoja = ultima.indice === null ? conArticulo(hoja, plural) : elemento(ultima.clave, ultima.indice)

  const contenedores = claves
    .slice(0, -1)
    .reverse()
    .map((c) => (c.indice === null ? conArticulo(campoDe(c.clave), false) : elemento(c.clave, c.indice)))

  return {
    texto: contraer([nombreHoja, ...contenedores].join(' de ')),
    hoja,
    plural,
    contenedor: contenedores.length > 0 ? contraer(contenedores.join(' de ')) : null,
  }
}

/** "de el gráfico" → "del gráfico". Suena a máquina si no se hace. */
function contraer(texto: string): string {
  return texto.replace(/\bde el\b/g, 'del')
}

function mayus(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * La primera pega del parseo, en español.
 *
 * Solo la primera a propósito: enumerar las siete cosas que están mal a la vez
 * es una lista que nadie lee. Se arregla una y se vuelve a intentar.
 */
export function motivoEnClaro(error: z.ZodError): string {
  const problema = error.issues[0]
  if (!problema) return 'La sección no pasó la validación.'

  const sitio = ubicar(problema.path)
  if (!sitio) return problema.message

  switch (problema.code) {
    case 'too_big': {
      // El tope sale del propio problema, NO de una tabla aparte: la ruta
      // puede ser `tablas.0.columnas`, donde el tope es el de las columnas de
      // una tabla y no el de las tablas de la sección.
      const tope = typeof problema.maximum === 'number' ? problema.maximum : null
      const c = sitio.hoja
      const donde = sitio.contenedor ?? 'una sección'
      if (tope === null) return `Hay ${c.varios} de más en ${donde}.`
      return `No caben más de ${tope} ${tope === 1 ? c.uno : c.varios} en ${donde}.`
    }

    case 'too_small': {
      const minimo = typeof problema.minimum === 'number' ? Number(problema.minimum) : 1
      if (problema.origin === 'string') return `Falta ${sitio.texto}.`
      if (minimo <= 1) return `${sitio.plural ? 'Faltan' : 'Falta'} ${sitio.texto}.`
      const c = sitio.hoja
      const donde = sitio.contenedor ?? 'Una sección'
      return `${mayus(donde)} necesita al menos ${minimo} ${minimo === 1 ? c.uno : c.varios}.`
    }

    case 'invalid_type':
      return `${mayus(sitio.texto)} no tiene la forma que espera esta sección.`

    case 'unrecognized_keys':
      return `Esta sección no admite ${sitio.texto}.`

    default:
      // Los `refine` (texto plano, URL segura) traen su propio mensaje escrito
      // para quien lo lee: se respeta tal cual, con el sitio delante.
      return `${mayus(sitio.texto)}: ${problema.message}`
  }
}
