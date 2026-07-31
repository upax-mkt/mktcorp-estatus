import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProveedorTema } from './ProveedorTema'
import { SEMILLA_DE_TEMAS } from '@/temas/semilla'
import { contraste } from '@/lib/color'
import { clasesDeFuentes } from '@/temas/fuentes'

describe('ProveedorTema', () => {
  it('inyecta el primario de la sala', () => {
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.zeus} superficie="clara">
        <span>contenido</span>
      </ProveedorTema>,
    )
    const contenedor = screen.getByTestId('tema')
    expect(contenedor.style.getPropertyValue('--primario')).toBe('#614ACA')
  })

  it('usa la superficie clara u oscura según se pida', () => {
    const { rerender } = render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.neracode} superficie="clara"><i /></ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--superficie')).toBe('#FFFFFF')

    rerender(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.neracode} superficie="oscura"><i /></ProveedorTema>,
    )
    expect(screen.getByTestId('tema').style.getPropertyValue('--superficie')).toBe('#07184F')
  })

  it('expone seis variables de datos', () => {
    render(<ProveedorTema tema={SEMILLA_DE_TEMAS.uix} superficie="clara"><i /></ProveedorTema>)
    const estilo = screen.getByTestId('tema').style
    for (let i = 1; i <= 6; i++) {
      expect(estilo.getPropertyValue(`--dato-${i}`)).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('renderiza a sus hijos', () => {
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.ceci} superficie="clara">
        <span>hola</span>
      </ProveedorTema>,
    )
    expect(screen.getByText('hola')).toBeInTheDocument()
  })
})

// CARGA SELECTIVA (tarea 7, ronda 8): ProveedorTema es el único lugar de la
// app donde una tipografía DE MARCA se pinta de verdad (ver el comentario de
// cabecera de fuentes.ts) — así que es quien tiene que cargar sus variables
// CSS, y solo las suyas, en vez de heredar las veinte (o las nueve de la
// Fase 1) del `<body>` del layout raíz.
describe('ProveedorTema — carga solo las familias de su propia sala (tarea 7)', () => {
  it('el className son exactamente las clases de familiaDisplay/familiaTexto de esta sala', () => {
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.zeus} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const esperado = clasesDeFuentes([SEMILLA_DE_TEMAS.zeus.familiaDisplay, SEMILLA_DE_TEMAS.zeus.familiaTexto])
    expect(screen.getByTestId('tema').className).toBe(esperado)
  })

  it('con título y texto en la misma familia (neracode: outfit/outfit), la clase no se repite', () => {
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.neracode} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const clases = screen.getByTestId('tema').className.split(' ').filter(Boolean)
    expect(clases).toHaveLength(1)
  })

  it('una sala con un alias heredado (mexa-creativa: familiaDisplay "specialGothic") igual carga una clase de fuente, no se queda vacía', () => {
    // Regresión: si `clasesDeFuentes` no resolviera el alias, esta sala
    // perdería la clase de Archivo Expandido y su título caería al
    // font-family heredado — ver el comentario de ALIAS en fuentes.ts.
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS['mexa-creativa']} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const clases = screen.getByTestId('tema').className.split(' ').filter(Boolean)
    // familiaDisplay 'specialGothic' → alias de archivoExpanded; familiaTexto 'raleway': dos familias reales, dos clases.
    expect(clases).toHaveLength(2)
  })
})

