/**
 * Capa de acceso a datos del Benchmark competitivo (spec §5): pertenece a la
 * SALA, no a la sesión — se nutre en el tiempo, editable solo por el equipo
 * interno. Con `hayDB()` consulta Postgres vía Drizzle (tabla `benchmarks`,
 * ver src/db/esquema.ts); sin DB, cae a los datos de ejemplo de
 * src/datos-benchmark.ts — así el espacio se ve igual en dev sin
 * DATABASE_URL.
 *
 * Dos orígenes, en este orden: el archivo incrustado
 * (`src/datos/benchmark.ts`, la excepción decidida por Franco) y, si no hay
 * entrada ahí, la tabla `benchmarks`. Sin ninguno de los dos, la sala enseña
 * su espacio vacío — que es la verdad mientras nadie haya cargado el
 * análisis.
 */
import { desc, eq } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { benchmarkIncrustado } from '@/datos/benchmark'
import type { Benchmark } from '@/dominio/benchmark'

export type { Benchmark, FilaDimensionBenchmark, NivelBenchmark } from '@/dominio/benchmark'

function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Benchmark vivo de una sala: sus 5 competidores, las dimensiones comparadas
 * y la lectura de Mkt Corp. `null` si la sala no tiene benchmark cargado
 * todavía (en DB: sin fila; en el fallback de ejemplo: slug desconocido).
 */
export async function obtenerBenchmark(salaSlug: string): Promise<Benchmark | null> {
  // El benchmark INCRUSTADO manda (ver src/datos/benchmark.ts): es la
  // excepción decidida por Franco, porque el análisis competitivo no se
  // produce en esta herramienta. La tabla queda por si algún día se carga
  // desde la app, y para no perder los que ya hubiera.
  const incrustado = benchmarkIncrustado(salaSlug)
  if (incrustado) return incrustado

  if (!hayDB()) return null

  const fila = (
    await db()
      .select()
      .from(esquema.benchmarks)
      .where(eq(esquema.benchmarks.salaSlug, salaSlug))
      .orderBy(desc(esquema.benchmarks.updatedAt))
      .limit(1)
  )[0]

  if (!fila) return null

  return {
    salaSlug,
    competidores: fila.competidores as Benchmark['competidores'],
    dimensiones: fila.dimensiones as Benchmark['dimensiones'],
    lectura: fila.lectura ?? '',
    actualizado: isoFecha(fila.updatedAt),
  }
}
