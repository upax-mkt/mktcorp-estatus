/**
 * La comprobación LEÍDA de la migración. Un reporte que dice "verificado" no
 * prueba nada: en la ronda 9 un subagente borró una migración del disco
 * dejándola en el journal y aplicada, y solo se cazó consultando la base.
 *
 * Uso:  node scripts/verificar-migracion.mjs [antes|despues]
 */
process.loadEnvFile(process.env.ENV_FILE ?? '.env.local')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

const momento = process.argv[2] ?? 'ahora'
const filas = async (etiqueta, consulta) => {
  const r = await consulta
  console.log(`${etiqueta.padEnd(34)} ${JSON.stringify(r[0] ?? r)}`)
}

console.log(`\n=== ${momento.toUpperCase()} · ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]} ===`)
await filas('sesiones', sql`select count(*)::int n from sesiones`)
await filas('reuniones', sql`select count(*)::int n from reuniones`)
await filas('documentos', sql`select count(*)::int n from documentos`)
await filas('items', sql`select count(*)::int n from items`)
await filas('minutas', sql`select count(*)::int n from minutas`)
await filas('acuerdos', sql`select count(*)::int n from acuerdos`)
await filas('participacion', sql`select count(*)::int n from participacion`)
await filas('archivos presentacion', sql`select count(*)::int n from archivos where categoria='presentacion'`)
try {
  await filas('  ...de esos, sin reunión', sql`select count(*)::int n from archivos where categoria='presentacion' and reunion_id is null`)
} catch (e) {
  // Solo 42703 (undefined_column, ver https://www.postgresql.org/docs/current/errcodes-appendix.html)
  // significa "la columna aún no existe" — cualquier otro código (timeout,
  // permisos, columna renombrada) es un fallo real y debe reventar, no
  // disfrazarse de "todavía no aplica". Este es el script que valida la
  // migración destructiva de la Tarea 8: un "verificado" falso aquí es
  // justo lo que existe para prevenir.
  if (e.code === '42703') {
    console.log(`${'  ...de esos, sin reunión'.padEnd(34)} — columna aún no existe`)
  } else {
    throw e
  }
}
await filas('reuniones sin sala', sql`select count(*)::int n from reuniones r left join salas s on s.slug=r.sala_slug where s.slug is null`)
await filas('documentos sin reunión', sql`select count(*)::int n from documentos d left join reuniones r on r.id=d.reunion_id where r.id is null`)
