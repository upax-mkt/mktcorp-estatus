import { and, eq, isNull, or } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { PLANTILLAS, type Plantilla, type DefinicionItem } from '@/secciones/plantillas'
import { moldeODefecto, MOLDE_POR_DEFECTO, type MoldeMinuta } from '@/minuta/molde'

/**
 * LAS PLANTILLAS QUE GUARDA EL EQUIPO, junto a las que trae el código.
 *
 * Franco: "para algunos tipos de reunión podríamos definir templates
 * preparados; por ejemplo la Estatus Mensual con RL debería tener una
 * estructura predefinida".
 *
 * QUIÉN LAS DEFINE, y por qué importa: las cinco de código son genéricas a
 * propósito. Qué lleva exactamente el estatus mensual de Research Land lo sabe
 * quien lo da; escribirlo yo sería inventar un compromiso entre Marketing
 * Corporativo y una unidad. Por eso el camino principal no es un catálogo más
 * largo sino "guarda ESTA estructura como plantilla de esta sala": se arma la
 * reunión una vez, se deja como quedó bien, y la siguiente nace igual.
 *
 * Las de código no se pueden borrar ni editar. Son el suelo: si alguien
 * estropea una guardada, siempre queda de dónde partir.
 */

export interface PlantillaGuardada extends Plantilla {
  /** Guardada por el equipo (se puede borrar) vs. traída por el código. */
  propia: boolean
  /** De qué sala es. Nulo = de todas. */
  salaSlug: string | null
}

function id(): string {
  return crypto.randomUUID()
}

const DE_CODIGO: PlantillaGuardada[] = PLANTILLAS.map((p) => ({ ...p, propia: false, salaSlug: null }))

/**
 * Las plantillas de sesión que se le pueden ofrecer a una sala.
 *
 * Las suyas primero: quien está preparando el estatus de Research Land busca
 * la de Research Land, no la quinta genérica de la lista.
 */
export async function plantillasDeSesion(salaSlug: string | null): Promise<PlantillaGuardada[]> {
  if (!hayDB()) return DE_CODIGO

  const filas = await db()
    .select()
    .from(esquema.plantillas)
    .where(
      and(
        eq(esquema.plantillas.tipo, 'sesion'),
        salaSlug
          ? or(isNull(esquema.plantillas.salaSlug), eq(esquema.plantillas.salaSlug, salaSlug))
          : isNull(esquema.plantillas.salaSlug),
      ),
    )

  const propias: PlantillaGuardada[] = filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    paraQue: f.paraQue,
    // Una guardada NUNCA fija sus secciones: el acuerdo de los ocho bloques es
    // de Marketing Corp con las UDNs, no algo que se herede por copiar una
    // estructura.
    seccionesFijas: false,
    // Siempre `true` (ronda 14.2, tarea 2, campo nuevo en `Plantilla`): una
    // plantilla guardada por el equipo es una estructura real que alguien
    // eligió y quedó bien — nunca la salida de emergencia ("En blanco"),
    // que solo existe en el catálogo fijo del código.
    esClaseDeJunta: true,
    items: (f.contenido as DefinicionItem[]) ?? [],
    propia: true,
    salaSlug: f.salaSlug,
  }))

  const deLaSala = propias.filter((p) => p.salaSlug !== null)
  const generales = propias.filter((p) => p.salaSlug === null)
  return [...deLaSala, ...DE_CODIGO, ...generales]
}

/** Guarda la estructura de una sesión como plantilla reutilizable. */
export async function guardarPlantillaDeSesion(datos: {
  nombre: string
  paraQue: string
  salaSlug: string | null
  items: DefinicionItem[]
}): Promise<{ id: string }> {
  if (!hayDB()) throw new Error('Sin base de datos no se pueden guardar plantillas.')
  if (datos.items.length === 0) throw new Error('Una plantilla sin secciones no sirve de plantilla.')

  const nuevo = id()
  await db().insert(esquema.plantillas).values({
    id: nuevo,
    tipo: 'sesion',
    nombre: datos.nombre.trim(),
    paraQue: datos.paraQue.trim(),
    salaSlug: datos.salaSlug,
    contenido: datos.items,
  })
  return { id: nuevo }
}

/**
 * Borra una plantilla guardada.
 *
 * Las de código no se tocan: el `where` por id no las encuentra porque no
 * están en la tabla, así que esto es seguro por construcción y no por
 * acordarse de comprobarlo.
 */
export async function borrarPlantilla(plantillaId: string): Promise<void> {
  if (!hayDB()) return
  await db().delete(esquema.plantillas).where(eq(esquema.plantillas.id, plantillaId))
}

// ---- el molde de la minuta ------------------------------------------------

/**
 * El molde con el que se arma la minuta de una sala.
 *
 * Cae al general y, si tampoco lo hay, al de siempre. Nadie se queda sin poder
 * levantar una minuta porque falte configuración.
 */
export async function moldeDeMinuta(salaSlug: string | null): Promise<MoldeMinuta> {
  if (!hayDB()) return MOLDE_POR_DEFECTO

  const filas = await db()
    .select()
    .from(esquema.plantillas)
    .where(
      and(
        eq(esquema.plantillas.tipo, 'minuta'),
        salaSlug
          ? or(isNull(esquema.plantillas.salaSlug), eq(esquema.plantillas.salaSlug, salaSlug))
          : isNull(esquema.plantillas.salaSlug),
      ),
    )

  // El de la sala gana al general: lo más específico manda.
  const suyo = filas.find((f) => f.salaSlug === salaSlug && salaSlug !== null)
  const general = filas.find((f) => f.salaSlug === null)
  return moldeODefecto((suyo ?? general)?.contenido)
}

/** Guarda (o reemplaza) el molde de minuta de una sala, o el general. */
export async function guardarMoldeDeMinuta(
  salaSlug: string | null,
  molde: MoldeMinuta,
): Promise<void> {
  if (!hayDB()) throw new Error('Sin base de datos no se puede guardar el molde.')

  const filas = await db()
    .select({ id: esquema.plantillas.id, salaSlug: esquema.plantillas.salaSlug })
    .from(esquema.plantillas)
    .where(
      and(
        eq(esquema.plantillas.tipo, 'minuta'),
        salaSlug ? eq(esquema.plantillas.salaSlug, salaSlug) : isNull(esquema.plantillas.salaSlug),
      ),
    )

  // Uno por sala, no un histórico: un molde no se versiona, se cambia.
  const existente = filas[0]
  if (existente) {
    await db()
      .update(esquema.plantillas)
      .set({ contenido: molde, updatedAt: new Date() })
      .where(eq(esquema.plantillas.id, existente.id))
    return
  }

  await db().insert(esquema.plantillas).values({
    id: id(),
    tipo: 'minuta',
    nombre: salaSlug ? `Molde de minuta · ${salaSlug}` : 'Molde de minuta',
    paraQue: '',
    salaSlug,
    contenido: molde,
  })
}
