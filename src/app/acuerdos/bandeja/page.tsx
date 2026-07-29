import Link from 'next/link'
import { acuerdosPendientesDeSubir, refrescarDesdeMonday } from '@/db/acuerdos'
import {
  elementosDeDelivery, existeElGrupo, grupoDeAcuerdos, mondayConectado,
} from '@/monday/cliente'
import { FilaBandeja } from '@/componentes/acuerdos/FilaBandeja'
import { subirAcuerdoAction, descartarAcuerdoAction } from '../acciones'
import estilos from '@/componentes/acuerdos/bandeja.module.css'

/**
 * LA BANDEJA: lo que espera un clic antes de subir a Delivery.
 *
 * No es una cola automática — es una lista de cosas listas que esperan que
 * alguien confirme. Lee el estado de Monday (token/escritura/grupo) y de la
 * base en cada carga: cachearla dejaría a alguien mirando un aviso de "grupo
 * roto" que ya se arregló, o al revés. Mismo criterio que el resto de las
 * pantallas de equipo (deck, cliente/[slug]).
 *
 * Esta página no se enlaza todavía desde ningún sitio: quien llega aquí lo
 * hace por la URL a mano.
 */
export const dynamic = 'force-dynamic'

/**
 * Lee `elementosDeDelivery` sin dejar que un Monday caído tumbe la página
 * entera: una fila puede subirse igual como "elemento nuevo" aunque no se
 * haya podido leer con qué colgarla, así que un fallo de lectura aquí no
 * debe bloquear toda la bandeja.
 */
async function elementosSeguro(slug: string) {
  try {
    return await elementosDeDelivery(slug)
  } catch {
    return { elementos: [], truncado: false }
  }
}

/**
 * Igual que arriba: un fallo de RED al comprobar el grupo no es lo mismo que
 * "el grupo no existe", pero el resultado práctico tiene que ser el mismo —
 * no se puede confirmar que sigue ahí, así que se trata como inválido.
 * Asumir que sí está y dejar subir a ciegas es exactamente el error que esta
 * comprobación existe para evitar (ver la cabecera de existeElGrupo).
 */
async function grupoExisteSeguro(): Promise<boolean> {
  try {
    return await existeElGrupo()
  } catch {
    return false
  }
}

export default async function PagBandeja() {
  const hayToken = mondayConectado()

  // SIN TOKEN la integración está apagada de raíz: no hay nada que leer ni
  // que decidir, así que ni se consulta la base de acuerdos. Sin esto, la
  // pantalla mostraría una bandeja "vacía" que en realidad nunca se llegó a
  // mirar — un vacío falso es peor que decir claramente qué falta.
  if (!hayToken) {
    return (
      <div className={estilos.app}>
        <header className={estilos.barra}>
          <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
          <div className={estilos.barraTitulo}>Bandeja de acuerdos</div>
        </header>
        <main className={estilos.main}>
          <p className={estilos.avisoApagado}>
            La integración con Monday está apagada: falta <code>MONDAY_TOKEN</code> en este
            despliegue. Esta pantalla no hace nada hasta que se configure.
          </p>
        </main>
      </div>
    )
  }

  // LA VUELTA antes de leer: si Monday movió el estatus o la fecha de un
  // acuerdo ya subido, que se refleje aquí también. Nunca debe tumbar la
  // página —regla central de src/monday/sincronizar.ts—, así que el fallo se
  // ignora: la bandeja se pinta igual con lo que ya hay en la base.
  try {
    await refrescarDesdeMonday()
  } catch {
    // Intencional: ver el comentario de arriba.
  }

  const [pendientes, grupoExiste] = await Promise.all([
    acuerdosPendientesDeSubir(),
    grupoExisteSeguro(),
  ])

  // Por cada sala presente en la bandeja, una sola consulta a Delivery — no
  // una por acuerdo: una sala puede tener varios acuerdos pendientes.
  const salasPresentes = [...new Set(pendientes.map((a) => a.salaSlug))]
  const porSala = new Map(
    await Promise.all(
      salasPresentes.map(async (slug) => [slug, await elementosSeguro(slug)] as const),
    ),
  )

  const grupo = grupoDeAcuerdos()
  const escrituraEncendida = process.env.MONDAY_ESCRITURA === 'si'
  // Hacen falta las DOS cosas para que un botón de subir sirva de algo: con
  // cualquiera de las dos apagada, Monday va a rechazar la escritura.
  const puedeSubir = escrituraEncendida && grupoExiste

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Bandeja de acuerdos</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Bandeja de acuerdos</h1>
            <p className={estilos.subtitulo}>
              Lo que se acordó con responsable de Marketing Corporativo, listo para confirmar
              qué sube al tablero del equipo y con qué forma. Lo que se descarta aquí no vuelve
              a ofrecerse.
            </p>
          </div>
          {pendientes.length > 0 && (
            <span className="pildora" data-tono="ojo">{pendientes.length} por revisar</span>
          )}
        </div>

        {/* Los dos avisos son independientes: cada uno describe SU propia
            condición y ninguno presupone el estado del otro. Alguien a punto
            de encender MONDAY_ESCRITURA (tarea 13) merece saber HOY si el
            grupo ya está roto, no descubrirlo justo después de encenderla. */}
        {!escrituraEncendida && (
          <p className={estilos.aviso} data-tono="ojo">
            La subida a Monday está apagada (falta encender <code>MONDAY_ESCRITURA</code>). Se
            puede revisar la bandeja, pero ningún botón de subir va a funcionar todavía.
          </p>
        )}
        {!grupoExiste && (
          <p className={estilos.aviso} data-tono="mal">
            No se pudo confirmar que el grupo <code>{grupo ?? '(sin configurar)'}</code> existe
            en el tablero de Monday. No se sube nada hasta arreglar <code>MONDAY_GRUPO</code>.
          </p>
        )}

        <section className={`tarjeta ${estilos.tarjetaLista}`}>
          {pendientes.length === 0 ? (
            <p className={estilos.vacio}>
              Nada por subir. Los acuerdos con responsable de Mkt Corp aparecen aquí al publicar
              la minuta.
            </p>
          ) : (
            <ul className={estilos.lista}>
              {pendientes.map((acuerdo) => {
                const info = porSala.get(acuerdo.salaSlug)
                return (
                  <FilaBandeja
                    key={acuerdo.id}
                    acuerdo={acuerdo}
                    elementos={info?.elementos ?? []}
                    truncado={info?.truncado ?? false}
                    puedeSubir={puedeSubir}
                    subir={subirAcuerdoAction}
                    descartar={descartarAcuerdoAction}
                  />
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
