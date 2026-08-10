/**
 * Comprueba que el DOCUMENTO enseña lo que hay escrito AHORA, y no la foto
 * del último "Generar la presentación".
 *
 * Escribe un título temporal en una sección, lee el documento, y lo devuelve
 * a como estaba. No deja rastro.
 *
 * Uso: npx tsx scripts/verifica-documento-vigente.ts <reunionId>
 */
process.loadEnvFile('.env.local')

import { documentoDeReunion, guardarSeccion } from '../src/db/documentos'
import type { BorradorSeccion } from '../src/secciones/borrador'

async function main() {
  const reunionId = process.argv[2]
  const doc = await documentoDeReunion(reunionId)
  if (!doc) { console.error('sin documento'); process.exit(1) }

  const item = doc.items.find((i) => (i.contenido.seccion as BorradorSeccion | undefined)?.titulo)
  if (!item) { console.error('sin sección con título'); process.exit(1) }
  const original = item.contenido.seccion as BorradorSeccion

  console.log('sección de prueba:', JSON.stringify(original.titulo))
  console.log('lo que enseña el documento AHORA:', JSON.stringify(item.resultado?.decision.titulo))

  const marca = `${original.titulo} · PRUEBA-${Date.now().toString().slice(-5)}`
  await guardarSeccion(doc.id, item.id, { ...original, titulo: marca })

  const tras = await documentoDeReunion(reunionId)
  const leido = tras!.items.find((i) => i.id === item.id)!.resultado?.decision.titulo
  const ok = leido === marca
  console.log('tras editar SIN volver a maquetar, el documento enseña:', JSON.stringify(leido))
  console.log(ok ? '✓ el documento refleja la edición al instante' : '✗ SIGUE sirviendo la foto vieja')

  await guardarSeccion(doc.id, item.id, original)
  const fin = await documentoDeReunion(reunionId)
  console.log('restaurado a:', JSON.stringify(fin!.items.find((i) => i.id === item.id)!.resultado?.decision.titulo))
  process.exit(ok ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
