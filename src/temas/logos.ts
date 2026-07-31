/**
 * A QUÉ ALTURA SE DIBUJA EL LOGOTIPO DE CADA SALA.
 *
 * Los diez lockups van de 1,64:1 (House of Films, casi cuadrado) a 6,80:1
 * (Research Land, muy apaisado) — 4,2 veces de diferencia. A la MISMA altura,
 * el apaisado ocupa 4,2 veces más superficie y se lee como si gritara al lado
 * de los otros. El ojo no compara alturas: compara MANCHA.
 *
 *     alto = 28 × (0.34 / proporción_de_tinta) ^ 0.29
 *
 * **CORRECCIÓN (revisión, 31-jul): esta fórmula tuvo un error real de
 * magnitud en su primera versión, encontrado por el revisor y verificado por
 * mí midiendo los once lockups reales — ver la tabla comparativa completa en
 * el reporte de la tarea 6.** La primera versión reutilizaba el `4` y el
 * `0.25` de la fórmula VIEJA (calibrada para una razón de aspecto, que iba de
 * 1,64 a 6,80) sustituyendo directamente la entrada por
 * `proporcionDeTinta` (0 a 1) sin recalibrar nada — un `4` que una proporción
 * acotada a 1 NUNCA PUEDE ALCANZAR. Medí los once logos reales de
 * `public/logos/` con `sharp` (mismo algoritmo que `proporcionDeTinta`, sobre
 * el buffer RGBA completo del archivo) y la fórmula vieja daba alturas de
 * 1,49× a 2,19× más grandes que `ALTO_LOGO` — Zeus de 23,5 a 46,3, Ceci de
 * 41,4 a 71,9 — exactamente el problema que esta normalización existe para
 * evitar, ahora vivo en la vista previa en vez de en trabajo futuro.
 *
 * **`0.34` y `0.29` son la recalibración**, ajustada por regresión
 * log-lineal contra los once pares (proporción de tinta real, alto de
 * `ALTO_LOGO`) — no elegidos a mano. `0.34` es, aproximadamente, la mediana
 * de proporción de tinta de los once lockups reales (0,092 a 0,535): un logo
 * con esa densidad renderiza a los 28px de referencia. El exponente
 * (0,29, redondeado de 0,2885) sigue siendo GENTIL —lejos de la igualación
 * pura de área, que sería 0,5— por la misma razón que el original: frenar
 * cuánto castiga o premia un extremo, no solo por casualidad numérica.
 * Aplicada a los once reales, esta versión da alturas de 24,6 a 40,9px —
 * dentro del rango real de `ALTO_LOGO` (23,5 a 41,4) — y respeta
 * aproximadamente el orden (Ceci, la de menos tinta, sigue siendo la más
 * alta; Zeus y UiX, las de más tinta, siguen entre las más bajas). No es un
 * ajuste perfecto punto a punto —House of Films en particular queda más bajo
 * de lo que su ALTO_LOGO sugiere, porque la métrica vieja medía SU FORMA
 * (aspecto de la caja de tinta) y la nueva mide cuánto aire dejó quien
 * exportó el archivo, que son cosas distintas— pero el criterio pedido era
 * el rango y el orden aproximado, no una réplica exacta.
 *
 * DOS NÚMEROS QUE SÍ SE CONSERVAN DE LA VERSIÓN ORIGINAL:
 *
 * - **28 px de referencia**, no 40. Con 40 los logos dominaban la tarjeta
 *   por encima de los datos, que es lo que se viene a leer. Franco: "los logos
 *   en el home de las salas son enormes".
 * - **Un exponente bien por debajo de 0.5** (igualación pura de área), que
 *   pasa de frenada: dejaría un extremo casi al doble de alto que el otro, y
 *   esa diferencia de altura se leería como otro tipo de desproporción.
 *
 * DE DÓNDE SALE LA PROPORCIÓN (tarea 6, ronda 8): hasta el 30-jul, un script
 * fuera de la app medía la MANCHA REAL de cada PNG —su caja de tinta y la
 * densidad dentro— y el resultado se pegaba a mano en la tabla `ALTO_LOGO` de
 * abajo. Un logo subido desde `/salas` no puede esperar a que alguien corra
 * un script: se mide en el propio navegador, al elegir el archivo, pintándolo
 * en un `<canvas>` y contando qué fracción de sus píxeles NO es transparente
 * (ver `proporcionDeTinta`/`medirTinta` en `src/lib/tinta.ts`, y nótese que
 * mide sobre el LIENZO COMPLETO, no sobre una caja recortada — por eso es una
 * magnitud distinta a la razón de aspecto vieja, no solo una escala distinta
 * de la misma cosa). Ese número se guarda en `salas.logoRelacionDeTinta` y
 * `altoDesdeTinta`, más abajo, alimenta esta fórmula con ese dato en vez de
 * con la tabla.
 *
 * Si el logo viene sin transparencia (un JPG, o un PNG exportado con fondo
 * blanco sólido), la medición da 1 — el lienzo entero "es tinta" — y la
 * fórmula lo encoge al mínimo de su rango: MÁS PEQUEÑO de lo que le tocaría
 * si se hubiera exportado bien. No es un tamaño válido, es la señal de que
 * algo vino mal — por eso `FormularioSala` avisa en pantalla cuando
 * `medirTinta` devuelve 1, en vez de guardarlo en silencio.
 *
 * MIGRACIÓN: ninguna de las diez filas reales tiene todavía su
 * `logoRelacionDeTinta` medido en la base — la tabla de abajo se escribió a
 * mano con el script viejo, antes de que existiera esa columna, y poblarla no
 * es parte de esta tarea (no toca crear/editar filas reales para probar, ver
 * el protocolo de la ronda). Por eso `altoDeLogo` seguía aceptando la tabla
 * como respaldo: el día que se despliega este cambio, ninguna de las nueve
 * salas reales ha vuelto a subir su logo desde `/salas` todavía, así que
 * igualarlas de golpe a la altura de referencia —perdiendo la proporción que
 * ya tenían cuidada— sería peor que mantener el respaldo un tiempo.
 */
