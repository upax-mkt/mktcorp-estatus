'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import estilos from './error.module.css'

/**
 * EL LÍMITE DE ERROR DE TODA LA APP (revisión final de la rama, punto 1).
 *
 * No existía ninguno en todo `src/app/`. Cualquier `exigir*()` que lanzara
 * (`src/auth/roles.ts` — la única vía de autorización de este repo) caía en
 * la pantalla genérica de Next: un código ilegible, sin decir qué hacer. El
 * caso concreto que lo hizo evidente: la cookie de equipo de 7 días sin
 * `rolApp` que tenía todo el equipo al desplegar esta ronda pasaba el filtro
 * optimista del proxy (arreglado aparte en `src/auth/politica.ts`), el Home
 * se pintaba entero por no tener guarda de página (arreglada en
 * `src/app/page.tsx`), y el primer clic real —cualquier Server Action que
 * llama a `exigirLectura()`/`exigirEditor()`/`exigirAdmin()`— lanzaba sin que
 * nada lo atrapara.
 *
 * Cuelga de `src/app/` (la raíz): cubre TODA la app, no una sección. No
 * intenta distinguir de qué tipo de error se trata —de sesión, de red, un bug
 * de verdad— porque la causa más probable, con diferencia, en una app donde
 * la única forma de fallar "de repente" es una sesión inválida o sin permiso,
 * es esa; y "vuelve a entrar" también resuelve los demás casos: recarga todo
 * desde cero.
 *
 * `'use client'`: Next exige que un límite de error sea un Client Component,
 * para poder montarlo como un React Error Boundary real.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Único rastro que queda hoy: no hay ninguna integración de errores
    // conectada todavía.
    console.error('[error.tsx] límite de error de la app:', error)
  }, [error])

  return (
    <div className={estilos.pantalla}>
      <div className={estilos.tarjeta}>
        <h1 className={estilos.titulo}>Algo salió mal</h1>
        <p className={estilos.texto}>
          Lo más probable es que tu sesión haya caducado o no tenga el permiso que esta pantalla
          necesita. Vuelve a entrar — si el problema sigue, avisa a Marketing Corporativo.
        </p>
        <div className={estilos.acciones}>
          <Link href="/entrar" className={estilos.boton}>
            Volver a entrar
          </Link>
          {/* `unstable_retry()`: re-intenta esta misma pantalla sin recargar
              toda la página — para el error que de verdad fue un hipo (una
              consulta que tropezó) y no una sesión sin permiso. */}
          <button type="button" onClick={() => unstable_retry()} className={estilos.botonSecundario}>
            Reintentar
          </button>
        </div>
        {error.digest && (
          <p className={estilos.digest}>
            Código para soporte: <code>{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  )
}
