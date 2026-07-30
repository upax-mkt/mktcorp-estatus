import Link from 'next/link'
import Image from 'next/image'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from './hub.module.css'
import {
  estadoDeSalas, ordenarPorProximaReunion, temperatura, acuerdosAbiertos,
  acuerdosVencidos, todosLosAcuerdos, pulsoDelMes, type EstatusAcuerdo,
} from '@/db/consultas'
import { sesionesMinutables, type SesionMinutable } from '@/dominio/salas'
import { altoDeLogo, archivoDeLogo } from '@/temas/logos'
import { moverEstatus, editarAcuerdo } from '@/db/acuerdos'
import { destacarAction } from '@/app/acuerdos/acciones'
import { listarSesiones } from '@/db/sesiones'
import { directorio } from '@/db/personas'
import { moldeDeMinuta, guardarMoldeDeMinuta } from '@/db/plantillas'
import { loQueFaltaAlMolde, type MoldeMinuta } from '@/minuta/molde'
import { fechaLarga, fechaBreve, textoDiasDesde, diasHasta, diaCivil } from '@/lib/fecha'
import { cerrarSesion, exigirEquipo } from '@/auth/sesion'
import { ModuloAcuerdos } from '@/componentes/hogar/ModuloAcuerdos'
import { ModuloCalendario } from '@/componentes/hogar/ModuloCalendario'
import { ModuloMinutas, type MinutaEnHome } from '@/componentes/hogar/ModuloMinutas'
import { colorDeTextoDeMarca } from '@/temas'

/**
 * El Home.
 *
 * Era una lista de diez renglones con un puntito de color y un panel de
 * acuerdos que solo se podía mirar. Ahora es un tablero: las salas como
 * tarjetas con su logotipo, y tres módulos que se USAN sin salir de aquí —
 * el mes, los acuerdos en riesgo (editables en el sitio) y las minutas.
 *
 * El orden de la página es el orden de las preguntas que uno se hace al
 * abrirla: qué se me está venciendo, qué viene, y cómo está cada relación.
 */
