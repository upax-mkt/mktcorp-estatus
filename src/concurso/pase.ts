/**
 * EL PASE DEL CONCURSO: un código por persona, y uno dorado si además compite.
 *
 * Franco: *«una vez que la persona registra su propuesta debe generar su golden
 * ticket para después con ese código único quemar su voto entregándolo»*, y al
 * concretarlo: el pase lo tiene TODO EL EQUIPO —el resultado es 70% del voto de
 * los 23, no solo de quienes concursan— y el de quien sube propuesta es el
 * dorado. «Quemar» es la metáfora de usarlo: el voto sigue siendo movible hasta
 * que cierra la votación, como prometen las bases.
 *
 * ⚠️ EL CÓDIGO SE DERIVA, NO SE GUARDA. Sale del mismo HMAC que ya identifica
 * al votante (`hashVotante`, src/db/concurso.ts), así que:
 *
 *  - es el MISMO cada vez que la persona entra, sin una tabla que mantener ni
 *    un momento de «generación» que pueda fallar a medias;
 *  - NO revela el correo, que es justo lo que el ADR protege al no guardar el
 *    correo en la tabla de votos;
 *  - y no se puede adivinar el de otro sin el `SESSION_SECRET`.
 *
 * Es un pase para reconocerse, no una credencial: quien vota ya está
 * autenticado por su sesión, y el servidor comprueba identidad y autoría antes
 * de escribir. Enseñar un código no autoriza nada por sí solo — si algún día se
 * usa para canjear algo en la ceremonia, hace falta validarlo contra la sesión,
 * no confiar en el papel.
 */

/**
 * Alfabeto sin caracteres que se confunden al leerlos en voz alta o teclearlos:
 * fuera 0/O, 1/I/L y el 5/S. Quedan 29, y con ocho posiciones son 5 × 10¹¹
 * combinaciones: de sobra para 23 personas, y suficientes para que el código de
 * otra persona no se acierte por tanteo.
 */
const ALFABETO = '2346789ABCDEFGHJKMNPQRTUVWXYZ'

/** Cuántos caracteres tiene el código, sin contar los guiones. */
const LARGO = 8

/**
 * El código de pase de un votante, derivado de su hash.
 *
 * Determinista: el mismo hash da siempre el mismo código. Se leen dos dígitos
 * hexadecimales por carácter —no uno— porque con uno solo el alfabeto efectivo
 * se reduciría a 16 valores y los códigos se parecerían entre sí.
 */
export function codigoDePase(hashVotante: string): string {
  if (!/^[0-9a-f]{16,}$/i.test(hashVotante)) {
    throw new Error('El hash del votante no tiene la forma esperada.')
  }
  let codigo = ''
  for (let i = 0; i < LARGO; i++) {
    const byte = parseInt(hashVotante.slice(i * 2, i * 2 + 2), 16)
    codigo += ALFABETO[byte % ALFABETO.length]
  }
  // Dos grupos de cuatro: así se dicta en voz alta sin perder el sitio.
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`
}

export type EstadoPase = 'dorado' | 'normal'

export interface Pase {
  codigo: string
  estado: EstadoPase
  /** Título de su propuesta, cuando compite. */
  propuesta: string | null
  /** Título de la propuesta que votó, si ya usó el pase. */
  votadoA: string | null
}

/**
 * El pase completo de una persona.
 *
 * `dorado` cuando ha subido propuesta. No es una recompensa cosmética: es la
 * única señal en toda la app de que alguien dio el paso de competir, y quien lo
 * hizo debería poder enseñarlo.
 */
export function paseDe(
  hashVotante: string,
  propuestaPropia: string | null,
  propuestaVotada: string | null,
): Pase {
  return {
    codigo: codigoDePase(hashVotante),
    estado: propuestaPropia ? 'dorado' : 'normal',
    propuesta: propuestaPropia,
    votadoA: propuestaVotada,
  }
}
