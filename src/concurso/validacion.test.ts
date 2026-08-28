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
    // Antes, aquí se afirmaba que un individuo SIN squad quedaba rechazado —
    // el defecto escrito como si fuera la regla. Las bases dicen lo contrario
    // («sin importar puesto o squad»), así que lo que se comprueba ahora es que
    // el squad se exige en la DUPLA, que es donde la invariante 7 lo pide.
    expect(validarIntegrantes([
      { correo: 'a@upax.com.mx', squad: null },
      { correo: 'b@upax.com.mx', squad: 'Squad Paid y RRSS' },
    ])).toContain('En dupla, los dos necesitan squad asignado en Personas.')
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

/**
 * SIN SQUAD SE PARTICIPA SOLO, PERO NO EN DUPLA (28-ago-2026).
 *
 * El código era más restrictivo que las bases. El spec dice, en su objetivo:
 * *«Puede participar cualquier colaborador activo, SIN IMPORTAR PUESTO O SQUAD,
 * de forma individual o en dupla de squads distintos»*, y su invariante 7 acota
 * la exigencia a la dupla: *«la falta de squad no vuelve elegible una DUPLA
 * inválida»*. `validarIntegrantes` la aplicaba a todos, así que quien no tiene
 * squad quedaba fuera del concurso entero.
 *
 * A quién dejaba fuera, con datos reales: al CMO —Franco no pertenece a ningún
 * squad porque está por encima de los seis— y a las personas indirectas de
 * marketing. Es decir, el concurso excluía a quien lo convoca.
 *
 * La dupla sí la sigue bloqueando, y por una razón de fondo: su única regla es
 * que una dupla una squads DISTINTOS, y eso no se puede comprobar contra un
 * dato que no existe. Dejarlo pasar sería interpretar la ausencia a favor, que
 * es exactamente lo que la invariante 7 prohíbe.
 */
describe('participación sin squad', () => {
  const CON_SQUAD = { correo: 'iris@upax.com.mx', squad: 'Squad Web y Contenidos' as const }
  const SIN_SQUAD = { correo: 'franco.cruzat@upax.com.mx', squad: null }

  it('quien no tiene squad puede presentarse SOLO', () => {
    expect(validarIntegrantes([SIN_SQUAD])).toEqual([])
  })

  it('pero no puede formar dupla: no hay con qué comprobar que los squads difieren', () => {
    const errores = validarIntegrantes([SIN_SQUAD, CON_SQUAD])
    expect(errores).toContain('En dupla, los dos necesitan squad asignado en Personas.')
  })

  it('tampoco al revés, con el que falta en segundo lugar', () => {
    expect(validarIntegrantes([CON_SQUAD, SIN_SQUAD])).toHaveLength(1)
  })

  it('dos sin squad tampoco forman dupla', () => {
    // Saltan los DOS motivos, y los dos son ciertos: falta el dato y, además,
    // `null === null` incumple la regla de squads distintos.
    const errores = validarIntegrantes([SIN_SQUAD, { correo: 'tairi@jansan.mx', squad: null }])
    expect(errores).toContain('En dupla, los dos necesitan squad asignado en Personas.')
    expect(errores.length).toBeGreaterThan(0)
  })

  /** «Sin squad» es un valor del catálogo, no una ausencia: Ángel lo tiene
   *  porque reporta directo a Franco. Participa solo y hace dupla con
   *  cualquiera de otro squad — solo no consigo mismo. */
  it('«Sin squad» es un dato y sí forma dupla con otro squad', () => {
    const angel = { correo: 'angel.toledano@elektra.com.mx', squad: 'Sin squad' as const }
    expect(validarIntegrantes([angel])).toEqual([])
    expect(validarIntegrantes([angel, CON_SQUAD])).toEqual([])
  })
})
