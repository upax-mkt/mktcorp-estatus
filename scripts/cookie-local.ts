/**
 * Emite una cookie de sesión de equipo firmada, para verificar el documento en
 * local con un navegador headless sin pasar por Slack.
 *
 * Uso:  npx tsx scripts/cookie-local.ts
 * Solo local: usa el SESSION_SECRET de .env.local y caduca en una hora.
 */
process.loadEnvFile('.env.local')

import { firmar } from '../src/auth/firma'

async function main() {
  const secreto = process.env.SESSION_SECRET
  if (!secreto || secreto.trim().length === 0) {
    console.error('Falta SESSION_SECRET en .env.local')
    process.exit(1)
  }
  const token = await firmar(
    { rol: 'equipo', sub: 'verificacion-local', rolApp: 'admin', exp: Date.now() + 3_600_000 },
    secreto,
  )
  console.log(token)
}

main().catch((e) => { console.error(e); process.exit(1) })
