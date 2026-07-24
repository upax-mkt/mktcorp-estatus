/**
 * Cliente Drizzle + Neon (driver HTTP, sin websockets — el adecuado para
 * funciones serverless de Vercel). NO se conecta ni lanza al importar este
 * módulo si falta DATABASE_URL: solo al llamar a db() sin ella configurada.
 * Mientras Franco no dé el DATABASE_URL, toda la app debe usar hayDB() para
 * decidir si consulta Postgres o cae al fallback de src/datos-ejemplo.ts.
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as esquema from './esquema'

export type BaseDeDatos = ReturnType<typeof drizzle<typeof esquema>>

let clienteCacheado: BaseDeDatos | null = null

/** true si DATABASE_URL está definida (y no vacía). No valida que sea alcanzable. */
export function hayDB(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)
}

/**
 * Cliente Drizzle, creado de forma perezosa. Lanza si se llama sin
 * DATABASE_URL — el llamador debe comprobar hayDB() antes.
 */
export function db(): BaseDeDatos {
  if (!hayDB()) {
    throw new Error(
      'db() llamado sin DATABASE_URL. Usa hayDB() antes de consultar la base de datos.',
    )
  }
  if (!clienteCacheado) {
    const sql = neon(process.env.DATABASE_URL as string)
    clienteCacheado = drizzle(sql, { schema: esquema })
  }
  return clienteCacheado
}
