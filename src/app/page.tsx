import Link from 'next/link'
import Image from 'next/image'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from './hub.module.css'
import {
  estadoDeSalas, ordenarPorUrgencia, temperatura, acuerdosAbiertos,
  acuerdosVencidos, acuerdosEnRiesgo, pulsoDelMes, type EstatusAcuerdo,
} from '@/db/consultas'
import { sesionesSinMinuta } from '@/dominio/salas'
import { altoDeLogo, SIN_LOGO } from '@/temas/logos'
import { moverEstatus, editarAcuerdo } from '@/db/acuerdos'
import { listarSesiones } from '@/db/sesiones'
import { fechaLarga, textoDiasDesde, fechaBreve, diasHasta } from '@/lib/fecha'
import { cerrarSesion, exigirEquipo } from '@/auth/sesion'
import { ModuloAcuerdos } from '@/componentes/hogar/ModuloAcuerdos'
import { ModuloCalendario } from '@/componentes/hogar/ModuloCalendario'
import { ModuloMinutas, type MinutaEnHome } from '@/componentes/hogar/ModuloMinutas'
import type { SesionMinutable } from '@/componentes/LevantarMinuta'

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

  // Sin esto Next lo prerenderiza y la app queda congelada en la fecha del build.
  await connection()
  const hoy = new Date()

  const [salasCrudas, riesgo, pulso, sesiones] = await Promise.all([
    estadoDeSalas(),
    acuerdosEnRiesgo(),
    pulsoDelMes(),
    listarSesiones(),
  ])
  const salas = ordenarPorUrgencia(salasCrudas)

  // Las minutas de las diez salas en una sola lista, la más reciente arriba.
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

  // Las reuniones presentadas SIN minuta, de las diez salas. Antes esto era un
  // número —"3 sesiones sin minuta"— y con un número no se puede levantar
  // ninguna: hay que saber cuáles son.
  const sinMinuta: SesionMinutable[] = salasCrudas.flatMap((s) =>
    sesionesSinMinuta(s).map((x) => ({ ...x, salaNombre: s.nombre, salaColor: s.color })),
  )

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
          <Link href="/preparar" className={estilos.barraLink}>Preparar</Link>
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
            <h1 className={estilos.saludo}>Marketing Corp</h1>
            <p className={estilos.saludoSub}>El estado de la relación con cada unidad.</p>
          </div>
          <div className={estilos.pulsoCifras}>
            <div className={estilos.pulsoItem}>
              <span className="cifra">{pulso.salas}</span>
              <span className="micro">salas</span>
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
            acuerdos={riesgo}
            abiertos={pulso.acuerdosAbiertos}
            cambiarEstatusAction={cambiarEstatusAction}
            ponerFechaAction={ponerFechaAction}
          />
          <ModuloCalendario sesiones={paraCalendario} hoy={hoy.toISOString()} />
          <ModuloMinutas minutas={minutas} pendientes={sinMinuta} />
        </div>

        {/* Las salas, con su logotipo. */}
        <section>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Las diez salas</h2>
            <span className="micro" data-sinpunto>ordenadas por atención pendiente</span>
          </div>

          <div className={estilos.salas}>
            {salas.map((s) => {
              const t = temperatura(s)
              const abiertos = acuerdosAbiertos(s)
              const vencidos = acuerdosVencidos(s)
              const dias = s.proximaSesion ? diasHasta(s.proximaSesion, hoy) : null
              return (
                <Link
                  key={s.slug}
                  href={`/sala/${s.slug}`}
                  className={`tarjeta ${estilos.sala}`}
                  style={{ '--marca': s.color } as CSSProperties}
                >
                  {/* El logotipo ES el nombre: la marca identifica más rápido
                      que su nombre escrito en la tipografía del sistema.
                      Salvo en Ceci, que hereda la identidad de Grupo UPAX —
                      poner ahí el logo de UPAX daría dos tarjetas idénticas
                      con salas distintas, que es peor que no poner ninguno. */}
                  <span className={estilos.salaLogo}>
                    {SIN_LOGO.has(s.slug) ? (
                      <span className={estilos.salaNombre}>{s.nombre}</span>
                    ) : (
                      <Image
                        src={`/logos/${s.slug}-color.png`}
                        alt={s.nombre}
                        width={240}
                        height={56}
                        className={estilos.salaLogoImg}
                        // Cada marca a SU altura: igualar alturas hace que un
                        // logotipo apaisado ocupe cuatro veces más mancha.
                        style={{ '--alto-logo': `${altoDeLogo(s.slug)}px` } as CSSProperties}
                      />
                    )}
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
      </main>
    </div>
  )
}
