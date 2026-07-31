import { describe, it, expect } from 'vitest'
import { altoDesdeTinta, altoDeLogo, archivoDeLogo, ALTO_LOGO } from './logos'

/**
 * `altoDesdeTinta`/`altoDeLogo` no tenían NINGÚN test hasta esta revisión —
 * por eso la primera calibración (28×(4/x)^0.25, reutilizando sin más los
 * números de la fórmula vieja) pasó `npm test`, `tsc` y `lint` sin que nada
 * la contradijera: esos tres comandos no saben que un "4" es inalcanzable
 * para una `x` acotada a [0,1]. Corregido, ver la cabecera de `logos.ts` para
 * la magnitud del error (1,49× a 2,19× de más) y de dónde salen los números
 * nuevos (0.34, 0.29 — regresión log-lineal contra los once lockups reales).
 */

describe('altoDesdeTinta', () => {
  it('sin medición (null/undefined) cae al alto de referencia', () => {
    expect(altoDesdeTinta(null)).toBe(28)
    expect(altoDesdeTinta(undefined)).toBe(28)
  })

  it('0 o negativo (no debería pasar, pero no debe dar Infinity/NaN) también cae al de referencia', () => {
    expect(altoDesdeTinta(0)).toBe(28)
    expect(altoDesdeTinta(-1)).toBe(28)
  })

  it('es DECRECIENTE: más tinta, menos alto — es el sentido entero de normalizar por mancha', () => {
    const pocaTinta = altoDesdeTinta(0.1)
    const mediaTinta = altoDesdeTinta(0.3)
    const muchaTinta = altoDesdeTinta(0.8)
    expect(pocaTinta).toBeGreaterThan(mediaTinta)
    expect(mediaTinta).toBeGreaterThan(muchaTinta)
  })

  it('sin transparencia (1, el máximo posible) da la altura MÍNIMA de toda la función: la señal correcta de "algo vino mal", nunca la más grande', () => {
    // Es la propiedad que hace correcto el aviso de FormularioSala ("se va a
    // ver más pequeño de lo que le corresponde"): tiene que ser cierto para
    // CUALQUIER proporción de tinta real posible (0,1), no solo para algunas.
    const enUno = altoDesdeTinta(1)
    for (const x of [0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      expect(enUno, `x=${x}`).toBeLessThanOrEqual(altoDesdeTinta(x))
    }
  })

  /**
   * REGRESIÓN CON LOS ONCE LOGOS REALES, medidos con `sharp` sobre
   * `public/logos/*-color.png` (mismo algoritmo que `proporcionDeTinta`, ver
   * el reporte de la tarea 6 para el script y la tabla completa). Es el
   * criterio de aceptación que pidió la revisión, convertido en test: si
   * alguien vuelve a tocar las constantes de la fórmula sin remedir contra
   * los logos reales, esto lo atrapa.
   */
  it('aplicada a los once logos reales, da alturas dentro del rango de ALTO_LOGO (23,5 a 41,4px)', () => {
    const proporcionesReales: Record<string, number> = {
      'ceci': 0.09207138259065875,
      'grupo-upax': 0.28142450553013654,
      'house-of-films': 0.22698514579130755,
      'marketing-corp': 0.3352350047105621,
      'marketing-united': 0.40951405697263077,
      'mexa-creativa': 0.5067130424825375,
      'neracode': 0.2706425165517478,
      'promo-espacio': 0.3631814206588281,
      'research-land': 0.3049506387921022,
      'uix': 0.5331505640637801,
      'zeus': 0.5347467166979362,
    }
    const MIN_ACEPTABLE = 20 // margen bajo el mínimo real (23.5) por si otra sala mide más denso aún
    const MAX_ACEPTABLE = 45 // margen sobre el máximo real (41.4) por si otra sala mide menos denso aún
    for (const [slug, x] of Object.entries(proporcionesReales)) {
      const alto = altoDesdeTinta(x)
      expect(alto, slug).toBeGreaterThanOrEqual(MIN_ACEPTABLE)
      expect(alto, slug).toBeLessThanOrEqual(MAX_ACEPTABLE)
    }
  })

  it('Ceci (la de menos tinta medida, 9,2%) sigue siendo de las más altas; Zeus y UiX (las de más, ~53%) de las más bajas', () => {
    // No es una réplica exacta del orden de ALTO_LOGO —la métrica cambió de
    // qué mide, no solo de escala, ver la cabecera de logos.ts— pero el
    // sentido general (poca tinta → más alto) tiene que sobrevivir en los
    // casos más claros.
    const ceci = altoDesdeTinta(0.09207138259065875)
    const zeus = altoDesdeTinta(0.5347467166979362)
    const uix = altoDesdeTinta(0.5331505640637801)
    expect(ceci).toBeGreaterThan(zeus)
    expect(ceci).toBeGreaterThan(uix)
  })
})

// REVISIÓN FINAL DE LA RAMA, PUNTO 4: `logoRelacionDeTinta` llegaba sin
// acotar — con un valor minúsculo la fórmula devolvía miles de píxeles de
// alto. Estos tests fijan el límite de seguridad que la protege.
describe('altoDesdeTinta — límites de seguridad (revisión final de la rama, punto 4)', () => {
  it('un logoRelacionDeTinta minúsculo YA NO dispara la fórmula a los miles de píxeles', () => {
    expect(altoDesdeTinta(0.000001)).toBeLessThanOrEqual(56)
    expect(altoDesdeTinta(1e-9)).toBeLessThanOrEqual(56)
    expect(altoDesdeTinta(Number.MIN_VALUE)).toBeLessThanOrEqual(56)
  })

  it('un logoRelacionDeTinta absurdamente alto (no debería pasar: proporcionDeTinta está acotada a [0,1]) no da un logo diminuto sin fondo: se topa en el mínimo', () => {
    expect(altoDesdeTinta(50)).toBeGreaterThanOrEqual(14)
    expect(altoDesdeTinta(1000)).toBeGreaterThanOrEqual(14)
  })

  it('el resultado queda dentro de [14, 56] para cualquier proporción positiva, del extremo más chico al más grande', () => {
    for (const x of [1e-9, 0.0001, 0.001, 0.01, 0.1, 0.34, 0.5, 0.8, 1, 10, 1000]) {
      const alto = altoDesdeTinta(x)
      expect(alto, `x=${x}`).toBeGreaterThanOrEqual(14)
      expect(alto, `x=${x}`).toBeLessThanOrEqual(56)
    }
  })

  it('dentro del rango normal (el de los once logos reales) el límite no toca nada: sigue dando el mismo resultado de siempre', () => {
    // Mismo valor de Zeus que ya prueba la describe() de arriba — el clamp no
    // debe cambiar ni un decimal de un caso que ya estaba dentro de [14, 56].
    expect(altoDesdeTinta(0.5347467166979362)).toBeCloseTo(24.554096624740332, 9)
  })
})

describe('altoDeLogo', () => {
  it('con una relación de tinta medida, usa la fórmula nueva — igual que altoDesdeTinta', () => {
    expect(altoDeLogo('cualquier-slug', 0.3)).toBe(altoDesdeTinta(0.3))
  })

  it('sin relación de tinta (las nueve salas reales, que no han vuelto a subir su logo), cae a la tabla ALTO_LOGO de siempre — compatibilidad hacia atrás a propósito', () => {
    expect(altoDeLogo('zeus')).toBe(ALTO_LOGO['zeus'])
    expect(altoDeLogo('ceci', null)).toBe(ALTO_LOGO['ceci'])
    expect(altoDeLogo('ceci', undefined)).toBe(ALTO_LOGO['ceci'])
  })

  it('un slug sin tabla y sin medición cae al alto de referencia (28), no revienta', () => {
    expect(altoDeLogo('sala-que-no-existe-todavia')).toBe(28)
  })
})

// REVISIÓN FINAL DE LA RAMA, PUNTO 3: antes de esta corrección, una sala
// creada desde `/salas` con su logo ya subido a Blob se pintaba como una
// imagen rota en la tarjeta del hub, en la portada de la sala y en la
// portada del deck — los tres pedían `/logos/<slug>-color.png` sin importar
// lo que trajera la fila. Esta es la fórmula completa: usa `logoUrl` si
// viene, y solo cae al archivo estático cuando es nulo.
describe('archivoDeLogo', () => {
  it('sin logoUrl (null, undefined, o sin pasarlo) cae al archivo estático de siempre — las nueve salas reales hoy', () => {
    expect(archivoDeLogo('zeus')).toBe('/logos/zeus-color.png')
    expect(archivoDeLogo('zeus', 'blanco')).toBe('/logos/zeus-blanco.png')
    expect(archivoDeLogo('zeus', 'color', null)).toBe('/logos/zeus-color.png')
    expect(archivoDeLogo('zeus', 'blanco', undefined)).toBe('/logos/zeus-blanco.png')
  })

  it('con logoUrl, lo usa TAL CUAL sin importar la variante pedida: una sala subida desde /salas es un solo archivo, no hay versión blanca aparte', () => {
    const url = 'https://blob.vercel-storage.com/salas/una-sala-nueva/logo/abc-mi-logo.png'
    expect(archivoDeLogo('una-sala-nueva', 'color', url)).toBe(url)
    expect(archivoDeLogo('una-sala-nueva', 'blanco', url)).toBe(url)
  })

  it('un logoUrl vacío ("") se trata igual que null: no hay nada real que pintar ahí', () => {
    expect(archivoDeLogo('zeus', 'color', '')).toBe('/logos/zeus-color.png')
  })

  it('sigue respetando LOGO_DE (el préstamo de logotipo) cuando cae al archivo estático', () => {
    // Hoy LOGO_DE está vacío (Ceci ya tiene el suyo, ver la cabecera del
    // archivo), pero el mecanismo se conserva: si algún día una sala presta
    // el logo de otra, `logoUrl` nulo sigue resolviendo por ese mapa.
    expect(archivoDeLogo('grupo-upax', 'color', null)).toBe('/logos/grupo-upax-color.png')
  })
})
