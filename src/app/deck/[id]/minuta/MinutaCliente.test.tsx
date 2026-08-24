import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MinutaCliente } from './MinutaCliente'
import type { AcuerdoConfirmado } from '@/db/minutas'

/**
 * EL BUG (ronda 11, tarea 1), con las palabras de Franco: "la minuta detecta
 * perfectamente los acuerdos pero una vez generada, abajo aparecen todos los
 * acuerdos detectados y cuando quito uno la minuta no se modifica y está
 * mal". Estas pruebas cubren los cuatro puntos que resultaron ser el mismo
 * problema: sin forma de corregir la minuta salvo repetirlo todo.
 *
 * `next/navigation` se mockea porque `useRouter()` exige un contexto de App
 * Router que Vitest no arma solo (mismo motivo documentado en
 * src/app/reuniones/page.test.tsx). `./acciones` se mockea porque
 * MinutaCliente llama a los Server Actions como funciones importadas
 * directamente (no como props) — se prueba SOLO el cableado del cliente; la
 * guarda de permiso de esas acciones ya tiene su propia cobertura en
 * acciones.test.ts.
 *
 * `ListaOrdenable` (dnd-kit) se mockea porque un arrastre de verdad necesita
 * geometría (`getBoundingClientRect`) que jsdom no calcula — eso es
 * responsabilidad de ListaOrdenable, que se reusa TAL CUAL y no se reescribe
 * ni se prueba de nuevo aquí. El mock expone un botón que invoca
 * `reordenarAction` con el orden invertido, para probar el CABLEADO de
 * MinutaCliente (que reordenar de verdad cambie la tabla y lo que se
 * publica), no la mecánica interna de dnd-kit.
 */

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

const generarMinutaActionMock = vi.fn()
const publicarMinutaActionMock = vi.fn()
vi.mock('./acciones', () => ({
  generarMinutaAction: (...args: unknown[]) => generarMinutaActionMock(...args),
  publicarMinutaAction: (...args: unknown[]) => publicarMinutaActionMock(...args),
}))

vi.mock('@/componentes/ListaOrdenable', () => ({
  ListaOrdenable: (
    { ids, children, reordenarAction }: {
      ids: string[]
      children: ReactNode[]
      reordenarAction: (idsEnOrden: string[]) => Promise<void>
    },
  ) => (
    <div data-testid="lista-ordenable">
      <button type="button" onClick={() => { void reordenarAction([...ids].reverse()) }}>
        invertir orden (prueba)
      </button>
      {ids.map((id, i) => <div key={id}>{children[i]}</div>)}
    </div>
  ),
}))

const MOLDE_PRUEBA = {
  saludo: 'Hola, equipo:',
  entradilla: 'Les comparto la minuta de {reunion} correspondiente a {fecha}.',
  bloques: [
    { titulo: 'Objetivo de la reunión', guia: '' },
    { titulo: 'Acuerdos y accionables', guia: '', conTabla: true },
    { titulo: 'Próximos pasos', guia: '' },
  ],
  cierre: 'Saludos.',
  conEnlace: true,
}

const ACUERDO_1 = { que: 'Cerrar el brief con Iris', responsable: 'Iris Gómez', prioridad: 'alta', fechaCompromiso: '2026-08-10' }
const ACUERDO_2 = { que: 'Mandar la propuesta a Zeus', responsable: 'por asignar', prioridad: 'media', fechaCompromiso: null }

