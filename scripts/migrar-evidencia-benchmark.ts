/**
 * MIGRA LOS SEIS TESTIGOS del benchmark de Promo Espacio a evidencia de base.
 *
 * Franco: *"la evidencia mejor la cargaré manualmente según la categoría,
 * subiré imágenes o videos o url; crea el módulo y reemplaza lo que cargaste
 * como imagen, NO QUITES EL TEXTO ya que es su bajada explicativa"*.
 *
 * Las seis imágenes ya estaban subidas a Blob (`scripts/subir-testigos-
 * benchmark.ts`) y registradas con `categoria: 'imagen'`; sus bajadas vivían
 * escritas en `src/datos/benchmark.ts`. Esto NO vuelve a subir nada: toma las
 * filas que ya existen y les pone encima lo que les faltaba para ser
 * evidencia —la categoría, la disciplina y la bajada—, sin tocar el binario.
 *
 * LAS BAJADAS VAN COPIADAS PALABRA POR PALABRA del archivo de datos. Es lo
 * que pidió Franco explícitamente y es lo único de este script que no se
 * puede rehacer si se pierde: el binario está en Blob, el texto no estaba en
 * ningún otro sitio.
 *
 * Idempotente: una fila que ya está en `evidencia` con su bajada no se toca.
 * Se puede correr dos veces sin duplicar ni pisar una edición hecha desde la
 * app.
 *
 * ⚠️ ESCRIBE EN LA BASE QUE COMPARTEN LOCAL Y PRODUCCIÓN.
 *
 * Uso: npx tsx scripts/migrar-evidencia-benchmark.ts [--seco]
 */
import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'

// `readFileSync` y no `process.loadEnvFile`: si el shell ya trae un
// DATABASE_URL, `loadEnvFile` NO lo pisa y se escribiría en otra base.
for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(linea.trim())
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

// `require` y no `import` estático: el import se izaría por encima del bloque
// de arriba y `src/db/cliente` leería DATABASE_URL antes de que exista. Y no
// `await import(...)`, que tsx compila a CJS y no admite await de nivel
// superior.
/* eslint-disable @typescript-eslint/no-require-imports */
const { db } = require('../src/db/cliente') as typeof import('../src/db/cliente')
const esquema = require('../src/db/esquema') as typeof import('../src/db/esquema')
/* eslint-enable @typescript-eslint/no-require-imports */

const SECO = process.argv.includes('--seco')

/**
 * El id de la fila ya registrada, su disciplina y su bajada.
 *
 * Los ids salen de `src/datos/benchmark.ts` tal como los dejó el script de
 * subida: son las URLs `/api/archivo/<id>` que la página servía.
 */
