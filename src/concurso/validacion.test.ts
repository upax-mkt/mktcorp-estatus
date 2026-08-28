import { describe, expect, it } from 'vitest'
import { validarIntegrantes, validarPropuesta, type ArchivoPropuesta } from './validacion'

const IMAGEN: ArchivoPropuesta = {
  ruta: 'concurso/a.png',
  nombreOriginal: 'frente.png',
  tipoContenido: 'image/png',
  tamanoBytes: 1024,
}

describe('validarIntegrantes', () => {
  it('acepta una propuesta individual con squad conocido', () => {
    expect(validarIntegrantes([
      { correo: 'iris@upax.com.mx', squad: 'Squad Web y Contenidos' },
    ])).toEqual([])
  })

  it('acepta una dupla solo cuando sus squads son distintos', () => {
    expect(validarIntegrantes([
      { correo: 'iris@upax.com.mx', squad: 'Squad Web y Contenidos' },
      { correo: 'paul@upax.com.mx', squad: 'Squad Paid y RRSS' },
    ])).toEqual([])
  })

  it('rechaza mismo squad, identidad repetida y squad desconocido', () => {
    expect(validarIntegrantes([
      { correo: 'a@upax.com.mx', squad: 'RevOps & Analytics' },
      { correo: 'b@upax.com.mx', squad: 'RevOps & Analytics' },
    ])).toContain('La dupla debe integrar squads distintos.')
    expect(validarIntegrantes([
      { correo: 'a@upax.com.mx', squad: 'RevOps & Analytics' },
      { correo: 'a@upax.com.mx', squad: 'Squad Paid y RRSS' },
    ])).toContain('Una persona no puede ocupar los dos lugares de la dupla.')
    expect(validarIntegrantes([{ correo: 'a@upax.com.mx', squad: null }]))
      .toContain('Todos los participantes necesitan un squad asignado en Personas.')
  })
})

describe('validarPropuesta', () => {
  it('acepta de una a tres imágenes JPG/PNG de hasta 25 MB y descripción de 500 caracteres', () => {
    expect(validarPropuesta({ titulo: 'Así sonamos', descripcion: 'x'.repeat(500), archivos: [IMAGEN] }))
      .toEqual([])
  })

  it('rechaza exceso de descripción, cantidad, MIME y tamaño', () => {
    expect(validarPropuesta({ titulo: 'A', descripcion: 'x'.repeat(501), archivos: [IMAGEN] }))
      .toContain('La explicación no puede superar 500 caracteres.')
    expect(validarPropuesta({ titulo: 'A', descripcion: '', archivos: [] }))
      .toContain('Sube al menos una imagen.')
    expect(validarPropuesta({ titulo: 'A', descripcion: '', archivos: [
      { ...IMAGEN, tipoContenido: 'image/svg+xml' },
    ] })).toContain('Solo se aceptan imágenes JPG o PNG.')
    expect(validarPropuesta({ titulo: 'A', descripcion: '', archivos: [
      { ...IMAGEN, tamanoBytes: 25 * 1024 * 1024 + 1 },
    ] })).toContain('Cada imagen debe pesar máximo 25 MB.')
  })
})