function respuestaOk(
  bloques = ['El objetivo de la junta.', 'Lo que sigue.'],
  // `AcuerdoConfirmado[]`, NO `typeof ACUERDO_1[]`: `ACUERDO_1` trae una
  // fecha, así que TypeScript infiere `fechaCompromiso: string` a secas — un
  // tipo más angosto que el real. El contrato de verdad (`EsquemaAcuerdoPropuesto`
  // en src/minuta/esquema.ts, vía `FechaCompromiso = z.string()...nullable()`)
  // es `string | null`, que es justo lo que trae `ACUERDO_2`. El error era del
  // test, no del tipo de producción: se corrige aquí.
  acuerdosPropuestos: AcuerdoConfirmado[] = [ACUERDO_1, ACUERDO_2],
) {
  return {
    ok: true,
    textoCorreo: 'texto ya ensamblado por el servidor (no lo usa el cliente para pintar: rearma el suyo)',
    bloques,
    acuerdosPropuestos,
    insumosCorreo: {
      salaSlug: 'neracode',
      molde: MOLDE_PRUEBA,
      reunionId: 'reu-1',
      contexto: { reunion: 'la reunión mensual de NeraCode y Mkt Corp', fecha: 'agosto de 2026' },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  generarMinutaActionMock.mockResolvedValue(respuestaOk())
  publicarMinutaActionMock.mockResolvedValue({ ok: true, reunionId: 'reu-1' })
})

/** Pega una transcripción y genera — el punto de partida de casi toda prueba de este archivo. */
async function generar(usuario: ReturnType<typeof userEvent.setup>) {
  const textarea = screen.getByPlaceholderText(/Pega aquí la transcripción completa/)
  await usuario.type(textarea, 'Fernando: cerramos el brief con Iris antes del viernes.')
  await usuario.click(screen.getByRole('button', { name: 'Generar minuta →' }))
  await screen.findByText('Cerrar el brief con Iris')
}

describe('MinutaCliente — el bug: quitar un acuerdo tiene que cambiar el texto de verdad', () => {
  it('al generar, la vista previa del correo nombra los dos acuerdos', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    expect(screen.getByText('Cerrar el brief con Iris')).toBeInTheDocument()
    expect(screen.getByText('Mandar la propuesta a Zeus')).toBeInTheDocument()
  })

  it('DESMARCAR un acuerdo (quitar el check) hace que el texto del correo deje de nombrarlo', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    await usuario.click(checkboxes[1]) // el de "Mandar la propuesta a Zeus"

    expect(screen.getByText('Cerrar el brief con Iris')).toBeInTheDocument()
    expect(screen.queryByText('Mandar la propuesta a Zeus')).toBeNull()
  })

  it('volver a marcar el acuerdo lo devuelve al texto (no es un borrado, es reversible)', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const checkboxes = screen.getAllByRole('checkbox')
    await usuario.click(checkboxes[1])
    expect(screen.queryByText('Mandar la propuesta a Zeus')).toBeNull()
    await usuario.click(checkboxes[1])
    expect(screen.getByText('Mandar la propuesta a Zeus')).toBeInTheDocument()
  })

  it('QUITAR un acuerdo (borrarlo de la lista) también hace que el texto deje de nombrarlo', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Quitar el acuerdo 2' }))

    expect(screen.getByText('Cerrar el brief con Iris')).toBeInTheDocument()
    expect(screen.queryByText('Mandar la propuesta a Zeus')).toBeNull()
  })

  it('Publicar manda el texto YA REARMADO — sin el acuerdo excluido, y solo con el confirmado', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.click(screen.getAllByRole('checkbox')[1])
    await usuario.click(screen.getByRole('button', { name: 'Publicar minuta →' }))

    expect(publicarMinutaActionMock).toHaveBeenCalledTimes(1)
    const [, , textoFinal, confirmados] = publicarMinutaActionMock.mock.calls[0] as [unknown, unknown, string, AcuerdoConfirmado[]]
    expect(textoFinal).toContain('Cerrar el brief con Iris')
    expect(textoFinal).not.toContain('Mandar la propuesta a Zeus')
    expect(confirmados).toHaveLength(1)
    expect(confirmados[0].que).toBe('Cerrar el brief con Iris')
  })

  /**
   * A DÓNDE LLEVA PUBLICAR (24-ago-2026).
   *
   * Franco: *"cuando termino de generar una minuta y la publico, la app me
   * lleva a la sala de preparación de la presentación y muestra los acuerdos
   * arriba para 'añadirlos'. Yo debo ser redirigido a la sala con los
   * acuerdos ya cargados, ¿por eso la publiqué no?"*.
   *
   * Iba a `/deck/<reunion>`: el editor de la presentación de una junta que
   * se acaba de minutar PORQUE YA OCURRIÓ — y ahí el panel de acuerdos
   * arrastrables ofrecía "añadir" los que la minuta acababa de crear.
   */
  it('publicar lleva a LA SALA, a su bloque de acuerdos — no al editor de la presentación', async () => {
    const usuario = userEvent.setup()
    publicarMinutaActionMock.mockResolvedValue({ ok: true, reunionId: 'reu-1', salaSlug: 'neracode' })
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Publicar minuta →' }))

    expect(pushMock).toHaveBeenCalledWith('/cliente/neracode#s-acuerdos')
    expect(pushMock).not.toHaveBeenCalledWith('/deck/reu-1')
  })

  /**
   * Una reunión que no es de ninguna sala (un comité, una interna de Mkt
   * Corp) no tiene espacio de cliente al que ir — y sus acuerdos ni siquiera
   * nacen como filas: se quedan en el texto de la minuta (`guardarMinuta`).
   * El destino honesto es la lista de reuniones, donde ya aparece dada.
   */
  it('sin sala, lleva a la lista de reuniones y no inventa un espacio de cliente', async () => {
    const usuario = userEvent.setup()
    publicarMinutaActionMock.mockResolvedValue({ ok: true, reunionId: 'reu-1', salaSlug: null })
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Publicar minuta →' }))

    expect(pushMock).toHaveBeenCalledWith('/reuniones')
  })
})

