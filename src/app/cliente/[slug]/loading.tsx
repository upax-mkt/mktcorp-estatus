import { Cargando } from '@/componentes/Cargando'

/**
 * La sala de un cliente es la ruta más lenta de la app: 585 ms de TTFB medidos
 * en producción, porque arma en una sola pasada el tema de la sala, sus
 * acuerdos, sus reuniones, sus materiales y su prensa. Es también la que abre
 * un director, y muchas veces desde el móvil.
 *
 * Siete barras: los siete módulos que va a encontrarse (Data & Analytics,
 * Acuerdos, Reuniones, Benchmark, Materiales, Prensa, Archivos).
 */
export default function Cargar() {
  return <Cargando filas={7} />
}
