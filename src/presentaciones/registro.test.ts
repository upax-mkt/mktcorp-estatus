import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  PRESENTACIONES, rutaDePresentacion, estatusDeGrupo, presentacionesDeSala, presentacionDeSala, presentacionPorRutaVieja,
} from './registro'
import { VISTAS_DE_SALA } from './vistas'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'

const APP = join(process.cwd(), 'src/app')

describe('registro de presentaciones web', () => {
  it('cada id es único y cada fecha es un día civil', () => {
    const ids = PRESENTACIONES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PRESENTACIONES) expect(p.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('cada estatus de grupo tiene su página bajo /estatus', () => {
    for (const p of estatusDeGrupo()) {
      expect(existsSync(join(APP, 'estatus', p.id, 'page.tsx')), p.id).toBe(true)
      expect(rutaDePresentacion(p)).toBe(`/estatus/${p.id}`)
    }
  })

  it('cada presentación de sala cuelga de una sala que existe y tiene qué pintar', () => {
    for (const p of PRESENTACIONES.filter((x) => x.lugar.tipo === 'sala')) {
      const sala = (p.lugar as { sala: string }).sala
      expect(SEMILLA_DE_TEMAS[sala], sala).toBeDefined()
      expect(VISTAS_DE_SALA[p.id], p.id).toBeDefined()
      expect(rutaDePresentacion(p)).toBe(`/cliente/${sala}/presentaciones/${p.id}`)
      expect(presentacionDeSala(sala, p.id)).toBe(p)
    }
    expect(existsSync(join(APP, 'cliente', '[slug]', 'presentaciones', '[id]', 'page.tsx'))).toBe(true)
  })

  it('una presentación no se abre desde la sala equivocada', () => {
    expect(presentacionDeSala('neracode', 'nueva-estructura-comercial-2027')).toBeUndefined()
    expect(presentacionesDeSala('neracode')).toEqual([])
  })

  it('la de Research Land vive en su sala y pide clave a quien no es del equipo', () => {
    const rl = presentacionDeSala('research-land', 'nueva-estructura-comercial-2027')
    expect(rl?.claveEnv).toBe('CLAVE_PRESENTACION_RL')
    expect(rl?.titulo).toBe('Nueva estructura comercial 2027')
  })

  it('cada ruta vieja sigue existiendo como redirección a su nuevo lugar', () => {
    for (const p of PRESENTACIONES.filter((x) => x.rutaVieja)) {
      expect(existsSync(join(APP, p.rutaVieja!.slice(1), 'page.tsx')), p.rutaVieja).toBe(true)
      expect(presentacionPorRutaVieja(p.rutaVieja!)).toBe(p)
    }
    expect(presentacionPorRutaVieja('/politico')?.id).toBe('politico-electoral')
    expect(presentacionPorRutaVieja('/rl-comercial')?.id).toBe('nueva-estructura-comercial-2027')
  })

  it('los estatus se listan del más reciente al más viejo', () => {
    const fechas = estatusDeGrupo().map((p) => p.fecha)
    expect(fechas).toEqual([...fechas].sort().reverse())
  })
})