describe('MinutaCliente — la minuta se edita ahí mismo (por bloque, no la tabla)', () => {
  it('editar la prosa de un bloque se refleja en la vista previa', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const bloque = screen.getByLabelText('Editar el bloque «Objetivo de la reunión»')
    await usuario.clear(bloque)
    await usuario.type(bloque, 'TEXTO EDITADO A MANO')

    expect(screen.getByText('TEXTO EDITADO A MANO')).toBeInTheDocument()
  })

  it('editar un bloque y LUEGO tocar los acuerdos CONSERVA lo editado (no pelean entre sí)', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const bloque = screen.getByLabelText('Editar el bloque «Objetivo de la reunión»')
    await usuario.clear(bloque)
    await usuario.type(bloque, 'TEXTO EDITADO A MANO')

    await usuario.click(screen.getAllByRole('checkbox')[1])

    expect(screen.getByText('TEXTO EDITADO A MANO')).toBeInTheDocument()
    expect(screen.queryByText('Mandar la propuesta a Zeus')).toBeNull()
  })

  it('la tabla de acuerdos NO se ofrece como texto editable (se deriva sola)', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    // Dos bloques redactables en el molde de prueba (el de la tabla no se
    // redacta) — nunca tres.
    expect(screen.getByLabelText('Editar el bloque «Objetivo de la reunión»')).toBeInTheDocument()
    expect(screen.getByLabelText('Editar el bloque «Próximos pasos»')).toBeInTheDocument()
    expect(screen.queryByLabelText('Editar el bloque «Acuerdos y accionables»')).toBeNull()
  })

  it('lo editado a mano viaja también a Publicar, dentro del texto final', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const bloque = screen.getByLabelText('Editar el bloque «Objetivo de la reunión»')
    await usuario.clear(bloque)
    await usuario.type(bloque, 'TEXTO EDITADO A MANO')
    await usuario.click(screen.getByRole('button', { name: 'Publicar minuta →' }))

    const [, , textoFinal] = publicarMinutaActionMock.mock.calls[0] as [unknown, unknown, string]
    expect(textoFinal).toContain('TEXTO EDITADO A MANO')
  })
})

