import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GlobalError from './global-error'
import NoEncontrado from './not-found'
import { Cargando } from '@/componentes/Cargando'

/**
 * LAS TRES PANTALLAS DE CUANDO ALGO NO VA (27-ago-2026).
 *
 * La app tenía `error.tsx` y nada más. Le faltaban las tres que cubren lo que
 * ese no puede cubrir:
 *
 *  - `global-error.tsx` — `error.tsx` es un boundary DENTRO del root layout,
 *    así que no atrapa un fallo DEL layout. Y este layout monta
 *    `ProveedorTema`, que consulta Neon: si eso revienta, lo que se veía era
 *    la pantalla cruda de Next con el stack en bruto.
 *  - `not-found.tsx` — cualquier `notFound()` caía en la estática del
 *    framework, «404: This page could not be found» en su tipografía. No es
 *    hipotético: `/cliente/grupo-upax` cae ahí siempre, porque `slugsDeSalas()`
 *    excluye a Grupo UPAX a propósito (es la casa, no un cliente).
 *  - `loading.tsx` — las 22 rutas son dinámicas y todas consultan la base. Sin
 *    esto, Next deja congelada la pantalla anterior durante la espera.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

describe('global-error.tsx', () => {
  const error = Object.assign(new Error('el layout reventó'), { digest: 'abc123' })

  /**
   * Monta `<html>` y `<body>` porque SUSTITUYE al root layout — no hay ninguno
   * encima que las ponga. jsdom se queja de anidar html dentro de un div, así
   * que el aviso se silencia: lo que se comprueba es el contenido, y el
   * requisito de las etiquetas es de Next, no nuestro.
   */
  function montar(retry = vi.fn()) {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    return { retry, ...render(<GlobalError error={error} retry={retry} />) }
  }

  it('dice qué pasó sin echarle la culpa a la sesión de quien mira', () => {
    montar()
    expect(screen.getByText('La aplicación no pudo cargar')).toBeInTheDocument()
    // El hermano `error.tsx` sí apunta a la sesión, porque ahí es la causa más
    // probable. Aquí no: si falló el layout entero, no es cosa del usuario.
    expect(screen.getByText(/No es tu sesión/)).toBeInTheDocument()
  })

  it('el botón de reintentar llama a retry, que es la API de Next 16 aquí', async () => {
    const { retry } = montar()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  /**
   * El enlace de salida es un `<a>` y NO un `<Link>`: el enrutador de Next vive
   * en el layout que acaba de fallar, así que hace falta una navegación del
   * navegador que recargue entero. Un `<Link>` aquí podría no llevar a ningún
   * sitio.
   */
  it('sale con una navegación del navegador, no con el enrutador que acaba de fallar', () => {
    montar()
    const salida = screen.getByRole('link', { name: 'Volver a entrar' })
    expect(salida).toHaveAttribute('href', '/entrar')
  })

  it('enseña el digest para que soporte pueda cruzarlo con el log', () => {
    montar()
    expect(screen.getByText('abc123')).toBeInTheDocument()
  })

  it('deja rastro en consola: no hay integración de errores conectada todavía', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<GlobalError error={error} retry={vi.fn()} />)
    expect(espia).toHaveBeenCalledWith('[global-error.tsx] falló el layout raíz:', error)
  })
})

describe('not-found.tsx', () => {
  it('habla el idioma de la app, no el del framework', () => {
    render(<NoEncontrado />)
    expect(screen.getByText('Esta página no existe')).toBeInTheDocument()
    // La cadena que venía a sustituir. Si reaparece, es que volvimos a caer en
    // la estática de Next.
    expect(screen.queryByText(/could not be found/i)).not.toBeInTheDocument()
  })

  it('ofrece la única salida que siempre existe: el Meeting Hub', () => {
    render(<NoEncontrado />)
    expect(screen.getByRole('link', { name: 'Ir al Meeting Hub' })).toHaveAttribute('href', '/')
  })
})

describe('el esqueleto de carga', () => {
  it('reserva tantas barras como módulos va a traer la pantalla', () => {
    const { container } = render(<Cargando filas={7} />)
    // Las barras son decoración: se cuentan por su clase, no por su rol,
    // porque a propósito no exponen ninguno.
    const barras = container.querySelectorAll('[class*="barra"]')
    expect(barras).toHaveLength(7)
  })

  /**
   * `aria-hidden`: describirle seis rectángulos grises a quien usa un lector de
   * pantalla no aporta nada; que la navegación está en curso ya lo anuncia el
   * navegador.
   */
  it('no le lee el esqueleto a un lector de pantalla', () => {
    const { container } = render(<Cargando />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('puede prescindir del título cuando la pantalla no lo lleva', () => {
    const { container } = render(<Cargando titulo={false} />)
    expect(container.querySelectorAll('[class*="titulo"]')).toHaveLength(0)
  })
})

/**
 * ⚠️ EL ESQUELETO QUE NO RESERVABA NINGÚN SITIO (27-ago-2026).
 *
 * La primera versión salía como una PANTALLA EN BLANCO, y los tres tests de
 * arriba pasaban en verde igualmente: cuentan elementos, y los siete elementos
 * estaban ahí. Medido en el navegador: 56 px de alto y **CERO de ancho**.
 *
 * La causa: el `<body>` de esta app es `display: flex; flex-direction: column`,
 * y en un contenedor flex un hijo con `margin: 0 auto` deja de estirarse —los
 * márgenes automáticos ganan al `stretch` implícito— y pasa a medir lo que mida
 * su contenido. El contenido de un esqueleto son divs VACÍOS. El mismo
 * `max-width` + `margin: 0 auto` funciona en `/reuniones` porque allí el
 * contenido tiene ancho propio y arrastra la caja.
 *
 * jsdom no calcula layout, así que ningún test de render puede cazar esto. Lo
 * que sí se puede fijar —y es exactamente lo que faltaba— es que la regla esté
 * escrita. Mismo patrón que `escala-proyectada.test.ts`.
 */
describe('el ancho del esqueleto', () => {
  const CSS = readFileSync(join(__dirname, '../componentes/Cargando.module.css'), 'utf8')

  it('declara width: 100%, sin el cual el esqueleto colapsa dentro del body flex', () => {
    const bloque = CSS.slice(CSS.indexOf('.pantalla {'), CSS.indexOf('}', CSS.indexOf('.pantalla {')))
    expect(bloque).toMatch(/width:\s*100%/)
  })

  it('sigue centrado y con su tope de ancho', () => {
    const bloque = CSS.slice(CSS.indexOf('.pantalla {'), CSS.indexOf('}', CSS.indexOf('.pantalla {')))
    expect(bloque).toMatch(/max-width:\s*84rem/)
    expect(bloque).toMatch(/margin:\s*0 auto/)
  })

  it('respeta a quien pidió menos movimiento, como el resto de las hojas', () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})
