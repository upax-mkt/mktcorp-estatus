import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db, hayDB } from './cliente'
import * as esquema from './esquema'
import { buscarPersona, listarPersonas, normalizarCorreo, type Persona } from './directorio'
import { CONCURSO_ID } from '@/concurso/config'
import { faseDelConcurso } from '@/concurso/fase'
import { filasDeImagenes } from '@/concurso/filas-imagenes'
import { validarIntegrantes, validarPropuesta, type ArchivoPropuesta } from '@/concurso/validacion'
import { calificacionJurado, puntajeFinal } from '@/concurso/resultados'

export interface PropuestaConcurso {
  id: string
  titulo: string
  descripcion: string
  oculta: boolean
  integrantes: Array<Pick<Persona, 'correo' | 'nombre' | 'squad'>>
  imagenes: Array<ArchivoPropuesta & { id: string; orden: number }>
  creadaEn: Date
  actualizadaEn: Date
}

export interface DatosGuardarPropuesta {
  titulo: string
  descripcion: string
  coautorCorreo?: string | null
  archivos: ArchivoPropuesta[]
}

export interface ResultadoConcurso {
  propuesta: PropuestaConcurso
  votos: number
  porcentajeEquipo: number
  promedioJurado: number
  puntaje: number
  creatividad: number
}

export interface EstadoJuradoConcurso {
  nombres: string[]
  calificaciones: Array<{
    propuestaId: string
    posicionJurado: number
    creatividad: number
    cultura: number
    viabilidad: number
    atractivo: number
  }>
}

function exigirBase(): void {
  if (!hayDB()) throw new Error('Sin base de datos no se puede operar el concurso.')
}

function errorDeBase(error: unknown): Error {
  if (error instanceof Error && /integrantes_propuesta_concurso.*(pk|unique)|duplicate key/i.test(error.message)) {
    return new Error('Uno de los participantes ya forma parte de otra propuesta.')
  }
  return error instanceof Error ? error : new Error('No se pudo completar la operación.')
}

function secretoDeVoto(): string {
  const secreto = process.env.SESSION_SECRET
  if (!secreto) throw new Error('Falta SESSION_SECRET para proteger la identidad del voto.')
  return secreto
}

export function hashVotante(correo: string): string {
  const normalizado = normalizarCorreo(correo)
  if (!normalizado) throw new Error('La sesión no contiene un correo válido.')
  return createHmac('sha256', secretoDeVoto())
    .update(`voto:${CONCURSO_ID}:${normalizado}`)
    .digest('hex')
}

export async function participantesElegibles(): Promise<Persona[]> {
  return (await listarPersonas()).filter((p) => p.activa && p.squad !== null)
}

export async function participantesDisponiblesConcurso(): Promise<Persona[]> {
  const elegibles = await participantesElegibles()
  if (!hayDB()) return elegibles
  const ocupados = await db().select({ correo: esquema.integrantesPropuestaConcurso.correo })
    .from(esquema.integrantesPropuestaConcurso)
    .where(eq(esquema.integrantesPropuestaConcurso.concursoId, CONCURSO_ID))
  const correos = new Set(ocupados.map((p) => p.correo))
  return elegibles.filter((p) => !correos.has(p.correo))
}

async function integrantesConfiables(autorCorreo: string, coautorCorreo?: string | null): Promise<Persona[]> {
  const autor = await buscarPersona(autorCorreo)
  if (!autor || !autor.activa) throw new Error('Tu perfil no está activo en Personas.')
  const integrantes = [autor]
  if (coautorCorreo) {
    const coautor = await buscarPersona(coautorCorreo)
    if (!coautor || !coautor.activa) throw new Error('La persona elegida no está activa en Personas.')
    integrantes.push(coautor)
  }
  const errores = validarIntegrantes(integrantes)
  if (errores.length > 0) throw new Error(errores[0])
  return integrantes
}

