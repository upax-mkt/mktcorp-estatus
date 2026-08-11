import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * TODA ACCIÓN QUE TOCA EL DOCUMENTO REVALIDA LAS DOS PANTALLAS.
 *
 * EL BUG QUE CIERRA — Franco, tres veces seguidas: *"el preview del doc sigue
 * sin jalar"*. Las nueve Server Actions del editor revalidaban `/deck/[id]` y
 * NINGUNA `/deck/[id]/documento`. Las dos pantallas leen el mismo documento,
 * así que al editar se invalidaba el editor y quedaba intacta la copia del
 * documento en la caché de router del navegador: se pulsaba "Ver documento →"
 * —un `<Link>`, o sea navegación de cliente— y Next servía el payload de
 * ANTES de la edición.
 *
 * POR QUÉ ESTE TEST MIRA EL CÓDIGO FUENTE Y NO EL COMPORTAMIENTO. Lo que
 * falla vive en la caché de router del navegador, que solo existe navegando
 * como una persona: con `goto()` —lo que hace cualquier prueba— la caché ni
 * se toca, y por eso el fallo sobrevivió a tres rondas de verificación con
 * Playwright y a 1,646 tests. Lo que sí se puede fijar es la REGLA: si
 * aparece una acción nueva que revalida solo el editor, esto se pone rojo.
 *
 * Es deliberadamente tosco. Un test tosco que habría cazado el fallo vale más
 * que uno elegante que no lo caza.
 *
 * ⚠️ EL HELPER VIVE A NIVEL DE MÓDULO y recibe `id` por parámetro. Estuvo
 * dentro del componente y las trece acciones se lo llevaban en su cierre, así
 * que React lo intentaba serializar hacia el cliente y la consola del editor
 * escupía "Functions cannot be passed directly to Client Components" en cada
 * carga. Si vuelve dentro del componente, vuelve el error.
 */

const RUTA = join(process.cwd(), 'src/app/deck/[id]/page.tsx')
const fuente = readFileSync(RUTA, 'utf8')

describe('las Server Actions del editor revalidan el documento, no solo el editor', () => {
  it('ninguna revalida `/deck/[id]` suelto: todas pasan por `revalidarDocumento()`', () => {
    // Fuera el cuerpo del propio helper, que es el único sitio donde esa
    // línea debe existir.
    const sinHelper = fuente.replace(
      /function revalidarDocumento\(id: string\)\s*\{[\s\S]*?\n\}/,
      '/* helper */',
    )
    const sueltas = sinHelper.match(/revalidatePath\(`\/deck\/\$\{id\}`\)/g) ?? []
    expect(sueltas).toEqual([])
  })

  it('el helper revalida LAS DOS rutas', () => {
    const helper = fuente.match(/function revalidarDocumento\(id: string\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(helper).toContain('revalidatePath(`/deck/${id}`)')
    expect(helper).toContain('revalidatePath(`/deck/${id}/documento`)')
    // Y no se llama a sí mismo: al extraerlo, una sustitución automática dejó
    // exactamente esa recursión infinita. Se mira el CUERPO, no la cabecera,
    // que obviamente lleva el nombre.
    const cuerpo = helper.slice(helper.indexOf('{'))
    expect(cuerpo).not.toMatch(/revalidarDocumento\(id\)/)
  })

  it('todas las acciones que guardan algo del documento lo llaman', () => {
    // Las acciones del editor, por nombre. Si se añade una que toque el
    // documento y no aparezca aquí, este test no la ve — pero el primero sí,
    // porque la pillaría revalidando `/deck/[id]` a pelo.
    const acciones = [
      'guardarSeccionAction',
      'anadirSeccionAction',
      'anadirSubseccionAction',
      'eliminarSeccionAction',
    ]
    for (const nombre of acciones) {
      const cuerpo = fuente.match(new RegExp(`async function ${nombre}\\([\\s\\S]*?\\n  \\}`))?.[0]
      expect(cuerpo, `no encontré la acción ${nombre}`).toBeTruthy()
      expect(cuerpo, `${nombre} no revalida el documento`).toContain('revalidarDocumento(id)')
    }
  })

  /**
   * DESCARTAR LA PRESENTACIÓN NO PUEDE LLEVARSE LA REUNIÓN.
   *
   * Franco: *"si estoy en el editor y quiero eliminar lo que estoy
   * trabajando, no puede eliminar la reunión, ya que son cosas distintas"*.
   * Este botón llamaba a `eliminarReunion`: tirar un deck mal empezado —lo
   * normal, se empieza dos veces— borraba la junta del calendario con su
   * fecha y su sitio en la sala.
   *
   * Mismo criterio tosco que el resto de esta suite: se mira el código
   * fuente, porque lo que hay que impedir es que alguien vuelva a cablear
   * aquí el borrado de la reunión.
   */
  it('la zona de peligro del editor borra el DOCUMENTO, nunca la reunión', () => {
    const cuerpo = fuente.match(
      /async function descartarPresentacionAction\([\s\S]*?\n  \}/,
    )?.[0]
    expect(cuerpo, 'no encontré descartarPresentacionAction').toBeTruthy()
    expect(cuerpo).toContain('eliminarDocumentoDeReunion(id)')
    // Ni aquí ni en ninguna otra acción de esta pantalla.
    expect(fuente).not.toMatch(/eliminarReunion\s*\(/)
  })

  /**
   * Y NO SE QUEDA EN EL EDITOR AL DESCARTAR: esta misma página CREA un
   * documento al cargar si la reunión no tiene, así que quedarse
   * reconstruiría al instante lo que se acaba de borrar.
   */
  it('al descartar redirige fuera del editor', () => {
    const cuerpo = fuente.match(
      /async function descartarPresentacionAction\([\s\S]*?\n  \}/,
    )?.[0]
    expect(cuerpo).toContain('redirect(')
    expect(cuerpo).toContain('/cliente/')
  })
})
