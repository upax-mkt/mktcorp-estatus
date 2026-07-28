import { firmar } from '@/auth/firma'
const token = await firmar(
  { rol: 'equipo' as const, sub: 'verificacion', exp: Date.now() + 30 * 60 * 1000 },
  process.env.SESSION_SECRET!,
)
process.stdout.write(`http://localhost:3000${process.argv[2]}?acceso=${encodeURIComponent(token)}`)
