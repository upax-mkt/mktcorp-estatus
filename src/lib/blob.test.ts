import { describe, it, expect } from 'vitest'
import { rutaDeArchivo, pesoLegible, extensionDe, TIPOS_PERMITIDOS, categoriaDeclarada, tipoSeguroParaServir, pideLaPoliticaDeVideo } from './blob'

describe('rutaDeArchivo', () => {
  it('cuelga de la sala y la categoría, para poder leer el store a ojo', () => {
    const ruta = rutaDeArchivo('mexa-creativa', 'presentacion', 'deck.pdf')
    expect(ruta.startsWith('salas/mexa-creativa/presentacion/')).toBe(true)
    expect(ruta.endsWith('-deck.pdf')).toBe(true)
  })

  it('dos subidas del mismo nombre no se pisan', () => {
    const a = rutaDeArchivo('zeus', 'interes', 'estatus.pdf')
    const b = rutaDeArchivo('zeus', 'interes', 'estatus.pdf')
    expect(a).not.toBe(b)
  })

  it('un nombre con acentos, espacios y barras no se escapa de su carpeta', () => {
    const ruta = rutaDeArchivo('uix', 'interes', '../../secreto de año/Informe (final).pdf')
    expect(ruta.startsWith('salas/uix/interes/')).toBe(true)
    expect(ruta).not.toContain('..')
    // Todo lo que no es letra, número, punto o guion se sustituye — incluida
    // la barra, que es lo que permitiría subir fuera de la carpeta.
    expect(ruta.split('salas/uix/interes/')[1]).not.toContain('/')
  })

  it('un nombre larguísimo se recorta y sigue siendo una ruta', () => {
    const largo = `${'a'.repeat(500)}.pdf`
    const ruta = rutaDeArchivo('zeus', 'interes', largo)
    expect(ruta.length).toBeLessThan(160)
  })
})

describe('categoriaDeclarada — la inversa de rutaDeArchivo', () => {
  it('lee la categoría del segundo tramo', () => {
    expect(categoriaDeclarada('salas/sesion-abc/video/uuid-clip.mp4')).toBe('video')
    expect(categoriaDeclarada('salas/mexa-creativa/presentacion/uuid-deck.pdf')).toBe('presentacion')
  })

  it('lo que arma rutaDeArchivo, categoriaDeclarada lo recupera exacto', () => {
    for (const categoria of ['imagen', 'video', 'presentacion', 'interes']) {
      const ruta = rutaDeArchivo('sesion-abc', categoria, 'archivo.mp4')
      expect(categoriaDeclarada(ruta)).toBe(categoria)
    }
  })

  it('un nombre de archivo con la palabra "video" en otro tramo no cuenta como categoría', () => {
    // Es la razón de leer el TRAMO exacto y no buscar la subcadena en toda
    // la ruta: un archivo de la categoría "interes" con "video" en su
    // propio nombre no debe recibir la política de vídeo.
    const ruta = rutaDeArchivo('sesion-abc', 'interes', 'mi-video-de-la-boda.pdf')
    expect(categoriaDeclarada(ruta)).toBe('interes')
  })

  it('una ruta sin forma reconocible no revienta: da undefined', () => {
    expect(categoriaDeclarada('')).toBeUndefined()
    expect(categoriaDeclarada('algo-suelto')).toBeUndefined()
  })
})

describe('pesoLegible', () => {
  it('escribe bytes, kilos y megas', () => {
    expect(pesoLegible(840)).toBe('840 B')
    expect(pesoLegible(24_000)).toBe('23 KB')
    expect(pesoLegible(2_400_000)).toBe('2.3 MB')
  })

  it('sin peso no inventa un cero', () => {
    expect(pesoLegible(null)).toBeNull()
    expect(pesoLegible(0)).toBeNull()
  })
})

describe('extensionDe', () => {
  it('saca la extensión en mayúsculas', () => {
    expect(extensionDe('deck.pptx')).toBe('PPTX')
    expect(extensionDe('Informe.PDF')).toBe('PDF')
  })

  it('un nombre sin extensión no deja el icono en blanco', () => {
    expect(extensionDe('LEEME')).toBe('FILE')
    expect(extensionDe('acaba.en.punto.')).toBe('FILE')
  })
})

