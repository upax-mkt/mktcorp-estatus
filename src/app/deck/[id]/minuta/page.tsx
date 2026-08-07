import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import type { CSSProperties } from 'react'
import estilos from '../../deck.module.css'
import { obtenerReunion } from '@/db/reuniones'
import { revalidatePath } from 'next/cache'
import { obtenerMinuta, editarTextoMinuta, eliminarMinuta, cargarMinutaExterna } from '@/db/minutas'
import { exigirEditor, exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { BarraNavegacion } from '@/componentes/BarraNavegacion'
import { registrarEdicion } from '@/db/participacion'
import { directorio } from '@/db/personas'
import { diaCivil, fechaCompleta } from '@/lib/fecha'
import { MinutaCliente } from './MinutaCliente'
import { MinutaPublicada } from '@/componentes/MinutaPublicada'
import { MinutaExternaForm } from '@/componentes/MinutaExternaForm'

// La llamada a Claude (etapa 9, ~similar a la etapa 2 del motor) puede tardar
// varios segundos: el default serverless de Vercel (10s) no alcanza.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function PagMinutaSesion({ params }: { params: Promise<{ id: string }> }) {
  // Página de equipo que faltaba exigir a nivel de página (corrección
  // post-revisión de la ronda 9) — la comprobación de sesión va primero.
  await exigirLectura()
  // `connection()`/`hoy`/`admin` (ronda 11, enganche de la tarea 2): mismo
  // mecanismo que `/` y `/deck` — la fecha y el gate de Clientes/Personas
  // que pinta `BarraNavegacion`, que esta pantalla no montaba hasta ahora.
  // Resueltos aquí arriba, antes de los DOS `return` de esta función: el
  // early return de "todavía no se dio" (más abajo) también monta la barra,
  // así que los dos caminos necesitan `hoy`/`admin`/`salir` ya listos.
  await connection()
  const hoy = new Date()
  const admin = await esAdmin()
  const { id } = await params
  const reunion = await obtenerReunion(id)
  if (!reunion) notFound()

  const estiloSala = { '--sala': reunion.salaColor } as CSSProperties

  // Mismo patrón que `salir` en `src/app/page.tsx` / `src/app/deck/page.tsx`:
  // repetido a propósito en cada pantalla que monta `BarraNavegacion`. Se
  // define aquí arriba —antes de los DOS `return` de la función— porque el
  // early return de "todavía no se dio", justo abajo, también la necesita.
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  /**
   * LO QUE DECIDE ES SI LA REUNIÓN YA OCURRIÓ, no si alguien alcanzó a
   * maquetar.
   *
   * El spec §9 decía "solo disponible cuando la sesión está presentada/lista",
   * y eso se implementó como "cualquier estado que no sea borrador". Confundía
   * dos cosas distintas: que el DOCUMENTO esté maquetado y que la REUNIÓN haya
   * pasado. Una reunión se da igual aunque nadie haya tenido tiempo de
   * maquetar nada —o aunque se diera sin presentación— y el acta hace falta
   * igual. El resultado era que el motor de transcripción, que existe desde la
   * primera versión, no se encontraba.
   *
   * Lo único que sigue sin tener sentido es minutar algo que aún no ha
   * pasado: no hay nada que transcribir.
   */
  const yaOcurrio = diaCivil(reunion.fecha) <= diaCivil(hoy.toISOString())
  if (!yaOcurrio) {
    return (
      <div className={estilos.app} style={estiloSala}>
        {/* LA BARRA (ronda 11, enganche de la tarea 2), arriba del todo — no
            sustituye al "← Editar documento" de abajo: volver a editar el
            documento de ESTA reunión y saltar a otra sección son cosas
            distintas (mismo criterio que `deck/[id]/page.tsx`).
            `seccionActiva="deck"`, no "presentaciones": `SeccionBarra` solo
            tiene esa clave — el nombre visible de la pestaña es
            "Presentaciones" (tarea 18), pero la ruta y la clave del ciclo
            siguen siendo `deck`. */}
        <BarraNavegacion seccionActiva="deck" hoy={hoy} admin={admin} salirAction={salir} />
        <header className={estilos.barra}>
          {/* "Cuestionario" no es el nombre de `/deck/{id}` desde hace dos
              rondas (auditoría UX/UI, 7-ago): hoy es el editor del documento
              de la reunión, y así se refieren a él las otras pantallas que
              enlazan aquí — "Editar →" en `/reunion/[id]`, "Seguir
              editando →" en la sala. */}
          <Link href={`/deck/${id}`} className={estilos.volver}>← Editar documento</Link>
          <div className={estilos.barraTitulo}>{reunion.salaNombre} · Minuta</div>
        </header>
        <main className={estilos.main}>
          {/* EL VACÍO DE UNA REUNIÓN FUTURA (auditoría UX/UI, 7-ago): antes
              era una franja de texto en una página en blanco, con un único
              "Volver al cuestionario" sin estilo —técnicamente un enlace,
              pero sin `className` hereda el reset global de `<a>`
              (`color: inherit; text-decoration: none`, `globals.css`) y en
              pantalla se lee como texto suelto—. Mismo tono que los otros
              vacíos de la app (`BenchmarkSala`, `ReunionesSala`): explica qué
              va a aparecer aquí, y ahora además ofrece las DOS salidas reales
              en vez de una sola casi invisible — preparar el documento de
              esta reunión, o volver a la lista. */}
          <div className={estilos.panelMaquetarAviso}>
            <p>
              Esta reunión está agendada para el {fechaCompleta(reunion.fecha)}. La minuta se levanta
              cuando ya se dio: se pega su transcripción y la IA propone el acta y los acuerdos.
            </p>
            <div className={estilos.generarFila}>
              <Link href={`/deck/${id}`} className={`${estilos.boton} ${estilos.botonAcento}`}>
                Preparar el documento →
              </Link>
              <Link href="/deck" className={`${estilos.boton} ${estilos.botonSecundario}`}>
                ← Presentaciones
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const minutaGuardada = await obtenerMinuta(id)
  // Para el selector de responsable de MinutaCliente — directorio() ya
  // aguanta Monday caído devolviendo la copia local (o [], sin ninguna).
  const personas = await directorio()

  // Publicar y corregir son cosas distintas: publicar decide qué acuerdos
  // nacen (y eso no se repite), corregir solo arregla el texto del correo.
  // Las dos escriben la minuta de la sesión, así que las dos registran a
  // quien lo hizo (ronda 9, tarea 4) — `eliminarAction`, más abajo, no: borra
  // el acta entera, no la prepara.
  async function editarAction(texto: string) {
    'use server'
    const quien = await exigirEditor()
    await editarTextoMinuta(id, texto)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}/minuta`)
  }

  async function eliminarAction() {
    'use server'
    await exigirEditor()
    await eliminarMinuta(id)
    revalidatePath(`/deck/${id}/minuta`)
  }

  async function cargarExternaAction(texto: string) {
    'use server'
    const quien = await exigirEditor()
    await cargarMinutaExterna(id, texto)
    if (quien.sub) await registrarEdicion(id, quien.sub)
    revalidatePath(`/deck/${id}/minuta`)
  }

  return (
    <div className={estilos.app} style={estiloSala}>
      {/* LA BARRA: mismo montaje que en el early return de arriba — ver su
          comentario ("todavía no se dio") para el porqué de `seccionActiva`
          y de por qué no sustituye al "← Editar documento". */}
      <BarraNavegacion seccionActiva="deck" hoy={hoy} admin={admin} salirAction={salir} />
      <header className={estilos.barra}>
        <Link href={`/deck/${id}`} className={estilos.volver}>← Editar documento</Link>
        <div className={estilos.barraTitulo}>{reunion.salaNombre} · Minuta</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Minuta</h1>
            <p className={estilos.subtitulo}>
              {minutaGuardada
                ? 'Esta reunión ya tiene una minuta publicada. Sus acuerdos confirmados ya viven en el espacio del cliente.'
                : 'Pega la transcripción de la reunión y genera el correo con la IA — nada se publica sin revisión.'}
            </p>
          </div>
        </div>

        {minutaGuardada ? (
          <MinutaPublicada
            texto={minutaGuardada.textoFinal ?? ''}
            editarAction={editarAction}
            eliminarAction={eliminarAction}
          />
        ) : (
          <>
            <MinutaCliente de={{ reunionId: id }} personas={personas} />
            <MinutaExternaForm cargarAction={cargarExternaAction} />
          </>
        )}
      </main>
    </div>
  )
}
