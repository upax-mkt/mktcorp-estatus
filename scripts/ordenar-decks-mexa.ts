/**
 * DEJA UNA SOLA RÉPLICA DEL ESTATUS DE MEXA, Y EN "EN PREPARACIÓN".
 *
 * Dos arreglos, los dos de una decisión equivocada al montar:
 *
 * 1. LA FECHA. Se montó con `2026-06-30`, el cierre del mes que el estatus
 *    reporta. Pero /deck no clasifica por periodo, clasifica por si la sesión
 *    ya ocurrió: `enPreparacion` es `estado === 'agendada' && !fueDada(...)`, y
 *    `fueDada` da por presentada cualquier agendada que tenga documento
 *    maquetado y cuyo día ya pasó. Con fecha de junio y el deck maquetado, la
 *    app la archivó sola: aparecía enterrada en "Anteriores" y no había forma
 *    de encontrarla. La fecha de una reunión es la de la SESIÓN, no la del
 *    periodo — que es lo que ya hacía `montar-nc-junio-2026.ts`.
 *
 * 2. EL DUPLICADO. La primera versión (quince secciones, sin la lectura del
 *    mes ni los siguientes pasos) quedó en la lista junto a la buena, con el
 *    mismo título y la misma fecha: imposible distinguirlas desde la interfaz.
 *
 * Uso:  npx tsx scripts/ordenar-decks-mexa.ts [--seco]
 */
process.loadEnvFile('.env.local')

import { editarReunion, eliminarReunion, obtenerReunion } from '../src/db/reuniones'
import { eliminarDocumentoDeReunion } from '../src/db/documentos'
import { instanteEnCDMX } from '../src/lib/fecha'

/** La réplica buena: dieciocho secciones. */
const VIGENTE = '655af261-0335-49c3-844c-b9137245588a'
/** La primera pasada, de quince secciones. */
const OBSOLETA = '9017ac2d-3fc2-458f-ab9f-0e0b24b58c97'
/** La sesión en la que se presenta. */
const FECHA_SESION = instanteEnCDMX('2026-08-18', '12:00')

const SECO = process.argv.includes('--seco')

async function main() {
  const vigente = await obtenerReunion(VIGENTE)
  const obsoleta = await obtenerReunion(OBSOLETA)
  if (!vigente) { console.error(`No existe la reunión vigente ${VIGENTE}`); process.exit(1) }

  console.log('Vigente :', vigente.titulo, '·', vigente.fecha, '·', vigente.estado)
  console.log('Obsoleta:', obsoleta ? `${obsoleta.titulo} · ${obsoleta.fecha}` : '(ya no existe)')
  console.log(`\nSe hará:\n  · fecha de la vigente → ${FECHA_SESION.toISOString()}`)
  console.log(obsoleta ? '  · borrar la obsoleta, con su documento' : '  · nada que borrar')
  if (SECO) { console.log('\n(--seco: no se tocó nada)'); return }

  await editarReunion(VIGENTE, { fecha: FECHA_SESION })
  console.log('\n✓ fecha actualizada')

  if (obsoleta) {
    await eliminarReunion(OBSOLETA, eliminarDocumentoDeReunion)
    console.log('✓ obsoleta eliminada')
  }

  const despues = await obtenerReunion(VIGENTE)
  console.log('\nQueda:', despues?.titulo, '·', despues?.fecha, '·', despues?.estado)
  console.log(`  /deck/${VIGENTE}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
