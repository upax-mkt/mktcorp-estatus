import Link from 'next/link'
import estilos from './personas.module.css'
import { hayDB } from '@/db/cliente'
import { listarPersonas, normalizarCorreo } from '@/db/directorio'
import { exigirAdmin } from '@/auth/roles'
import { FilaPersona } from '@/componentes/personas/FilaPersona'
import { FormularioAlta } from '@/componentes/personas/FormularioAlta'
import { altaPersonaAction, cambiarRolAction, activarPersonaAction } from './acciones'

export const dynamic = 'force-dynamic'

/**
 * `/PERSONAS` — la pantalla que existe porque, desde la tarea 1 (el
 * directorio) y la tarea 2 (el rol en la sesión), QUIÉN entra y CON QUÉ
 * permiso vive en la base — y hasta esta pantalla, tocarlo era cosa de SQL a
 * mano. Aquí un admin da de alta a alguien, le cambia el rol y lo
 * activa/desactiva.
 *
 * Solo admin, como cualquier pantalla de administración de esta app —
 * `exigirAdmin()` es la primera línea, antes de leer un solo dato (mismo
 * criterio que `/salas`). Esconder el enlace en la barra para quien no es
 * admin (`src/app/page.tsx`) es cosmética; esta comprobación es la que
 * protege de verdad.
 *
 * LAS DOS GUARDAS DE LA TAREA —nadie se quita a sí mismo el admin ni se
 * desactiva; siempre queda al menos un admin activo— NO viven aquí: viven en
 * `./acciones.ts`, del lado del servidor, con su propio test. Lo que hace
 * esta pantalla con `esYo` es solo la ayuda visual (apagar el control antes
 * de que alguien lo intente) — ver la cabecera de `FilaPersona.tsx`.
 */
export default async function PagPersonas() {
  const sesion = await exigirAdmin()

  const personas = await listarPersonas()

  // Quién soy YO en este directorio — de la sesión firmada, nunca de un dato
  // que mande el navegador (mismo criterio que las guardas de acciones.ts).
  // `sesion.sub` es el correo de Slack tal como lo devolvió Slack, o el
  // literal 'equipo-mkt-corp' si se entró por el portillo de emergencia —
  // ese literal no normaliza a ningún correo real, así que sencillamente
  // ninguna fila puede ser "yo" en esa sesión.
  const miCorreo = sesion.sub ? normalizarCorreo(sesion.sub) : null

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Meeting Hub</Link>
        <div className={estilos.barraTitulo}>Personas</div>
      </header>

      <main className={estilos.main}>
        {/* SIN DATABASE_URL: mismo aviso que /salas — sin base no hay contra
            qué comprobar quién entra (ver la cabecera de src/db/directorio.ts),
            así que `listarPersonas()` cae a `[]` y nada de aquí se puede
            guardar: alta, cambiar rol y activar/desactivar van a fallar con
            este mismo motivo. */}
        {!hayDB() && (
          <div className={estilos.avisoSinBase} role="alert">
            <strong>Sin base de datos configurada</strong> — falta <code>DATABASE_URL</code> en este
            entorno. No hay directorio que mostrar, y nada de esta pantalla se puede guardar: alta,
            cambiar rol y activar/desactivar van a fallar con este mismo aviso.
          </div>
        )}

        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Personas</h1>
          <p className={estilos.subtitulo}>
            Quién entra a Marketing Corporativo y con qué permiso. Admin administra salas, marcas y
            este directorio; editor prepara, maqueta, minuta y mueve acuerdos; viewer solo mira.
          </p>
        </div>

        <section className={estilos.seccion}>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>El directorio</h2>
            <span className="micro" data-sinpunto>{personas.length} persona{personas.length === 1 ? '' : 's'}</span>
          </div>

          {personas.length === 0 ? (
            <p className={estilos.subtitulo}>Todavía no hay nadie en el directorio.</p>
          ) : (
            <ul className={estilos.listaPersonas}>
              {personas.map((p) => (
                <FilaPersona
                  key={p.correo}
                  persona={p}
                  esYo={miCorreo !== null && miCorreo === p.correo}
                  cambiarRol={cambiarRolAction.bind(null, p.correo)}
                  activar={activarPersonaAction.bind(null, p.correo)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className={estilos.seccion}>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Dar de alta</h2>
          </div>
          <FormularioAlta altaAction={altaPersonaAction} />
        </section>
      </main>
    </div>
  )
}
