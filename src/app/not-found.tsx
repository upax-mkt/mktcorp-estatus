import Link from 'next/link'
import estilos from './error.module.css'

/**
 * LA PÁGINA QUE SE SIRVE CUANDO ALGO NO EXISTE.
 *
 * Hasta hoy no había ninguna, así que cualquier `notFound()` caía en la
 * estática que trae Next: un «404: This page could not be found» en la
 * tipografía del framework. Es literalmente la anti-referencia que fija el
 * PRODUCT.md —"un dashboard SaaS cualquiera", fuentes genéricas— y aparecía
 * en la app que un director abre la víspera de su reunión.
 *
 * Y NO ES UN CASO RARO. `/cliente/grupo-upax` cae aquí SIEMPRE y a propósito:
 * `slugsDeSalas()` (src/db/temas.ts) excluye a Grupo UPAX porque es la casa,
 * no un cliente al que Marketing Corp le da estatus. Cualquiera que teclee esa
 * ruta —o siga un enlace viejo a una sala renombrada— aterriza justo aquí.
 *
 * Reutiliza `error.module.css` en vez de estrenar una hoja propia: es la misma
 * tarjeta centrada de `/entrar` y de `error.tsx`, y esta pantalla no merece un
 * lenguaje visual nuevo. Tres pantallas de "algo pasó" con la misma forma se
 * leen como una sola app; con tres formas distintas, como tres.
 *
 * Server Component: aquí no hay nada que reintentar ni estado que llevar, solo
 * una salida. No hace falta `'use client'`.
 */
export default function NoEncontrado() {
  return (
    <div className={estilos.pantalla}>
      <div className={estilos.tarjeta}>
        <h1 className={estilos.titulo}>Esta página no existe</h1>
        <p className={estilos.texto}>
          El enlace puede estar caducado, o apuntar a una sala que cambió de nombre. Desde el
          Meeting Hub llegas a todos los clientes.
        </p>
        <div className={estilos.acciones}>
          <Link href="/" className={estilos.boton}>
            Ir al Meeting Hub
          </Link>
        </div>
      </div>
    </div>
  )
}