/** Alta atómica: propuesta + integrantes + imágenes viven o fallan juntas. */
export async function crearPropuestaConcurso(
  autorCorreo: string,
  datos: DatosGuardarPropuesta,
  ahora = new Date(),
): Promise<string> {
  exigirBase()
  if (faseDelConcurso(ahora) !== 'recepcion') throw new Error('La recepción de propuestas ya cerró.')
  const errores = validarPropuesta(datos)
  if (errores.length > 0) throw new Error(errores[0])
  const integrantes = await integrantesConfiables(autorCorreo, datos.coautorCorreo)
  const propuestaId = randomUUID()
  const miembrosJson = JSON.stringify(integrantes.map((p, indice) => ({ correo: p.correo, orden: indice + 1 })))
  // Las claves las traduce `filasDeImagenes`, NO un spread: el objeto de
  // dominio es camelCase y `jsonb_to_recordset` lee los nombres de columna.
  // Ver el comentario de ese módulo: mezclarlos dejó el concurso inservible.
  const imagenesJson = JSON.stringify(filasDeImagenes(datos.archivos, randomUUID))

  try {
    const resultado = await db().execute<{ id: string }>(sql`
      WITH nueva AS (
        INSERT INTO ${esquema.propuestasConcurso}
          (id, concurso_id, titulo, descripcion, oculta, creada_en, actualizada_en)
        VALUES
          (${propuestaId}, ${CONCURSO_ID}, ${datos.titulo.trim()}, ${datos.descripcion.trim()}, false, now(), now())
        RETURNING id, concurso_id
      ), miembros AS (
        INSERT INTO ${esquema.integrantesPropuestaConcurso}
          (concurso_id, propuesta_id, correo, orden)
        SELECT nueva.concurso_id, nueva.id, entrada.correo, entrada.orden
        FROM nueva,
          jsonb_to_recordset(${miembrosJson}::jsonb) AS entrada(correo text, orden integer)
        RETURNING propuesta_id
      ), imagenes AS (
        INSERT INTO ${esquema.imagenesPropuestaConcurso}
          (id, propuesta_id, ruta, nombre_original, tipo_contenido, tamano_bytes, orden)
        SELECT entrada.id, nueva.id, entrada.ruta, entrada.nombre_original,
          entrada.tipo_contenido, entrada.tamano_bytes, entrada.orden
        FROM nueva,
          jsonb_to_recordset(${imagenesJson}::jsonb) AS entrada(
            id text, ruta text, nombre_original text, tipo_contenido text,
            tamano_bytes integer, orden integer
          )
        RETURNING propuesta_id
      )
      SELECT id FROM nueva
      WHERE (SELECT count(*) FROM miembros) = ${integrantes.length}
        AND (SELECT count(*) FROM imagenes) = ${datos.archivos.length}
    `)
    if (!resultado.rows[0]) throw new Error('No se pudo registrar la propuesta completa.')
    return resultado.rows[0].id
  } catch (error) {
    throw errorDeBase(error)
  }
}

export async function actualizarPropuestaConcurso(
  propuestaId: string,
  autorCorreo: string,
  datos: Omit<DatosGuardarPropuesta, 'coautorCorreo'>,
  ahora = new Date(),
): Promise<void> {
  exigirBase()
  if (faseDelConcurso(ahora) !== 'recepcion') throw new Error('La recepción de propuestas ya cerró.')
  const correo = normalizarCorreo(autorCorreo)
  if (!correo) throw new Error('La sesión no contiene un correo válido.')
  const errores = validarPropuesta(datos)
  if (errores.length > 0) throw new Error(errores[0])
  // Las claves las traduce `filasDeImagenes`, NO un spread: el objeto de
  // dominio es camelCase y `jsonb_to_recordset` lee los nombres de columna.
  // Ver el comentario de ese módulo: mezclarlos dejó el concurso inservible.
  const imagenesJson = JSON.stringify(filasDeImagenes(datos.archivos, randomUUID))

  const resultado = await db().execute<{ id: string }>(sql`
    WITH actualizada AS (
      UPDATE ${esquema.propuestasConcurso}
      SET titulo = ${datos.titulo.trim()}, descripcion = ${datos.descripcion.trim()}, actualizada_en = now()
      WHERE id = ${propuestaId} AND concurso_id = ${CONCURSO_ID}
        AND EXISTS (
          SELECT 1 FROM ${esquema.integrantesPropuestaConcurso}
          WHERE propuesta_id = ${propuestaId} AND correo = ${correo}
        )
      RETURNING id
    ), borradas AS (
      DELETE FROM ${esquema.imagenesPropuestaConcurso}
      WHERE propuesta_id IN (SELECT id FROM actualizada)
      RETURNING propuesta_id
    ), imagenes AS (
      INSERT INTO ${esquema.imagenesPropuestaConcurso}
        (id, propuesta_id, ruta, nombre_original, tipo_contenido, tamano_bytes, orden)
      SELECT entrada.id, actualizada.id, entrada.ruta, entrada.nombre_original,
        entrada.tipo_contenido, entrada.tamano_bytes, entrada.orden
      FROM actualizada,
        jsonb_to_recordset(${imagenesJson}::jsonb) AS entrada(
          id text, ruta text, nombre_original text, tipo_contenido text,
          tamano_bytes integer, orden integer
        )
      RETURNING propuesta_id
    )
    SELECT id FROM actualizada
    WHERE (SELECT count(*) FROM imagenes) = ${datos.archivos.length}
  `)
  if (!resultado.rows[0]) throw new Error('No encontramos una propuesta tuya para editar.')
}

