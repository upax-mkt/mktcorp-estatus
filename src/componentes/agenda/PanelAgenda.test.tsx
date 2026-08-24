import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelAgenda, type SesionAgendada } from './PanelAgenda'
import type { SalaElegible } from './FormularioSesion'

/**
 * `PanelAgenda` (ronda 10: mudado TAL CUAL desde `/agenda`; RONDA 11, TAREA
 * 4: "Lo que viene" baja del panel lateral de 22rem al flujo, debajo del
 * calendario, con el mismo tratamiento visual que "Por confirmar"/"Falta su
 * minuta"/"Cerradas" en `/reuniones`). Franco, el 6-ago: "en la pestaña
 * Reuniones 'lo que viene' déjalo abajo del calendario al igual que las
 * otras listas, se desarma todo cuando hay muchas".
 *
 * "Próximas" SIGUE viviendo dentro de este componente (aquí es donde vive
 * "editar" una reunión ya agendada — sacarla de aquí habría exigido un
 * componente cliente nuevo solo para conservar esa capacidad, fuera de las
 * dos áreas de esta tarea). Lo que cambió es DE DÓNDE saca la lista: antes
 * la calculaba ella misma filtrando `sesiones`; ahora recibe `idsProximas`
 * YA RESUELTO por `cicloDeReuniones` (`src/app/reuniones/page.tsx`) —así se
 * cierra el solape con "falta su minuta" que probó esa suite— y solo cruza
 * esos ids contra su propio `sesiones` (que sigue recibiendo COMPLETO, sin
 * filtrar: el calendario del mes necesita verlas todas) para pintar cada
 * fila con sus datos completos.
 *
 * A diferencia de `page.test.tsx` (que MOCKEA `PanelAgenda`), aquí se monta
 * de verdad — `Calendario`/`FormularioSesion` incluidos, sin mock — porque
 * es exactamente lo que hace falta probar: que el calendario y "agendar"
 * sigan intactos y que "próximas" aterrice bien alineada a su lado.
 * `next/navigation` sí se mockea (`useRouter`/`usePathname`), igual que ya
 * hace `MinutaCliente.test.tsx`: montarlo de verdad exige un contexto de App
 * Router que Vitest no arma solo.
 *
 * AUDITORÍA UX/UI (ronda 11) — EL HUECO MUERTO: con "Próximas" ya en el
 * flujo (arriba), el `<aside>` que compartía fila con el calendario se quedó
 * con un solo botón y el resto vacío. El arreglo mueve "+ Agendar una
 * reunión" a la cabecera (título/subtítulo incluidos, ahora pintados por
 * este componente — ver su comentario de archivo) y hace que el `<aside>`
 * SOLO exista mientras haya un formulario que mostrar (`agendando`/
 * `editando`, reflejado en `data-activo` sobre `.panel`). Los tests de más
 * abajo que antes comprobaban "el botón vive dentro del `<aside>`" ahora
 * comprueban lo contrario a propósito: en reposo el `<aside>` NI SE MONTA.
 *
 * RONDA 15 (CIERRE DE LA DEUDA B) — LOS FILTROS DEJAN DE FILTRAR AQUÍ
 * ADENTRO. Hasta esta ronda `filtroSala`/`filtroClase` eran `useState` de
 * este componente, y las suites de más abajo comprobaban que elegir una
 * opción angostaba `sesiones`/`proximas` en el propio render. Ahora ese
 * cálculo vive en `page.tsx` (filtra `reuniones` contra `searchParams` antes
 * de construir las props) — este componente solo RECIBE `filtroSala`/
 * `filtroClase` ya resueltos (para el `value` de cada `<select>` y el aviso)
 * y ESCRIBE la URL nueva con `router.replace` al elegir una opción distinta.
 * Por eso las suites de filtro, más abajo, ya no comprueban "elegir X quita Y
 * de la pantalla" (esa lógica se mudó a `page.test.tsx`, sobre
 * `coincideConFiltros`) sino "elegir X llama a `replace` con la URL
 * correcta" y "con `filtroSala`/`filtroClase` ya puestos como prop, el
 * `<select>` y el aviso los reflejan".
 */

const refreshMock = vi.fn()
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, replace: replaceMock }),
  usePathname: () => '/reuniones',
}))

const SALAS: SalaElegible[] = [
  { slug: 'neracode', nombre: 'NeraCode', color: '#101010' },
  { slug: 'mexa-creativa', nombre: 'Mexa Creativa', color: '#c0392b' },
]

// 2026-08-19T18:00:00Z = 2026-08-19 12:00 CDMX, lejos de cualquier frontera de día.
const HOY = '2026-08-19T18:00:00.000Z'