describe('MinutaCliente — el cuadro de feedback para la IA + Regenerar', () => {
  it('Regenerar pide confirmación ANTES de llamar a la acción — avisa que se pierde lo editado', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.type(screen.getByLabelText('Corrección para la IA'), 'Fernando no Fernanda, fue Iris')
    await usuario.click(screen.getByRole('button', { name: 'Regenerar minuta →' }))

    // Todavía no se llamó: la primera llamada sigue siendo solo la de generar().
    expect(generarMinutaActionMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/se descarta/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, regenerar' })).toBeInTheDocument()
  })

  it('Cancelar no llama a la acción y vuelve al botón normal', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Regenerar minuta →' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(generarMinutaActionMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Regenerar minuta →' })).toBeInTheDocument()
  })

  it('confirmar Regenerar manda la corrección al servidor junto con la MISMA transcripción', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.type(screen.getByLabelText('Corrección para la IA'), 'Fernando no Fernanda, fue Iris')
    await usuario.click(screen.getByRole('button', { name: 'Regenerar minuta →' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, regenerar' }))

    expect(generarMinutaActionMock).toHaveBeenCalledTimes(2)
    const [de, transcripcion, correccion] = generarMinutaActionMock.mock.calls[1] as [unknown, string, string]
    expect(de).toEqual({ reunionId: 'reu-1' })
    expect(transcripcion).toContain('Fernando: cerramos el brief con Iris antes del viernes.')
    expect(correccion).toBe('Fernando no Fernanda, fue Iris')
  })

  it('al regenerar, lo editado a mano se DESCARTA: el bloque vuelve a lo que trae el nuevo borrador', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const bloque = screen.getByLabelText('Editar el bloque «Objetivo de la reunión»')
    await usuario.clear(bloque)
    await usuario.type(bloque, 'TEXTO EDITADO A MANO')
    expect(screen.getByText('TEXTO EDITADO A MANO')).toBeInTheDocument()

    generarMinutaActionMock.mockResolvedValue(respuestaOk(['OBJETIVO NUEVO DEL MODELO', 'Lo que sigue, otra vez.']))
    await usuario.click(screen.getByRole('button', { name: 'Regenerar minuta →' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, regenerar' }))

    await screen.findByText('OBJETIVO NUEVO DEL MODELO')
    expect(screen.queryByText('TEXTO EDITADO A MANO')).toBeNull()
  })

  it('tras regenerar con éxito, el cuadro de corrección se limpia', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const cuadro = screen.getByLabelText('Corrección para la IA')
    await usuario.type(cuadro, 'algo que corregir')
    await usuario.click(screen.getByRole('button', { name: 'Regenerar minuta →' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, regenerar' }))

    await screen.findByRole('button', { name: 'Regenerar minuta →' }) // ya se cerró la confirmación
    expect(screen.getByLabelText('Corrección para la IA')).toHaveValue('')
  })
})

describe('MinutaCliente — arrastrar los acuerdos por importancia (reusa ListaOrdenable)', () => {
  it('la lista de acuerdos se monta a través de ListaOrdenable', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    expect(screen.getByTestId('lista-ordenable')).toBeInTheDocument()
  })

  it('reordenar cambia el orden de la tabla del correo', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    const antes = document.body.textContent ?? ''
    expect(antes.indexOf('Cerrar el brief con Iris')).toBeLessThan(antes.indexOf('Mandar la propuesta a Zeus'))

    await usuario.click(screen.getByRole('button', { name: 'invertir orden (prueba)' }))

    const despues = document.body.textContent ?? ''
    expect(despues.indexOf('Mandar la propuesta a Zeus')).toBeLessThan(despues.indexOf('Cerrar el brief con Iris'))
  })

  it('reordenar cambia también el orden en el que se publican los acuerdos', async () => {
    const usuario = userEvent.setup()
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)
    await generar(usuario)

    await usuario.click(screen.getByRole('button', { name: 'invertir orden (prueba)' }))
    await usuario.click(screen.getByRole('button', { name: 'Publicar minuta →' }))

    const confirmados = publicarMinutaActionMock.mock.calls[0][3] as AcuerdoConfirmado[]
    expect(confirmados.map((a) => a.que)).toEqual(['Mandar la propuesta a Zeus', 'Cerrar el brief con Iris'])
  })
})

describe('MinutaCliente — el servidor manda: un rechazo de permiso llega tal cual a pantalla', () => {
  it('si generarMinutaAction rechaza, se ve el error y no aparecen ni correo ni acuerdos', async () => {
    const usuario = userEvent.setup()
    generarMinutaActionMock.mockResolvedValue({
      ok: false,
      error: 'Esta acción requiere permiso de edición en Marketing Corporativo.',
    })
    render(<MinutaCliente de={{ reunionId: 'reu-1' }} personas={[]} />)

    await usuario.type(screen.getByPlaceholderText(/Pega aquí la transcripción completa/), 'algo')
    await usuario.click(screen.getByRole('button', { name: 'Generar minuta →' }))

    expect(await screen.findByText('Esta acción requiere permiso de edición en Marketing Corporativo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar minuta →' })).toBeNull()
  })
})
