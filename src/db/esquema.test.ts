import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import * as esquema from './esquema'
import { cadenciaEnum, documentos, estadoDocumentoEnum, estadoReunionEnum, reuniones, tipoReunionEnum } from './esquema'

describe('esquema de la ronda 7', () => {
  it('la sala sabe si está activa y desde cuándo está en pausa', () => {
    const columnas = getTableColumns(esquema.salas)
    expect(columnas.activa.notNull).toBe(true)
    expect(columnas.activa.default).toBe(true)
    expect(columnas.pausadaDesde.notNull).toBe(false)
  })

  it('el acuerdo sabe a quién de Monday corresponde y en qué estado de bandeja está', () => {
    const columnas = getTableColumns(esquema.acuerdos)
    expect(columnas.responsableMondayId.notNull).toBe(false)
    expect(columnas.destacado.default).toBe(false)
    expect(columnas.bandeja.default).toBe('no_aplica')
    expect(columnas.mondayTipo.notNull).toBe(false)
  })

  it('hay una copia local del directorio de personas', () => {
    const columnas = getTableColumns(esquema.personasMonday)
    expect(columnas.mondayId.primary).toBe(true)
    expect(columnas.nombre.notNull).toBe(true)
    expect(columnas.correo.notNull).toBe(true)
  })
})

describe('esquema de la ronda 8 (tarea 5: la marca de la sala vive en la base)', () => {
  it('los doce campos de Tema son obligatorios: se poblaron antes de exigirlos (migraciones 0013 → 0014)', () => {
    const columnas = getTableColumns(esquema.salas)
    for (const campo of [
      'nombre', 'primario', 'secundario', 'acento',
      'superficieClara', 'superficieOscura', 'textoSobreClara', 'textoSobreOscura',
      'gradiente', 'familiaDisplay', 'familiaTexto',
    ] as const) {
      expect(columnas[campo].notNull, campo).toBe(true)
    }
  })

  it('el logo puede faltar: ninguna sala lo tiene medido todavía (tarea 6)', () => {
    const columnas = getTableColumns(esquema.salas)
    expect(columnas.logoUrl.notNull).toBe(false)
    expect(columnas.logoRelacionDeTinta.notNull).toBe(false)
  })
})

describe('el modelo de reuniones', () => {
  it('una reunión se puede dar o no, y nada más — el estado del documento es otra cosa', () => {
    expect(estadoReunionEnum.enumValues).toEqual(['agendada', 'dada'])
    expect(estadoDocumentoEnum.enumValues).toEqual(['borrador', 'listo'])
  })

  it('quincenal existe, y en los dos sitios: la cadencia de la sala y el tipo de la reunión', () => {
    expect(cadenciaEnum.enumValues).toContain('quincenal')
    expect(tipoReunionEnum.enumValues).toEqual(['semanal', 'quincenal', 'mensual'])
  })

  it('la reunión guarda lo que trae un evento de calendario', () => {
    const cols = Object.keys(reuniones)
    for (const c of ['salaSlug', 'fecha', 'titulo', 'tipo', 'estado', 'noDadaEn', 'lugar', 'alcance', 'participantes']) {
      expect(cols).toContain(c)
    }
  })

  it('un documento pertenece a una reunión y a una sola', () => {
    expect(Object.keys(documentos)).toContain('reunionId')
    expect(documentos.reunionId.notNull).toBe(true)
    expect(documentos.reunionId.isUnique).toBe(true)
  })
})

/**
 * HALLAZGO 3 DE LA REVISIÓN FINAL DE LA RONDA 10: `minutas.reunionId` no
 * tenía ni UNIQUE ni NOT NULL, así que la tabla dependía por completo de que
 * `guardarMinuta` (`src/db/minutas.ts`) se comportara — un doble clic o un
 * reintento de red podían dejar dos minutas para la misma reunión. Mismo
 * criterio que ya exige `documentos.reunionId` (arriba): la garantía la da
 * la BASE, no la disciplina de quien escribe.
 */
describe('la minuta — hallazgo 3 de la revisión final de la ronda 10', () => {
  it('reunionId es NOT NULL y UNIQUE: la base impide dos minutas para la misma reunión', () => {
    const columnas = getTableColumns(esquema.minutas)
    expect(columnas.reunionId.notNull).toBe(true)
    expect(columnas.reunionId.isUnique).toBe(true)
  })
})
