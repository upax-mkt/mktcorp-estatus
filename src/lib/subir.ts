'use client'

import { upload } from '@vercel/blob/client'
import type { CategoriaArchivo } from '@/db/archivos'
import { rutaDeArchivo } from '@/lib/blob'

/**
 * SUBE UN ARCHIVO DIRECTO A VERCEL BLOB desde el navegador, y devuelve lo que
 * hace falta para registrar su fila.
 *
 * Nunca por una Server Action: el cuerpo de una está limitado a 1 MB por
 * defecto, y un deck de 40 MB tendría que atravesarla —pagando el ancho de
 * banda dos veces y arriesgando el tiempo de la función. El navegador escribe
 * directo con un token de un solo uso que emite `/api/archivos/subir`, que es
 * donde vive la autorización.
 *
 * VIVÍA DENTRO DE `ArchivosSala.tsx`. Se muda aquí al retirar ese componente
 * (ronda 12, "Materiales Comerciales"): tres sitios la importaban desde un
 * componente que ya no se monta en ninguna pantalla, que es la forma más
 * rápida de que alguien borre el archivo y se lleve por delante la subida de
 * las reuniones. No es un componente, es una utilidad: su sitio es `lib`.
 */
export async function subirArchivoDirecto(
  salaSlug: string,
  categoria: CategoriaArchivo,
  archivo: File,
): Promise<{
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number
}> {
  const subido = await upload(rutaDeArchivo(salaSlug, categoria, archivo.name), archivo, {
    access: 'private',
    handleUploadUrl: '/api/archivos/subir',
    contentType: archivo.type || undefined,
  })
  return {
    ruta: subido.pathname,
    nombreOriginal: archivo.name,
    tipoContenido: archivo.type || null,
    tamanoBytes: archivo.size,
  }
}
