import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/esquema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // No hay DATABASE_URL todavía (Franco lo dará). `drizzle-kit generate`
    // no necesita conexión real; `db:migrate` sí, y fallará con un mensaje
    // claro hasta que la variable exista.
    url: process.env.DATABASE_URL ?? '',
  },
})