function sesion(datos: Partial<SesionAgendada> & { id: string }): SesionAgendada {
  return {
    fecha: '2026-08-25T18:00:00.000Z',
    titulo: 'Reunión',
    salaSlug: 'neracode',
    salaNombre: 'NeraCode',
    salaColor: '#101010',
    estado: 'agendada',
    alcance: 'todos',
    tipo: 'mensual',
    // `null` por defecto (sin clase) — mismo default honesto que `lugar`,
    // dos líneas abajo: la mayoría de los tests de este archivo no le
    // importa la clase de la junta, así que no inventan una.
    plantilla: null,
    lugar: null,
    participantes: [],
    itemsLlenados: 0,
    totalItems: 0,
    ...datos,
  }
}

function acciones() {
  return {
    agendarAction: vi.fn().mockResolvedValue({}),
    editarAction: vi.fn().mockResolvedValue({}),
  }
}

beforeEach(() => {
  refreshMock.mockReset()
  replaceMock.mockReset()
})

describe('PanelAgenda — "agendar" vive en la cabecera (auditoría UX/UI, arreglo del hueco muerto)', () => {
  /**
   * REESCRITO (ronda 14.4, tarea 1 — segunda vuelta sobre el hueco muerto).
   * La ronda 11 cerraba el hueco NO montando el `<aside>` en reposo; el
   * informe de esta tarea midió que eso abrió uno nuevo (~408px muertos a
   * 1440px, sin nada). El arreglo es el contrario: el `<aside>` AHORA
   * SIEMPRE se monta —en reposo, con filtros + leyenda, nunca vacío—. Ver el
   * comentario de archivo de `PanelAgenda.tsx`.
   */
  /**
   * EN REPOSO NO HAY COLUMNA LATERAL (24-ago-2026). Antes el `<aside>` se
   * pintaba SIEMPRE —con filtros y leyenda dentro— para que la fila del
   * calendario no quedara coja; eso es lo que dejaba 517 px de hueco a su
   * derecha (medido en la ronda 16, "arreglado" entonces dándole fondo
   * blanco al vacío). Los filtros viven ahora en su propia barra, arriba, y
   * la leyenda se retiró: cada evento del calendario ya lleva escrito el
   * nombre de su sala.
   */
  it('sin nada agendando: el botón en la cabecera, los filtros en su barra, y NINGUNA columna lateral vacía', () => {
    const { container } = render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />,
    )

    expect(screen.getByRole('heading', { name: 'Reuniones', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Agendar una reunión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por sala')).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por clase')).toBeInTheDocument()
    // Ni aside ni leyenda: el calendario ocupa el ancho entero.
    expect(container.querySelector('aside')).toBeNull()
    expect(screen.queryByText('Leyenda')).not.toBeInTheDocument()
  })

  /**
   * ⚠️ LOS FILTROS NO DESAPARECEN AL AGENDAR, y por eso el suyo se llama
   * "Filtrar por sala": convive en pantalla con el campo "Sala" DEL
   * FORMULARIO, y son cosas distintas —uno acota lo que se ve, el otro decide
   * de quién es la reunión que se está creando—. Antes no colisionaban porque
   * el formulario los tapaba; ahora hay que distinguirlos por su nombre.
   */
  it('al agendar, el formulario aparece con sus campos reales y los filtros siguen en su sitio', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />,
    )

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    expect(screen.getByRole('heading', { name: 'Agendar una reunión' })).toBeInTheDocument()
    // El campo del FORMULARIO —"Sala"— y el FILTRO —"Filtrar por sala"— son
    // dos controles distintos que ahora conviven.
    expect(screen.getByLabelText('Sala')).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por sala')).toBeInTheDocument()
    expect(screen.getByLabelText('Día')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agendar' })).toBeInTheDocument()
    // Y ahora sí hay columna lateral: es donde vive el formulario.
    expect(container.querySelector('aside')).not.toBeNull()
  })

  it('agendar sigue alcanzable con MUCHAS reuniones en "Próximas" (el botón, en la cabecera, no depende del tamaño de la lista)', async () => {
    const muchas = Array.from({ length: 60 }, (_, i) => sesion({
      id: `vol-${i}`, titulo: `Reunión de volumen ${i}`,
      fecha: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T18:00:00.000Z`,
    }))
    const usuario = userEvent.setup()
    render(
      <PanelAgenda
        sesiones={muchas}
        salas={SALAS}
        hoy={HOY}
        idsProximas={muchas.map((s) => s.id)}
        {...acciones()}
      />,
    )

    const boton = screen.getByRole('button', { name: '+ Agendar una reunión' })
    await usuario.click(boton)
    expect(screen.getByRole('heading', { name: 'Agendar una reunión' })).toBeInTheDocument()
  })
})

describe('PanelAgenda — "Próximas" bajó del panel lateral al flujo, debajo del calendario', () => {
  /**
   * GUARDIA I6 (revisión C1): "Próximas" es uno de los CUATRO módulos que
   * Franco cerró (6-ago: "en la pestaña Reuniones ahí debe vivir el módulo
   * Se dieron pero falta su minuta, reuniones cerradas, reuniones
   * pendientes..." + la costumbre de fundir módulos que este repo ya pagó
   * antes) — su encabezado tiene que ser un `<h2>` REAL, no solo un texto
   * cualquiera. `page.test.tsx` MOCKEA `PanelAgenda` entero (Client
   * Component con `useRouter()`, ver su comentario de archivo), así que no
   * puede vigilar esto de verdad: hasta esta revisión el mock ahí fabricaba
   * un `<h2>Próximas</h2>` fijo que se auto-validaba —se borró el
   * encabezado real y los 34 tests de esa suite siguieron en verde—. ESTE
   * test SÍ monta el componente real (sin mock de `PanelAgenda` — solo
   * `next/navigation`, arriba) y es el único guardia contra fundir o
   * renombrar "Próximas" con role="heading" de verdad.
   *
   * COMPROBADO ROMPIÉNDOLO (como pide la revisión): con
   * `<h2 className={estilosCiclo.cicloTitulo}>` cambiado a un `<p>` a mano
   * en `PanelAgenda.tsx`, `npx vitest run` tumbó ESTE test (y solo este,
   * más los que ya usaban `getByText('Próximas')` para navegar al
   * `<section>` — ver el resto de este describe) — restaurado después.
   */
  it('GUARDIA I6: "Próximas" tiene un encabezado real, con role="heading" — no solo un texto', () => {
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    // Regex, no la cadena exacta: el `<h2>` lleva el conteo pegado adentro
    // (`<span>{proximas.length}</span>`), así que su nombre accesible es
    // "Próximas 0", no "Próximas" a secas — mismo criterio que ya usa el
    // guardia original de los cuatro módulos en `page.test.tsx`.
    expect(screen.getByRole('heading', { name: /próximas/i, level: 2 })).toBeInTheDocument()
  })

  it('la sección "Próximas" NO está dentro del <aside> (ya no es un panel lateral) — ni siquiera con el formulario abierto', async () => {
    const usuario = userEvent.setup()
    const s = sesion({ id: 's1', titulo: 'Estatus de septiembre' })
    const { container } = render(
      <PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={['s1']} {...acciones()} />,
    )

    // El <aside> es condicional desde el arreglo del hueco muerto (auditoría
    // UX/UI): sin abrir el formulario no existe, así que la pregunta de este
    // test ("¿'Próximas' está dentro?") no se puede hacer todavía — se abre
    // a propósito para que la comprobación sea real.
    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    const aside = container.querySelector('aside')!
    expect(aside).not.toBeNull()
    const encabezadoProximas = screen.getByText('Próximas')
    expect(aside.contains(encabezadoProximas)).toBe(false)
  })

  it('"Próximas" aparece DESPUÉS del calendario en el orden del documento (debajo, no al lado)', () => {
    const s = sesion({ id: 's1', titulo: 'Estatus de septiembre' })
    render(<PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={['s1']} {...acciones()} />)

    const rejillaCalendario = screen.getByRole('grid')
    const encabezadoProximas = screen.getByText('Próximas')
    const posicion = rejillaCalendario.compareDocumentPosition(encabezadoProximas)
    expect(Boolean(posicion & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('el contador junto a "Próximas" refleja idsProximas.length', () => {
    const s1 = sesion({ id: 's1', titulo: 'Uno' })
    const s2 = sesion({ id: 's2', titulo: 'Dos', fecha: '2026-08-26T18:00:00.000Z' })
    render(
      <PanelAgenda sesiones={[s1, s2]} salas={SALAS} hoy={HOY} idsProximas={['s1', 's2']} {...acciones()} />,
    )

    const seccion = screen.getByText('Próximas').closest('section')!
    expect(within(seccion).getByText('2')).toBeInTheDocument()
  })
})

describe('PanelAgenda — nada se pierde: idsProximas se cruza contra sesiones, con datos completos y en el orden dado', () => {
  it('pinta título, sala, fecha/hora y el enlace "Preparar →" de cada reunión en idsProximas', () => {
    const s = sesion({
      id: 's1', titulo: 'Estatus de agosto', salaSlug: 'mexa-creativa', salaNombre: 'Mexa Creativa',
      salaColor: '#c0392b', fecha: '2026-08-25T18:00:00.000Z', lugar: 'Sala 4',
    })
    render(<PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={['s1']} {...acciones()} />)

    const seccion = screen.getByText('Próximas').closest('section')!
    expect(within(seccion).getByText('Estatus de agosto')).toBeInTheDocument()
    expect(within(seccion).getByText('Mexa Creativa')).toBeInTheDocument()
    expect(within(seccion).getByText(/25 de agosto de 2026/)).toBeInTheDocument()
    expect(within(seccion).getByText(/Sala 4/)).toBeInTheDocument()
    const link = within(seccion).getByText('Preparar →').closest('a')
    expect(link).toHaveAttribute('href', '/deck/s1')
  })

  /**
   * CUMPLIMIENTO (revisión C1, ronda 14.4 tarea 1): "Próximas" era 3 de las
   * 4 tarjetas de 14 sin clase de junta pintada (la cuarta, "Por confirmar",
   * se prueba en `ReunionesPorConfirmar.test.tsx`) — las otras diez
   * secciones (Falta su minuta/Cerradas, `page.test.tsx`) ya la pintaban.
   * Las dos reuniones a la vez, no cada una por separado: un arreglo a
   * medias podría aprobar "sí pinta la clase" con una junta clasificada y
   * fallar silenciosamente con `null` (mismo criterio que el test gemelo de
   * `page.test.tsx`, "una reunión sin clase lo dice…").
   */
  it('CUMPLIMIENTO: cada tarjeta de "Próximas" dice también su clase de junta, y una sin clase dice "Sin clasificar" (nunca la primera del catálogo)', () => {
    const clasificada = sesion({
      id: 's1', titulo: 'Sync semanal', plantilla: 'sync-comercial', fecha: '2026-08-25T18:00:00.000Z',
    })
    const sinClase = sesion({ id: 's2', titulo: 'Standup rápido', plantilla: null, fecha: '2026-08-26T18:00:00.000Z' })
    render(
      <PanelAgenda sesiones={[clasificada, sinClase]} salas={SALAS} hoy={HOY} idsProximas={['s1', 's2']} {...acciones()} />,
    )

    const seccion = screen.getByText('Próximas').closest('section')!
    expect(within(seccion).getByText(/sync comercial/i)).toBeInTheDocument()
    expect(within(seccion).getByText(/sin clasificar/i)).toBeInTheDocument()
    expect(within(seccion).queryByText(/estatus de udn/i)).toBeNull()
  })

  it('con avance de secciones (totalItems > 0), lo muestra; sin avance, no pinta esa línea', () => {
    const conAvance = sesion({ id: 's1', titulo: 'Con avance', itemsLlenados: 2, totalItems: 5 })
    const sinAvance = sesion({ id: 's2', titulo: 'Sin avance', fecha: '2026-08-26T18:00:00.000Z' })
    render(
      <PanelAgenda
        sesiones={[conAvance, sinAvance]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={['s1', 's2']}
        {...acciones()}
      />,
    )

    expect(screen.getByText('2 de 5 secciones escritas')).toBeInTheDocument()
  })

  it('respeta el ORDEN de idsProximas tal cual llega (no reordena ni deduplica por su cuenta)', () => {
    // A propósito en un orden que NO coincide con el de `sesiones` ni con un
    // orden alfabético/por fecha "natural": si PanelAgenda reordenara o
    // recalculara por su cuenta, este test lo delataría.
    const a = sesion({ id: 'a', titulo: 'Reunión A', fecha: '2026-08-20T18:00:00.000Z' })
    const b = sesion({ id: 'b', titulo: 'Reunión B', fecha: '2026-08-30T18:00:00.000Z' })
    const c = sesion({ id: 'c', titulo: 'Reunión C', fecha: '2026-08-25T18:00:00.000Z' })

    render(
      <PanelAgenda sesiones={[a, b, c]} salas={SALAS} hoy={HOY} idsProximas={['b', 'a', 'c']} {...acciones()} />,
    )

    const seccion = screen.getByText('Próximas').closest('section')!
    const titulos = within(seccion).getAllByText(/^Reunión [ABC]$/).map((el) => el.textContent)
    expect(titulos).toEqual(['Reunión B', 'Reunión A', 'Reunión C'])
  })

  it('un id en idsProximas que no está en sesiones no revienta (defensivo, no debería pasar en producción)', () => {
    const s = sesion({ id: 's1', titulo: 'Sí existe' })
    render(
      <PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={['fantasma', 's1']} {...acciones()} />,
    )

    const seccion = screen.getByText('Próximas').closest('section')!
    expect(within(seccion).getByText('Sí existe')).toBeInTheDocument()
    expect(within(seccion).getByText('1')).toBeInTheDocument() // el fantasma no cuenta
  })

  it('sin reuniones próximas, muestra el vacío explícito de siempre — no una sección en blanco', () => {
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    expect(screen.getByText('Próximas')).toBeInTheDocument()
    expect(screen.getByText(/No hay ninguna reunión agendada/)).toBeInTheDocument()
  })

  it('AGUANTA VOLUMEN: 60 reuniones próximas se pintan todas, sin reventar (brief §2, Step 2)', () => {
    const muchas = Array.from({ length: 60 }, (_, i) => sesion({
      id: `vol-${i}`, titulo: `Reunión de volumen ${i}`,
      fecha: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T18:00:00.000Z`,
    }))
    render(
      <PanelAgenda
        sesiones={muchas}
        salas={SALAS}
        hoy={HOY}
        idsProximas={muchas.map((s) => s.id)}
        {...acciones()}
      />,
    )

    const seccion = screen.getByText('Próximas').closest('section')!
    expect(within(seccion).getAllByText(/^Reunión de volumen \d+$/)).toHaveLength(60)
    expect(within(seccion).getByText('60')).toBeInTheDocument()
  })
})

