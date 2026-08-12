/**
 * Los archivos que el equipo cuelga en una sala.
 *
 * Categorías de SALA, misma mecánica:
 *
 * - `presentacion` — las presentaciones ANTIGUAS, las que se dieron antes de
 *   que existiera esta herramienta. Las nuevas no se suben: se arman en la
 *   app y viven en `/sesion/{id}`, así que la sala mezcla las dos cosas en
 *   una sola línea de tiempo ordenada por fecha.
 * - `comercial` — **Materiales Comerciales**: lo que la UDN usa para VENDER.
 *   Credenciales, un caso en vídeo, una nota de prensa.
 * - `interes` — **Archivos de Interés**: todo lo demás que conviene tener a
 *   mano en la sala. Un estudio, un brief, el enlace a un tablero.
 *
 * ⚠️ Hasta la migración 0034, `interes` guardaba los Materiales Comerciales
 * (se llamaba así por el nombre viejo de ese módulo, antes de que Franco lo
 * renombrara) y sus filas se movieron a `comercial`.
 *
 * Y dos que NO son de sala, sino de una reunión: `imagen` y `video` son lo
 * que va incrustado dentro de un documento. Más `evidencia`, que es de sala
 * pero cuelga del benchmark (ver `src/db/evidencia.ts`).
 *
 * El binario vive en Vercel Blob; aquí solo su `ruta` y sus datos. Ver
 * `src/lib/blob.ts` para por qué el store es privado y cómo se sirve.
 */
