/**
 * DIAGNÓSTICO: ¿por qué la vista previa del editor no enseña lo mismo que el
 * documento? Aísla la capa — compara el borrador guardado, lo que produce
 * `maquetarBorrador` (que usan la previa Y el documento) y la decisión que
 * quedó guardada al maquetar.
 *
 * Uso: npx tsx scripts/diagnostico-previa.ts <reunionId>
 */
process.loadEnvFile('.env.local')

import { documentoDeReunion } from '../src/db/documentos'
import { maquetarBorrador } from '../src/motor/maquetar'
import type { BorradorSeccion } from '../src/secciones/borrador'
import type { DecisionSlide } from '../src/decision/esquema'

async function main() {
  const doc = await documentoDeReunion(process.argv[2])
  if (!doc) { console.error('sin documento'); process.exit(1) }

  for (const item of doc.items) {
    const b = item.contenido.seccion as BorradorSeccion | undefined
    if (!b) continue
    const m = maquetarBorrador(b, item.titulo ?? 'Sección', item.acuerdosRetomados)
    const guardada = item.resultado?.decision as DecisionSlide | undefined

    const cuenta = (d?: Partial<DecisionSlide>) => ({
      tablas: d?.tablas?.length ?? 0,
      filas: d?.tablas?.reduce((n, t) => n + t.filas.length, 0) ?? 0,
      graficos: d?.graficos?.length ?? 0,
      columnas: d?.columnas?.length ?? 0,
      bloques: d?.bloques?.length ?? 0,
      kpis: d?.kpis?.length ?? 0,
    })
    const enBorrador = cuenta(b)
    const enMaqueta = cuenta(m.decision)
    const enGuardada = cuenta(guardada)

    const difiere = JSON.stringify(enMaqueta) !== JSON.stringify(enGuardada)
      || JSON.stringify(enBorrador) !== JSON.stringify(enMaqueta)
    if (!difiere) continue

    console.log(`\n── ${b.layout} · "${(b.titulo ?? item.titulo ?? '').slice(0, 46)}"`)
    console.log('   borrador guardado :', JSON.stringify(enBorrador))
    console.log('   maquetarBorrador  :', JSON.stringify(enMaqueta), m.degradado ? `⚠ DEGRADADO: ${m.motivo}` : '')
    console.log('   decisión en base  :', JSON.stringify(enGuardada))
  }
  console.log('\n(solo se listan las secciones donde alguna capa difiere)')
}

main().catch((e) => { console.error(e); process.exit(1) })
