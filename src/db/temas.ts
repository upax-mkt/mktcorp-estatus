/**
 * EL REGISTRO DE TEMAS (ronda 8, tarea 5).
 *
 * Hasta el 30-jul, `src/temas/index.ts` exportaba `TEMAS`: un objeto armado
 * en código a partir de un archivo por sala. Desde ahora la fuente es la
 * tabla `salas` — se edita desde la app (tarea 6) y esta es la única capa
 * que sabe leerla.
 */
import { cache } from 'react'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { EsquemaTema, type Tema } from '@/temas/tipos'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'
import { grupoUpax } from '@/temas/grupo-upax'

/**
 * EL ORDEN, tal como estaban en código hasta el 30-jul — es el que ya conocía
 * cualquiera que usara la app, y es el que decide qué sala sale preseleccionada
 * en formularios como `FormularioSesion` (`salas[0]`). Postgres no lo
 * garantiza por su cuenta: sin un `ORDER BY` explícito, el orden de un
 * `SELECT` es el que el motor decida devolver (hoy coincide con la semilla
 * por casualidad, porque el poblado escribió las diez filas de una pasada; el
 * primer `UPDATE` posterior —pausar una sala, regenerar una clave, o
 * cualquier edición de la tarea 6— puede desordenarlo).
 *
 * Un slug que no esté en la semilla (no debería pasar: las salas no se crean
 * desde la app) va al final, no se pierde.
 */
const ORDEN_DE_SEMILLA = Object.keys(SEMILLA_DE_TEMAS)

function posicionDeOrden(slug: string): number {
  const i = ORDEN_DE_SEMILLA.indexOf(slug)
  return i === -1 ? ORDEN_DE_SEMILLA.length : i
}

/**
 * EL REGISTRO COMPLETO, leído de la base: las diez filas de `salas`, con
 * `grupo-upax` incluido (ver `src/temas/semilla.ts` sobre por qué sigue
 * ahí — es la identidad de las reuniones sin sala, `temaDeSala` más abajo).
 *
 * Envuelto en `cache()` de React: una misma petición puede pedirlo desde el
 * hub, desde una tarjeta y desde el proveedor de tema, y se consulta una vez.
 *
 * SIN BASE DE DATOS cae a `SEMILLA_DE_TEMAS`, NO a un registro vacío. Es una
 * desviación deliberada de lo que decía el brief original ("sin base de
 * datos devuelve un registro vacío, son datos y no configuración"): en la
 * práctica esta rama solo se alcanza en vitest —que no carga `.env.local`— y
 * en un `npm run dev` sin credenciales, y en AMBOS casos la app entera sigue
 * funcionando sobre el store en memoria de `src/db/store-memoria.ts`, que sí
 * necesita saber qué es "una sala real" para validar (`crearSesion`,
 * `crearAcuerdo`, `registrarArchivo`, `regenerarClave` lo comprueban SIN
 * mirar `hayDB()`) y qué nombre/color mostrar (`identidadDe`,
 * `src/db/sesiones.ts`, se llama para CADA sesión, con o sin base). Un
 * registro vacío ahí no habría dado "sin datos que editar": habría roto la
 * validación de las nueve salas en decenas de tests que hoy corren sin DB
 * (`src/db/archivos.test.ts`, `src/db/salas.test.ts`,
 * `src/db/sesiones.test.ts`, `src/db/plantillas.test.ts`…) y el propio modo
 * de desarrollo sin credenciales. La semilla es exactamente lo que esas
 * pruebas ya esperaban — es, literalmente, el mismo valor que devolvía el
 * `TEMAS` de código hasta ayer — así que caer en ella no cambia ningún
 * comportamiento observable; sí lo habría cambiado un registro vacío.
 *
 * EL RIESGO REAL no es que Neon se caiga —`hayDB()` solo mira si la variable
 * de entorno existe; si Postgres está inalcanzable la app da 500, no colores
 * viejos— sino un DESPLIEGUE sin `DATABASE_URL` promovida (un preview al que
 * se le olvidó la variable). Ahí este respaldo no rompe nada a la vista: pinta
 * el brandbook tal como estaba en código hasta el 30-jul, silenciosamente,
 * como si fuera el vigente. Si alguien ya editó una marca desde la app (tarea
 * 6), ese despliegue la muestra revertida y nadie se entera. Por eso grita
 * —`console.error`, no un warning que se pierde— cuando el entorno es de
 * producción: la semilla es un respaldo de DESARROLLO, nunca de producción.
 */
