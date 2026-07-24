import estilos from '@/app/sala/sala.module.css'
import type { Benchmark, NivelBenchmark } from '@/db/benchmark'

const ETIQUETA_NIVEL: Record<NivelBenchmark, string> = {
  lider: 'Líder',
  a_la_par: 'A la par',
  rezagado: 'Rezagado',
}

function claseNivel(n: NivelBenchmark): string {
  if (n === 'lider') return estilos.chipLider
  if (n === 'rezagado') return estilos.chipRezagado
  return estilos.chipPar
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Espacio Benchmark de una sala (spec §5): la lectura de Mkt Corp destacada
 * arriba, la matriz dimensiones × (UDN + 5 competidores) debajo, y la fecha
 * de la última actualización. Vive a nivel de sala, no de sesión — se nutre
 * en el tiempo conforme Mkt Corp lo actualiza.
 *
 * Estructura preliminar (ver cabecera de src/datos-benchmark.ts): sujeta a
 * ajuste cuando llegue la presentación de benchmark real de Franco.
 */
export function BenchmarkSala({ benchmark, nombreSala }: { benchmark: Benchmark | null; nombreSala: string }) {
  if (!benchmark) {
    return (
      <div className={estilos.benchmark}>
        <p className={estilos.benchmarkNota}>Benchmark aún no configurado para esta sala.</p>
      </div>
    )
  }

  return (
    <div className={estilos.benchmark}>
      <div className={estilos.benchmarkLectura}>
        <div className={estilos.benchmarkLecturaEtiqueta}>
          <span className={estilos.benchmarkPunto} />
          Lectura de Mkt Corp
        </div>
        <p className={estilos.benchmarkLecturaTexto}>{benchmark.lectura}</p>
      </div>

      <div className={estilos.benchmarkMatrizWrap}>
        <table className={estilos.benchmarkMatriz}>
          <thead>
            <tr>
              <th className={estilos.benchmarkColDimension}>Dimensión</th>
              <th className={`${estilos.benchmarkColUdn} ${estilos.benchmarkColUdnEtiqueta}`}>{nombreSala}</th>
              {benchmark.competidores.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {benchmark.dimensiones.map((f) => (
              <tr key={f.dimension}>
                <td className={estilos.benchmarkFilaDimension}>{f.dimension}</td>
                <td className={estilos.benchmarkColUdn}>
                  <span className={`${estilos.chip} ${claseNivel(f.udn)}`}>{ETIQUETA_NIVEL[f.udn]}</span>
                </td>
                {f.competidores.map((n, i) => (
                  <td key={i}>
                    <span className={`${estilos.chip} ${claseNivel(n)}`}>{ETIQUETA_NIVEL[n]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={estilos.benchmarkActualizado}>Actualizado el {fechaLarga(benchmark.actualizado)}</div>
    </div>
  )
}
