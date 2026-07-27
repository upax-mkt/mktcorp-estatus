/**
 * El almacén de archivos de las salas: Vercel Blob, store `archivos-mktcorp`.
 *
 * PRIVADO, A PROPÓSITO. Un store público sirve por URL adivinable y eterna:
 * quien reciba el enlace de un deck comercial lo reenvía, y sigue abierto un
 * año después aunque el archivo se haya quitado de la sala. Aquí el binario
 * solo sale a través de `/api/archivo/[id]`, que comprueba la sesión contra
 * LA SALA del archivo antes de servir un byte.
 *
 * LA SUBIDA NO PASA POR EL SERVIDOR. El navegador escribe directo en Blob con
 * un token de un solo uso que emite `/api/archivos/subir`. Un deck de 40 MB a
 * través de una Server Action chocaría con el límite de cuerpo (1 MB por
 * defecto), y subirlo dos veces —navegador → función → Blob— es pagar el
 * ancho de banda dos veces y arriesgar el tiempo de la función.
 */

/** Lo que se acepta subir. Lista blanca: lo que no está, no entra. */
export const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

/** 100 MB. Un deck con vídeo incrustado llega ahí; más es un vídeo suelto. */
export const TAMANO_MAXIMO = 100 * 1024 * 1024

/**
 * Dónde vive el binario dentro del store.
 *
 * Lleva la sala y la categoría para que el store se pueda leer a ojo, y un
 * identificador al frente del nombre: dos personas suben "estatus.pdf" el
 * mismo día y ninguna debe pisar a la otra.
 */
export function rutaDeArchivo(salaSlug: string, categoria: string, nombre: string): string {
  const limpio = nombre
    // Lista blanca: letras, números, guion bajo, punto y guion. La barra cae
    // aquí, que es lo que impide que un nombre se salga de su carpeta.
    .replace(/[^\w.\-]+/g, '-')
    // Y los puntos seguidos se colapsan: `..` no llega a ninguna parte con la
    // barra fuera, pero una ruta que contiene `..` es una ruta que alguien va
    // a tener que mirar dos veces.
    .replace(/\.{2,}/g, '.')
    .slice(-80)
  return `salas/${salaSlug}/${categoria}/${crypto.randomUUID()}-${limpio}`
}

/** "2.4 MB". Para escribirlo al lado del archivo en la lista. */
export function pesoLegible(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** La extensión, en mayúsculas, para el icono de la lista: "PDF", "XLSX". */
export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  if (punto < 0 || punto === nombre.length - 1) return 'FILE'
  return nombre.slice(punto + 1).toUpperCase().slice(0, 4)
}
