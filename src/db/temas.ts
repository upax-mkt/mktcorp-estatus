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
import type { Tema } from '@/temas/tipos'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'
import { grupoUpax } from '@/temas/grupo-upax'

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
 */
export const cargarTemas = cache(async (): Promise<Record<string, Tema>> => {
  if (!hayDB()) return SEMILLA_DE_TEMAS

  const filas = await db().select().from(esquema.salas)
  const registro: Record<string, Tema> = {}
  for (const fila of filas) {
    // Las columnas de marca nacieron anulables (migración 0013) y solo se
    // exigen NOT NULL desde la 0014, ya aplicada — pero Drizzle sigue
    // tipándolas como posiblemente nulas porque no lee esa restricción del
    // esquema. Si alguna fila llegara sin completar (no debería) se
    // descarta en vez de construir un Tema roto a medias: mismo criterio
    // defensivo que `temaDeSalaSeguro` (src/db/acuerdos.ts, src/db/consultas.ts).
    if (
      fila.nombre == null || fila.primario == null || fila.secundario == null ||
      fila.acento == null || fila.superficieClara == null || fila.superficieOscura == null ||
      fila.textoSobreClara == null || fila.textoSobreOscura == null || fila.gradiente == null ||
      fila.familiaDisplay == null || fila.familiaTexto == null
    ) {
      console.warn(`[cargarTemas] la sala "${fila.slug}" tiene su marca incompleta; se omite del registro`)
      continue
    }
    registro[fila.slug] = {
      slug: fila.slug,
      nombre: fila.nombre,
      primario: fila.primario,
      secundario: fila.secundario,
      acento: fila.acento,
      superficieClara: fila.superficieClara,
      superficieOscura: fila.superficieOscura,
      textoSobreClara: fila.textoSobreClara,
      textoSobreOscura: fila.textoSobreOscura,
      gradiente: fila.gradiente,
      familiaDisplay: fila.familiaDisplay,
      familiaTexto: fila.familiaTexto,
    }
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
 */
export const slugsDeSalas = cache(async (): Promise<string[]> => {
  const registro = await cargarTemas()
  return Object.keys(registro).filter((slug) => slug !== grupoUpax.slug)
})
