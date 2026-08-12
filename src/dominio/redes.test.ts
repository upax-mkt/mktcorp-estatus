import { describe, it, expect } from 'vitest'
import { REDES, NOMBRE_DE_RED, sanearRedes, urlPublicaValida, redesConEnlace } from './redes'

/**
 * LOS ENLACES PÚBLICOS DE UNA MARCA.
 *
 * Franco: *"necesito que todas las salas en el header tengan sus respectivos
 * iconos de redes sociales, sitio web, blog, etc."*.
 *
 * Lo que se prueba aquí es el saneado, y no por manía: estos enlaces se pintan
 * en el `href` de una página que se comparte con las UDNs y se ve sin sesión.
 * Un `javascript:` en un `href` no navega, ejecuta — y en este repo ya mordió
 * una vez, en el pie de la minuta (ronda 11), donde el `href` aceptaba
 * cualquier cosa que no llevara espacios.
 */

describe('urlPublicaValida', () => {
  it.each([
    'https://neracode.com',
    'http://ejemplo.mx/algo?x=1',
    'https://www.linkedin.com/company/neracodemx',
  ])('acepta %s', (url) => {
    expect(urlPublicaValida(url)).toBe(true)
  })

  /**
   * LOS TRES QUE IMPORTAN. `javascript:` y `vbscript:` ejecutan; `data:` deja
   * servir un documento entero desde el propio atributo. Ninguno es
   * navegación, que es lo único que estos enlaces significan.
   */
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox',
    'neracode.com',
    '',
    '   ',
    'no soy una url',
  ])('rechaza %s', (url) => {
    expect(urlPublicaValida(url)).toBe(false)
  })
})

describe('sanearRedes', () => {
  it('deja pasar lo válido, tal cual', () => {
    expect(sanearRedes({ web: 'https://hof.mx', linkedin: 'https://www.linkedin.com/company/house-of-films' }))
      .toEqual({ web: 'https://hof.mx', linkedin: 'https://www.linkedin.com/company/house-of-films' })
  })

  it('quita los espacios de los extremos', () => {
    expect(sanearRedes({ web: '  https://hof.mx  ' })).toEqual({ web: 'https://hof.mx' })
  })

  it('descarta lo vacío en vez de guardar una cadena en blanco', () => {
    expect(sanearRedes({ web: 'https://hof.mx', blog: '', x: '   ' })).toEqual({ web: 'https://hof.mx' })
  })

  /**
   * UNA CLAVE DESCONOCIDA NO SE GUARDA. La lista de `REDES` la comparten el
   * formulario, la cabecera y la base; una clave que solo exista en lo que
   * llega se guardaría sin error y no se pintaría jamás — el mismo defecto
   * silencioso que ya obligó a tener una sola lista de disciplinas en el
   * benchmark.
   */
  it('ignora las claves que no están en REDES', () => {
    expect(sanearRedes({ web: 'https://hof.mx', myspace: 'https://myspace.com/hof' }))
      .toEqual({ web: 'https://hof.mx' })
  })

  it('un esquema peligroso no sobrevive, aunque venga en una clave válida', () => {
    expect(sanearRedes({ web: 'javascript:alert(1)', linkedin: 'https://linkedin.com/x' }))
      .toEqual({ linkedin: 'https://linkedin.com/x' })
  })

  it.each([null, undefined, 'una cadena', 42, []])('con %s devuelve un objeto vacío, no revienta', (crudo) => {
    expect(sanearRedes(crudo)).toEqual({})
  })

  /** Un valor que no es texto —un número, un objeto anidado— se descarta. */
  it('ignora los valores que no son cadenas', () => {
    expect(sanearRedes({ web: 123, blog: { url: 'https://x.mx' }, x: 'https://x.com/a' }))
      .toEqual({ x: 'https://x.com/a' })
  })

  /**
   * `{}` ES UNA RESPUESTA, no un fallo: vaciar todos los campos es la única
   * manera de decir "esta marca no tiene redes", y `editarSalaAction` escribe
   * el resultado SIEMPRE — si aquí se devolviera `undefined` para no tocar
   * nada, no habría forma de borrar el último enlace.
   */
  it('sin nada válido devuelve {}, que es lo que borra los enlaces', () => {
    expect(sanearRedes({ web: '', linkedin: 'javascript:x' })).toEqual({})
  })
})

describe('redesConEnlace', () => {
  it('devuelve solo las que tienen enlace, en el orden de REDES', () => {
    // A propósito en orden inverso al de la lista: el orden de salida es el de
    // `REDES`, no el de las claves del objeto.
    expect(redesConEnlace({ x: 'https://x.com/a', web: 'https://a.mx', linkedin: 'https://li/a' }))
      .toEqual([['web', 'https://a.mx'], ['linkedin', 'https://li/a'], ['x', 'https://x.com/a']])
  })

  it.each([null, undefined, {}])('con %s no devuelve nada: la cabecera no pinta ni el hueco', (redes) => {
    expect(redesConEnlace(redes)).toEqual([])
  })
})

describe('la lista de redes', () => {
  it('cada clave tiene su nombre legible: un icono sin texto accesible es un enlace anónimo', () => {
    for (const red of REDES) {
      expect(NOMBRE_DE_RED[red], red).toBeTruthy()
    }
  })

  it('no hay claves repetidas', () => {
    expect(new Set(REDES).size).toBe(REDES.length)
  })
})
