/**
 * MAQUETA UNA REUNIÓN YA LLENADA, sin pasar por el navegador.
 *
 * Hace exactamente lo que la Server Action `maquetar` de `/deck/[id]`
 * (src/app/deck/[id]/page.tsx), menos la comprobación de sesión: leer las
 * entradas del documento, pasarlas por el motor y guardar las decisiones.
 *
 * SIN RED cuando todas las secciones están compuestas a mano: `maquetarBorrador`
 * es determinista (ver src/motor/maquetar.ts) y no llama al modelo. Por eso
 * esto corre en local, donde no hay `ANTHROPIC_API_KEY`. Si alguna sección
 * llegara por el camino asistido, ahí sí fallaría — y el error lo dirá.
 *
 * Uso:  npx tsx scripts/maquetar-reunion.ts <reunionId>
 */
process.loadEnvFile('.env.local')

import { documentoDeReunion, entradasCrudasDeDocumento, guardarDecisiones } from '../src/db/documentos'
import { obtenerReunion } from '../src/db/reuniones'
import { maquetarSesion } from '../src/motor/maquetar'

async function main() {
  const reunionId = process.argv[2]
  if (!reunionId) { console.error('Falta el id de la reunión'); process.exit(1) }

  const reunion = await obtenerReunion(reunionId)
  if (!reunion) { console.error(`No existe la reunión ${reunionId}`); process.exit(1) }

  const documento = await documentoDeReunion(reunionId)
  if (!documento) { console.error('Esa reunión no tiene documento'); process.exit(1) }

  const entradas = entradasCrudasDeDocumento(documento)
  if (entradas.length === 0) { console.error('No hay secciones llenadas'); process.exit(1) }

  const resultados = await maquetarSesion(entradas, reunion.salaSlug)
  await guardarDecisiones(documento.id, resultados)

  const degradadas = resultados.filter((r) => r.degradado)
  console.log(`✓ ${resultados.length} secciones maquetadas · degradadas: ${degradadas.length}`)
  for (const d of degradadas) console.log(`  ⚠ ${d.decision.titulo}: ${d.motivo ?? '—'}`)
  console.log(`\n/deck/${reunionId}/documento`)
}

main().catch((e) => { console.error(e); process.exit(1) })
