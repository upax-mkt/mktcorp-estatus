import type { Tema } from './tipos'
import { neracode } from './neracode'
import { researchLand } from './research-land'
import { promoEspacio } from './promo-espacio'
import { mexaCreativa } from './mexa-creativa'
import { marketingUnited } from './marketing-united'
import { houseOfFilms } from './house-of-films'
import { uix } from './uix'
import { zeus } from './zeus'
import { ceci } from './ceci'
import { grupoUpax } from './grupo-upax'

/**
 * LOS DIEZ TEMAS ORIGINALES, tal como estuvieron en código hasta el 30-jul.
 *
 * Ya no es la fuente de verdad —lo es la tabla `salas`, ver `src/db/temas.ts`—
 * pero se conserva por tres motivos:
 *
 * 1. Pobló la base la primera vez (`scripts/poblar-marcas.ts`).
 * 2. Es el registro de qué color tenía cada marca antes de que nadie pudiera
 *    editarlas: si alguien estropea una marca desde la app, aquí está lo que
 *    decía el brandbook.
 * 3. Es el respaldo SIN base de datos (`cargarTemas`, `src/db/temas.ts`): sin
 *    DATABASE_URL —el caso de vitest y de un `npm run dev` sin credenciales—
 *    no hay tabla `salas` que leer, y sin un respaldo la validación de sala
 *    ("¿existe 'zeus'?", que corre en `crearSesion`, `crearAcuerdo`,
 *    `registrarArchivo`, `regenerarClave` sin importar si hay DB) se habría
 *    quedado sin nada contra qué comparar.
 *
 * DIEZ y no NUEVE (la cuenta que tenía `TEMAS` hasta el 30-jul): la tabla
 * `salas` tiene una décima fila, `grupo-upax`, activa aunque dejó de ser una
 * sala el 24-jul (ver el comentario de `TEMAS` que este archivo reemplaza,
 * más abajo en `src/temas/index.ts`). Si la semilla solo trajera nueve, la
 * migración que exige estas columnas completas (`drizzle/0014`) habría
 * fallado contra esa fila. Su tema se conserva igual: es la identidad de las
 * reuniones que no pertenecen a ninguna sala (`temaDeSala`), y con eso la
 * fila queda con una marca válida en vez de una inventada.
 *
 * `slugsDeSalas()` (`src/db/temas.ts`) es quien decide cuáles de estas diez
 * son "una sala" para listar, seleccionar o crear sesiones/acuerdos nuevos
 * (las nueve; grupo-upax queda fuera, igual que excluía `TEMAS`). Esta
 * semilla no filtra nada: es el inventario completo.
 *
 * No se edita. Cambiar una marca se hace en la app.
 */
export const SEMILLA_DE_TEMAS: Record<string, Tema> = {
  [neracode.slug]: neracode,
  [researchLand.slug]: researchLand,
  [promoEspacio.slug]: promoEspacio,
  [mexaCreativa.slug]: mexaCreativa,
  [marketingUnited.slug]: marketingUnited,
  [houseOfFilms.slug]: houseOfFilms,
  [uix.slug]: uix,
  [zeus.slug]: zeus,
  [ceci.slug]: ceci,
  [grupoUpax.slug]: grupoUpax,
}
