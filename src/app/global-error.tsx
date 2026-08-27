'use client'

import { useEffect } from 'react'
import estilos from './global-error.module.css'

/**
 * EL LÍMITE DE ERROR DE ÚLTIMO RECURSO — el que atrapa lo que `error.tsx` no
 * puede atrapar.
 *
 * `error.tsx` (hermano de este archivo) es un boundary DENTRO del root layout:
 * cubre todo lo que se renderiza debajo, pero no el layout mismo. Y en esta
 * app el root layout no es decorativo: monta `ProveedorTema`, que lee la marca
 * de la sala desde Neon. Si esa consulta revienta —o falla la carga de la
 * tipografía, o cualquier cosa del layout— el boundary de `error.tsx` ni
 * siquiera llega a montarse, y lo que ve el director es la pantalla cruda de
 * Next con el stack en bruto.
 *
 * Este archivo es la red debajo de esa red. Se monta EN LUGAR del root layout,
 * por eso trae sus propias etiquetas `<html>` y `<body>`: no hay ningún layout
 * encima que las ponga (docs de Next 16, `file-conventions/error.md`).
 *
 * `retry`, no `reset` ni `unstable_retry`: son tres APIs distintas de tres
 * versiones distintas, y la de `global-error` en Next 16.3.3 es `retry`. El
 * hermano `error.tsx` recibe `unstable_retry` — no es una inconsistencia
 * nuestra, es que son dos convenciones separadas del framework. Comprobado en
 * `node_modules/next/dist/docs`, que es lo que manda el AGENTS.md de este
 * repo: esta NO es la versión de Next que uno recuerda.
 *
 * Los estilos van en su propia hoja con valores LITERALES, no con las
 * variables de `sistema.css`: si el layout que las importa es lo que falló, no
 * están definidas. Ver el comentario de `global-error.module.css`.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // El mismo rastro que deja `error.tsx`: no hay integración de errores
    // conectada todavía, así que la consola es lo único que queda.
    console.error('[global-error.tsx] falló el layout raíz:', error)
  }, [error])

  return (
    <html lang="es">
      <body className={estilos.pantalla}>
        <div className={estilos.tarjeta}>
          <h1 className={estilos.titulo}>La aplicación no pudo cargar</h1>
          <p className={estilos.texto}>
            No es tu sesión: falló algo al montar la página entera. Reintenta, y si vuelve a
            pasar avisa a Marketing Corporativo con el código de abajo.
          </p>
          <div className={estilos.acciones}>
            <button type="button" onClick={() => retry()} className={estilos.boton}>
              Reintentar
            </button>
            {/* Un `<a>` y no un `<Link>`: el enrutador de Next vive en el
                layout que acaba de fallar, así que aquí hace falta una
                navegación del navegador de toda la vida, que recarga entero. */}
            <a href="/entrar" className={estilos.botonSecundario}>
              Volver a entrar
            </a>
          </div>
          {error.digest && (
            <p className={estilos.digest}>
              Código para soporte: <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
