import estilos from './Cargando.module.css'

/**
 * EL ESQUELETO QUE SE VE MIENTRAS UNA RUTA CONSULTA LA BASE.
 *
 * Las 22 rutas de esta app son dinámicas (`ƒ` en el build): ninguna está
 * pregenerada, todas preguntan a Neon antes de pintar. Sin un `loading.tsx`
 * que lo cubra, Next deja la pantalla ANTERIOR congelada durante la espera
 * —medio segundo largo en la sala de un cliente, medido en producción— sin
 * decir que algo está pasando.
 *
 * Un solo componente para las tres rutas que lo estrenan, con el número de
 * barras como única diferencia: son tres listas de tarjetas anchas, así que
 * comparten forma. Si alguna pantalla necesita un esqueleto de verdad
 * distinto, se hace el suyo — no se le añaden props a este hasta convertirlo
 * en un mini framework.
 *
 * `aria-hidden` y no un `role="status"`: quien usa un lector de pantalla no
 * gana nada oyendo describir seis rectángulos grises. El anuncio de que la
 * navegación está en curso ya lo hace el propio navegador.
 */
export function Cargando({ filas = 5, titulo = true }: { filas?: number; titulo?: boolean }) {
  return (
    <div className={estilos.pantalla} aria-hidden="true">
      {titulo && <div className={estilos.titulo} />}
      <div className={estilos.fila}>
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className={estilos.barra} />
        ))}
      </div>
    </div>
  )
}