// Decisión de marca (24-jul): el degradado se pinta SIEMPRE exacto y nunca
// lleva texto. Este test reemplaza al que verificaba contraste texto-sobre-
// degradado (retirado junto con --gradiente-texto y --texto-sobre-gradiente,
// ver superficie-texto.ts): ahora lo que hay que impedir que vuelva es que
// alguien "ajuste" --gradiente para hacerle sitio a texto. Para las 10 salas,
// --gradiente debe reproducir cada parada de tema.gradiente sin alterar
// ningún dígito.
describe.each(Object.values(SEMILLA_DE_TEMAS))(
  '$nombre: --gradiente reproduce el degradado de marca EXACTO, sin ajustar',
  (tema) => {
    it('cada parada de --gradiente coincide con tema.gradiente', () => {
      render(
        <ProveedorTema tema={tema} superficie="clara">
          <i />
        </ProveedorTema>,
      )
      const estilo = screen.getByTestId('tema').style
      const gradiente = estilo.getPropertyValue('--gradiente')
      const paradas = gradiente.match(/#[0-9A-Fa-f]{6}/g) ?? []

      expect(paradas).toEqual(tema.gradiente)
    })
  },
)

// Éste es el corazón del arreglo de contraste de --primario-sobre-superficie:
// para las 10 salas del registro y para AMBAS superficies (clara y oscura),
// el token debe contrastar ≥4.5:1 contra --superficie. Antes del fix,
// deck.module.css pintaba texto (.columnaTitulo) directo con --primario, sin
// que nada validara ese par: Promo Espacio caía a 2.97:1 y otras cinco marcas
// quedaban por debajo de 4.5:1 sobre superficieClara. Este test es lo que
// impide que ese defecto vuelva.
describe.each(Object.values(SEMILLA_DE_TEMAS))(
  '$nombre: --primario-sobre-superficie contrasta ≥4.5:1 contra --superficie',
  (tema) => {
    it.each(['clara', 'oscura'] as const)('sobre superficie %s', (superficie) => {
      render(
        <ProveedorTema tema={tema} superficie={superficie}>
          <i />
        </ProveedorTema>,
      )
      const estilo = screen.getByTestId('tema').style
      const primarioSobreSuperficie = estilo.getPropertyValue('--primario-sobre-superficie')
      const superficieActiva = estilo.getPropertyValue('--superficie')

      expect(primarioSobreSuperficie).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(contraste(primarioSobreSuperficie, superficieActiva)).toBeGreaterThanOrEqual(4.5)
    })
  },
)

// REVISIÓN FINAL DE LA RAMA, PUNTO 3: `archivoDeLogo` ahora acepta el
// `logoUrl` de la fila y cae al archivo estático solo si es nulo — esto
// prueba que `ProveedorTema` lo pasa de verdad, no solo que la función pura
// lo haga (ya cubierto en src/temas/logos.test.ts).
describe('ProveedorTema — logoUrl (revisión final de la rama, punto 3)', () => {
  it('sin logoUrl, --logo-blanco sigue apuntando al archivo estático de siempre', () => {
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.zeus} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const estilo = screen.getByTestId('tema').style
    expect(estilo.getPropertyValue('--logo-blanco')).toBe('url("/logos/zeus-blanco.png")')
  })

  it('con logoUrl (una sala creada desde /salas), --logo-blanco usa ESE archivo en vez del estático', () => {
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.zeus} superficie="clara" logoUrl="https://blob.vercel-storage.com/x.png">
        <i />
      </ProveedorTema>,
    )
    const estilo = screen.getByTestId('tema').style
    expect(estilo.getPropertyValue('--logo-blanco')).toBe('url("https://blob.vercel-storage.com/x.png")')
  })
})

describe('--primario-sobre-superficie', () => {
  it('no toca el primario cuando ya cumple 4.5:1 contra la superficie', () => {
    // NeraCode: #3E31CC contra superficieClara #FFFFFF da 8.35:1, ya cumple.
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS.neracode} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const estilo = screen.getByTestId('tema').style
    expect(estilo.getPropertyValue('--primario-sobre-superficie')).toBe('#3E31CC')
  })

  it('deja --primario intacto (color de marca puro, sin ajustar)', () => {
    // Promo Espacio: #F94700 sólo da 2.97:1 contra su superficieClara, pero
    // --primario debe seguir publicando el color de marca puro sin tocar.
    render(
      <ProveedorTema tema={SEMILLA_DE_TEMAS['promo-espacio']} superficie="clara">
        <i />
      </ProveedorTema>,
    )
    const estilo = screen.getByTestId('tema').style
    expect(estilo.getPropertyValue('--primario')).toBe('#F94700')
    expect(estilo.getPropertyValue('--primario-sobre-superficie')).not.toBe('#F94700')
  })
})
