/**
 * Carga el estatus de junio 2026 de Mexa Creativa como SESIÓN REAL en la base.
 *
 * Es una prueba de fuego del editor, no un atajo: crea la sesión y va añadiendo
 * y guardando sección por sección con las MISMAS funciones que usa la pantalla
 * (`anadirSeccion`, `guardarSeccion`). Si el editor no pudiera representar algo
 * del deck, este guion tampoco podría.
 *
 * Al terminar imprime la URL para abrirla y editarla como cualquier otra.
 *
 *   npx tsx scripts/sembrar-mexa-junio.mts
 */
process.loadEnvFile('.env.local')

const { hayDB } = await import('../src/db/cliente')
if (!hayDB()) {
  console.error('Falta DATABASE_URL en .env.local: sin base no hay sesión que sembrar.')
  process.exit(1)
}

const { MC_JUNIO_2026 } = await import('../src/fixtures/mc-junio-2026')
const {
  crearSesionConEstructura, anadirSeccion, guardarSeccion, obtenerSesion,
  entradasCrudasDeSesion, guardarDecisiones,
} = await import('../src/db/sesiones')
const { maquetarSesion } = await import('../src/motor/maquetar')
const { tipoDeSeccion } = await import('../src/secciones/catalogo')

// La sesión nace con las OCHO secciones base. El deck de junio se cuelga de
// ellas: sus divisores corresponden a cuatro, y las páginas de contenido que
// venían detrás de cada uno son sus subsecciones. Campañas 360 y RevOps se
// quedan vacías porque ese mes no se trataron — que es exactamente lo que un
// estatus real tiene: bloques fijos y contenido variable.
const { id } = await crearSesionConEstructura({
  salaSlug: 'mexa-creativa', tipo: 'mensual', alcance: 'todos',
})

/** Qué divisor del deck corresponde a qué sección base de hoy. */
const BLOQUE_POR_DIVISOR: Record<string, string> = {
  'Portafolio & ecosistema': 'portafolio-ecosistema',
  'Performance & conversión': 'performance-conversion',
  'Outbound & pipeline': 'outbound-pipeline',
}

/**
 * "Acuerdos y Pendientes" es una sección ÚNICA, no un bloque: el divisor del
 * deck y la tabla que venía detrás son la misma cosa. Se descarta el divisor y
 * la tabla se guarda directamente en la sección base.
 */
const DIVISOR_REDUNDANTE = 'Acuerdos y pendientes'

const base = (tipo: string) => (sesionBase.items.find((i) => i.tipo === tipo))!
let sesionBase = (await obtenerSesion(id))!
let bloqueActual: string | undefined

for (const decision of MC_JUNIO_2026) {
  // `razon` es la explicación que da la IA de su decisión. Aquí la sección la
  // compone una persona: no hay nada que auditar y no viaja al borrador.
  const { razon: _razon, ...borrador } = decision

  // Portada y Agenda YA existen como sección base: se rellenan, no se crean.
  if (decision.layout === 'portada' || decision.layout === 'agenda') {
    await guardarSeccion(id, base(decision.layout).id, borrador)
    console.log(`  ✓ ${decision.titulo}`)
    continue
  }

  // El divisor de acuerdos no se crea: su contenido es la tabla que sigue.
  if (decision.titulo === DIVISOR_REDUNDANTE) {
    bloqueActual = 'acuerdos-pendientes'
    continue
  }
  // La tabla de pendientes ES la sección base, no una subsección suya.
  if (bloqueActual === 'acuerdos-pendientes' && decision.layout === 'pendientes-semaforo') {
    await guardarSeccion(id, base('acuerdos-pendientes').id, borrador)
    console.log(`  ✓ ${decision.titulo} (en Acuerdos y Pendientes)`)
    continue
  }

  // Un divisor del deck es una sección base de hoy: se rellena y abre bloque.
  const tipoBase = BLOQUE_POR_DIVISOR[decision.titulo]
  if (decision.layout === 'divisor-seccion' && tipoBase) {
    await guardarSeccion(id, base(tipoBase).id, borrador)
    bloqueActual = tipoBase
    console.log(`  ✓ ${decision.titulo}`)
    continue
  }

  // El resto son subsecciones del bloque abierto (o secciones sueltas al
  // final, como el cierre).
  const padre = decision.layout === 'cierre' ? undefined : bloqueActual
  const nombre = tipoDeSeccion(decision.layout)?.nombre ?? decision.layout
  const { itemId } = await anadirSeccion(id, decision.layout, nombre, padre)
  await guardarSeccion(id, itemId, borrador)
  sesionBase = (await obtenerSesion(id))!
  console.log(`  ${padre ? '   ↳' : '✓'} ${decision.titulo}`)
}

// Se maqueta con la IA DESHABILITADA a propósito: si alguna sección necesitara
// al modelo, aquí se caería. Todas están compuestas a mano.
const clave = process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_API_KEY
const sesion = (await obtenerSesion(id))!
const resultados = await maquetarSesion(entradasCrudasDeSesion(sesion), sesion.salaSlug)
await guardarDecisiones(id, resultados)
if (clave !== undefined) process.env.ANTHROPIC_API_KEY = clave

const degradadas = resultados.filter((r) => r.degradado)
if (degradadas.length > 0) {
  console.error(`\n⚠ ${degradadas.length} sección(es) degradada(s):`)
  for (const d of degradadas) console.error(`  · ${d.decision.titulo}: ${d.motivo}`)
} else {
  console.log('\nTodas las secciones se maquetaron sin IA y sin degradar.')
}

console.log(`\nSesión sembrada con ${MC_JUNIO_2026.length} secciones.`)
console.log(`  Editor:    /preparar/${id}`)
console.log(`  Documento: /sesion/${id}`)
