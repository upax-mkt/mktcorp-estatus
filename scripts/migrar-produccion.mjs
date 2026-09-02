/**
 * MIGRAR LA BASE DE PRODUCCIÓN — a mano y a propósito.
 *
 * Desde el 1-sep-2026 `.env.local` apunta a la rama `dev` de Neon, así que
 * `npm run db:migrate` migra dev y NO toca lo que Franco ve en el sitio. Eso
 * es lo que queremos el 99% de las veces; el 1% restante es este script.
 *
 * Existe como archivo aparte, y no como una variable que alguien exporta en su
 * terminal, porque el fallo que lo motivó fue precisamente ese: una sesión de
 * desarrollo apuntando a producción sin que nadie lo hubiera decidido. Aquí
 * hay que teclear el nombre del comando y confirmar.
 *
 * Uso:  npm run db:migrate:prod
 */
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { spawnSync } from 'node:child_process'

if (!existsSync('.env.prod.local')) {
  console.error('Falta .env.prod.local (la DATABASE_URL de la rama `main` de Neon).')
  process.exit(1)
}
process.loadEnvFile('.env.prod.local')

const url = process.env.DATABASE_URL ?? ''
// Se enseña el host, nunca la contraseña: este script se corre delante de gente.
const host = url.match(/@([^/]+)\//)?.[1] ?? '(no se pudo leer el host)'

console.log('\n⚠️  Vas a migrar la base de PRODUCCIÓN —lo que Franco ve en el sitio.')
console.log(`   Host: ${host}\n`)

const rl = createInterface({ input: process.stdin, output: process.stdout })
const respuesta = await rl.question('Escribe "producción" para continuar: ')
rl.close()

if (respuesta.trim().toLowerCase() !== 'producción') {
  console.log('Cancelado. No se tocó nada.')
  process.exit(0)
}

const r = spawnSync('npx', ['drizzle-kit', 'migrate'], { stdio: 'inherit', env: process.env })
process.exit(r.status ?? 1)