export default async function Hub() {
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  async function cambiarEstatusAction(id: string, estatus: EstatusAcuerdo) {
    'use server'
    await exigirEquipo()
    await moverEstatus(id, estatus)
    revalidatePath('/')
  }

  async function ponerFechaAction(id: string, fecha: string | null) {
    'use server'
    await exigirEquipo()
    await editarAcuerdo(id, { fechaCompromiso: fecha ? new Date(fecha) : null })
    revalidatePath('/')
  }

  async function guardarMoldeAction(nuevo: MoldeMinuta): Promise<{ error?: string }> {
    'use server'
    await exigirEquipo()
    // Se revalida en el servidor aunque el editor ya lo compruebe: ocultar un
    // botón no protege una acción.
    const faltas = loQueFaltaAlMolde(nuevo)
    if (faltas.length > 0) return { error: `Falta ${faltas.join(' y ')}.` }
    try {
      await guardarMoldeDeMinuta(null, nuevo)
      revalidatePath('/')
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo guardar el molde.' }
    }
  }

  // Sin esto Next lo prerenderiza y la app queda congelada en la fecha del build.
  await connection()
  const hoy = new Date()

  const [salasCrudas, acuerdos, pulso, sesiones, personas] = await Promise.all([
    estadoDeSalas(),
    // Las diez salas juntas (tarea 11): de aquí salen los dos bloques de
    // ModuloAcuerdos (tarea 12) — destacados y vencidos son dos filtros sobre
    // la MISMA lista, no dos consultas que se puedan desincronizar entre sí.
    todosLosAcuerdos(),
    pulsoDelMes(),
    listarSesiones(),
    // Para el selector de responsable de ModuloMinutas → LevantarMinuta →
    // MinutaCliente — directorio() ya aguanta Monday caído.
    directorio(),
  ])
  const molde = await moldeDeMinuta(null)
  const salas = ordenarPorProximaReunion(salasCrudas)
  // En pausa, aparte (tarea 12): `ordenarPorProximaReunion` ya las manda al
  // final del mismo orden, pero la tarjeta de una sala congelada no tiene
  // nada en común con la de una activa —ni próxima sesión, ni vencidos que
  // contar— así que se separan en su propio bloque en vez de mezclarse en la
  // misma rejilla con media tarjeta vacía.
  const salasActivas = salas.filter((s) => s.activa)
  const salasPausadas = salas.filter((s) => !s.activa)
  const destacados = acuerdos.filter((a) => a.destacado)
  // Nombre distinto de la constante `vencidos` que ya existe MÁS ABAJO, por
  // sala, dentro del .map() de tarjetas — son dos cosas distintas (una lista
  // completa vs. un conteo por sala) y compartir nombre solo confundiría.
  const acuerdosVencidosParaHome = acuerdos.filter((a) => a.estatus === 'vencido')

  // Las minutas de todas las salas en una sola lista, la más reciente arriba.
  const minutas: MinutaEnHome[] = salasCrudas
    .flatMap((s) =>
      s.minutas.map((m) => ({
        id: m.sesionId ?? `${s.slug}-${m.fecha}`,
        titulo: m.titulo,
        fecha: m.fecha,
        salaSlug: s.slug,
        salaNombre: s.nombre,
        salaColor: s.color,
        texto: m.texto,
        sesionId: m.sesionId,
      })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  // TODA reunión cuyo día ya llegó y que no tenga minuta, sea borrador o no.
  // Antes solo se ofrecían las marcadas como «presentada», y marcar una sesión
  // como presentada es papeleo: la reunión ocurrió igual. Obligar al papeleo
  // antes de poder minutar es la forma más segura de que nadie encuentre el
  // motor de transcripción.
  const conMinuta = new Set(
    salasCrudas.flatMap((s) => s.minutas.map((m) => m.sesionId).filter((x): x is string => Boolean(x))),
  )
  const sinMinuta: SesionMinutable[] = sesionesMinutables(sesiones, conMinuta, diaCivil(hoy.toISOString()))

  const paraCalendario = sesiones.map((s) => ({
    id: s.id,
    fecha: s.fecha,
    titulo: s.titulo,
    salaSlug: s.salaSlug,
    salaNombre: s.salaNombre,
    salaColor: s.salaColor,
    estado: s.estado,
  }))

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.marca}>
          <Image
            src="/logos/marketing-corp-blanco.png"
            alt="Marketing Corp"
            width={140}
            height={33}
            className={estilos.marcaLogo}
            priority
          />
        </Link>
        <nav className={estilos.barraDcha}>
          <Link href="/agenda" className={estilos.barraLink}>Agenda</Link>
          <Link href="/deck" className={estilos.barraLink}>Deck Designer</Link>
          <span className={estilos.barraFecha}>{fechaLarga(hoy)}</span>
          <form action={salir}>
            <button type="submit" className={estilos.barraSalir}>Salir</button>
          </form>
        </nav>
      </header>

      <main className={estilos.main}>
        {/* El pulso: cuatro cifras grandes y sus rótulos diminutos. */}
        <section className={estilos.pulso}>
          <div>
            <h1 className={estilos.saludo}>Meeting Hub</h1>
            <p className={estilos.saludoSub}>El estado de la relación con cada cliente.</p>
          </div>
          <div className={estilos.pulsoCifras}>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.salas}</span>
              <span className="micro">clientes</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.sesionesUltimos30}</span>
              <span className="micro">con sesión este mes</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.acuerdosAbiertos}</span>
              <span className="micro">acuerdos abiertos</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className="cifra" data-alerta={pulso.acuerdosVencidos > 0 ? 'true' : undefined}>
                {pulso.acuerdosVencidos}
              </span>
              <span className="micro">vencidos</span>
            </div>
          </div>
        </section>

        {/* Los módulos: lo que hay que atender y lo que viene. */}
        <div className={estilos.modulos}>
          <ModuloAcuerdos
            destacados={destacados}
            vencidos={acuerdosVencidosParaHome}
            total={acuerdos.length}
            destacarAction={destacarAction}
            cambiarEstatusAction={cambiarEstatusAction}
            ponerFechaAction={ponerFechaAction}
          />
          <ModuloCalendario sesiones={paraCalendario} hoy={hoy.toISOString()} />
          <ModuloMinutas
            minutas={minutas}
            pendientes={sinMinuta}
            salas={salasCrudas.map((x) => ({ slug: x.slug, nombre: x.nombre }))}
            molde={molde}
            guardarMoldeAction={guardarMoldeAction}
            personas={personas}
          />
        </div>

        {/* Las salas, con su logotipo. */}
        <section>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Los clientes</h2>
            <span className="micro" data-sinpunto>ordenadas por próxima reunión</span>
          </div>

          <div className={estilos.salas}>
            {salasActivas.map((s) => {
              const t = temperatura(s)
              const abiertos = acuerdosAbiertos(s)
              const vencidos = acuerdosVencidos(s)
              const dias = s.proximaSesion ? diasHasta(s.proximaSesion, hoy) : null
              return (
                <Link
                  key={s.slug}
                  href={`/cliente/${s.slug}`}
                  className={`tarjeta ${estilos.sala}`}
                  style={{ '--marca': s.color, '--marca-texto': colorDeTextoDeMarca(s.color) } as CSSProperties}
                >
                  {/* El logotipo ES el nombre: la marca identifica más rápido
                      que su nombre escrito en la tipografía del sistema. Las
                      nueve tienen el suyo — Ceci, su firma. */}
                  <span className={estilos.salaLogo}>
                    <Image
                      src={archivoDeLogo(s.slug)}
                      alt={s.nombre}
                      width={180}
                      height={40}
                      className={estilos.salaLogoImg}
                      // Cada marca a SU altura: igualar alturas hace que un
                      // logotipo apaisado ocupe cuatro veces más mancha.
                      style={{ '--alto-logo': `${altoDeLogo(s.slug)}px` } as CSSProperties}
                    />
                  </span>

                  <div className={estilos.salaCuando}>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV} data-temp={t}>
                        {textoDiasDesde(s.diasDesdeUltima)}
                      </span>
                      <span className="micro" data-sinpunto>última</span>
                    </span>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV} data-pendiente={s.proximaSesion ? undefined : 'true'}>
                        {s.proximaSesion
                          ? `${fechaBreve(s.proximaSesion)}${dias != null && dias >= 0 ? ` · ${dias} d` : ''}`
                          : 'por agendar'}
                      </span>
                      <span className="micro" data-sinpunto>próxima</span>
                    </span>
                  </div>

                  {s.enPreparacion && s.seccionesTotales ? (
                    <div className={estilos.salaAvance}>
                      <span className={estilos.salaAvanceTexto}>
                        <span>{s.seccionesEscritas} de {s.seccionesTotales} secciones</span>
                        <span>{s.avancePreparacion}%</span>
                      </span>
                      <span className={estilos.salaBarra}>
                        <span className={estilos.salaBarraRelleno} style={{ width: `${s.avancePreparacion ?? 0}%` }} />
                      </span>
                    </div>
                  ) : (
                    <span />
                  )}

                  <div className={estilos.salaChips}>
                    {s.enPreparacion && <span className="pildora" data-tono="marca">en preparación</span>}
                    {vencidos > 0 && <span className="pildora" data-tono="mal">{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
                    {abiertos > 0 && <span className="pildora">{abiertos} abierto{abiertos > 1 ? 's' : ''}</span>}
                    {abiertos === 0 && vencidos === 0 && <span className="pildora">al día</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* EN PAUSA (tarea 12): aparte de "Los clientes", no mezcladas en la
            misma rejilla. Una sala en freeze no se borra —su historia se
            sigue consultando igual, y por eso sigue siendo un link a su
            sala— pero no tiene próxima sesión que anunciar ni vencidos que
            contar, así que la tarjeta dice otra cosa: desde cuándo está en
            pausa. */}
        {salasPausadas.length > 0 && (
          <section>
            <div className={estilos.seccionCabecera}>
              <h2 className={estilos.seccionTitulo}>En pausa</h2>
              <span className="micro" data-sinpunto>freeze comercial — sin reuniones ni gestión hasta nuevo aviso</span>
            </div>

            <div className={estilos.salas}>
              {salasPausadas.map((s) => (
                <Link
                  key={s.slug}
                  href={`/cliente/${s.slug}`}
                  className={`tarjeta ${estilos.sala} ${estilos.salaPausada}`}
                  style={{ '--marca': s.color, '--marca-texto': colorDeTextoDeMarca(s.color) } as CSSProperties}
                >
                  <span className={estilos.salaLogo}>
                    <Image
                      src={archivoDeLogo(s.slug)}
                      alt={s.nombre}
                      width={180}
                      height={40}
                      className={estilos.salaLogoImg}
                      style={{ '--alto-logo': `${altoDeLogo(s.slug)}px` } as CSSProperties}
                    />
                  </span>

                  <div className={estilos.salaCuando}>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV}>{textoDiasDesde(s.diasDesdeUltima)}</span>
                      <span className="micro" data-sinpunto>última</span>
                    </span>
                    <span className={estilos.salaDato}>
                      <span className={estilos.salaDatoV}>
                        {s.pausadaDesde ? fechaBreve(s.pausadaDesde) : '—'}
                      </span>
                      <span className="micro" data-sinpunto>en pausa desde</span>
                    </span>
                  </div>

                  <span />

                  <div className={estilos.salaChips}>
                    <span className="pildora">en pausa</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
