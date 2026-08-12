import { describe, it, expect } from 'vitest'
import {
  idDeYouTube,
  dominioDe,
  extensionParaCaratula,
  materialParaVista,
  normalizarEnlace,
  familiaDeFormato,
  tonoDeDominio,
  inicialDeDominio,
} from './materiales'

const base = { id: 'abc', enlace: null, ruta: null, nombreOriginal: null, tipoContenido: null }

describe('idDeYouTube — las cuatro formas con las que llega un enlace pegado a mano', () => {
  it('reconoce watch?v=, youtu.be, /embed/ y /shorts/', () => {
    expect(idDeYouTube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idDeYouTube('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idDeYouTube('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idDeYouTube('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('aguanta parámetros de más y el dominio móvil', () => {
    expect(idDeYouTube('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLx')).toBe('dQw4w9WgXcQ')
    expect(idDeYouTube('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ')
  })

  /**
   * El caso que motiva comprobar la FORMA del id y no solo el dominio: un
   * enlace a un canal es de YouTube pero no es un vídeo, y pedirle portada
   * devuelve un 404 que en una rejilla se ve como un hueco.
   */
  it('un canal o una búsqueda de YouTube NO son un vídeo', () => {
    expect(idDeYouTube('https://www.youtube.com/@promoespacio')).toBeNull()
    expect(idDeYouTube('https://www.youtube.com/results?search_query=dooh')).toBeNull()
    expect(idDeYouTube('https://www.youtube.com/watch?v=corto')).toBeNull()
  })

  it('lo que no es de YouTube, y lo que no es ni una URL', () => {
    expect(idDeYouTube('https://vimeo.com/123456')).toBeNull()
    expect(idDeYouTube('no soy una url')).toBeNull()
  })
})

describe('materialParaVista — qué cara pone cada material', () => {
  it('un vídeo de YouTube trae su portada y abre fuera', () => {
    const v = materialParaVista({ ...base, enlace: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(v.tipo).toBe('video')
    expect(v.miniatura).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(v.externo).toBe(true)
    expect(v.destino).toBe('https://youtu.be/dQw4w9WgXcQ')
  })

  it('un enlace cualquiera no trae miniatura: lleva su dominio en la carátula', () => {
    const v = materialParaVista({ ...base, enlace: 'https://promoespacio.com/casos' })
    expect(v.tipo).toBe('enlace')
    expect(v.miniatura).toBeNull()
    expect(v.distintivo).toBe('promoespacio.com')
  })

  /**
   * El store de Blob es PRIVADO: un fichero solo sale por /api/archivo/[id],
   * que comprueba el permiso contra la sala. Si esto alguna vez devolviera la
   * URL de Blob, la miniatura sería un agujero en ese control.
   */
  it('un fichero SIEMPRE se sirve por /api/archivo/[id], nunca por la ruta de Blob', () => {
    const v = materialParaVista({
      ...base,
      ruta: 'salas/promo-espacio/interes/x-credenciales.pdf',
      nombreOriginal: 'credenciales.pdf',
    })
    expect(v.destino).toBe('/api/archivo/abc')
    expect(v.externo).toBe(false)
    expect(v.distintivo).toBe('PDF')
  })

  it('una imagen subida se pinta a sí misma', () => {
    const v = materialParaVista({
      ...base,
      ruta: 'salas/pe/interes/x-mapa.png',
      nombreOriginal: 'mapa.png',
      tipoContenido: 'image/png',
    })
    expect(v.tipo).toBe('imagen')
    expect(v.miniatura).toBe('/api/archivo/abc')
  })

  /**
   * Un mp4 propio caía a "documento" —carátula "MP4", sin triángulo de
   * reproducir— porque solo YouTube contaba como vídeo. Quien sube la
   * evidencia de un benchmark sube capturas y vídeos: los dos tienen que
   * distinguirse de un Excel.
   */
  it('un vídeo subido es vídeo, y se sigue sirviendo por /api/archivo/[id]', () => {
    const v = materialParaVista({
      ...base,
      ruta: 'salas/pe/video/x-spot.mp4',
      nombreOriginal: 'spot.mp4',
      tipoContenido: 'video/mp4',
    })
    expect(v.tipo).toBe('video')
    expect(v.destino).toBe('/api/archivo/abc')
    expect(v.externo).toBe(false)
    // Sin miniatura: sacar un fotograma exigiría decodificar el vídeo en el
    // servidor. Quien lo pinta decide si lo reproduce en línea.
    expect(v.miniatura).toBeNull()
  })

  it('reconoce el vídeo por su tipo de contenido aunque el nombre no lleve extensión', () => {
    const v = materialParaVista({
      ...base,
      ruta: 'salas/pe/video/x-grabacion',
      nombreOriginal: 'grabacion',
      tipoContenido: 'video/webm',
    })
    expect(v.tipo).toBe('video')
  })

  it('reconoce la imagen por su tipo de contenido aunque el nombre no lleve extensión', () => {
    const v = materialParaVista({
      ...base,
      ruta: 'salas/pe/interes/x-captura',
      nombreOriginal: 'captura',
      tipoContenido: 'image/webp',
    })
    expect(v.tipo).toBe('imagen')
  })

  it('el enlace manda sobre el fichero si por lo que sea vinieran los dos', () => {
    const v = materialParaVista({
      ...base,
      enlace: 'https://youtu.be/dQw4w9WgXcQ',
      ruta: 'salas/pe/interes/x.pdf',
      nombreOriginal: 'x.pdf',
    })
    expect(v.tipo).toBe('video')
  })
})

describe('normalizarEnlace', () => {
  it('completa el esquema que nadie escribe al pegar de memoria', () => {
    const r = normalizarEnlace('promoespacio.com/casos')
    expect(r).toEqual({ url: 'https://promoespacio.com/casos' })
  })

  it('respeta http y https', () => {
    expect(normalizarEnlace('http://ejemplo.com')).toEqual({ url: 'http://ejemplo.com/' })
  })

  /** `javascript:` en un href es XSS almacenado: el material lo ve la UDN. */
  it('rechaza cualquier esquema que no sea http o https', () => {
    expect(normalizarEnlace('javascript:alert(1)')).toHaveProperty('error')
    expect(normalizarEnlace('data:text/html,<script>')).toHaveProperty('error')
    expect(normalizarEnlace('file:///etc/passwd')).toHaveProperty('error')
  })

  it('rechaza lo que no tiene dominio y lo vacío', () => {
    expect(normalizarEnlace('   ')).toHaveProperty('error')
    expect(normalizarEnlace('localhost')).toHaveProperty('error')
  })
})

describe('extensionParaCaratula y dominioDe', () => {
  it('la extensión, corta y en mayúsculas', () => {
    expect(extensionParaCaratula('credenciales.pdf')).toBe('PDF')
    expect(extensionParaCaratula('plan.pptx')).toBe('PPTX')
    expect(extensionParaCaratula('sin-extension')).toBe('DOC')
    expect(extensionParaCaratula(null)).toBe('DOC')
  })

  it('el dominio, sin www', () => {
    expect(dominioDe('https://www.ejemplo.com/x')).toBe('ejemplo.com')
    expect(dominioDe('no soy url')).toBe('enlace')
  })
})

/**
 * LA CARA DE UN MATERIAL SIN MINIATURA (ronda 12).
 *
 * Franco: *"las miniaturas preview de los materiales cargados como un pdf o un
 * link o un excel se ven sin diseño, una imagen gris y ya; dale amor y que se
 * vea bonito"*. Era literal: un rectángulo gris con la palabra «PDF» centrada,
 * así que ocho materiales se veían como ocho rectángulos iguales que había que
 * LEER uno a uno.
 *
 * Lo que se clasifica aquí es lo que permite dibujarlos distintos. El color y
 * la forma viven en el CSS y en `CaratulaMaterial`: la clasificación es
 * conocimiento del dominio, el verde y el rojo son decisiones de estilo.
 */
describe('familiaDeFormato', () => {
  it.each([
    ['credenciales.pdf', 'pdf'],
    ['icp.xlsx', 'hoja'],
    ['datos.csv', 'hoja'],
    ['estatus.pptx', 'presentacion'],
    ['guion.docx', 'texto'],
    ['notas.md', 'texto'],
    ['entregable.zip', 'comprimido'],
    ['reel.mp4', 'video'],
    ['portada.png', 'imagen'],
  ] as const)('%s → %s', (nombre, familia) => {
    expect(familiaDeFormato(nombre)).toBe(familia)
  })

  it.each([null, '', 'sin_extension', 'archivo.xyz'])(
    'lo que no reconoce cae en "otro" (%s): sin inventar una familia',
    (nombre) => {
      expect(familiaDeFormato(nombre)).toBe('otro')
    },
  )

  it('no le importan las mayúsculas del nombre', () => {
    expect(familiaDeFormato('CREDENCIALES.PDF')).toBe('pdf')
  })

  /** Un nombre con puntos: manda la ÚLTIMA extensión, no la primera. */
  it('con varios puntos, la extensión es la última', () => {
    expect(familiaDeFormato('reporte.v2.final.xlsx')).toBe('hoja')
  })
})

describe('el monograma de un enlace', () => {
  /**
   * EL MISMO DOMINIO DA SIEMPRE EL MISMO COLOR. Es lo único que se le pide:
   * no reparte bien ni falta que hace, pero si cambiara entre cargas, la misma
   * tarjeta parpadearía de color en cada visita.
   */
  it('el tono es estable para un dominio dado', () => {
    expect(tonoDeDominio('onuris.sharepoint.com')).toBe(tonoDeDominio('onuris.sharepoint.com'))
  })

  it('está siempre dentro del círculo cromático', () => {
    for (const d of ['a.mx', 'onuris.sharepoint.com', 'brujula-comercial-upax.vercel.app', '']) {
      const t = tonoDeDominio(d)
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(360)
    }
  })

  /** Dominios distintos con colores distintos: es para lo que sirve. */
  it('dos dominios de un mismo material no colisionan', () => {
    expect(tonoDeDominio('onuris.sharepoint.com')).not.toBe(tonoDeDominio('brujula-comercial-upax.vercel.app'))
  })

  it.each([
    ['onuris.sharepoint.com', 'O'],
    ['www.upax.com.mx', 'U'],
    ['4chan.org', '4'],
  ])('la inicial de %s es %s', (dominio, inicial) => {
    expect(inicialDeDominio(dominio)).toBe(inicial)
  })

  /** Sin ninguna letra ni número no se revienta: se pinta un punto. */
  it('un dominio sin caracteres alfanuméricos cae a "·"', () => {
    expect(inicialDeDominio('---')).toBe('·')
  })
})
