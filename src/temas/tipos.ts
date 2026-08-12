import { z } from 'zod'

/**
 * LA FORMA DE UN TEMA, con las mismas reglas que antes solo se comprobaban en
 * tests contra `SEMILLA_DE_TEMAS` —una constante que nadie puede romper— y no
 * contra lo que de verdad se pinta (revisión de la tarea 5, ronda 8).
 *
 * Desde que la marca se edita desde la app (tarea 6), `cargarTemas()`
 * (`src/db/temas.ts`) arma un `Tema` por cada fila de `salas`, y una fila
 * puede llegar con basura sin que Postgres se queje: `NOT NULL` exige que
 * `primario` tenga ALGÚN texto, no que sea un hex de seis dígitos, y no dice
 * nada sobre que `gradiente` tenga al menos dos paradas. Sin esta validación,
 * el día que alguien guarde `primario: "rojo"` o un degradado de una sola
 * parada desde la pantalla de la tarea 6, la app pintaría CSS inválido en
 * silencio: el resto del suite seguiría en verde porque ninguna otra prueba
 * ejercita ese camino.
 *
 * `cargarTemas()` valida cada fila contra este esquema con `safeParse` y
 * descarta la que no pase — mismo criterio que ya usaba con "¿falta algún
 * campo?", ahora con "¿tiene la FORMA correcta?".
 */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'debe ser un color hex de seis dígitos, p. ej. "#614ACA"')

export const EsquemaTema = z.object({
  slug: z.string().min(1),
  nombre: z.string().min(1),
  /** Color de marca dominante. */
  primario: hex,
  secundario: hex,
  acento: hex,
  /** Fondo claro de los slides de contenido. */
  superficieClara: hex,
  /** Fondo oscuro de portadas y divisores. */
  superficieOscura: hex,
  textoSobreClara: hex,
  textoSobreOscura: hex,
  /** Paradas del gradiente de portada, en orden. Al menos dos: un degradado de una sola parada no degrada nada. */
  gradiente: z.array(hex).min(2),
  /** Clave de familia tipográfica, resuelta en src/temas/fuentes.ts */
  familiaDisplay: z.string().min(1),
  familiaTexto: z.string().min(1),
  /**
   * Los enlaces públicos de la marca: sitio, blog y redes (`salas.redes`).
   * `.catch({})` y no `.optional()`: una fila con un JSON raro en esa columna
   * NO puede tumbar la marca entera de una sala —`cargarTemas` descarta la
   * fila que no valida, y con ella el color, el logo y el degradado—; que
   * falten unos iconos es infinitamente más barato que una sala sin vestir.
   * Lo que llega se sanea después con `sanearRedes`, que es quien filtra
   * claves desconocidas y esquemas que no sean http(s).
   *
   * `.optional()` para que los temas de la SEMILLA (`src/temas/*.ts`, escritos
   * a mano) no tengan que declarar un `redes: {}` que no dice nada: sin redes
   * y con redes vacías son lo mismo, y quien lo pinta ya trata los dos igual.
   */
  redes: z.record(z.string(), z.string()).catch({}).optional(),
})

export type Tema = z.infer<typeof EsquemaTema>
