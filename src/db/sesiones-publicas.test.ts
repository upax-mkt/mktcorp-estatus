import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * `sesionesPublicasDelMes` — LA RAMA CON DB (ronda 8, tarea 3, corrección de
 * revisión; fixtures actualizadas en la tarea 5 cuando `salaNombre`/
 * `salaColor` pasaron a salir del mismo JOIN en vez de resolverse aparte).
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
 * DESPUÉS: el filtro y el mapeo de esas filas a `ReunionPublica`.
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
 * por slug, no un efecto secundario de que falte un dato: Grupo UPAX es el
 * holding, no una UDN, y esta pantalla anuncia "cuándo le toca a [UDN]".
 */

let filas: { salaSlug: string | null; fecha: Date; salaNombre: string | null; salaColor: string | null }[] = []

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

describe('sesionesPublicasDelMes — grupo-upax nunca sale, aunque tenga tema válido', () => {
  it('se descarta por ser el holding, no por faltarle marca', async () => {
    filas = [
      { salaSlug: 'grupo-upax', fecha: new Date('2026-08-05T16:00:00.000Z'), salaNombre: 'Grupo UPAX', salaColor: '#E34714' },
      { salaSlug: 'neracode', fecha: new Date('2026-08-10T16:00:00.000Z'), salaNombre: 'NeraCode', salaColor: '#3E31CC' },
    ]

    const reuniones = await sesionesPublicasDelMes(2026, 8)

    expect(reuniones).toHaveLength(1)
    expect(reuniones[0].salaSlug).toBe('neracode')
  })

  it('si TODAS las filas del mes son de grupo-upax, devuelve la lista vacía, no un error', async () => {
    filas = [{ salaSlug: 'grupo-upax', fecha: new Date('2026-08-05T16:00:00.000Z'), salaNombre: 'Grupo UPAX', salaColor: '#E34714' }]

    await expect(sesionesPublicasDelMes(2026, 8)).resolves.toEqual([])
  })

  it('una UDN real sigue resolviendo su nombre y color, tal cual los trae la fila', async () => {
    filas = [{ salaSlug: 'neracode', fecha: new Date('2026-08-05T16:00:00.000Z'), salaNombre: 'NeraCode', salaColor: '#3E31CC' }]

    const [reunion] = await sesionesPublicasDelMes(2026, 8)

    expect(reunion.salaSlug).toBe('neracode')
    expect(reunion.salaNombre).toBe('NeraCode')
    expect(reunion.salaColor).toBe('#3E31CC')
  })
})
