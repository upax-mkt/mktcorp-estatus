/**
 * PUEBLA LAS COLUMNAS DE MARCA de `salas` (ronda 8, tarea 5). Script de un
 * solo uso: corre entre las dos migraciones — 0013 (columnas anulables) ya
 * aplicada, 0014 (`NOT NULL`) todavía no — para que la segunda no falle
 * contra una fila sin completar.
 *
 * Para cada entrada de `SEMILLA_DE_TEMAS`, un UPDATE de la fila de esa sala
 * con sus doce campos. Idempotente por diseño: siempre escribe los mismos
 * valores fijos de la semilla, así que correrlo dos veces deja la base
 * exactamente igual — no sirve para "restaurar" una marca editada desde la
 * app después de esta tarea, solo para la carga inicial.
 *
 * Uso:
 *   npx tsx scripts/poblar-marcas.ts
 *
 * `drizzle-kit` y `tsx` no cargan `.env.local` por su cuenta (mismo motivo
 * que documenta drizzle.config.ts): sin esta línea, `DATABASE_URL` llegaría
 * vacía y `db()` reventaría al primer UPDATE.
 */
process.loadEnvFile('.env.local')

import { eq } from 'drizzle-orm'
import { db } from '../src/db/cliente'
import * as esquema from '../src/db/esquema'
import { SEMILLA_DE_TEMAS } from '../src/temas/semilla'

async function main() {
  const conexion = db()
  let actualizadas = 0

  for (const tema of Object.values(SEMILLA_DE_TEMAS)) {
    const resultado = await conexion
      .update(esquema.salas)
      .set({
        nombre: tema.nombre,
        primario: tema.primario,
        secundario: tema.secundario,
        acento: tema.acento,
        superficieClara: tema.superficieClara,
        superficieOscura: tema.superficieOscura,
        textoSobreClara: tema.textoSobreClara,
        textoSobreOscura: tema.textoSobreOscura,
        gradiente: tema.gradiente,
        familiaDisplay: tema.familiaDisplay,
        familiaTexto: tema.familiaTexto,
        updatedAt: new Date(),
      })
      .where(eq(esquema.salas.slug, tema.slug))
      .returning({ slug: esquema.salas.slug })

    if (resultado.length === 0) {
      // No debería pasar: las diez filas ya existen (viven como semillas, no
      // se crean desde este script). Si una sala de la semilla no encuentra
      // fila, es una desincronización entre `salas` y `SEMILLA_DE_TEMAS` que
      // hay que mirar a mano, no algo que este script deba arreglar solo.
      console.warn(`⚠ no existe una fila en "salas" para el slug "${tema.slug}"`)
      continue
    }
    actualizadas += 1
    console.log(`✓ ${tema.slug}`)
  }

  console.log(`\n${actualizadas} de ${Object.keys(SEMILLA_DE_TEMAS).length} salas pobladas.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
