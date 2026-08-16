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
 * `next/navigation` sí se mockea (`useRouter`), igual que ya hace
 * `MinutaCliente.test.tsx`: montarlo de verdad exige un contexto de App
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
 */

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
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
})

describe('PanelAgenda — "agendar" vive en la cabecera (auditoría UX/UI, arreglo del hueco muerto)', () => {
  it('sin nada agendando, "+ Agendar una reunión" está en la cabecera junto al título — y el <aside> del calendario ni se monta (ahí vivía el hueco)', () => {
    const { container } = render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />,
    )

    expect(screen.getByRole('heading', { name: 'Reuniones', level: 1 })).toBeInTheDocument()
    const boton = screen.getByRole('button', { name: '+ Agendar una reunión' })
    expect(boton).toBeInTheDocument()
    // Antes vivía DENTRO del <aside>, junto al calendario (brief, ambigüedad
    // 1, ronda 11 tarea 4). Ese <aside>, una vez que "Próximas" bajó al
    // flujo, se quedaba con ese único botón y el resto vacío — el hueco
    // muerto que encontró la auditoría UX/UI. Subir el botón a la cabecera
    // solo tapa el síntoma si el <aside> además deja de montarse en reposo:
    // por eso ninguno de los dos existe aquí, no solo el botón se movió.
    expect(container.querySelector('aside')).toBeNull()
    expect(container.querySelector('[data-activo]')).toBeNull()
  })

  it('al hacer clic en "+ Agendar una reunión", el formulario aparece con sus campos reales (FormularioSesion sin mockear), y el <aside> vuelve —ahora con algo que mostrar—', async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <PanelAgenda sesiones={[]} salas={SALAS} hoy={HOY} idsProximas={[]} {...acciones()} />,
    )

    await usuario.click(screen.getByRole('button', { name: '+ Agendar una reunión' }))

    expect(screen.getByRole('heading', { name: 'Agendar una reunión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Sala')).toBeInTheDocument()
    expect(screen.getByLabelText('Día')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agendar' })).toBeInTheDocument()
    expect(container.querySelector('aside')).not.toBeNull()
    expect(container.querySelector('[data-activo="true"]')).not.toBeNull()
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
   * CRÍTICO C2 (ronda 14-2, fix 3/4). `SesionAgendada` (arriba en este mismo
   * archivo) NO DECLARA `plantilla`, y el `inicial={{...}}` que arma la
   * edición (más abajo, en el propio `PanelAgenda`) tampoco la incluye — así
   * que `plantillaInicial()` (`FormularioSesion.tsx`), que distingue "vino la
   * clave" de "no vino" con el operador `in`, nunca ve la clave puesta y cae
   * SIEMPRE a `PLANTILLA_POR_DEFECTO` ('estatus-udn'), sea cual sea la clase
   * real de la reunión. La sala/día/hora/tipo SÍ llegan bien (ver el test de
   * arriba, "clic en 'Editar' abre el formulario... prellenado"): esto no es
   * un fallo del cableado en general, es específico de `plantilla`.
   *
   * `sesion(...)` (el helper de arriba) construye un `SesionAgendada` — el
   * tipo real, sin `plantilla` todavía — así que el campo se añade por fuera
   * con un cast: es exactamente la forma real que trae `ReunionResumen`
   * (`src/db/reuniones.ts`, que SÍ declara `plantilla` desde la tarea 3) una
   * vez que `page.tsx`/`PanelAgenda.tsx` terminen de cargarla hasta aquí —
   * el cast no inventa nada que el arreglo no vaya a producir de verdad.
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
