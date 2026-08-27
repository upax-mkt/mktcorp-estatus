import { describe, it, expect } from 'vitest'
import { blobsHuerfanos, comoPathname, enUnidadLegible } from './blobs-huerfanos'

const blob = (pathname: string, size = 1024) => ({
  pathname,
  size,
  uploadedAt: new Date('2026-08-01T12:00:00Z'),
})

describe('comoPathname', () => {
  it('deja un pathname pelado como está: es lo que guarda archivos.ruta', () => {
    expect(comoPathname('salas/mexa/credenciales.pdf')).toBe('salas/mexa/credenciales.pdf')
  })

  /**
   * `salas.logoUrl` guarda la URL COMPLETA, no el pathname (ver
   * `src/temas/logos.ts`). Sin esta conversión, los diez logos de las salas
   * saldrían como huérfanos — diez falsos positivos sobre archivos vivos, que
   * es exactamente el error que puede acabar con alguien borrando un logo.
   */
  it('saca el pathname de una URL completa de Blob', () => {
    expect(comoPathname('https://abc123.public.blob.vercel-storage.com/logos/zeus.png')).toBe(
      'logos/zeus.png',
    )
  })

  it('descodifica los espacios y acentos que la URL trae escapados', () => {
    expect(comoPathname('https://x.blob.vercel-storage.com/salas/one%20page%20PE.pdf')).toBe(
      'salas/one page PE.pdf',
    )
  })

  it('ignora lo que no es un binario nuestro', () => {
    // Un enlace de los que viven en `archivos.enlace`.
    expect(comoPathname('https://www.youtube.com/watch?v=abc')).toBeNull()
    // Un logo servido desde /public, que no está en Blob.
    expect(comoPathname('/logos/upax.svg')).toBeNull()
    expect(comoPathname(null)).toBeNull()
    expect(comoPathname('')).toBeNull()
    expect(comoPathname('   ')).toBeNull()
  })

  it('no se traga una URL rota', () => {
    expect(comoPathname('https://')).toBeNull()
  })
})

describe('blobsHuerfanos', () => {
  it('señala solo lo que nadie referencia', () => {
    const huerfanos = blobsHuerfanos(
      [blob('vivo.pdf'), blob('olvidado.pdf'), blob('tambien-vivo.png')],
      ['vivo.pdf', 'https://x.blob.vercel-storage.com/tambien-vivo.png'],
    )
    expect(huerfanos.map((h) => h.pathname)).toEqual(['olvidado.pdf'])
  })

  /**
   * EL CASO QUE MÁS IMPORTA NO EQUIVOCAR: el mismo PDF registrado dos veces
   * —como material comercial y como archivo de interés— comparte `ruta`. Si
   * el conjunto de referencias se construyera mal, seguiría estando vivo y
   * aparecería como huérfano.
   */
  it('un binario referenciado por varias filas no es huérfano', () => {
    const huerfanos = blobsHuerfanos(
      [blob('compartido.pdf')],
      ['compartido.pdf', 'compartido.pdf', 'compartido.pdf'],
    )
    expect(huerfanos).toHaveLength(0)
  })

  /**
   * LA TABLA VACÍA. Sin ninguna referencia, TODO el store es huérfano — y eso
   * es literalmente cierto, pero es también la situación en la que un borrado
   * automático arrasaría con todo. Otra razón para que esto solo liste.
   */
  it('con la base sin referencias, todos los blobs salen listados', () => {
    expect(blobsHuerfanos([blob('a.pdf'), blob('b.pdf')], [])).toHaveLength(2)
  })

  it('sin blobs no hay nada que listar, aunque la base referencie cosas', () => {
    expect(blobsHuerfanos([], ['a.pdf', 'b.pdf'])).toEqual([])
  })

  it('ignora los nulos de la base sin contarlos como referencia', () => {
    // `archivos.ruta` es NULL en cada fila que es un enlace, no un fichero.
    const huerfanos = blobsHuerfanos([blob('solo.pdf')], [null, undefined, '', 'otro.pdf'])
    expect(huerfanos.map((h) => h.pathname)).toEqual(['solo.pdf'])
  })

  it('devuelve el tamaño y la fecha, que es lo que decide si importa', () => {
    const [h] = blobsHuerfanos([blob('grande.mp4', 15_728_640)], [])
    expect(h.size).toBe(15_728_640)
    expect(h.uploadedAt).toBe('2026-08-01T12:00:00.000Z')
  })

  it('acepta la fecha ya en texto, como la sirve la API', () => {
    const [h] = blobsHuerfanos(
      [{ pathname: 'x.pdf', size: 10, uploadedAt: '2026-08-01T12:00:00.000Z' }],
      [],
    )
    expect(h.uploadedAt).toBe('2026-08-01T12:00:00.000Z')
  })
})

describe('enUnidadLegible', () => {
  it('usa la unidad en la que se decide si algo pesa', () => {
    expect(enUnidadLegible(512)).toBe('512 B')
    expect(enUnidadLegible(2048)).toBe('2.0 KB')
    expect(enUnidadLegible(15_728_640)).toBe('15.0 MB')
    expect(enUnidadLegible(2_147_483_648)).toBe('2.00 GB')
  })
})
