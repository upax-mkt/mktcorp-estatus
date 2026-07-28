import { listarSesiones } from '@/db/sesiones'
const s = (await listarSesiones()).find((x) => x.salaSlug === 'zeus')!
process.stdout.write(s.id)
