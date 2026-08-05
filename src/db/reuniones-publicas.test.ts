import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import * as esquema from './esquema'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'

/**
 * `reunionesPublicasDelMes` — LA RAMA CON DB (ronda 8, tarea 3, corrección de
 * revisión; fixtures actualizadas en la tarea 5 dos veces: primero cuando
 * `salaNombre`/`salaColor` pasaron a salir del mismo JOIN, y de nuevo en la
 * revisión cuando la exclusión de `grupo-upax` pasó a apoyarse en
 * `slugsDeSalas()` en vez de un slug clavado a mano — lo que añade una
 * SEGUNDA consulta a la base, `cargarTemas()`, que el doble de abajo también
 * tiene que servir).
 *
 * Archivo renombrado en la ronda 10, tarea 5b (era `sesiones-publicas.test.ts`,
 * contra `sesionesPublicasDelMes` de `sesiones.ts`): la función se mudó tal
 * cual a `reuniones.ts` — mismas columnas, mismo JOIN con `salas`, misma
 * exclusión de `grupo-upax` — así que el doble de `db()` de más abajo no
 * cambia, solo el import y el nombre de la función.
 *
 * `src/db/reuniones.test.ts` ya cubre la rama sin DB (devuelve `[]`). Este
 * archivo vive aparte porque necesita `hayDB() === true` con un `db()`
 * sustituido — lo contrario de lo que asume el resto de `reuniones.test.ts` —
 * y mezclar los dos supuestos en un solo archivo es la clase de cosa que
 * rompe un test por el orden en que corre otro.
 *
 * El doble de `db()` de abajo NO evalúa el WHERE de verdad: para lo que este
 * archivo prueba no hace falta (el SQL en sí — el JOIN, `salas.activa`, el
 * rango de fechas — no cambió con esta corrección). Distingue las DOS
 * consultas que hoy hace `reunionesPublicasDelMes` por la TABLA de la que
 * parte el `.from(...)`: si es `esquema.salas` (la que dispara `cargarTemas`
 * vía `slugsDeSalas`), la resuelve directo con `filasSalas`; cualquier otra
 * (la de `reuniones` con su JOIN) sigue la cadena completa hasta `orderBy` y
 * resuelve con `filasReuniones`.
 *
 * EL CASO REAL QUE MOTIVA ESTE ARCHIVO (tarea 3): la tabla `salas` tiene una
 * fila `grupo-upax`, ACTIVA, que dejó de ser una sala el 24-jul. Hasta la
 * tarea 5 esa fila tampoco tenía tema en el `TEMAS` de código, así que
 * `obtenerTema('grupo-upax')` reventaba DENTRO de esta función — sin
 * try/catch entre ella y la página— y el 500 se lo llevaba la agenda pública
 * ENTERA de ese mes: la única pantalla que ve gente de fuera del equipo.
 *
 * DESDE LA TAREA 5, `grupo-upax` SÍ tiene tema (vive en la misma fila, con
 * las demás columnas de marca) — el hueco que la excluía por accidente ya no
 * existe. La exclusión se mantiene igual de estricta pero ahora es explícita
 * y contra `slugsDeSalas()` (una sola fuente de qué son las nueve UDNs), no
 * un efecto secundario de que falte un dato ni un slug clavado a mano aparte.
 */

let filasReuniones: { salaSlug: string | null; fecha: Date; salaNombre: string | null; salaColor: string | null }[] = []

// El universo de salas para slugsDeSalas(): las diez de la semilla, tal
// cual — válidas para EsquemaTema, así que cargarTemas() no descarta
// ninguna. No varía entre tests: lo que cada test prueba es el filtro de
// REUNIONES, no el registro de salas (eso ya lo cubre src/db/temas.test.ts).
const filasSalas = Object.values(SEMILLA_DE_TEMAS)

/**
 * Doble de `db()` que distingue las dos consultas por la tabla de la que
 * parte `.from()`. Ignora el resto de los argumentos (columnas pedidas,
 * condición del WHERE): no hace falta para lo que este archivo prueba.
 */
function dobleDB() {
  return {
    select: () => ({
      from: (tabla: unknown) => {
        if (tabla === esquema.salas) return Promise.resolve(filasSalas)
        const encadenable = {
          innerJoin: () => encadenable,
          where: () => encadenable,
          orderBy: () => Promise.resolve(filasReuniones),
        }
        return encadenable
      },
    }),
  }
}

vi.mock('./cliente', () => ({ hayDB: () => true, db: () => dobleDB() }))

const { reunionesPublicasDelMes } = await import('./reuniones')

describe('reunionesPublicasDelMes — grupo-upax nunca sale, aunque tenga tema válido', () => {
  it('se descarta por ser el holding, no por faltarle marca', async () => {
    filasReuniones = [
      { salaSlug: 'grupo-upax', fecha: new Date('2026-08-05T16:00:00.000Z'), salaNombre: 'Grupo UPAX', salaColor: '#E34714' },
      { salaSlug: 'neracode', fecha: new Date('2026-08-10T16:00:00.000Z'), salaNombre: 'NeraCode', salaColor: '#3E31CC' },
    ]

    const reuniones = await reunionesPublicasDelMes(2026, 8)

    expect(reuniones).toHaveLength(1)
    expect(reuniones[0].salaSlug).toBe('neracode')
  })

  it('si TODAS las filas del mes son de grupo-upax, devuelve la lista vacía, no un error', async () => {
    filasReuniones = [{ salaSlug: 'grupo-upax', fecha: new Date('2026-08-05T16:00:00.000Z'), salaNombre: 'Grupo UPAX', salaColor: '#E34714' }]

    await expect(reunionesPublicasDelMes(2026, 8)).resolves.toEqual([])
  })

  it('una UDN real sigue resolviendo su nombre y color, tal cual los trae la fila', async () => {
    filasReuniones = [{ salaSlug: 'neracode', fecha: new Date('2026-08-05T16:00:00.000Z'), salaNombre: 'NeraCode', salaColor: '#3E31CC' }]

    const [reunion] = await reunionesPublicasDelMes(2026, 8)

    expect(reunion.salaSlug).toBe('neracode')
    expect(reunion.salaNombre).toBe('NeraCode')
    expect(reunion.salaColor).toBe('#3E31CC')
  })
})
