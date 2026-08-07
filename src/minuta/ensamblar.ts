/**
 * Arma el correo de la minuta a partir de sus piezas — SIN NADA del SDK de
 * Anthropic (ronda 11, tarea 1, "el hallazgo que lo hace fácil").
 *
 * Vive en su propio módulo, separado de `generar.ts` (que sí importa
 * `@anthropic-ai/sdk/helpers/zod` y `@/motor/decidir`, APIs de Node), para
 * que `MinutaCliente.tsx` (Client Component) pueda importar `ensamblarCorreo`
 * DIRECTO y rearmar el correo EN EL NAVEGADOR cada vez que cambian los
 * acuerdos o se edita un bloque — determinista, instantáneo, sin llamar al
 * modelo — sin arrastrar el cliente de Anthropic al bundle del navegador.
 * `generar.ts` re-exporta esta misma función para que los módulos que ya la
 * importaban desde ahí (`correo-html.test.ts`, `molde.test.ts`) sigan
 * funcionando sin cambios.
 */
import type { AcuerdoPropuesto } from './esquema'
import { MOLDE_POR_DEFECTO, type MoldeMinuta } from './molde'

/**
 * Todo lo que `ensamblarCorreo` necesita para rearmar el correo, SALVO los
 * `bloques` y los `acuerdos` — esos son justo los que cambian con cada
 * edición o cada acuerdo que se marca/desmarca/reordena. `generarMinuta`
 * devuelve esto junto con el resultado (`ResultadoMinuta.insumosCorreo`) para
 * que el cliente pueda volver a llamar a `ensamblarCorreo` cuantas veces haga
 * falta sin volver a llamar al modelo.
 */
export interface InsumosCorreo {
  salaSlug: string | null
  molde: MoldeMinuta
  reunionId?: string
  /** De qué reunión y de cuándo, para la entradilla — ver `generarMinuta`. */
  contexto: { reunion: string; fecha: string }
}

/**
 * "por definir" es el rótulo que el spec exige mostrar antes de enviar el
 * correo (§9). Exportada (ronda 11, tarea 1): `MinutaCliente.tsx` la reusa
 * para pintar la MISMA fecha en su vista previa editable en vez de duplicar
 * el formato a mano.
 */
export function formatearFechaTabla(fechaIso: string | null): string {
  if (!fechaIso) return 'por definir'
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * La ruta congelada por sesión (spec §10, `/cliente/{slug}/{fecha}?t={token}`)
 * es trabajo de la tarea pendiente de tokens/SSO: mientras no exista, se
 * enlaza al link permanente de la sala, que ya existe y funciona hoy.
 */
/**
 * A dónde apunta la minuta.
 *
 * A la sala, si la reunión es de una. Una que no pertenece a ninguna —un
 * comité, un arranque— apunta al documento de la propia reunión: es lo único
 * que hay que enseñar.
 *
 * Exportada (ronda 11, tarea 1): mismo motivo que `formatearFechaTabla`.
 */
export function urlSesion(salaSlug: string | null, reunionId?: string): string {
  if (salaSlug) return `/cliente/${salaSlug}`
  return reunionId ? `/reunion/${reunionId}` : '/'
}

/**
 * La tabla del correo: TRES columnas, no cinco.
 *
 * Squad y prioridad siguen viajando en los datos —los necesita el acuerdo que
 * nace en el espacio del cliente, con su dueño y su seguimiento— pero en el
 * correo eran dos columnas donde casi todas las filas decían "—" y "media".
 * Una columna que casi siempre dice lo mismo no informa: ocupa.
 */
function tablaAcuerdos(acuerdos: AcuerdoPropuesto[]): string {
  if (acuerdos.length === 0) {
    return '(sin acuerdos accionables identificados en la transcripción)'
  }
  const encabezado = 'Acción | Owner | Fecha'
  const filas = acuerdos.map((a) =>
    [a.que, a.responsable, formatearFechaTabla(a.fechaCompromiso)].join(' | '),
  )
  return [encabezado, ...filas].join('\n')
}

/**
 * Arma el correo SEGÚN EL MOLDE, no según una forma incrustada aquí.
 *
 * El modelo devuelve un texto por bloque, en el mismo orden que el molde. El
 * bloque marcado con `conTabla` recibe además la tabla de acuerdos, que NO la
 * redacta el modelo: se arma con los compromisos que se van a publicar en la
 * sala, con su dueño y su fecha. Dejarla al modelo sería dejarle inventar
 * compromisos.
 *
 * PURA: mismo `salaSlug`+`bloques`+`acuerdos`+`molde` siempre da el mismo
 * texto. Es justo lo que permite llamarla de nuevo en el navegador cada vez
 * que cambia la lista de acuerdos (ronda 11, tarea 1) sin que eso signifique
 * "regenerar con el modelo".
 */
export function ensamblarCorreo(
  salaSlug: string | null,
  bloques: string[],
  acuerdos: AcuerdoPropuesto[],
  molde: MoldeMinuta = MOLDE_POR_DEFECTO,
  reunionId?: string,
  /** De qué reunión y de cuándo, para la entradilla. */
  contexto?: { reunion: string; fecha: string },
): string {
  const lineas: string[] = [molde.saludo, '']

  // La entradilla dice DE QUÉ es esta minuta. Sin ella, el correo abre con
  // "Objetivo de la reunión" a secas y quien lo abre tres semanas después no
  // sabe de qué reunión le hablan.
  if (molde.entradilla?.trim()) {
    lineas.push(
      molde.entradilla
        .replace('{reunion}', contexto?.reunion ?? 'la reunión')
        .replace('{fecha}', contexto?.fecha ?? ''),
      '',
    )
  }

  // El modelo devuelve un texto por bloque REDACTABLE; el de la tabla no se le
  // pide (ver `construirPromptMinuta`). Por eso el índice avanza solo con
  // esos: si se recorriera `molde.bloques` a secas, el bloque de la tabla se
  // comería el texto del siguiente y todo saldría corrido una posición.
  let siguiente = 0
  molde.bloques.forEach((b) => {
    lineas.push(b.titulo)
    if (b.conTabla) {
      lineas.push(tablaAcuerdos(acuerdos))
    } else {
      const texto = (bloques[siguiente++] ?? '').trim()
      if (texto) lineas.push(texto)
    }
    lineas.push('')
  })

  if (molde.cierre?.trim()) lineas.push(molde.cierre, '')
  if (molde.conEnlace) lineas.push(urlSesion(salaSlug, reunionId))
  return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}
