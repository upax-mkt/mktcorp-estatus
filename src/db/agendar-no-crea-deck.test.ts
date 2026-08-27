import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * AGENDAR UNA REUNIÓN NO CREA SU PRESENTACIÓN. LAS TRES VECES.
 *
 * Franco: *"aparece un botón que dice crear presentación y debería ser crear
 * reunión; una vez que la creo debo decidir si la creo con el editor de
 * presentaciones o cargar un archivo ya creado"*.
 *
 * Hay TRES sitios donde se agenda una junta —la sala, el calendario y el
 * atajo del Home— y los tres llamaban a `crearReunionConDocumento`, que
 * agenda Y monta el deck de una vez. Al separarlo cambié dos y **me dejé el
 * tercero**, que es justo el fallo que este test existe para impedir: el
 * mismo gesto dejando la reunión en dos estados distintos según la pantalla
 * por la que se entre — la agendada en uno sale en su sala como "a medio
 * armar", con ocho secciones vacías que nadie empezó, y la del otro como
 * "sin presentación todavía".
 *
 * `/deck/nueva` SÍ puede crearlo, y por eso está en la lista de excepciones:
 * ahí no se agenda una junta, se va expresamente a armar un deck —pide la
 * plantilla y termina en el editor—. Es la única pantalla de la app para la
 * que "reunión" y "presentación" son el mismo acto.
 *
 * MIRA EL CÓDIGO FUENTE, como `revalidacion.test.ts`: la invariante cruza
 * cuatro archivos y ningún test de comportamiento la ve entera. Un test tosco
 * que habría cazado el fallo vale más que uno elegante que no lo caza.
 */

const RAIZ = process.cwd()

/** Dónde se agenda una junta. Ninguna puede montar el deck. */
const AGENDAN = [
  'src/app/page.tsx', // el atajo del Home
  // Desde la sala. Apuntaba a `cliente/[slug]/page.tsx` hasta el 27-ago-2026,
  // cuando las veintitrés acciones de esa página se mudaron a su propio
  // `acciones.ts` —el mismo patrón que ya seguía el calendario, aquí abajo—.
  // Lo que vigila este test no cambió ni un ápice: cambió el archivo donde
  // vive el código vigilado, y la ruta lo sigue.
  'src/app/cliente/[slug]/acciones.ts',
  'src/app/reuniones/acciones.ts', // desde el calendario
]

/** La única pantalla cuyo propósito ES armar la presentación. */
const ARMA_EL_DECK = 'src/app/deck/nueva/page.tsx'

function fuente(ruta: string): string {
  return readFileSync(join(RAIZ, ruta), 'utf8')
}

/** Sin comentarios: estos archivos EXPLICAN el cambio, y citarlo no es usarlo. */
function codigo(ruta: string): string {
  return fuente(ruta)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('agendar una reunión no crea su presentación', () => {
  it.each(AGENDAN)('%s llama a crearReunion, nunca a crearReunionConDocumento', (ruta) => {
    const src = codigo(ruta)
    expect(src, `${ruta} sigue montando el deck al agendar`).not.toContain(
      'crearReunionConDocumento(',
    )
    expect(src, `${ruta} no crea la reunión`).toContain('crearReunion(')
  })

  /**
   * El título lo resolvía `crearReunionConDocumento` por dentro. Al dejar de
   * usarla, cada sitio tiene que reponerlo o la reunión nace sin nombre: dos
   * quincenales de la misma sala —el caso real de Research Land, Comercial vs.
   * Digital— serían indistinguibles en el calendario.
   */
  it.each(AGENDAN)('%s resuelve el título por defecto, que antes ponía la otra función', (ruta) => {
    expect(codigo(ruta), `${ruta} puede guardar un título vacío`).toContain('tituloPorDefecto(')
  })

  it('/deck/nueva sí lo crea: ahí no se agenda, se va a armar el deck', () => {
    expect(codigo(ARMA_EL_DECK)).toContain('crearReunionConDocumento(')
  })
})
