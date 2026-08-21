import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { eq } from 'drizzle-orm'
import estilos from './salas.module.css'
import { cargarTemas, slugsDeSalas } from '@/db/temas'
import { slugsDeSalasPausadas } from '@/db/salas'
import { tokenDeAgenda } from '@/db/enlace-agenda'
import { db, hayDB } from '@/db/cliente'
import * as esquema from '@/db/esquema'
import { exigirAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { urlBase } from '@/lib/url-base'
import { FormularioSala } from '@/componentes/salas/FormularioSala'
import { BloqueEnlaceAgenda } from '@/componentes/salas/BloqueEnlaceAgenda'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { crearSalaAction, editarSalaAction, recalcularPaletaAction, generarEnlaceAction, revocarEnlaceAction } from './acciones'

export const dynamic = 'force-dynamic'

/**
 * `/SALAS` — la razón de ser de la ronda 8: las nueve salas se mudaron de
 * código a la base (tarea 5) precisamente para que esta pantalla pudiera
 * existir. Aquí Franco crea salas nuevas y edita las que ya tiene, con su
 * marca completa y su logo medido; y aquí mismo se genera y se revoca el
 * enlace público de la agenda (tarea 1), porque es la misma pregunta que el
 * resto de esta pantalla — qué puede ver alguien de fuera.
 *
 * Solo equipo, como cualquier pantalla de configuración de esta app.
 *
 * NINGUNA ACCIÓN DE AQUÍ BORRA SALAS. Para dejar de atender una está la
 * pausa (ronda 7, ver `PausaSala` dentro de la propia sala) — borrarla
 * dejaría sus sesiones, acuerdos y minutas colgando de algo que no existe.
 */
export default async function PagSalas({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; nueva?: string }>
}) {
  await exigirAdmin()
  // `connection()`/`hoy` (ronda 11, tarea 2): mismo mecanismo que `/` y
  // `/deck` para que `BarraNavegacion` pinte la fecha de HOY, no la del
  // build — aunque `searchParams`, más abajo, ya vuelve dinámica esta
  // página por su cuenta (ver la guía de Next, "Rendering with search
  // params"), se deja explícito por el mismo motivo que en las demás
  // pantallas de esta ronda: no depender de un efecto colateral para algo
  // que se puede pedir directamente.
  await connection()
  const hoy = new Date()
  // `admin` para `BarraNavegacion`: siempre `true` aquí — si `exigirAdmin()`
  // no lanzó arriba, la sesión YA administra Marketing Corporativo. Llamar a
  // `esAdmin()` sería preguntarle lo mismo a la sesión dos veces.
  const admin = true
  // Los clientes del desplegable de la barra. Prop obligatoria a propósito:
  // así una pantalla nueva no puede montar la barra y olvidarse de ellos.
  const clientes = await clientesParaBarra()

  // Mismo patrón que `salir` en `src/app/page.tsx` / `src/app/deck/page.tsx`:
  // repetido a propósito en cada pantalla que monta `BarraNavegacion`.
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  const { editar, nueva } = await searchParams

  const [slugs, registro, pausadas, token] = await Promise.all([
    slugsDeSalas(),
    cargarTemas(),
    slugsDeSalasPausadas(),
    tokenDeAgenda(),
  ])

  const enlace = token ? `${await urlBase()}/agenda/${token}` : null

  // El slug que se está editando, solo si es de verdad una de las nueve — un
  // `?editar=` con basura o con una sala que ya no existiera no debe reventar
  // la pantalla, solo no abrir ningún formulario de edición.
  const editarSlug = editar && slugs.includes(editar) ? editar : null

  // logoUrl/logoRelacionDeTinta/cadencia no viven en `Tema` (cargarTemas()
  // no las trae — logoUrl/logoRelacionDeTinta no formaban parte del tipo
  // antes de la tarea 6, y cadencia nunca formó parte de él porque es
  // freeze/config operativa, no marca; ver src/temas/tipos.ts) así que se
  // piden aparte, y SOLO para la sala que se está editando: la lista no
  // enseña miniatura de logo ni cadencia, no hace falta traerlas las nueve.
  //
  // CADENCIA SUMADA EN LA TAREA 15: hasta aquí esta consulta solo traía las
  // dos columnas de logo, y el `sala={{...}}` de más abajo no pasaba
  // `cadencia` en absoluto — así que `FormularioSala` (que la T16 ya sabía
  // pintar) siempre arrancaba en su valor por defecto ('mensual'), nunca en
  // la cadencia real de la sala que se estaba editando. Mismo defecto que
  // `editarSalaAction` tenía del lado de la escritura (ver acciones.ts), solo
  // que este era del lado de la lectura.
  const extraDeLaEditada =
    editarSlug && hayDB()
      ? (
          await db()
            .select({
              logoUrl: esquema.salas.logoUrl,
              logoRelacionDeTinta: esquema.salas.logoRelacionDeTinta,
              cadencia: esquema.salas.cadencia,
            })
            .from(esquema.salas)
            .where(eq(esquema.salas.slug, editarSlug))
        )[0]
      : null

  return (
    <div className={estilos.app}>
      <BarraNavegacion seccionActiva="salas" hoy={hoy} admin={admin} clientes={clientes} salirAction={salir} />

      <main className={estilos.main}>
        {/* SIN DATABASE_URL (revisión final de la rama, punto 5): sin esta
            variable, `cargarTemas()` (src/db/temas.ts) cae a la SEMILLA —las
            nueve salas tal como estaban en código hasta el 30-jul, con pinta
            de lista normal y editable— mientras que el Home, en el MISMO
            despliegue, cae a cero salas sin explicación (`estadoDeSalas()`
            no tiene de dónde inventar una lista sin base). Las dos
            decisiones son defensables por separado; juntas, una pantalla
            dice "todo bien" y la otra "no hay nada" del mismo problema. Este
            aviso hace explícito lo que ya es cierto: nada de aquí abajo se
            puede guardar (`crearSalaAction`/`editarSalaAction` devuelven
            este mismo motivo si se intenta), y lo que se ve es código, no la
            base. */}
        {!hayDB() && (
          <div className={estilos.avisoSinBase} role="alert">
            <strong>Sin base de datos configurada</strong> — falta <code>DATABASE_URL</code> en este
            entorno. Lo que ves abajo es el brandbook tal como está en el código (la semilla), no
            necesariamente el vigente: si alguien ya editó una marca desde esta pantalla en
            producción, aquí no se refleja. Y nada se puede guardar todavía — Crear y Guardar
            cambios van a fallar con este mismo aviso.
          </div>
        )}

        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>Clientes</h1>
          {/* ⚠️ CUATRO LÍNEAS MENOS (21-ago-2026). Este párrafo explicaba cómo
              se deriva una paleta del primario y cómo recalcularla — instrucciones
              de un formulario, escritas en la pantalla que solo LISTA las salas.
              Quien viene aquí viene a entrar en una, no a aprender el modelo de
              color; y quien va a montar una lo lee donde le sirve, en el
              formulario, que ya lo dice campo por campo. */}
          <p className={estilos.subtitulo}>
            Las nueve unidades de negocio, cada una con su marca y su espacio.
          </p>
        </div>

        <section className={estilos.seccion}>
          <BloqueEnlaceAgenda
            enlace={enlace}
            generarAction={generarEnlaceAction}
            revocarAction={revocarEnlaceAction}
          />
        </section>

        <section className={estilos.seccion}>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Las nueve salas</h2>
            {!nueva && !editarSlug && (
              <Link href="/salas?nueva=1" className="boton">
                + Crear sala
              </Link>
            )}
          </div>

          <ul className={estilos.listaSalas}>
            {slugs.map((slug) => {
              const tema = registro[slug]
              const enPausa = pausadas.has(slug)
              const seEstaEditando = editarSlug === slug
              return (
                <li key={slug} className={estilos.filaSala}>
                  <div className={estilos.filaResumen}>
                    {/* ⚠️ EL DEGRADADO DE LA MARCA, NO SU PRIMARIO A SECAS
                        (21-ago-2026). Con el primario plano, Marketing United
                        y House of Films son el MISMO PUNTO NEGRO —las dos
                        tienen `primario: #000000`— y la lista deja de
                        distinguirlas por color, que es justo para lo que está
                        ese punto. Sus degradados sí difieren: HoF va a
                        #3a7cf7 y MU a #000075, así que el punto los separa sin
                        tocar la marca de nadie (que es decisión de Franco, no
                        de esta pantalla). Y de paso dice la verdad: en una
                        casa de marcas, la marca de una sala ES su degradado
                        — es lo que viste su cabecera. */}
                    <span
                      className={estilos.filaColor}
                      style={{ background: `linear-gradient(135deg, ${tema.gradiente.join(', ')})` }}
                      aria-hidden
                    />
                    {/* EL NOMBRE ES LA PUERTA A LA SALA, no solo el botón del
                        final (Franco: *"dentro de la pestaña clientes el
                        nombre también debe llevarme a la sala, no solo el
                        botón «Ver sala»"*). Es lo que hace todo el mundo al
                        llegar a una lista: pulsar el nombre. Que no hiciera
                        nada obligaba a cruzar la fila entera hasta el botón.
                        El botón se queda: dice a dónde lleva, y el nombre por
                        sí solo no lo dice. */}
                    <Link href={`/cliente/${slug}`} className={estilos.filaNombre}>
                      {tema.nombre}
                    </Link>
                    <span className="pildora" data-tono={enPausa ? undefined : 'bien'}>
                      {enPausa ? 'en pausa' : 'activa'}
                    </span>
                    <span className={estilos.filaAcciones}>
                      {seEstaEditando ? (
                        <Link href="/salas" className="boton" data-tono="fantasma">
                          Cerrar
                        </Link>
                      ) : (
                        <Link href={`/salas?editar=${slug}`} className="boton" data-tono="suave">
                          Editar
                        </Link>
                      )}
                      <Link href={`/cliente/${slug}`} className="boton" data-tono="fantasma">
                        Ver sala →
                      </Link>
                    </span>
                  </div>

                  {seEstaEditando && (
                    <div className={estilos.filaFormulario}>
                      <FormularioSala
                        guardar={editarSalaAction.bind(null, slug)}
                        recalcularPaleta={recalcularPaletaAction.bind(null, slug)}
                        slugsUsados={slugs.filter((s) => s !== slug)}
                        sala={{
                          slug,
                          nombre: tema.nombre,
                          primario: tema.primario,
                          // Los que la marca tiene hoy: el formulario arranca
                          // con ellos para que editar no los borre sin querer.
                          secundario: tema.secundario,
                          acento: tema.acento,
                          familiaDisplay: tema.familiaDisplay,
                          familiaTexto: tema.familiaTexto,
                          logoUrl: extraDeLaEditada?.logoUrl ?? null,
                          logoRelacionDeTinta: extraDeLaEditada?.logoRelacionDeTinta ?? null,
                          cadencia: extraDeLaEditada?.cadencia ?? 'mensual',
                          // Mismo motivo que `secundario`/`acento`, y aquí más
                          // grave: `editarSalaAction` escribe `redes` siempre,
                          // así que sin esto guardar cualquier cambio las
                          // borraría todas.
                          redes: tema.redes,
                          analyticsUrl: tema.analyticsUrl,
                          gradienteInicio: tema.gradiente[0],
                          gradienteFin: tema.gradiente[1],
                          superficieOscura: tema.superficieOscura,
                          superficieClara: tema.superficieClara,
                          textoSobreClara: tema.textoSobreClara,
                          textoSobreOscura: tema.textoSobreOscura,
                          iconoTitulo: tema.iconoTitulo ?? undefined,
                          textoSobreGradiente: tema.textoSobreGradiente ?? undefined,
                        }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {nueva && (
          <section className={estilos.seccion}>
            <div className={estilos.seccionCabecera}>
              <h2 className={estilos.seccionTitulo}>Crear una sala</h2>
              <Link href="/salas" className="boton" data-tono="fantasma">
                Cancelar
              </Link>
            </div>
            <FormularioSala guardar={crearSalaAction} slugsUsados={slugs} />
          </section>
        )}
      </main>
    </div>
  )
}
