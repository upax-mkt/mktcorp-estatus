import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit no lee .env.local por su cuenta. En local lo cargamos aquí para
// que `db:migrate` use la misma DATABASE_URL que inyecta Vercel; en CI/Vercel
// la variable ya viene del entorno y este bloque no hace nada.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

export default defineConfig({
  schema: './src/db/esquema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // `drizzle-kit generate` no necesita conexión real; `db:migrate` sí, y
    // falla con un mensaje claro si la variable no está en el entorno.
    url: process.env.DATABASE_URL ?? '',
  },
})
