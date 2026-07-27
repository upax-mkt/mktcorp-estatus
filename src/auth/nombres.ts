/**
 * Nombres compartidos entre el proxy (Edge) y la capa de sesión (Node).
 *
 * Viven aparte porque el proxy no puede importar src/auth/sesion.ts: ese
 * módulo usa `next/headers`, que no existe en Edge. Un solo sitio donde se
 * decide cómo se llama la cookie evita que las dos capas se desincronicen.
 */

export const COOKIE_SESION = 'mktcorp_sesion'
