import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import * as esquema from './esquema'

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
