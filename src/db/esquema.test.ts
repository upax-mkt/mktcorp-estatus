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

  it('el acuerdo se puede destacar, y nace sin destacar', () => {
    const columnas = getTableColumns(esquema.acuerdos)
    expect(columnas.destacado.default).toBe(false)
  })

  /**
   * EL DESMONTAJE DE MONDAY (20-ago-2026) — este test es su centinela.
   *
   * El acuerdo llevaba cinco columnas de la integración (`monday_id`,
   * `responsable_monday_id`, `monday_tipo`, `monday_url`,
   * `monday_sincronizado_en`) más `bandeja`, y había una tabla entera
   * `personas_monday`. Se borraron con la migración 0042 tras comprobar
   * contra producción que las seis estaban vacías en los 37 acuerdos.
   *
   * Si alguien reintroduce cualquiera de ellas —copiando un esquema viejo, o
   * volviendo a generar desde una migración anterior— este test cae. Es lo
   * único que impide que el cadáver vuelva sin que nadie lo decida.
   */
  it('el acuerdo ya no lleva ninguna columna de Monday, ni bandeja', () => {
    const columnas = Object.keys(getTableColumns(esquema.acuerdos))
    expect(columnas.filter((c) => c.toLowerCase().includes('monday'))).toEqual([])
    expect(columnas).not.toContain('bandeja')
  })

  it('no hay ninguna tabla de personas de Monday en el esquema', () => {
    expect(Object.keys(esquema).filter((t) => t.toLowerCase().includes('monday'))).toEqual([])
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