describe('tipos permitidos', () => {
  it('es una lista blanca: lo ejecutable no está', () => {
    for (const prohibido of ['application/x-msdownload', 'text/html', 'application/javascript']) {
      expect(TIPOS_PERMITIDOS).not.toContain(prohibido)
    }
  })

  it('cubre lo que el equipo cuelga de verdad: decks, excels e imágenes', () => {
    expect(TIPOS_PERMITIDOS).toContain('application/pdf')
    expect(TIPOS_PERMITIDOS).toContain(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
    expect(TIPOS_PERMITIDOS).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(TIPOS_PERMITIDOS).toContain('image/png')
  })
})

/**
 * REVISIÓN FINAL DE LA RAMA, PUNTO 4: `/api/archivo/[id]` servía
 * `archivo.tipoContenido` —dato del cliente— tal cual, con
 * `Content-Disposition: inline` y sin validar contra ninguna lista. Un SVG
 * con script servido así se ejecuta en el origen de la app en cuanto alguien
 * abre el enlace (`ArchivosSala.tsx` los enlaza con un `<a target="_blank">`
 * real) — y quien los abre son los directores de las UDN.
 */
describe('tipoSeguroParaServir', () => {
  it('un tipo conocido y permitido se sirve tal cual', () => {
    expect(tipoSeguroParaServir('application/pdf')).toBe('application/pdf')
    expect(tipoSeguroParaServir('image/png')).toBe('image/png')
    expect(tipoSeguroParaServir('video/mp4')).toBe('video/mp4')
  })

  it('image/svg+xml NUNCA se sirve como tal, aunque esté en la lista de subida — es la excepción', () => {
    expect(TIPOS_PERMITIDOS).toContain('image/svg+xml') // sí se admite SUBIR
    expect(tipoSeguroParaServir('image/svg+xml')).toBe('application/octet-stream') // pero no SERVIR así
  })

  it('un tipo ejecutable o desconocido se degrada a descarga genérica, no se confía en el cliente', () => {
    expect(tipoSeguroParaServir('text/html')).toBe('application/octet-stream')
    expect(tipoSeguroParaServir('application/javascript')).toBe('application/octet-stream')
    expect(tipoSeguroParaServir('lo-que-sea')).toBe('application/octet-stream')
  })

  it('sin tipo declarado, descarga genérica — nunca se inventa uno', () => {
    expect(tipoSeguroParaServir(null)).toBe('application/octet-stream')
    expect(tipoSeguroParaServir(undefined)).toBe('application/octet-stream')
    expect(tipoSeguroParaServir('')).toBe('application/octet-stream')
  })

  it('no se deja engañar por parámetros pegados al tipo ni por mayúsculas', () => {
    expect(tipoSeguroParaServir('IMAGE/SVG+XML')).toBe('application/octet-stream')
    expect(tipoSeguroParaServir('application/pdf; charset=binary')).toBe('application/pdf')
  })
})


/**
 * QUÉ POLÍTICA DE SUBIDA LE TOCA A CADA ARCHIVO (24-ago-2026).
 *
 * Franco, subiendo un vídeo a los materiales de una sala: *"Vercel Blob:
 * Content type mismatch, video/mp4 is not allowed"*. La lista de vídeo y su
 * tope de 200 MB existían, pero solo se ofrecían a la categoría `video` —que
 * usa únicamente el benchmark—, así que un `.mp4` en "Materiales comerciales"
 * caía en la política de documentos y se rechazaba.
 */
describe('pideLaPoliticaDeVideo', () => {
  it('la categoría `video` la pide, como siempre', () => {
    expect(pideLaPoliticaDeVideo('salas/mexa-creativa/video/uuid-clip.mp4')).toBe(true)
  })

  it('EL CASO DE FRANCO: un mp4 en materiales comerciales también', () => {
    expect(pideLaPoliticaDeVideo('salas/mexa-creativa/comercial/uuid-spot.mp4')).toBe(true)
  })

  it('y un webm en archivos de interés', () => {
    expect(pideLaPoliticaDeVideo('salas/neracode/interes/uuid-demo.webm')).toBe(true)
  })

  it('mayúsculas en la extensión no lo despistan: el nombre lo escribe quien sube', () => {
    expect(pideLaPoliticaDeVideo('salas/zeus/comercial/uuid-SPOT.MP4')).toBe(true)
  })

  it('un PDF sigue con la política de documentos, que es la que le toca', () => {
    expect(pideLaPoliticaDeVideo('salas/mexa-creativa/comercial/uuid-credenciales.pdf')).toBe(false)
  })

  /**
   * ⚠️ NO SE ENSANCHA NADA. La política de vídeo no es "documentos + vídeo":
   * es la de vídeo, con SUS dos tipos. Un archivo que solo lleva "mp4" en el
   * nombre —sin ser su extensión— no se cuela en ella.
   */
  it('"mp4" dentro del nombre no basta: tiene que ser la extensión', () => {
    expect(pideLaPoliticaDeVideo('salas/zeus/comercial/uuid-guion-mp4-final.pdf')).toBe(false)
    // ⚠️ CON EL PUNTO DELANTE, que es el caso que de verdad separa `endsWith`
    // de `includes`. Sin esta línea, cambiar uno por otro dejaba los siete
    // tests en verde — comprobado mutándolo: un test que no puede fallar.
    expect(pideLaPoliticaDeVideo('salas/zeus/comercial/uuid-resumen.mp4.pdf')).toBe(false)
  })

  it('ni una sala o un nombre que se llamen "video" cambian la política de un pdf', () => {
    expect(pideLaPoliticaDeVideo('salas/video/comercial/uuid-video.pdf')).toBe(false)
  })
})
