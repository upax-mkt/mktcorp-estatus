import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * `sesionesPublicasDelMes` — LA RAMA CON DB (ronda 8, tarea 3, corrección de
 * revisión).
 *
 * `src/db/sesiones.test.ts` ya cubre la rama sin DB (devuelve `[]`). Este
 * archivo vive aparte porque necesita `hayDB() === true` con un `db()`
 * sustituido — lo contrario de lo que asume el resto de `sesiones.test.ts` —
 * y mezclar los dos supuestos en un solo archivo es la clase de cosa que
 * rompe un test por el orden en que corre otro.
 *
 * El doble de `db()` de abajo NO evalúa el WHERE de verdad: para lo que este
 * archivo prueba no hace falta (el SQL en sí — el JOIN, `salas.activa`, el
 * rango de fechas — no cambió con esta corrección). Lo único que hace falta
 * es controlar qué FILAS devuelve la consulta, para probar qué pasa
 * DESPUÉS: el mapeo de esas filas a `ReunionPublica`.
 *
 * EL CASO REAL QUE MOTIVA ESTE ARCHIVO: el revisor comprobó contra
 * producción que la tabla `salas` tiene una fila `grupo-upax`, ACTIVA, que ya
 * no está registrada en `src/temas` (dejó de ser una sala hace unas rondas —
 * ver el comentario junto a `TEMAS` en src/temas/index.ts). Antes de esta
 * corrección, en cuanto una sesión no-borrador apuntara a esa sala,
 * `obtenerTema('grupo-upax')` reventaba DENTRO de `sesionesPublicasDelMes` —
 * sin try/catch entre esa función y la página— y el 500 se lo llevaba la
 * agenda pública ENTERA de ese mes: la única pantalla que ve gente de fuera
 * del equipo.
 */

let filas: { salaSlug: string | null; fecha: Date }[] = []

/** Doble mínimo: ignora los argumentos de cada eslabón y devuelve `filas` tal cual al final de la cadena. */
function dobleDB() {
  const encadenable = {
    from: () => encadenable,
    innerJoin: () => encadenable,
    where: () => encadenable,
    orderBy: () => Promise.resolve(filas),
  }
  return { select: () => encadenable }
}

vi.mock('./cliente', () => ({ hayDB: () => true, db: () => dobleDB() }))

const { sesionesPublicasDelMes } = await import('./sesiones')

describe('sesionesPublicasDelMes — una fila huérfana no tumba la página', () => {
  it('una sala que ya no está registrada en src/temas ("grupo-upax") se descarta, no revienta', async () => {
    filas = [
      { salaSlug: 'grupo-upax', fecha: new Date('2026-08-05T16:00:00.000Z') },
      { salaSlug: 'neracode', fecha: new Date('2026-08-10T16:00:00.000Z') },
    ]

    const reuniones = await sesionesPublicasDelMes(2026, 8)

    // Si `obtenerTema('grupo-upax')` no estuviera protegido, este await
    // habría lanzado antes de llegar a cualquier expect.
    expect(reuniones).toHaveLength(1)
    expect(reuniones[0].salaSlug).toBe('neracode')
  })

  it('si TODAS las filas del mes son huérfanas, devuelve la lista vacía, no un error', async () => {
    filas = [{ salaSlug: 'grupo-upax', fecha: new Date('2026-08-05T16:00:00.000Z') }]

    await expect(sesionesPublicasDelMes(2026, 8)).resolves.toEqual([])
  })

  it('una sala registrada de verdad sigue resolviendo nombre y color desde src/temas', async () => {
    filas = [{ salaSlug: 'neracode', fecha: new Date('2026-08-05T16:00:00.000Z') }]

    const [reunion] = await sesionesPublicasDelMes(2026, 8)

    expect(reunion.salaSlug).toBe('neracode')
    expect(reunion.salaNombre).toBe('NeraCode')
    expect(reunion.salaColor).toBe('#3E31CC')
  })
})