async function ensamblarPropuestas(ids?: string[]): Promise<PropuestaConcurso[]> {
  if (!hayDB()) return []
  const condicion = ids ? inArray(esquema.propuestasConcurso.id, ids) : eq(esquema.propuestasConcurso.concursoId, CONCURSO_ID)
  if (ids && ids.length === 0) return []
  const propuestas = await db().select().from(esquema.propuestasConcurso).where(condicion).orderBy(asc(esquema.propuestasConcurso.creadaEn))
  if (propuestas.length === 0) return []
  const propuestaIds = propuestas.map((p) => p.id)
  const [integrantes, imagenes] = await Promise.all([
    db().select({
      propuestaId: esquema.integrantesPropuestaConcurso.propuestaId,
      correo: esquema.personas.correo,
      nombre: esquema.personas.nombre,
      squad: esquema.personas.squad,
      orden: esquema.integrantesPropuestaConcurso.orden,
    }).from(esquema.integrantesPropuestaConcurso)
      .innerJoin(esquema.personas, eq(esquema.integrantesPropuestaConcurso.correo, esquema.personas.correo))
      .where(inArray(esquema.integrantesPropuestaConcurso.propuestaId, propuestaIds)),
    db().select().from(esquema.imagenesPropuestaConcurso)
      .where(inArray(esquema.imagenesPropuestaConcurso.propuestaId, propuestaIds)),
  ])
  return propuestas.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    descripcion: p.descripcion,
    oculta: p.oculta,
    creadaEn: p.creadaEn,
    actualizadaEn: p.actualizadaEn,
    integrantes: integrantes
      .filter((i) => i.propuestaId === p.id)
      .sort((a, b) => a.orden - b.orden)
      .map(({ correo, nombre, squad }) => ({ correo, nombre, squad: squad as Persona['squad'] })),
    imagenes: imagenes
      .filter((i) => i.propuestaId === p.id)
      .sort((a, b) => a.orden - b.orden)
      .map((i) => ({
        id: i.id,
        ruta: i.ruta,
        nombreOriginal: i.nombreOriginal,
        tipoContenido: i.tipoContenido,
        tamanoBytes: i.tamanoBytes,
        orden: i.orden,
      })),
  }))
}

export async function propuestaDePersona(correo: string): Promise<PropuestaConcurso | null> {
  if (!hayDB()) return null
  const normalizado = normalizarCorreo(correo)
  if (!normalizado) return null
  const miembro = (await db().select({ propuestaId: esquema.integrantesPropuestaConcurso.propuestaId })
    .from(esquema.integrantesPropuestaConcurso)
    .where(and(
      eq(esquema.integrantesPropuestaConcurso.concursoId, CONCURSO_ID),
      eq(esquema.integrantesPropuestaConcurso.correo, normalizado),
    )).limit(1))[0]
  if (!miembro) return null
  return (await ensamblarPropuestas([miembro.propuestaId]))[0] ?? null
}

export async function galeriaConcurso(ahora = new Date()): Promise<PropuestaConcurso[]> {
  const fase = faseDelConcurso(ahora)
  if (fase === 'recepcion') return []
  return (await ensamblarPropuestas()).filter((p) => !p.oculta)
}

