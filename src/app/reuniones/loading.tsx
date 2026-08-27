import { Cargando } from '@/componentes/Cargando'

/** `/reuniones` monta el calendario y cuatro listas; nunca es instantánea. */
export default function Cargar() {
  return <Cargando filas={5} />
}
