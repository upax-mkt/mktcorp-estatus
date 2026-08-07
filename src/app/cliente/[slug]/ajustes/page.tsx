import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import type { CSSProperties } from 'react'
import estilos from '../../cliente.module.css'
import { colorDeTextoDeMarca } from '@/temas'
import { cargarTemas } from '@/db/temas'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirAdmin } from '@/auth/roles'
import { secretoConfigurado } from '@/auth/sesion'
import { FormularioSala } from '@/componentes/salas/FormularioSala'
import { PausaSala } from '@/componentes/PausaSala'
import { ClaveDeSala } from '@/componentes/ClaveDeSala'
import { editarSalaAction } from '@/app/salas/acciones'
import { pausarSalaAction, reactivarSalaAction } from '@/app/acuerdos/acciones'
import { estadoDeClave, regenerarClave, quitarClave } from '@/db/claves'

export const dynamic = 'force-dynamic'

/**
 * `/CLIENTE/[SLUG]/AJUSTES` — LOS AJUSTES DE UNA SALA, DESDE DENTRO DE SÍ
 * MISMA (ronda 10, tarea 15, spec §5). Franco, al cerrar su queja del módulo
 * de reuniones: "la sala debería tener arriba un enlace para los ajustes de
 * la misma sala". Hasta ahora editar una sala solo se podía desde la
 * pantalla global `/salas` (que se queda: sigue siendo el sitio para crear
 * salas y verlas todas juntas) — esta página trae esa misma edición adentro.
 *
 * REUTILIZA `FormularioSala` y las acciones de `src/app/salas/acciones.ts`
 * TAL CUAL: no hay formulario propio ni validación propia aquí, solo se
 * colocan dentro de la sala.
 *
 * "GUARDAR CAMBIOS" NUNCA RE-DERIVA LA PALETA (regla dura de la ronda 8,
 * revisión final, punto 1): la prop `recalcularPaleta` de `FormularioSala`
 * NO se pasa —ni se dispara, ni por defecto— así que el botón que la
 * dispara ni siquiera puede aparecer. Re-derivar al guardar destruía el
 * brandbook que alguien había ajustado a mano.
 *
 * SOLO ADMIN, sin excepción: `exigirAdmin()` es la PRIMERA operación de la
 * función, antes incluso de leer `params`. El engrane ⚙ en la cabecera de la
 * sala (que vive en `cliente/[slug]/page.tsx`, tarea 11) es cortesía de
 * interfaz — esconder un botón no protege un endpoint, lección pagada en la
 * ronda del 27-jul. Esta línea es lo que de verdad protege.
 *
 * `ClaveDeSala` SE MUDÓ AQUÍ DESDE LA SALA (ronda 11, tarea 3, paso 1).
 * Franco: "dentro de un cliente (sala) el módulo de acceso al director no
 * debería vivir allí, debería estar en los ajustes de cada sala". Coherente
 * con el permiso: `regenerarClaveAction`/`quitarClaveAction` (más abajo) ya
 * exigían admin en su sitio viejo, y esta página entera ya lo exige desde su
 * primera línea. Las dos acciones viajan CON su propio `exigirAdmin()`
 * intacto —no se debilitan ni se duplican—: la página ya gatea el render,
 * pero una Server Action sigue siendo un endpoint propio, alcanzable con su
 * id aunque nadie pase por esta pantalla.
 *
 * SOLO SE MUEVE `ClaveDeSala` — no el link firmado de 30 días
 * (`generarTokenDeSala`/`tokenDeAcceso`), que se queda en la sala
 * (`cliente/[slug]/page.tsx`): es un mecanismo distinto (un token que se
 * firma de nuevo en cada carga de la sala, no una credencial persistente) y
 * el encargo de Franco nombra específicamente la clave.
 */