describe('PanelAgenda — "Editar" sigue funcionando desde "Próximas" tras la mudanza', () => {
  it('clic en "Editar" abre el formulario de corrección, prellenado con los datos de ESA fila', async () => {
    const usuario = userEvent.setup()
    const s = sesion({
      id: 's1', titulo: 'Estatus a corregir', salaSlug: 'mexa-creativa',
      fecha: '2026-08-25T16:00:00.000Z', tipo: 'quincenal', alcance: 'squad growth',
    })
    render(<PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={['s1']} {...acciones()} />)

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('heading', { name: 'Corregir la reunión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Estatus a corregir')
    // El campo del FORMULARIO, no el filtro de la barra (que se llama
    // "Filtrar por sala" justo para que no se confundan).
    expect(screen.getByLabelText('Sala')).toHaveValue('mexa-creativa')
    expect(screen.getByLabelText('Tipo de reunión')).toHaveValue('quincenal')
  })

  it('guardar cambios llama a editarAction(id, datos) con el id de la fila correcta', async () => {
    const usuario = userEvent.setup()
    const s = sesion({ id: 's1', titulo: 'Estatus a corregir' })
    const { editarAction, agendarAction } = acciones()
    render(
      <PanelAgenda
        sesiones={[s]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={['s1']}
        agendarAction={agendarAction}
        editarAction={editarAction}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(editarAction).toHaveBeenCalledExactlyOnceWith('s1', expect.objectContaining({ titulo: 'Estatus a corregir' }))
    expect(agendarAction).not.toHaveBeenCalled()
  })

  /**
   * CRÍTICO C2 (ronda 14-2, fix 3/4) — YA CORREGIDO, este test es su
   * regresión. `SesionAgendada` (`PanelAgenda.tsx`) SÍ declara `plantilla:
   * string | null`, y el `inicial={{...}}` que arma la edición (en el propio
   * `PanelAgenda`) SÍ la incluye — así que `plantillaInicial()`
   * (`FormularioSesion.tsx`), que distingue "vino la clave" de "no vino" con
   * el operador `in`, ve la clave puesta y arranca en la clase real de la
   * reunión, no en `PLANTILLA_POR_DEFECTO` ('estatus-udn') por defecto.
   *
   * `sesion(...)` (el helper de arriba) ya construye un `SesionAgendada` con
   * `plantilla` incluida de fábrica (`plantilla: null` por defecto, línea
   * ~71) — sin cast: es un campo más del tipo, no un añadido por fuera.
   */
  it('CRÍTICO C2: al editar una junta YA clasificada, el formulario arranca en su clase real, no en "Estatus de UDN" por defecto', async () => {
    const usuario = userEvent.setup()
    const s = sesion({ id: 's1', titulo: 'Sync mensual', plantilla: 'sync-comercial' })
    render(<PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={['s1']} {...acciones()} />)

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText(/qué junta es/i)).toHaveValue('sync-comercial')
  })

  /**
   * COSTURA COMPLETA, mitad UI (el resto vive en `src/db/reuniones.test.ts`,
   * describe "editarReunion", test "COSTURA COMPLETA"): una junta SIN clase
   * (`plantilla: null`, como las 6 reuniones reales sin clasificar) a la que
   * solo se le corrige OTRO campo —aquí, el lugar— no debe mandar una clase
   * inventada a `editarAction`. Antes del arreglo de C2 esto manda
   * `'estatus-udn'` (el `<select>` cae al default del catálogo, igual que el
   * test de arriba); después, `''` — que es como esta pantalla representa
   * "sin clase" hasta que `editarReunionAction` (`src/app/reuniones/
   * acciones.ts`, ya arreglado y sin tocar en esta tarea) la traduce a
   * `null` antes de escribirla. Mismo test, en espíritu, que ya tiene
   * `FormularioSesion.test.tsx` ("editar otro campo de una junta sin clase no
   * la clasifica de rebote") — aquí se repite un nivel más arriba, con el
   * `inicial` de verdad que arma `PanelAgenda`, no uno escrito a mano.
   */
  it('COSTURA: editar SOLO el lugar de una junta sin clase no la clasifica de rebote (a través de PanelAgenda, no solo de FormularioSesion)', async () => {
    const usuario = userEvent.setup()
    const { editarAction, agendarAction } = acciones()
    const s = sesion({ id: 's1', titulo: 'Sin clasificar', lugar: '', plantilla: null })
    render(
      <PanelAgenda
        sesiones={[s]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={['s1']}
        agendarAction={agendarAction}
        editarAction={editarAction}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByLabelText(/qué junta es/i)).toHaveValue('')

    await usuario.type(screen.getByLabelText(/dónde/i), 'Sala 4')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(editarAction).toHaveBeenCalledExactlyOnceWith(
      's1',
      expect.objectContaining({ lugar: 'Sala 4', plantilla: '' }),
    )
  })

  it('editar una fila de "Próximas" con muchas reuniones en la lista sigue encontrando la fila correcta, no la primera', async () => {
    const usuario = userEvent.setup()
    const muchas = Array.from({ length: 10 }, (_, i) => sesion({
      id: `vol-${i}`, titulo: `Reunión de volumen ${i}`,
      fecha: `2026-09-${String(i + 1).padStart(2, '0')}T18:00:00.000Z`,
    }))
    const { editarAction } = acciones()
    render(
      <PanelAgenda
        sesiones={muchas}
        salas={SALAS}
        hoy={HOY}
        idsProximas={muchas.map((s) => s.id)}
        agendarAction={vi.fn()}
        editarAction={editarAction}
      />,
    )

    const filaObjetivo = screen.getByText('Reunión de volumen 7').closest('div')!
    await usuario.click(within(filaObjetivo).getByRole('button', { name: 'Editar' }))
    expect(screen.getByLabelText('Título')).toHaveValue('Reunión de volumen 7')

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(editarAction).toHaveBeenCalledExactlyOnceWith('vol-7', expect.anything())
  })
})

/**
 * EL HUECO DEL CALENDARIO — FILTROS Y LEYENDA (ronda 14.4, tarea 1;
 * REESCRITO en la ronda 15, cierre de la deuda B).
 *
 * EL FILTRO YA NO FILTRA AQUÍ ADENTRO. Hasta la ronda 15 `filtroSala`/
 * `filtroClase` eran `useState` de este componente, y elegir una opción
 * angostaba `sesiones`/`proximas` en el mismo render — de ahí salían tests
 * como "filtrar por sala deja 'Próximas' solo con esa sala". Ahora el
 * filtro sube a `searchParams`: `page.tsx` es quien filtra `reuniones`
 * (`coincideConFiltros`, probado en `page.test.tsx`) y le pasa a este
 * componente `sesiones` YA FILTRADA más `filtroSala`/`filtroClase` YA
 * RESUELTOS. El trabajo de ESTE componente se reduce a dos cosas, y son las
 * que prueba esta suite:
 *   1. Elegir una opción llama a `router.replace` con la URL correcta —no
 *      cambia lo que se ve en el propio render (`sesiones` no cambia: viene
 *      fija por prop, el mock de `next/navigation` no navega de verdad).
 *   2. Con `filtroSala`/`filtroClase` ya puestos como prop (simulando que la
 *      URL ya trae un filtro), el `<select>` correspondiente y el aviso de
 *      "filtro activo" lo reflejan.
 */
describe('PanelAgenda — los filtros de la barra (ronda 15; mudados arriba el 24-ago-2026)', () => {
  /**
   * La leyenda de nueve puntos se retiró: existía "para leer el filo de color
   * de las tarjetas", y ese filo ya no está (era una franja lateral que ni
   * siquiera distinguía a las dos salas negras). En el calendario, cada
   * reunión lleva el nombre de su sala escrito — que es lo que la leyenda
   * venía a traducir.
   */
  it('cada reunión del calendario dice de qué sala es, sin necesidad de una leyenda que lo traduzca', () => {
    const s = sesion({ id: 's1', titulo: 'Estatus', salaSlug: 'mexa-creativa', fecha: '2026-08-18T16:00:00.000Z' })
    render(<PanelAgenda sesiones={[s]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    expect(screen.queryByText('Leyenda')).not.toBeInTheDocument()
    expect(screen.getAllByText('Mexa Creativa').length).toBeGreaterThan(0)
  })

  it('elegir una sala en el filtro navega (router.replace) a la misma ruta con "?sala=<slug>"', async () => {
    const usuario = userEvent.setup()
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    await usuario.selectOptions(screen.getByLabelText('Filtrar por sala'), 'mexa-creativa')

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/reuniones?sala=mexa-creativa', { scroll: false })
  })

  it('"Sin sala" está entre las opciones del filtro de sala, y elegirla navega con "?sala=sin-sala"', async () => {
    const usuario = userEvent.setup()
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    expect(within(screen.getByLabelText('Filtrar por sala')).getByRole('option', { name: 'Sin sala' })).toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Filtrar por sala'), 'Sin sala')

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/reuniones?sala=sin-sala', { scroll: false })
  })

  it('elegir una clase navega con "?clase=<id>", conservando la sala si ya había una elegida', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} filtroSala="neracode" {...acciones()} />,
    )

    await usuario.selectOptions(screen.getByLabelText('Filtrar por clase'), 'Sync Comercial')

    // Los DOS ejes en la URL nueva —no solo el que cambió—: `irAFiltro`
    // recibe siempre los dos valores completos (ver su comentario en
    // `PanelAgenda.tsx`), así que la sala que ya estaba puesta sobrevive al
    // cambio de clase.
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/reuniones?sala=neracode&clase=sync-comercial', { scroll: false })
  })

  it('elegir "Sin clasificar" navega con "?clase=sin-clasificar"', async () => {
    const usuario = userEvent.setup()
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    await usuario.selectOptions(screen.getByLabelText('Filtrar por clase'), 'Sin clasificar')

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/reuniones?clase=sin-clasificar', { scroll: false })
  })

  it('volver a "Todas las salas" navega SIN el parámetro "sala" en la URL', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} filtroSala="neracode" {...acciones()} />,
    )

    await usuario.selectOptions(screen.getByLabelText('Filtrar por sala'), 'Todas las salas')

    // Sin `?`: `irAFiltro` no arma una URL con un `URLSearchParams` vacío
    // colgando — vuelve a la ruta desnuda.
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/reuniones', { scroll: false })
  })

  it('con "filtroSala"/"filtroClase" puestos como prop, los <select> arrancan en ese valor', () => {
    render(
      <PanelAgenda
        sesiones={[]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={[]}
        filtroSala="mexa-creativa"
        filtroClase="sync-comercial"
        {...acciones()}
      />,
    )

    expect(screen.getByLabelText('Filtrar por sala')).toHaveValue('mexa-creativa')
    expect(screen.getByLabelText('Filtrar por clase')).toHaveValue('sync-comercial')
  })

  it('los filtros no le llegan a "Por confirmar"/"Falta su minuta"/"Cerradas" por su cuenta: este componente solo las coloca donde `page.tsx` se las manda', () => {
    // Guardia de diseño, no de comportamiento: sin `entreCalendarioYProximas`/
    // `despuesDeProximas`, este componente no inventa esas tres secciones —
    // el filtrado de sus datos (`coincideConFiltros`) vive en `page.tsx`,
    // antes de que exista ningún JSX que pasarle. Ver `page.test.tsx` para el
    // guardia de que SÍ llegan ya filtradas cuando `page.tsx` las arma.
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    expect(screen.queryByText('Por confirmar')).not.toBeInTheDocument()
    expect(screen.queryByText('Se dieron, falta su minuta')).not.toBeInTheDocument()
    expect(screen.queryByText('Cerradas')).not.toBeInTheDocument()
  })

  /**
   * EL AVISO DE FILTRO ACTIVO (revisión C1, hallazgo I3 — SIGUE VIVO tras la
   * ronda 15): con un filtro puesto (ahora, vía prop —simulando la URL—, no
   * `useState`), abrir "+ Agendar una reunión" sustituye Filtros/Leyenda por
   * el formulario — los `<select>` (y su valor elegido) dejan de estar a la
   * vista, pero el filtro de la URL sigue aplicado. Ver el comentario de
   * `hayFiltroActivo` en `PanelAgenda.tsx` para el porqué el aviso sigue
   * haciendo falta (y vale para MÁS pantalla que antes, no para menos).
   */
  it('sin filtro activo, abrir el formulario NO pinta ningún aviso — no hay nada que avisar', async () => {
    const usuario = userEvent.setup()
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    expect(screen.queryByText(/filtro activo/i)).not.toBeInTheDocument()
  })

  it('con un filtro activo, EN REPOSO tampoco pinta el aviso — los propios <select> ya muestran su valor', () => {
    render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} filtroSala="neracode" {...acciones()} />,
    )

    expect(screen.queryByText(/filtro activo/i)).not.toBeInTheDocument()
  })

  it('con un filtro de sala activo (prop), abrir el formulario SÍ pinta el aviso, nombrando la sala', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} filtroSala="mexa-creativa" {...acciones()} />,
    )

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    // El aviso mismo, no `screen` a secas: con el formulario abierto, SU
    // PROPIO `<select>` "Sala" también ofrece "Mexa Creativa" como opción —
    // `getByText` a nivel de documento encontraría las dos.
    expect(screen.getByText(/filtro activo/i)).toHaveTextContent(/mexa creativa/i)
  })

  it('con filtro de sala Y de clase activos a la vez (props), el aviso nombra las dos', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelAgenda
        sesiones={[]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={[]}
        filtroSala="neracode"
        filtroClase="sin-clasificar"
        {...acciones()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    const aviso = screen.getByText(/filtro activo/i)
    expect(aviso).toHaveTextContent(/neracode/i)
    expect(aviso).toHaveTextContent(/sin clasificar/i)
  })

  it('con el filtro de sala en "Sin sala" (prop), el aviso dice "Sin sala", no el marcador crudo', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} filtroSala="sin-sala" {...acciones()} />,
    )

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    expect(screen.getByText(/filtro activo/i)).toHaveTextContent(/sin sala/i)
  })

  it('al cerrar el formulario con un filtro activo (prop), el aviso desaparece junto con él (los <select> vuelven a estar a la vista)', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} filtroSala="neracode" {...acciones()} />,
    )

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))
    expect(screen.getByText(/filtro activo/i)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText(/filtro activo/i)).not.toBeInTheDocument()
  })
})

