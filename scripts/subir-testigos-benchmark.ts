/**
 * SUBE LAS LÁMINAS DEL BENCHMARK que valen porque se VEN.
 *
 * Un benchmark real trae gráficos, matrices y capturas de los anuncios de la
 * competencia. Algunas se pueden reconstruir con datos —y entonces se
 * reconstruyen, que se leen mejor y se actualizan—, pero otras no: un radar
 * sin valores rotulados, la captura de un anuncio de JCDecaux. Esas se
 * enseñan tal cual, y para eso hay que guardarlas.
 *
 * Se suben al MISMO store privado que el resto (`access: 'private'`) y se
 * sirven por `/api/archivo/[id]`, que comprueba el permiso contra la sala.
 * Nunca por la URL de Blob a pelo.
 *
 * Idempotente: si ya existe un archivo con el mismo título en la sala, no
 * sube otro — imprime el id que ya tenía.
 *
 * Uso: npx tsx scripts/subir-testigos-benchmark.ts
 */
process.loadEnvFile('.env.local')

import { readFileSync } from 'node:fs'
import { put } from '@vercel/blob'
import { and, eq } from 'drizzle-orm'
import { db } from '../src/db/cliente'
import * as esquema from '../src/db/esquema'

const SALA = 'promo-espacio'
const DIR = `${process.env.CLAUDE_JOB_DIR}/tmp/pe`

/** Las láminas que se suben, con el título con el que quedan registradas. */
/**
 * LA EVIDENCIA REAL, y no una lámina de datos.
 *
 * La primera versión de esta lista subía la matriz, la tabla comparativa y la
 * contactabilidad — las tres YA reconstruidas como datos en la propia página.
 * Eso es duplicar. Evidencia es lo que NO se puede reconstruir: los anuncios
 * que la competencia tiene corriendo con su fecha de inicio a la vista, el
 * simulador que ISA tiene montado en su sitio, la portada de JCDecaux con sus
 * campañas reales encima.
 */
const TESTIGOS = [
  { archivo: 'ev-s42-isa-web.png', titulo: 'Evidencia · El simulador de ISA' },
  { archivo: 'ev-s53-jcdecaux-ads-mx.png', titulo: 'Evidencia · Los 17 anuncios de JCDecaux en México' },
  { archivo: 'ev-s57-isa-paid.png', titulo: 'Evidencia · Los anuncios que ISA lleva meses sin apagar' },
  { archivo: 'ev-s54-jcdecaux-ads-intl.png', titulo: 'Evidencia · JCDecaux fuera de México' },
  { archivo: 'ev-s51-gvp-ads-intl.png', titulo: 'Evidencia · Global Vía Pública fuera de México' },
  { archivo: 'ev-s36-jcdecaux-web.png', titulo: 'Evidencia · El catálogo de formatos de JCDecaux' },
  { archivo: 's67-radar.png', titulo: 'Benchmark · Radar de capacidades' },
]

async function main() {
  const conexion = db()
  for (const t of TESTIGOS) {
    const yaEsta = (
      await conexion
        .select({ id: esquema.archivos.id })
        .from(esquema.archivos)
        .where(and(eq(esquema.archivos.salaSlug, SALA), eq(esquema.archivos.titulo, t.titulo)))
        .limit(1)
    )[0]
    if (yaEsta) {
      console.log(`· ya estaba  ${t.titulo}\n  /api/archivo/${yaEsta.id}`)
      continue
    }

    let bytes: Buffer
    try {
      bytes = readFileSync(`${DIR}/${t.archivo}`)
    } catch {
      console.warn(`⚠ no encontré ${DIR}/${t.archivo} — se salta`)
      continue
    }

    const id = crypto.randomUUID()
    const ruta = `salas/${SALA}/imagen/${id}-${t.archivo}`
    await put(ruta, bytes, { access: 'private', contentType: 'image/png', addRandomSuffix: false })
    await conexion.insert(esquema.archivos).values({
      id,
      salaSlug: SALA,
      categoria: 'imagen',
      titulo: t.titulo,
      fecha: null,
      ruta,
      nombreOriginal: t.archivo,
      tipoContenido: 'image/png',
      tamanoBytes: bytes.byteLength,
    })
    console.log(`✓ subido    ${t.titulo}  (${Math.round(bytes.byteLength / 1024)} KB)\n  /api/archivo/${id}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
