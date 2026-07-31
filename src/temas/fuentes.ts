import {
  Outfit, Montserrat, Raleway, Mukta_Mahee, Figtree,
  Anton, Bungee, Hanken_Grotesk, Archivo,
  Inter, Manrope, DM_Sans, Space_Grotesk, Sora, Plus_Jakarta_Sans,
  Playfair_Display, Fraunces, Bebas_Neue, Oswald, Barlow_Condensed,
} from 'next/font/google'

/**
 * EL CATÁLOGO DE FUENTES (tarea 7, ronda 8).
 *
 * Franco, literal: "el tema de la tipografía fue una mala decisión, ya que
 * se ven mal, debemos poder seleccionar tipos". Revierte su propia regla de
 * que cada deck se vistiera con la tipografía del brandbook de su unidad
 * (commit 106e622) — al verla pintada no funcionaba. Esto reemplaza "una
 * fuente obligada por marca" por un catálogo de veinte para elegir: las
 * nueve que ya vestían las salas (Fase 1) más once nuevas que cubren
 * registros que antes no existían — neutras de texto, con carácter para
 * títulos, condensadas y dos serifs. El porqué de cada una está en el
 * reporte de esta tarea.
 *
 * CADA FUENTE SE DECLARA UNA SOLA VEZ, aquí, aunque la elección de verdad
 * viva en la base (`salas.familia_display`/`familia_texto`, tarea 5):
 * `next/font/google` se resuelve AL COMPILAR — es una llamada a nivel de
 * módulo, no algo que se pueda parametrizar en tiempo de ejecución con la
 * clave que traiga una fila — así que las veinte tienen que existir en
 * código pase lo que pase. Lo que SÍ varía por pantalla es cuántas de sus
 * VARIABLES CSS se cargan de verdad — ver `clasesDeFuentes` más abajo, y
 * `ProveedorTema`/`SelectorTipografia`, sus dos únicos consumidores.
 */