import { and, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import * as memoria from './store-memoria'
import { slugsDeSalas } from './temas'

export type CategoriaArchivo = 'presentacion' | 'interes' | 'imagen' | 'video' | 'evidencia' | 'comercial'

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
  /** Nula si el material es un ENLACE: no hay binario en Blob. */
  ruta: string | null
  nombreOriginal: string | null
  /** La URL, si el material es un enlace (vídeo de YouTube, link de interés). */
  enlace: string | null
  tipoContenido: string | null
  tamanoBytes: number | null
  subidoPor: string | null
  subidoEn: string // ISO
  /** Subcategoría dentro de su módulo, o null si está sin agrupar. */
  grupo: string | null
  /** Posición dentro de su grupo; null mientras nadie lo haya arrastrado. */
  orden: number | null
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
  /** Nula si el material es un ENLACE: no hay binario en Blob. */
  ruta: string | null
  nombreOriginal: string | null
  /** La URL, si el material es un enlace (vídeo de YouTube, link de interés). */
  enlace: string | null
  tipoContenido: string | null
  tamanoBytes: number | null
  subidoPor: string | null
  grupo?: string | null
  orden?: number | null
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
    enlace: fila.enlace,
    tipoContenido: fila.tipoContenido,
    tamanoBytes: fila.tamanoBytes,
    subidoPor: fila.subidoPor,
    subidoEn: isoFecha(fila.createdAt),
    grupo: fila.grupo ?? null,
    orden: fila.orden ?? null,
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

/**
 * EL ORDEN QUE ALGUIEN PUSO A MANO MANDA; el resto cae al de siempre.
 *
 * Un material con `orden` fue arrastrado hasta ahí a propósito, así que va
 * antes que cualquiera que nunca se tocó — si no, subir algo nuevo se colaría
 * en medio de una lista ya ordenada solo por ser más reciente.
 */
function porOrdenYFecha(a: ArchivoSala, b: ArchivoSala): number {
  if (a.orden != null && b.orden != null) return a.orden - b.orden
  if (a.orden != null) return -1
  if (b.orden != null) return 1
  return porFechaDesc(a, b)
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

  return filas.map(desdeFila).sort(porOrdenYFecha)
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
  /** Un material es O un fichero subido (`ruta`) O un `enlace`. Nunca los dos. */
  ruta?: string | null
  nombreOriginal?: string | null
  enlace?: string | null
  /** Solo en `categoria: 'evidencia'`: de qué disciplina del benchmark es. */
  bloque?: string | null
  /** Solo en `categoria: 'evidencia'`: qué hay que mirar en ella. */
  lectura?: string | null
  /** Subcategoría dentro de su módulo ("Credenciales", "Casos de éxito"…). */
  grupo?: string | null
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
  // O fichero o enlace. Sin ninguno de los dos la fila no lleva a ningún
  // sitio: sería una tarjeta que no se puede abrir. Con los dos, habría dos
  // destinos y `materialParaVista` tendría que elegir por su cuenta.
  const tieneFichero = Boolean(datos.ruta)
  const tieneEnlace = Boolean(datos.enlace)
  if (tieneFichero === tieneEnlace) {
    throw new Error('Un material es un archivo subido o un enlace, no las dos cosas ni ninguna.')
  }
  if (tieneFichero && !datos.nombreOriginal) {
    throw new Error('Un archivo subido necesita su nombre original.')
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
      reunionId: datos.reunionId ?? null,
      categoria: datos.categoria,
      titulo,
      fecha: datos.fecha,
      ruta: datos.ruta ?? null,
      nombreOriginal: datos.nombreOriginal ?? null,
      enlace: datos.enlace ?? null,
      bloque: datos.bloque ?? null,
      lectura: datos.lectura ?? null,
      grupo: datos.grupo?.trim() || null,
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
      ruta: datos.ruta ?? null,
      nombreOriginal: datos.nombreOriginal ?? null,
      enlace: datos.enlace ?? null,
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
export async function eliminarArchivo(id: string): Promise<{ ruta: string | null } | null> {
  const archivo = await obtenerArchivo(id)
  if (!archivo) return null

  if (hayDB()) {
    await db().delete(esquema.archivos).where(eq(esquema.archivos.id, id))
  } else {
    memoria.eliminarArchivoMemoria(id)
  }
  return { ruta: archivo.ruta }
}

/**
 * REUBICA LOS MATERIALES: quién va en qué grupo y en qué orden.
 *
 * Franco: *"debo poder crear subcategorías dentro del módulo… y además
 * necesito poder reubicar su orden drag and drop"*.
 *
 * Recibe la lista COMPLETA del módulo tal como quedó tras arrastrar, no un
 * "mueve este de aquí a allá". Es lo que evita la clase de fallo que ya mordió
 * en `items.orden`: dos personas moviendo a la vez, cada una calculando su
 * hueco, y dos materiales en la misma posición. Aquí la última en soltar
 * escribe la lista entera y no hay hueco que calcular.
 *
 * `neon-http` no tiene transacciones, así que son N updates sueltos. Si el
 * proceso muere a media lista, lo que queda es un orden parcial —feo, no
 * roto— y el siguiente arrastre lo arregla.
 */
export async function reubicarMateriales(
  salaSlug: string,
  enOrden: Array<{ id: string; grupo: string | null }>,
): Promise<void> {
  if (enOrden.length === 0) return

  if (!hayDB()) {
    enOrden.forEach((m, i) => memoria.actualizarArchivoMemoria(m.id, { grupo: m.grupo, orden: i }))
    return
  }
  const conexion = db()
  for (const [i, m] of enOrden.entries()) {
    await conexion
      .update(esquema.archivos)
      // `salaSlug` en el WHERE: el id llega del navegador, y sin esto se
      // podría reordenar el material de otro cliente desde aquí.
      .set({ grupo: m.grupo?.trim() || null, orden: i, updatedAt: new Date() })
      .where(and(eq(esquema.archivos.id, m.id), eq(esquema.archivos.salaSlug, salaSlug)))
  }
}

/** Renombra un grupo entero dentro de un módulo de una sala. */
export async function renombrarGrupo(
  salaSlug: string,
  categoria: CategoriaArchivo,
  antes: string,
  despues: string,
): Promise<void> {
  const nuevo = despues.trim()
  if (!hayDB() || nuevo.length === 0) return
  await db()
    .update(esquema.archivos)
    .set({ grupo: nuevo, updatedAt: new Date() })
    .where(
      and(
        eq(esquema.archivos.salaSlug, salaSlug),
        eq(esquema.archivos.categoria, categoria),
        eq(esquema.archivos.grupo, antes),
      ),
    )
}
