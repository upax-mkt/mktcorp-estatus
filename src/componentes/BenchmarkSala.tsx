import Link from 'next/link'
import estilos from '@/app/cliente/cliente.module.css'
import type { Benchmark } from '@/db/benchmark'
import { resumirBenchmark } from '@/dominio/benchmark'
import { fechaCompleta } from '@/lib/fecha'

/**
 * El benchmark EN LA SALA: el resumen, no la matriz.
 *
 * Antes se pintaba aquí la tabla entera —seis columnas por cinco filas de
 * etiquetas— y una tabla así se estudia, no se mira de paso. La sala es una
 * pantalla de las que se miran de paso: se entra a ver acuerdos y la última
 * presentación. Lo que aquí cabe es el titular —en cuántas dimensiones la UDN
 * va delante y en cuáles va detrás— y una puerta a la vista completa.
 */
export function BenchmarkSala({
  benchmark,
  nombreSala,
  salaSlug,
}: {
  benchmark: Benchmark | null
  nombreSala: string
  salaSlug: string
}) {
  if (!benchmark) {
    return (
      <div className={estilos.benchmark}>
        <p className={estilos.benchmarkNota}>
          Benchmark aún no cargado para esta sala. Cuando llegue el análisis competitivo, aparece
          aquí el resumen y se puede entrar a verlo completo.
        </p>
      </div>
    )
  }

  const resumen = resumirBenchmark(benchmark)

  return (
    <div className={estilos.benchmark}>
      <div className={estilos.benchmarkResumen}>
        <div className={estilos.benchmarkCifras}>
          <span className={estilos.benchmarkCifra} data-nivel="lider">
            <strong>{resumen.lider}</strong>
            <span>de {resumen.total} liderando</span>
          </span>
          <span className={estilos.benchmarkCifra} data-nivel="a_la_par">
            <strong>{resumen.aLaPar}</strong>
            <span>a la par</span>
          </span>
          <span className={estilos.benchmarkCifra} data-nivel="rezagado">
            <strong>{resumen.rezagado}</strong>
            <span>por detrás</span>
          </span>
        </div>

        <p className={estilos.benchmarkLecturaTexto}>{benchmark.lectura}</p>

        {resumen.brechas.length > 0 && (
          <p className={estilos.benchmarkBrechas}>
            <span className={estilos.benchmarkBrechasEtiqueta}>Brecha por cerrar</span>
            {resumen.brechas.join(' · ')}
          </p>
        )}
      </div>

      <div className={estilos.benchmarkPie}>
        <span className={estilos.benchmarkActualizado}>
          {nombreSala} contra {benchmark.competidores.length} competidores · actualizado el{' '}
          {fechaCompleta(benchmark.actualizado)}
        </span>
        <Link href={`/cliente/${salaSlug}/benchmark`} className={estilos.presVer}>
          Ver el benchmark completo →
        </Link>
      </div>
    </div>
  )
}
