/**
 * Los archivos que el equipo cuelga en una sala.
 *
 * Dos categorías, misma mecánica:
 *
 * - `presentacion` — las presentaciones ANTIGUAS, las que se dieron antes de
 *   que existiera esta herramienta. Las nuevas no se suben: se arman en la
 *   app y viven en `/sesion/{id}`, así que la sala mezcla las dos cosas en
 *   una sola línea de tiempo ordenada por fecha.
 * - `interes` — presentaciones comerciales, excels, imágenes: lo que el
 *   equipo estime útil tener a mano en la sala.
 *
 * El binario vive en Vercel Blob; aquí solo su `ruta` y sus datos. Ver
 * `src/lib/blob.ts` para por qué el store es privado y cómo se sirve.
 */
import { and, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { slugsDeSalas } from './temas'

export type CategoriaArchivo = 'presentacion' | 'interes' | 'imagen' | 'video'

export interface ArchivoSala {
  id: string
  /** Nulo en una imagen de presentación: esa cuelga de la reunión. */
  salaSlug: string | null
  /**
   * La reunión de la que es, si es una imagen o vídeo incrustado en su
   * documento. Se llamaba `sesionId`; pasa a `reunionId` en la ronda 10,
   * tarea 5b, cuando `sesiones.ts` desaparece — `esquema.archivos.reunion_id`
   * ya existía (tarea 3) pero este módulo todavía no lo usaba.
   */
  reunionId: string | null
  categoria: CategoriaArchivo
  titulo: string
  /** ISO, o null cuando no tiene fecha propia (habitual en los de interés). */
  fecha: string | null
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
  subidoPor: string | null
  subidoEn: string // ISO
}

function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function desdeFila(fila: {
  id: string
  salaSlug: string | null
  reunionId?: string | null
  categoria: CategoriaArchivo
  titulo: string
  fecha: Date | null
  ruta: string
  nombreOriginal: string
  tipoContenido: string | null
  tamanoBytes: number | null
  subidoPor: string | null
  createdAt: Date
}): ArchivoSala {
  return {
    id: fila.id,
    salaSlug: fila.salaSlug,
    reunionId: fila.reunionId ?? null,
    categoria: fila.categoria,
    titulo: fila.titulo,
    fecha: fila.fecha ? isoFecha(fila.fecha) : null,
    ruta: fila.ruta,
    nombreOriginal: fila.nombreOriginal,
    tipoContenido: fila.tipoContenido,
    tamanoBytes: fila.tamanoBytes,
    subidoPor: fila.subidoPor,
    subidoEn: isoFecha(fila.createdAt),
  }
}

/**
 * Los más recientes primero.
 *
 * Ordena por la fecha del CONTENIDO cuando la tiene, y por la de subida
 * cuando no: una presentación de marzo subida hoy pertenece a marzo, no a
 * hoy. Sin esto, subir el histórico de un año de golpe lo dejaría todo
 * apilado en el día en que se subió.
 */
function porFechaDesc(a: ArchivoSala, b: ArchivoSala): number {
  return (b.fecha ?? b.subidoEn).localeCompare(a.fecha ?? a.subidoEn)
}

export async function listarArchivos(
  salaSlug: string,
  categoria?: CategoriaArchivo,
): Promise<ArchivoSala[]> {
  const filas = hayDB()
    ? await db().select().from(esquema.archivos).where(
        categoria
          ? and(eq(esquema.archivos.salaSlug, salaSlug), eq(esquema.archivos.categoria, categoria))
          : eq(esquema.archivos.salaSlug, salaSlug),
      )
    : memoria
        .listarArchivosDeSalaMemoria(salaSlug)
        .filter((f) => !categoria || f.categoria === categoria)

  return filas.map(desdeFila).sort(porFechaDesc)
}

export async function obtenerArchivo(id: string): Promise<ArchivoSala | null> {
  if (!hayDB()) {
    const fila = memoria.obtenerArchivoMemoria(id)
    return fila ? desdeFila(fila) : null
  }
  const fila = (await db().select().from(esquema.archivos).where(eq(esquema.archivos.id, id)))[0]
  return fila ? desdeFila(fila) : null
}

export async function registrarArchivo(datos: {
  salaSlug: string | null
  /**
   * De qué reunión es, si es una imagen o vídeo incrustado en su documento.
   * Se llamaba `sesionId` (ver el comentario de `ArchivoSala.reunionId`).
   */
  reunionId?: string | null
  categoria: CategoriaArchivo
  titulo: string
  fecha: Date | null
  ruta: string
  nombreOriginal: string
  tipoContenido?: string | null
  tamanoBytes?: number | null
  subidoPor?: string | null
}): Promise<{ id: string }> {
  if (datos.salaSlug && !(await slugsDeSalas()).includes(datos.salaSlug)) {
    throw new Error(`Sala desconocida: "${datos.salaSlug}"`)
  }
  // Un archivo tiene que colgar de algo: de una sala o de una reunión. Sin
  // ninguno de los dos no habría contra qué comprobar quién puede verlo.
  if (!datos.salaSlug && !datos.reunionId) {
    throw new Error('El archivo debe pertenecer a una sala o a una reunión.')
  }
  const titulo = datos.titulo.trim()
  // Sin título la lista sería una columna de nombres de fichero
  // ("Copia de deck v3 FINAL (2).pptx"), que es justo lo que el título viene
  // a resolver.
  if (titulo.length === 0) throw new Error('El archivo necesita un título.')

  const id = crypto.randomUUID()
  const ahora = new Date()

  if (hayDB()) {
    await db().insert(esquema.archivos).values({
      id,
      salaSlug: datos.salaSlug,
      // `sesionId` queda siempre null en un archivo nuevo (ronda 10, tarea
      // 5b): la columna sigue viva solo para las imágenes/vídeos que ya
      // colgaban de una sesión antes de esta tarea.
      sesionId: null,
      reunionId: datos.reunionId ?? null,
      categoria: datos.categoria,
      titulo,
      fecha: datos.fecha,
      ruta: datos.ruta,
      nombreOriginal: datos.nombreOriginal,
      tipoContenido: datos.tipoContenido ?? null,
      tamanoBytes: datos.tamanoBytes ?? null,
      subidoPor: datos.subidoPor ?? null,
    })
  } else {
    memoria.insertarArchivoMemoria({
      id,
      salaSlug: datos.salaSlug,
      reunionId: datos.reunionId ?? null,
      categoria: datos.categoria,
      titulo,
      fecha: datos.fecha,
      ruta: datos.ruta,
      nombreOriginal: datos.nombreOriginal,
      tipoContenido: datos.tipoContenido ?? null,
      tamanoBytes: datos.tamanoBytes ?? null,
      subidoPor: datos.subidoPor ?? null,
      createdAt: ahora,
      updatedAt: ahora,
    })
  }
  return { id }
}

/** Solo el título y la fecha: el binario no se reemplaza, se sube otro. */
export async function editarArchivo(
  id: string,
  cambios: { titulo?: string; fecha?: Date | null },
): Promise<void> {
  const titulo = cambios.titulo?.trim()
  if (titulo !== undefined && titulo.length === 0) {
    throw new Error('El archivo necesita un título.')
  }
  const aplicar = {
    ...(titulo !== undefined ? { titulo } : {}),
    ...(cambios.fecha !== undefined ? { fecha: cambios.fecha } : {}),
  }
  if (Object.keys(aplicar).length === 0) return

  if (hayDB()) {
    await db()
      .update(esquema.archivos)
      .set({ ...aplicar, updatedAt: new Date() })
      .where(eq(esquema.archivos.id, id))
    return
  }
  memoria.actualizarArchivoMemoria(id, aplicar)
}

/**
 * Quita el registro. Devuelve la ruta del binario para que quien llama lo
 * borre del store — Franco: "si algo se elimina también se elimina del
 * almacenamiento". Se separa a propósito: esta capa no habla con Blob, y
 * borrar la fila sin borrar el binario dejaría basura pagada y accesible
 * para quien conserve una URL firmada.
 */
export async function eliminarArchivo(id: string): Promise<{ ruta: string } | null> {
  const archivo = await obtenerArchivo(id)
  if (!archivo) return null

  if (hayDB()) {
    await db().delete(esquema.archivos).where(eq(esquema.archivos.id, id))
  } else {
    memoria.eliminarArchivoMemoria(id)
  }
  return { ruta: archivo.ruta }
}