/**
 * "ENTRE CALENDARIO Y PRÓXIMAS" / "DESPUÉS DE PRÓXIMAS" — EL ORDEN DEL DOM,
 * NO DE CSS (ronda 15, cierre de la deuda B). `page.tsx` deja de reordenar
 * "Por confirmar"/"Falta su minuta"/"Cerradas" con `order` de CSS y en su
 * lugar se las pasa a este componente como JSX ya armado; este componente
 * las coloca físicamente en su propio `return` — ver el comentario de esas
 * dos props (`Props`, en `PanelAgenda.tsx`) para el porqué.
 */
describe('PanelAgenda — entreCalendarioYProximas / despuesDeProximas: el orden del trabajo, en el DOM (ronda 15)', () => {
  it('"entreCalendarioYProximas" aparece DESPUÉS del calendario y ANTES de "Próximas" en el orden del documento', () => {
    render(
      <PanelAgenda
        sesiones={[]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={[]}
        entreCalendarioYProximas={<p data-testid="marcador-entre">Por confirmar (stub)</p>}
        {...acciones()}
      />,
    )

    const rejillaCalendario = screen.getByRole('grid')
    const marcador = screen.getByTestId('marcador-entre')
    const encabezadoProximas = screen.getByRole('heading', { name: /próximas/i, level: 2 })

    expect(Boolean(rejillaCalendario.compareDocumentPosition(marcador) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(Boolean(marcador.compareDocumentPosition(encabezadoProximas) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('"despuesDeProximas" aparece DESPUÉS de "Próximas" en el orden del documento', () => {
    render(
      <PanelAgenda
        sesiones={[]}
        salas={SALAS}
        hoy={HOY}
        idsProximas={[]}
        despuesDeProximas={<p data-testid="marcador-despues">Cerradas (stub)</p>}
        {...acciones()}
      />,
    )

    const encabezadoProximas = screen.getByRole('heading', { name: /próximas/i, level: 2 })
    const marcador = screen.getByTestId('marcador-despues')

    expect(Boolean(encabezadoProximas.compareDocumentPosition(marcador) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('sin las dos props, no se pinta nada de más — el resto del componente queda exactamente igual', () => {
    render(<PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />)

    expect(screen.getByRole('heading', { name: /próximas/i, level: 2 })).toBeInTheDocument()
  })
})