export default async function PaginaAjustesSala({ params }: { params: Promise<{ slug: string }> }) {
  await exigirAdmin()
  const { slug } = await params

  /**
   * CONTRA EL REGISTRO COMPLETO (`cargarTemas()`, las DIEZ filas de `salas`),
   * NO contra `slugsDeSalas()` (las nueve "salas de verdad") — a propósito, y
   * a diferencia de `/cliente/[slug]` y `/cliente/[slug]/benchmark`, que sí
   * excluyen `grupo-upax` porque no es una sala navegable para un director.
   *
   * Aquí es al revés porque la Tarea 17 necesita pausar `grupo-upax` desde
   * `/cliente/grupo-upax/ajustes` (spec §5, "grupo-upax": "es el mismo
   * mecanismo de freeze que ya usa Zeus"). Si esta guarda usara
   * `slugsDeSalas()`, esa ruta daría 404 y la Tarea 17 no tendría desde dónde
   * pausarla sin tocar además esta página.
   *
   * OJO — esto NO basta por sí solo, y queda dicho en el reporte de la tarea
   * 15: `pausarSala`/`reactivarSala` (`src/db/salas.ts`, fuera de esta tarea)
   * validan el slug con `slugsDeSalas()` puertas adentro, que SIGUE
   * excluyendo a `grupo-upax`. Así que hoy, aun con esta página abierta,
   * pulsar "Pausar" para `grupo-upax` va a fallar con "Sala desconocida:
   * grupo-upax" — el error llega a pantalla (`PausaSala` ya lo enseña), no
   * revienta la página. Editar su nombre/marca/cadencia SÍ funciona:
   * `editarSalaAction` no pasa por esa validación. Cerrar ese último tramo
   * para `grupo-upax` es trabajo de la Tarea 17 en `db/salas.ts`, no de esta.
   */
  const registro = await cargarTemas()
  const tema = registro[slug]
  if (!tema) notFound()

  /**
   * LO QUE `Tema` NO TRAE: `cargarTemas()` (`src/db/temas.ts`) solo expone
   * las columnas de MARCA — nunca `logoUrl`/`logoRelacionDeTinta` (tarea 6)
   * ni `cadencia`/`activa`/`pausadaDesde` (tarea 12 y tarea 1/16) — hacen
   * falta para `FormularioSala` y `PausaSala`, así que se piden aparte,
   * directo de `esquema.salas`, solo para la sala de esta página. Mismo
   * patrón que `logoDeLaEditada` en `src/app/salas/page.tsx`, que ya hacía
   * exactamente esta consulta para logo/logoRelacionDeTinta antes de esta
   * tarea — aquí se extiende con las tres columnas que además hacían falta.
   *
   * SIN BASE DE DATOS: como en `salas/page.tsx`, no hay nada que preguntar —
   * `editarSalaAction`/`pausarSalaAction` ya van a fallar con su propio aviso
   * de "sin base de datos" al guardar/pausar, así que aquí basta con no
   * reventar y mostrar los mismos valores por defecto que usa el resto de la
   * app (`cadencia` 'mensual', `activa` true, sin logo, sin pausa).
   */
  const extra = hayDB()
    ? (
        await db()
          .select({
            logoUrl: esquema.salas.logoUrl,
            logoRelacionDeTinta: esquema.salas.logoRelacionDeTinta,
            cadencia: esquema.salas.cadencia,
            activa: esquema.salas.activa,
            pausadaDesde: esquema.salas.pausadaDesde,
          })
          .from(esquema.salas)
          .where(eq(esquema.salas.slug, slug))
      )[0]
    : undefined

  // Los identificadores en uso por OTRAS salas — igual criterio que `/salas`
  // (`crearSalaAction` los exige contra la tabla completa), contra el
  // registro completo: `grupo-upax` sigue siendo un slug real que nadie más
  // podría reutilizar. En la práctica no cambia nada aquí (el identificador
  // es fijo al editar — `FormularioSala` lo deshabilita), pero es la lista
  // correcta si algún día deja de estarlo.
  const slugsUsados = Object.keys(registro).filter((s) => s !== slug)

  /**
   * EL ESTADO DE LA CLAVE (mudado desde `cliente/[slug]/page.tsx`). Ahí el
   * cálculo se guardaba tras `equipo && secreto` —esta página no lo necesita:
   * `exigirAdmin()`, arriba, ya es más estricto que `equipo` (admin implica
   * lector), así que si se llegó hasta aquí ya hay equipo de sobra.
   */
  const secreto = secretoConfigurado()
  const clave = secreto
    ? await estadoDeClave(slug, secreto)
    : { tiene: false, creadaEn: null }

  // ---- Server actions: ligadas a ESTA sala, delegando en las de siempre ----
  // Mismo patrón que `pausarEstaSalaAction`/`reactivarEstaSalaAction`, más
  // abajo: un cierre fino sobre las acciones de `@/app/acuerdos/acciones` (ya
  // exigen admin por su cuenta) para que `PausaSala` no tenga que conocer el
  // slug.
  async function pausarEstaSalaAction(): Promise<void> {
    'use server'
    await pausarSalaAction(slug)
  }

  async function reactivarEstaSalaAction(): Promise<void> {
    'use server'
    await reactivarSalaAction(slug)
  }

  /**
   * Pone una clave nueva y la devuelve EN CLARO, una sola vez (mudada TAL
   * CUAL desde `cliente/[slug]/page.tsx`, ronda 11, tarea 3). Se guarda su
   * hash, así que esta es la única oportunidad de leerla — el componente la
   * enseña con un "cópiala ahora".
   */
  async function regenerarClaveAction(): Promise<{ clave?: string; error?: string }> {
    'use server'
    // ADMIN, no equipo: generar/revocar la clave decide QUIÉN puede entrar a
    // esta sala desde fuera del equipo. Intacto tal como vivía en la sala:
    // esta línea, no el render de la página, es lo que de verdad protege.
    await exigirAdmin()
    const s = secretoConfigurado()
    if (!s) return { error: 'Falta SESSION_SECRET en el despliegue: sin él no se pueden firmar claves.' }
    try {
      const nueva = await regenerarClave(slug, s)
      revalidatePath(`/cliente/${slug}/ajustes`)
      return { clave: nueva }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo generar la clave.' }
    }
  }

  async function quitarClaveAction() {
    'use server'
    // Misma exigencia que regenerarClaveAction: es la otra mitad del acceso
    // externo de esta sala.
    await exigirAdmin()
    await quitarClave(slug)
    revalidatePath(`/cliente/${slug}/ajustes`)
  }

  const estiloMarca = {
    '--marca': tema.primario,
    '--marca-texto': colorDeTextoDeMarca(tema.primario),
    '--gradiente': `linear-gradient(120deg, ${tema.gradiente.join(', ')})`,
  } as CSSProperties

  return (
    <div className={estilos.app} style={estiloMarca}>
      <header className={estilos.barra}>
        <Link href={`/cliente/${slug}`} className={estilos.volver}>← {tema.nombre}</Link>
        <div className={estilos.barraSala}>
          <span className={estilos.barraPunto} />
          Ajustes
        </div>
      </header>

      <div className={estilos.hero}>
        <div className={estilos.heroInner}>
          <div className={estilos.heroKicker}>Ajustes de sala</div>
          <h1 className={estilos.heroNombre}>{tema.nombre}</h1>
        </div>
      </div>

      <main className={estilos.main}>
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Identidad, marca y cadencia</h2>
          <FormularioSala
            guardar={editarSalaAction.bind(null, slug)}
            slugsUsados={slugsUsados}
            sala={{
              slug,
              nombre: tema.nombre,
              primario: tema.primario,
              familiaDisplay: tema.familiaDisplay,
              familiaTexto: tema.familiaTexto,
              logoUrl: extra?.logoUrl ?? null,
              logoRelacionDeTinta: extra?.logoRelacionDeTinta ?? null,
              cadencia: extra?.cadencia ?? 'mensual',
            }}
            // Se vuelve a la sala, no a la lista global: aquí se entró desde
            // dentro de ella. El default de `FormularioSala` es `/salas`, que
            // es lo correcto para la pantalla de administración, no para ésta.
            volverA={`/cliente/${slug}`}
          />
        </section>

        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Estado</h2>
          <PausaSala
            nombreSala={tema.nombre}
            activa={extra?.activa ?? true}
            // Día civil, no instante — mismo formato que produce el
            // `isoFecha()` local de `src/db/consultas.ts` para este mismo
            // campo (`EstadoSala.pausadaDesde`, que ya consume `PausaSala`
            // desde `cliente/[slug]/page.tsx`): no se puede importar esa
            // función (no es un export del módulo), así que se reproduce
            // aquí el mismo recorte a 10 caracteres.
            pausadaDesde={extra?.pausadaDesde ? extra.pausadaDesde.toISOString().slice(0, 10) : null}
            pausarAction={pausarEstaSalaAction}
            reactivarAction={reactivarEstaSalaAction}
          />
        </section>

        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Acceso del director</h2>
          <ClaveDeSala
            nombreSala={tema.nombre}
            tiene={clave.tiene}
            creadaEn={clave.creadaEn}
            regenerarAction={regenerarClaveAction}
            quitarAction={quitarClaveAction}
          />
        </section>
      </main>
    </div>
  )
}
