import Link from 'next/link'
import estilos from '@/app/cliente/cliente.module.css'
import type { Benchmark } from '@/db/benchmark'
import { resumirBenchmark } from '@/dominio/benchmark'
import { fechaCompleta } from '@/lib/fecha'

/**
 * EL BENCHMARK EN LA SALA: lo que sirve de un vistazo, no la matriz.
 *
 * La sala es una pantalla de las que se miran de paso —se entra a ver acuerdos
 * y la última reunión—, así que aquí no cabe un análisis. Pero tampoco cabía
 * lo que había antes: tres contadores y un párrafo de doce líneas.
 *
 * Franco: *"la vista previa en la sala debe ser más atractiva con info clave
 * de vista rápida"*. Lo que de verdad se usa en cinco segundos, y en este
 * orden:
 *
 *   1. LA TESIS. La frase que el director puede repetir en una junta.
 *   2. DOS O TRES CIFRAS de las de cabecera, en grande.
 *   3. CONTRA QUIÉN se compite de verdad — los de amenaza alta, por nombre.
 *      Es lo que se mira antes de entrar a una reunión con un prospecto.
 *   4. QUÉ INDUSTRIA está en su pico de compra este mes: la única línea de
 *      todo el módulo que sirve para hacer algo hoy.
 *
 * La matriz, las fichas de competidor y el calendario completo viven en su
 * página, a un clic.
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
  // Tres como mucho: la cuarta ya no se lee en una tarjeta que se mira de
  // paso. La página completa las enseña todas.
  const cifras = (benchmark.indicadores ?? []).slice(0, 3)

  return (
    <div className={`${estilos.benchmark} ${estilos.bmSala}`}>
      {benchmark.tesis ? (
        <p className={estilos.bmSalaTesis}>{benchmark.tesis.titular}</p>
      ) : (
        <p className={estilos.benchmarkLecturaTexto}>{benchmark.lectura}</p>
      )}

      {cifras.length > 0 ? (
        <ul className={estilos.bmSalaCifras}>
          {cifras.map((c) => (
            <li key={c.rotulo} className={estilos.bmSalaCifra} data-tono={c.tono}>
              <strong>{c.valor}</strong>
              <span>{c.rotulo}</span>
            </li>
          ))}
        </ul>
      ) : (
        // Sin indicadores cargados se cae al recuento de la matriz, que es lo
        // que este módulo enseñaba antes: nunca se queda vacío.
        <ul className={estilos.bmSalaCifras}>
          <li className={estilos.bmSalaCifra} data-tono="gana">
            <strong>{resumen.lider} de {resumen.total}</strong>
            <span>Dimensiones liderando</span>
          </li>
          <li className={estilos.bmSalaCifra}>
            <strong>{resumen.aLaPar}</strong>
            <span>A la par</span>
          </li>
          <li className={estilos.bmSalaCifra} data-tono="atencion">
            <strong>{resumen.rezagado}</strong>
            <span>Por detrás</span>
          </li>
        </ul>
      )}

      <div className={estilos.bmSalaLineas}>
        {resumen.amenazasAltas.length > 0 && (
          <p className={estilos.bmSalaLinea}>
            <span className={estilos.bmSalaEtiqueta}>Aprietan</span>
            {resumen.amenazasAltas.join(' · ')}
          </p>
        )}
        {resumen.vendenAhora.length > 0 && (
          <p className={estilos.bmSalaLinea} data-tono="gana">
            <span className={estilos.bmSalaEtiqueta}>Compran ahora</span>
            {resumen.vendenAhora.join(' · ')}
          </p>
        )}
        {resumen.brechas.length > 0 && (
          <p className={estilos.bmSalaLinea} data-tono="atencion">
            <span className={estilos.bmSalaEtiqueta}>Brecha por cerrar</span>
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