export async function propuestasAdministracionConcurso(): Promise<PropuestaConcurso[]> {
  return ensamblarPropuestas()
}

export async function registrarVotoConcurso(correoSesion: string, propuestaId: string, ahora = new Date()): Promise<void> {
  exigirBase()
  if (faseDelConcurso(ahora) !== 'votacion') throw new Error('La votación no está abierta.')
  const votante = await buscarPersona(correoSesion)
  if (!votante || !votante.activa) throw new Error('Tu perfil no está activo en Personas.')
  const propuesta = (await ensamblarPropuestas([propuestaId]))[0]
  if (!propuesta || propuesta.oculta) throw new Error('La propuesta no está disponible.')
  if (propuesta.integrantes.some((p) => p.correo === votante.correo)) {
    throw new Error('Tu pase no puede usarse en tu propia propuesta.')
  }
  const votanteHash = hashVotante(votante.correo)
  await db().insert(esquema.votosConcurso).values({
    concursoId: CONCURSO_ID,
    votanteHash,
    propuestaId,
  }).onConflictDoUpdate({
    target: [esquema.votosConcurso.concursoId, esquema.votosConcurso.votanteHash],
    set: { propuestaId, actualizadoEn: new Date() },
  })
}

export async function votoDePersona(correo: string): Promise<string | null> {
  if (!hayDB()) return null
  const votanteHash = hashVotante(correo)
  const fila = (await db().select({ propuestaId: esquema.votosConcurso.propuestaId })
    .from(esquema.votosConcurso)
    .where(and(eq(esquema.votosConcurso.concursoId, CONCURSO_ID), eq(esquema.votosConcurso.votanteHash, votanteHash)))
    .limit(1))[0]
  return fila?.propuestaId ?? null
}

export async function imagenConcursoParaServir(
  imagenId: string,
  correoSesion: string,
  admin: boolean,
  ahora = new Date(),
): Promise<{ ruta: string; nombreOriginal: string; tipoContenido: string; tamanoBytes: number } | null> {
  if (!hayDB()) return null
  const fila = (await db().select({
    propuestaId: esquema.imagenesPropuestaConcurso.propuestaId,
    ruta: esquema.imagenesPropuestaConcurso.ruta,
    nombreOriginal: esquema.imagenesPropuestaConcurso.nombreOriginal,
    tipoContenido: esquema.imagenesPropuestaConcurso.tipoContenido,
    tamanoBytes: esquema.imagenesPropuestaConcurso.tamanoBytes,
    oculta: esquema.propuestasConcurso.oculta,
  }).from(esquema.imagenesPropuestaConcurso)
    .innerJoin(esquema.propuestasConcurso, eq(esquema.imagenesPropuestaConcurso.propuestaId, esquema.propuestasConcurso.id))
    .where(eq(esquema.imagenesPropuestaConcurso.id, imagenId)).limit(1))[0]
  if (!fila) return null
  if (fila.oculta && !admin) return null
  if (faseDelConcurso(ahora) !== 'recepcion') return fila
  if (admin) return fila
  const correo = normalizarCorreo(correoSesion)
  if (!correo) return null
  const propio = (await db().select({ correo: esquema.integrantesPropuestaConcurso.correo })
    .from(esquema.integrantesPropuestaConcurso)
    .where(and(
      eq(esquema.integrantesPropuestaConcurso.propuestaId, fila.propuestaId),
      eq(esquema.integrantesPropuestaConcurso.correo, correo),
    )).limit(1))[0]
  return propio ? fila : null
}