export const cargarTemas = cache(async (): Promise<Record<string, Tema>> => {
  if (!hayDB()) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[cargarTemas] sin DATABASE_URL en un entorno de producción: mostrando la marca de la SEMILLA ' +
          '(el brandbook tal como estaba en código hasta el 30-jul), no la vigente. Si alguien ya editó ' +
          'una marca desde la app, este despliegue la muestra revertida sin aviso. Revisa que DATABASE_URL ' +
          'esté promovida a este entorno.',
      )
    }
    return SEMILLA_DE_TEMAS
  }

  // Solo las columnas de marca: esta consulta la pide, entre otros, el enlace
  // público de agenda para pintar un color — no tiene por qué traer
  // `claveHash`/`claveCreadaEn` (hashes de credenciales de sala) en cada
  // petición.
  const filas = await db()
    .select({
      slug: esquema.salas.slug,
      nombre: esquema.salas.nombre,
      primario: esquema.salas.primario,
      secundario: esquema.salas.secundario,
      acento: esquema.salas.acento,
      superficieClara: esquema.salas.superficieClara,
      superficieOscura: esquema.salas.superficieOscura,
      textoSobreClara: esquema.salas.textoSobreClara,
      textoSobreOscura: esquema.salas.textoSobreOscura,
      iconoTitulo: esquema.salas.iconoTitulo,
      textoSobreGradiente: esquema.salas.textoSobreGradiente,
      gradiente: esquema.salas.gradiente,
      familiaDisplay: esquema.salas.familiaDisplay,
      familiaTexto: esquema.salas.familiaTexto,
      redes: esquema.salas.redes,
      analyticsUrl: esquema.salas.analyticsUrl,
    })
    .from(esquema.salas)

  // Orden explícito (ver ORDEN_DE_SEMILLA arriba) ANTES de construir el
  // registro: un `Record` de JS itera sus claves de texto en el orden en que
  // se insertaron, así que el orden de este `for` es el que hereda
  // `Object.keys(registro)` — y con él, `slugsDeSalas()` y todo lo que
  // itera "las salas" para pintarlas.
  const filasOrdenadas = [...filas].sort((a, b) => posicionDeOrden(a.slug) - posicionDeOrden(b.slug))

  const registro: Record<string, Tema> = {}
  for (const fila of filasOrdenadas) {
    // `NOT NULL` (migración 0014) garantiza que cada campo tenga ALGÚN
    // valor, no que tenga la FORMA correcta — un hex mal escrito o un
    // degradado de una sola parada pasarían la restricción de la base sin
    // problema. `EsquemaTema` valida la forma; una fila que no la cumpla se
    // descarta en vez de construir un Tema que pinte CSS inválido. Mismo
    // criterio defensivo que `temaDeSalaSeguro` (src/db/acuerdos.ts,
    // src/db/consultas.ts): un texto de menos en el registro es más barato
    // que una sala rota en pantalla.
    const resultado = EsquemaTema.safeParse(fila)
    if (!resultado.success) {
      console.warn(`[cargarTemas] la sala "${fila.slug}" no pasa la validación de marca; se omite del registro`, resultado.error.issues)
      continue
    }
    registro[fila.slug] = resultado.data
  }
  return registro
})

/**
 * LOS SLUGS DE LAS NUEVE SALAS — las 8 UDNs + Ceci, no las diez filas de
 * `salas`.
 *
 * `grupo-upax` sigue en `cargarTemas()` (hace falta para vestir una reunión
 * sin sala, ver `temaDeSala`) pero NO es una sala para efectos de listar,
 * seleccionar o admitir sesiones/acuerdos/archivos/claves nuevas — dejó de
 * serlo el 24-jul (ver `src/temas/semilla.ts`) y esto reproduce exactamente
 * la exclusión que hacía el `TEMAS` de código hasta el 30-jul. Que la fila
 * exista y esté activa en la base es una decisión de Franco, aparte, que se
 * gobierna con `salas.activa` — no con esta lista.
 *
 * El orden es el de `cargarTemas()` (ver `ORDEN_DE_SEMILLA`): esta lista
 * alimenta directamente selectores como el de `FormularioSesion`, donde el
 * primer elemento es la sala preseleccionada al agendar.
 */
export const slugsDeSalas = cache(async (): Promise<string[]> => {
  const registro = await cargarTemas()
  return Object.keys(registro).filter((slug) => slug !== grupoUpax.slug)
})
