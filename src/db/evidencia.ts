/**
 * LA EVIDENCIA DEL BENCHMARK: lo que sostiene un hallazgo y se carga desde la
 * app, no desde el código.
 *
 * Franco: *"la evidencia mejor la cargaré manualmente según la categoría,
 * subiré imágenes o videos o url"*. Antes vivía escrita en
 * `src/datos/benchmark.ts` con la URL de un archivo subido por un script:
 * cambiar una captura exigía un despliegue, que es justo lo que no puede
 * pasar con material que se renueva cada vez que llega un análisis.
 *
 * Se apoya en `archivos` (categoría `evidencia`) y no en una tabla propia,
 * por lo que documenta `drizzle/0032_evidencia_de_benchmark.sql`: esa tabla
 * ya resuelve subida a Blob privado, alternativa de enlace, servido con
 * comprobación de permiso y borrado del binario. Aquí solo se le pone encima
 * el BLOQUE (de qué disciplina es) y la BAJADA (qué hay que mirar).
 */
import { and, asc, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { materialParaVista, type TipoMaterial } from '@/lib/materiales'

/**
 * Las disciplinas salen de `src/dominio/benchmark.ts` y no se redeclaran aquí:
 * el `bloque` que se guarda en la fila TIENE que ser uno de los que la página
 * dibuja, y con dos listas la evidencia acabaría archivada en un bloque que no
 * existe — invisible, sin error, sin forma de darse cuenta.
 */
export { DISCIPLINAS, nombreDeDisciplina, type IdDisciplina } from '@/dominio/benchmark'

export interface EvidenciaBenchmark {
  id: string
  bloque: string
  titulo: string
  /** La bajada: qué hay que mirar. */
  lectura: string
  /** Cómo se enseña: imagen, vídeo, enlace o documento. */
  tipo: TipoMaterial
  /** A dónde lleva. */
  destino: string
  /** La miniatura, o null si se dibuja carátula tipográfica. */
  miniatura: string | null
  /** true si abre fuera de la app. */
  externo: boolean
  subidoEn: string
}

/** Toda la evidencia de una sala, agrupada por bloque y en su orden de carga. */
export async function evidenciaDeSala(salaSlug: string): Promise<EvidenciaBenchmark[]> {
  if (!hayDB()) return []

  const filas = await db()
    .select()
    .from(esquema.archivos)
    .where(
      and(
        eq(esquema.archivos.salaSlug, salaSlug),
        eq(esquema.archivos.categoria, 'evidencia'),
      ),
    )
    .orderBy(asc(esquema.archivos.createdAt))

  return filas.map((f) => {
    const vista = materialParaVista({
      id: f.id,
      enlace: f.enlace,
      ruta: f.ruta,
      nombreOriginal: f.nombreOriginal,
      tipoContenido: f.tipoContenido,
    })
    return {
      id: f.id,
      bloque: f.bloque ?? 'portafolio',
      titulo: f.titulo,
      lectura: f.lectura ?? '',
      tipo: vista.tipo,
      destino: vista.destino,
      miniatura: vista.miniatura,
      externo: vista.externo,
      subidoEn: f.createdAt.toISOString(),
    }
  })
}

/** La evidencia de un bloque, en el orden en que se cargó. */
export function evidenciaDelBloque(
  todas: EvidenciaBenchmark[],
  bloque: string,
): EvidenciaBenchmark[] {
  return todas.filter((e) => e.bloque === bloque)
}