export async function resultadosConcurso(ahora = new Date()): Promise<ResultadoConcurso[]> {
  if (faseDelConcurso(ahora) !== 'resultados' || !hayDB()) return []
  const propuestas = await galeriaConcurso(ahora)
  if (propuestas.length === 0) return []
  const ids = propuestas.map((p) => p.id)
  const [votos, notas] = await Promise.all([
    db().select({ propuestaId: esquema.votosConcurso.propuestaId, cantidad: sql<number>`count(*)::int` })
      .from(esquema.votosConcurso)
      .where(eq(esquema.votosConcurso.concursoId, CONCURSO_ID))
      .groupBy(esquema.votosConcurso.propuestaId),
    db().select().from(esquema.calificacionesJuradoConcurso)
      .where(inArray(esquema.calificacionesJuradoConcurso.propuestaId, ids)),
  ])
  const votosTotales = votos.reduce((total, v) => total + v.cantidad, 0)
  return propuestas.map((propuesta) => {
    const cantidad = votos.find((v) => v.propuestaId === propuesta.id)?.cantidad ?? 0
    const rubricas = notas.filter((n) => n.propuestaId === propuesta.id)
    const promedioJurado = rubricas.length > 0
      ? rubricas.reduce((total, n) => total + calificacionJurado(n), 0) / rubricas.length
      : 0
    const creatividad = rubricas.length > 0
      ? rubricas.reduce((total, n) => total + n.creatividad, 0) / rubricas.length
      : 0
    return {
      propuesta,
      votos: cantidad,
      porcentajeEquipo: votosTotales > 0 ? cantidad / votosTotales * 100 : 0,
      promedioJurado,
      puntaje: puntajeFinal({ votos: cantidad, votosTotales, jurado: promedioJurado }),
      creatividad,
    }
  }).sort((a, b) => b.puntaje - a.puntaje || b.promedioJurado - a.promedioJurado || b.creatividad - a.creatividad)
}

export async function establecerVisibilidadPropuestaConcurso(
  propuestaId: string,
  visible: boolean,
  motivo = '',
): Promise<void> {
  exigirBase()
  await db().update(esquema.propuestasConcurso)
    .set({
      oculta: !visible,
      motivoOculta: visible ? null : motivo.trim() || 'Incumplimiento de las bases',
      actualizadaEn: new Date(),
    })
    .where(and(eq(esquema.propuestasConcurso.id, propuestaId), eq(esquema.propuestasConcurso.concursoId, CONCURSO_ID)))
}

export async function estadoJuradoConcurso(): Promise<EstadoJuradoConcurso> {
  if (!hayDB()) return { nombres: [], calificaciones: [] }
  const [jurados, calificaciones] = await Promise.all([
    db().select().from(esquema.juradosConcurso)
      .where(eq(esquema.juradosConcurso.concursoId, CONCURSO_ID))
      .orderBy(asc(esquema.juradosConcurso.posicion)),
    db().select().from(esquema.calificacionesJuradoConcurso),
  ])
  return {
    nombres: jurados.map((j) => j.nombre),
    calificaciones: calificaciones.map((c) => ({
      propuestaId: c.propuestaId,
      posicionJurado: c.posicionJurado,
      creatividad: c.creatividad,
      cultura: c.cultura,
      viabilidad: c.viabilidad,
      atractivo: c.atractivo,
    })),
  }
}

export async function guardarJuradoConcurso(nombres: string[]): Promise<void> {
  exigirBase()
  const limpios = nombres.map((n) => n.trim()).filter(Boolean)
  if (limpios.length !== 3) throw new Error('El jurado debe tener exactamente tres integrantes.')
  for (const [indice, nombre] of limpios.entries()) {
    await db().insert(esquema.juradosConcurso).values({ concursoId: CONCURSO_ID, posicion: indice + 1, nombre })
      .onConflictDoUpdate({
        target: [esquema.juradosConcurso.concursoId, esquema.juradosConcurso.posicion],
        set: { nombre },
      })
  }
}

export async function guardarCalificacionConcurso(
  propuestaId: string,
  posicionJurado: number,
  rubrica: { creatividad: number; cultura: number; viabilidad: number; atractivo: number },
): Promise<void> {
  exigirBase()
  if (!Number.isInteger(posicionJurado) || posicionJurado < 1 || posicionJurado > 3) throw new Error('Jurado inválido.')
  if (Object.values(rubrica).some((n) => !Number.isInteger(n) || n < 0 || n > 10)) {
    throw new Error('Cada criterio debe calificarse con un entero de 0 a 10.')
  }
  await db().insert(esquema.calificacionesJuradoConcurso).values({ propuestaId, posicionJurado, ...rubrica })
    .onConflictDoUpdate({
      target: [esquema.calificacionesJuradoConcurso.propuestaId, esquema.calificacionesJuradoConcurso.posicionJurado],
      set: { ...rubrica, actualizadaEn: new Date() },
    })
}