export const ALTO_LOGO: Record<string, number> = {
  'research-land': 24.3,
  'promo-espacio': 25.7,
  'marketing-united': 28.9,
  'mexa-creativa': 26.8,
  'house-of-films': 38.4,
  'uix': 26.7,
  'neracode': 28.0,
  'zeus': 23.5,
  'ceci': 41.4,
  'marketing-corp': 26.6,
  'grupo-upax': 28.5,
}

/**
 * De qué sala saca su logotipo cada sala.
 *
 * Vacío hoy: CECI YA TIENE EL SUYO. Durante un tiempo tomó prestado el de
 * Grupo UPAX porque no había archivo, y de ahí salieron dos tarjetas con el
 * mismo logotipo. Franco pasó su firma —"Ceci Fallabrino", manuscrita— y
 * desde entonces cada sala lleva la suya.
 *
 * El mecanismo se queda: es la respuesta correcta para una sala nueva que
 * todavía no tiene identidad propia, y no volver a inventarlo el día que
 * aparezca vale más que las tres líneas que ocupa.
 */
export const LOGO_DE: Record<string, string> = {}

export function archivoDeLogo(slug: string, variante: 'color' | 'blanco' = 'color'): string {
  return `/logos/${LOGO_DE[slug] ?? slug}-${variante}.png`
}

/** Altura de referencia cuando no hay nada mejor que usar: ni una medición, ni la tabla vieja. */
const ALTO_POR_DEFECTO = 28
/**
 * A esta proporción de tinta, la fórmula da exactamente `ALTO_POR_DEFECTO`.
 * Es, aproximadamente, la MEDIANA de proporción de tinta de los once lockups
 * reales (0,335, ver la tabla de la cabecera) — no un número elegido a ojo:
 * "el logo con la densidad típica de hoy renderiza a la altura de
 * referencia" es lo que hace que 28px siga significando algo concreto.
 */
const TINTA_DE_REFERENCIA = 0.34
/**
 * Ajustado por regresión log-lineal contra los once pares reales (ver la
 * cabecera del archivo) — no heredado sin más de la versión anterior, que
 * calibraba una magnitud distinta (razón de aspecto, no proporción de
 * tinta). Se mantiene bien por debajo de 0.5 (igualación pura de área) por la
 * misma razón que la versión original: un exponente así de gentil evita que
 * un extremo salga desproporcionadamente más alto o más bajo que el resto.
 */
const EXPONENTE = 0.29

/**
 * El alto que le toca a un logo YA MEDIDO (`proporcionDeTinta`, 0 a 1).
 *
 * Aplicada al vuelo sobre un dato por sala en vez de una constante escrita a
 * mano. `null`/`undefined`/0 (todavía no se midió, o algo salió mal) caen a
 * `ALTO_POR_DEFECTO`: ni gigante ni diminuto mientras no hay una medición de
 * la que partir.
 *
 * Es la función que usa `VistaPreviaMarca` para enseñar "así de grande se va
 * a ver" con el número que acaba de salir de `medirTinta`, antes incluso de
 * que la sala exista.
 */
export function altoDesdeTinta(relacionDeTinta: number | null | undefined): number {
  if (!relacionDeTinta || relacionDeTinta <= 0) return ALTO_POR_DEFECTO
  return ALTO_POR_DEFECTO * (TINTA_DE_REFERENCIA / relacionDeTinta) ** EXPONENTE
}

/**
 * El alto de la tarjeta de una sala YA CREADA.
 *
 * Con `relacionDeTinta` medida —el camino nuevo, tarea 6— sale de
 * `altoDesdeTinta`. Sin ella —las nueve salas reales, que todavía no han
 * vuelto a subir su logo desde `/salas`— cae a la tabla fija de siempre. El
 * segundo parámetro es OPCIONAL a propósito: los llamadores que hoy no
 * conocen la medición de su sala (el Home, la vista de cliente — ninguno de
 * los dos es parte de esta tarea) siguen compilando y viendo exactamente lo
 * mismo de siempre sin tener que tocarlos.
 */
export function altoDeLogo(slug: string, relacionDeTinta?: number | null): number {
  if (relacionDeTinta != null) return altoDesdeTinta(relacionDeTinta)
  return ALTO_LOGO[LOGO_DE[slug] ?? slug] ?? ALTO_POR_DEFECTO
}
