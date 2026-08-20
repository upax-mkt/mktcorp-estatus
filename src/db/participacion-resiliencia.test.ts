import { describe, it, expect, vi } from 'vitest'

/**
 * `registrarEdicion` NUNCA debe propagar un error de escritura (revisión de
 * la ronda 9, tarea 4 — hallazgo del revisor). Si lo hiciera:
 * `publicarMinutaAction` (`src/app/deck/[id]/minuta/acciones.ts`) la llama
 * DESPUÉS de crear la sesión y guardar la minuta de verdad, dentro de su
 * propio try/catch. Un hipo transitorio de red en esta escritura de bitácora
 * subiría como error, ese try/catch lo atraparía y devolvería «no se pudo
 * publicar» — con el acta YA publicada. Un reintento del usuario, con el
 * mismo `{ nueva: ... }`, volvería a crear la sesión y su minuta: la misma
 * «reunión fantasma» que el comentario de esa función documenta como ya
 * corregida en otra ronda.
 *
 * Archivo APARTE de `participacion.test.ts` — mismo criterio que separa
 * `documentos.test.ts` de `documentos-concurrencia.test.ts`: aquel prueba el
 * camino real "sin base de datos" dejando `./cliente` SIN mockear (`hayDB()`
 * da `false` de verdad, porque no hay `DATABASE_URL` en el entorno de test);
 * este necesita
 * simular una base de datos que SÍ existe pero cuya escritura falla, así que
 * mockea `./cliente` entero — dos configuraciones de doble que no conviven
 * bien en un solo archivo.
 */

vi.mock('./cliente', () => ({
  hayDB: () => true,
  db: () => ({
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => Promise.reject(new Error('ECONNRESET simulado')),
      }),
    }),
  }),
}))

const { registrarEdicion } = await import('./participacion')

describe('registrarEdicion — nunca tumba a quien la llama', () => {
  it('la escritura falla y la promesa igual resuelve, sin lanzar', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(registrarEdicion('ses-1', 'iris@upax.com.mx')).resolves.toBeUndefined()

    espia.mockRestore()
  })

  it('deja un rastro en consola en vez de desaparecer sin dejar huella', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})

    await registrarEdicion('ses-1', 'iris@upax.com.mx')

    expect(espia).toHaveBeenCalledTimes(1)
    expect(espia.mock.calls[0][0]).toContain('[registrarEdicion]')
    espia.mockRestore()
  })
})