const outfit = Outfit({ subsets: ['latin'], variable: '--f-outfit' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--f-montserrat' })
const raleway = Raleway({ subsets: ['latin'], variable: '--f-raleway' })
const muktaMahee = Mukta_Mahee({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--f-mukta' })
const figtree = Figtree({ subsets: ['latin'], variable: '--f-figtree' })
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--f-anton' })
const bungee = Bungee({ subsets: ['latin'], weight: '400', variable: '--f-bungee' })
const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], variable: '--f-hanken' })
const archivoExpanded = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--f-archivo' })

// Las once nuevas (tarea 7). Pesos por defecto (fuente variable) salvo
// donde Google no ofrece variable de peso: Bebas Neue solo existe en 400, y
// Barlow Condensed no publica un eje de peso variable (a diferencia de
// Oswald, que sí).
const inter = Inter({ subsets: ['latin'], variable: '--f-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--f-manrope' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--f-dm-sans' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--f-space-grotesk' })
const sora = Sora({ subsets: ['latin'], variable: '--f-sora' })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--f-plus-jakarta' })
const playfairDisplay = Playfair_Display({ subsets: ['latin'], variable: '--f-playfair' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--f-fraunces' })
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--f-bebas' })
const oswald = Oswald({ subsets: ['latin'], variable: '--f-oswald' })
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['400', '700'], variable: '--f-barlow-condensed' })

/** En qué registro sirve bien una familia: para títulos, para texto corrido, o para los dos. Descriptivo, no filtra — `SelectorTipografia` ofrece el catálogo entero en las dos preguntas (títulos y texto); esto es lo que enseña a elegir bien. */
export type RegistroFuente = 'display' | 'texto' | 'ambos'

interface DescriptorFuente {
  clave: string
  nombre: string
  registro: RegistroFuente
  /** El objeto que devolvió `next/font/google`: de aquí sale la clase que carga la variable CSS. */
  fuente: { variable: string }
  /** El nombre de la variable CSS (el que se le pasó a `variable:` arriba), para construir `var(--f-…)`. */
  cssVar: string
}

/**
 * LA TABLA ÚNICA: cada una de las veinte con su clave, su nombre para
 * enseñar, su registro y el objeto de `next/font`. `CLASES_DE_FUENTES`,
 * `clasesDeFuentes`, `CATALOGO_DE_FUENTES`, `familiaCss` y
 * `esFamiliaConocida` se derivan TODOS de aquí — una sola fuente de verdad,
 * para no repetir la lista de veinte claves en varios sitios y arriesgar que
 * alguno se quede desincronizado.
 */
const TABLA: DescriptorFuente[] = [
  { clave: 'outfit', nombre: 'Outfit', registro: 'ambos', fuente: outfit, cssVar: '--f-outfit' },
  { clave: 'montserrat', nombre: 'Montserrat', registro: 'ambos', fuente: montserrat, cssVar: '--f-montserrat' },
  { clave: 'raleway', nombre: 'Raleway', registro: 'texto', fuente: raleway, cssVar: '--f-raleway' },
  { clave: 'muktaMahee', nombre: 'Mukta Mahee', registro: 'texto', fuente: muktaMahee, cssVar: '--f-mukta' },
  { clave: 'figtree', nombre: 'Figtree', registro: 'ambos', fuente: figtree, cssVar: '--f-figtree' },
  { clave: 'anton', nombre: 'Anton', registro: 'display', fuente: anton, cssVar: '--f-anton' },
  { clave: 'bungee', nombre: 'Bungee', registro: 'display', fuente: bungee, cssVar: '--f-bungee' },
  { clave: 'hankenGrotesk', nombre: 'Hanken Grotesk', registro: 'ambos', fuente: hankenGrotesk, cssVar: '--f-hanken' },
  { clave: 'archivoExpanded', nombre: 'Archivo Expandido', registro: 'display', fuente: archivoExpanded, cssVar: '--f-archivo' },
  { clave: 'inter', nombre: 'Inter', registro: 'texto', fuente: inter, cssVar: '--f-inter' },
  { clave: 'manrope', nombre: 'Manrope', registro: 'ambos', fuente: manrope, cssVar: '--f-manrope' },
  { clave: 'dmSans', nombre: 'DM Sans', registro: 'texto', fuente: dmSans, cssVar: '--f-dm-sans' },
  { clave: 'spaceGrotesk', nombre: 'Space Grotesk', registro: 'display', fuente: spaceGrotesk, cssVar: '--f-space-grotesk' },
  { clave: 'sora', nombre: 'Sora', registro: 'ambos', fuente: sora, cssVar: '--f-sora' },
  { clave: 'plusJakartaSans', nombre: 'Plus Jakarta Sans', registro: 'texto', fuente: plusJakartaSans, cssVar: '--f-plus-jakarta' },
  { clave: 'playfairDisplay', nombre: 'Playfair Display', registro: 'display', fuente: playfairDisplay, cssVar: '--f-playfair' },
  { clave: 'fraunces', nombre: 'Fraunces', registro: 'ambos', fuente: fraunces, cssVar: '--f-fraunces' },
  { clave: 'bebasNeue', nombre: 'Bebas Neue', registro: 'display', fuente: bebasNeue, cssVar: '--f-bebas' },
  { clave: 'oswald', nombre: 'Oswald', registro: 'display', fuente: oswald, cssVar: '--f-oswald' },
  { clave: 'barlowCondensed', nombre: 'Barlow Condensed', registro: 'display', fuente: barlowCondensed, cssVar: '--f-barlow-condensed' },
]

const POR_CLAVE = new Map(TABLA.map((f) => [f.clave, f]))

/**
 * ALIAS HEREDADOS DE LA FASE 1. El comentario original decía "Special Gothic
 * Expanded y Satoshi se añaden en la Fase 2 como fuentes locales" — nunca
 * llegaron a serlo, y dos salas de la base todavía guardan estas dos claves
 * (mexa-creativa.familiaDisplay = 'specialGothic'; uix.familiaDisplay Y
 * familiaTexto = 'satoshi'). Esta tarea NO reescribe esa base —solo
 * consulta, ver el brief— así que ambas se siguen resolviendo al catálogo
 * más parecido en vez de romper esas dos marcas o bloquear su edición.
 *
 * El selector NUNCA las ofrece como opción —no son fuentes reales,
 * `CATALOGO_DE_FUENTES` no las incluye—; solo `familiaCss`, `clasesDeFuentes`
 * y `esFamiliaConocida` las conocen, para que una sala vieja siga
 * pintándose y pudiendo guardarse igual que hoy.
 */
const ALIAS: Record<string, string> = {
  specialGothic: 'archivoExpanded',
  satoshi: 'hankenGrotesk',
}

function resolverClave(clave: string): string {
  return ALIAS[clave] ?? clave
}

/**
 * Todas las variables de fuente. Hoy solo la usa `SelectorTipografia`: es el
 * único lugar de la app que necesita las veinte a la vez, para pintar cada
 * opción del catálogo con su propia fuente (ver su comentario de cabecera).
 *
 * NO se aplica en `layout.tsx` — el `<body>` solo carga Outfit
 * (`clasesDeFuentes(['outfit'])`), la única familia que el resto de la app
 * usa fuera de una sala (es el `font-family` fijo de cada pantalla de
 * chrome: hub, salas, cliente, agenda, entrar, deck, minuta…). La
 * tipografía DE MARCA —la que de verdad varía por sala— solo se pinta
 * dentro de `ProveedorTema`, que carga únicamente la suya. Se conserva
 * exportada mientras `SelectorTipografia` la siga necesitando.
 */
export const CLASES_DE_FUENTES = TABLA.map((f) => f.fuente.variable).join(' ')

/**
 * Las clases de SOLO las familias pedidas — lo que carga de verdad una
 * página con una sala (dos claves, ver `ProveedorTema`) en vez de las veinte
 * del picker.
 *
 * Una clave desconocida (dato corrupto, o algo que no es ni una de las
 * veinte ni uno de los alias heredados) se ignora en vez de reventar — mismo
 * criterio defensivo que `familiaCss`. Duplicados —una sala cuyo título y su
 * texto comparten familia— no repiten la misma clase dos veces.
 */
export function clasesDeFuentes(claves: string[]): string {
  const vistas = new Set<string>()
  const clases: string[] = []
  for (const claveCruda of claves) {
    const clave = resolverClave(claveCruda)
    if (vistas.has(clave)) continue
    const descriptor = POR_CLAVE.get(clave)
    if (!descriptor) continue
    vistas.add(clave)
    clases.push(descriptor.fuente.variable)
  }
  return clases.join(' ')
}

/**
 * La familia CSS de una clave, lista para `--fuente-display`/`--fuente-texto`
 * (ver `ProveedorTema`). Una clave que no se reconoce cae a Outfit — mismo
 * criterio defensivo que `cargarTemas` con un tema mal formado: una sala con
 * una fuente rara se ve con la fuente por defecto, no rompe la página.
 */
export function familiaCss(clave: string): string {
  const descriptor = POR_CLAVE.get(resolverClave(clave))
  return descriptor ? `var(${descriptor.cssVar})` : 'var(--f-outfit)'
}

/**
 * Si el servidor puede resolver esta clave a una fuente real: las veinte del
 * catálogo, o uno de los dos alias heredados (arriba). Es lo que validan
 * `crearSalaAction`/`editarSalaAction` antes de guardar — deliberadamente
 * MÁS PERMISIVO que `CATALOGO_DE_FUENTES` (que el selector sí limita a las
 * veinte elegibles): una sala vieja con 'specialGothic' o 'satoshi' tiene
 * que poder seguir editándose —el logo, el color— sin que un campo de
 * tipografía que nadie tocó bloquee el guardado entero.
 */
export function esFamiliaConocida(clave: string): boolean {
  return POR_CLAVE.has(resolverClave(clave))
}

export interface FuenteCatalogo {
  clave: string
  nombre: string
  registro: RegistroFuente
}

/**
 * EL CATÁLOGO ELEGIBLE: las veinte fuentes reales, nunca los alias
 * heredados de arriba — es lo que ofrece `SelectorTipografia`. Un valor que
 * no corresponda a ninguna de estas veinte claves no debe poder elegirse
 * desde la pantalla, aunque el servidor siga tolerando los dos alias
 * heredados por compatibilidad (ver `esFamiliaConocida`).
 */
export const CATALOGO_DE_FUENTES: FuenteCatalogo[] = TABLA.map(({ clave, nombre, registro }) => ({
  clave,
  nombre,
  registro,
}))