const EVIDENCIA = [
  {
    id: '0ae4933c-704c-4669-96f1-ad6d0b3b035b',
    bloque: 'portafolio',
    titulo: 'El simulador de ISA',
    lectura: 'Un asistente de tres pasos dentro de su sitio —elegir el espacio, subir la imagen, ver el resultado— que monta la creatividad del cliente sobre la foto de un espacio real. Nadie más en el set lo tiene: resuelve solo la objeción de “no me imagino cómo se va a ver”, sin una llamada. Es lo único del análisis que obliga a construir algo, no a decir algo distinto.',
  },
  {
    id: '87a34f46-c3ae-4cdc-be55-cc6f9694e1f9',
    bloque: 'paid',
    titulo: 'Los 17 anuncios que JCDecaux tiene corriendo en México',
    lectura: 'Diecisiete anuncios de búsqueda vivos, uno por formato, repartidos en dos dominios propios que compiten entre sí. Todo el argumento es cobertura y escala —“más de 15 mil anuncios”, “presencia en 32 estados”— y meten su suite de medición como enlaces del propio anuncio: Mide el Impacto, Post Buy, Engage. No venden espacios: venden cobertura con medición, y lo dicen desde el anuncio.',
  },
  {
    id: '632c7458-2b16-4633-be80-9bfa3b10c28a',
    bloque: 'paid',
    titulo: 'Los anuncios que ISA lleva meses sin apagar',
    lectura: 'Dos anuncios marcados “Activo” en la biblioteca de Meta con su fecha de arranque a la vista: uno desde septiembre y otro desde diciembre de 2025. No venden “OOH”, venden dos activos concretos —aeropuertos y Metro— con foto de sus pantallas ya instaladas y campañas de cliente corriendo. Es el competidor con la operación de pauta más constante del set, y la fecha lo hace indiscutible en una junta.',
  },
  {
    id: '3b1c5117-7617-4509-b252-5619fa49811f',
    bloque: 'rrss',
    titulo: 'JCDecaux fuera de México: caso de éxito, no catálogo',
    lectura: 'En LinkedIn no anuncian inventario: anuncian el takeover de Wembley por una serie de conciertos agotados. En Meta venden con promesa de retorno y sostienen una serie de contenido propia ya en su quinto episodio. Es el techo de la categoría, y es contra esto que se va a comparar el material de Promo Espacio — no contra una lámina de formatos.',
  },
  {
    id: 'd44f6b1b-1fd2-4191-ac19-d077ea31d3db',
    bloque: 'rrss',
    titulo: 'Global Vía Pública fuera de México nombra a sus clientes',
    lectura: 'Afuera sí hacen paid social, y con marca cliente a la vista: sus pantallas corriendo Scotiabank, y la final de la Copa Libertadores con “Amstel apostó por dos de nuestras ubicaciones más potentes”. En México, en cambio, dejan redes sociales vacías. Es un movimiento concreto y copiable que ya dominan y todavía no traen aquí.',
  },
  {
    id: 'bf72cbc8-d3d1-4a60-9766-6bd1b0b1b1d2',
    bloque: 'web',
    titulo: 'Cómo JCDecaux vende formato por formato',
    lectura: 'Su página de mobiliario urbano no lista formatos: los vende uno a uno con fotografía de calle real y una línea de beneficio cada uno, con campañas de cliente vivas encima. Es el estándar de cómo debería verse una oferta en pantalla. El contrapunto que el propio análisis marca: dependen al 100% del formulario para que alguien los contacte.',
  },
] as const

async function main() {
  const conexion = db()
  for (const e of EVIDENCIA) {
    const fila = (
      await conexion
        .select({
          id: esquema.archivos.id,
          salaSlug: esquema.archivos.salaSlug,
          categoria: esquema.archivos.categoria,
          lectura: esquema.archivos.lectura,
          bloque: esquema.archivos.bloque,
        })
        .from(esquema.archivos)
        .where(eq(esquema.archivos.id, e.id))
    )[0]

    if (!fila) {
      console.warn(`⚠ no existe la fila ${e.id} — «${e.titulo}». Se salta.`)
      continue
    }
    if (fila.categoria === 'evidencia' && fila.bloque === e.bloque && fila.lectura) {
      console.log(`· ya migrada  [${e.bloque}] ${e.titulo}`)
      continue
    }
    if (SECO) {
      console.log(`→ migraría   [${e.bloque}] ${e.titulo}  (hoy: ${fila.categoria}/${fila.bloque ?? 'sin bloque'})`)
      continue
    }

    await conexion
      .update(esquema.archivos)
      .set({
        categoria: 'evidencia',
        bloque: e.bloque,
        titulo: e.titulo,
        lectura: e.lectura,
        updatedAt: new Date(),
      })
      .where(eq(esquema.archivos.id, e.id))
    console.log(`✓ migrada     [${e.bloque}] ${e.titulo}`)
  }

  // El radar iba subido como imagen y ya NO se usa: se reconstruyó como dato
  // (gráfico de la disciplina Portafolio). Se avisa pero no se borra desde
  // aquí — borrar un binario es una decisión, no un efecto secundario de una
  // migración.
  const radar = (
    await conexion
      .select({ id: esquema.archivos.id, titulo: esquema.archivos.titulo })
      .from(esquema.archivos)
      .where(eq(esquema.archivos.titulo, 'Benchmark · Radar de capacidades'))
  )[0]
  if (radar) {
    console.log(
      `\nℹ La lámina del radar (${radar.id}) sigue registrada como imagen y ya no se usa:\n` +
        '  el radar se reconstruyó como dato. Se puede quitar desde la sala cuando se quiera.',
    )
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
