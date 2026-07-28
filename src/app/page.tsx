import Link from 'next/link'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import estilos from './hub.module.css'
import {
  estadoDeSalas, ordenarPorUrgencia, temperatura, acuerdosAbiertos,
  acuerdosVencidos, acuerdosEnRiesgo, pulsoDelMes,
} from '@/db/consultas'
import type { CSSProperties } from 'react'
import { fechaLarga, textoDiasDesde, fechaBreve, diasHasta } from '@/lib/fecha'
import { cerrarSesion } from '@/auth/sesion'

export default async function Hub() {
  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  // El hub muestra el día de hoy y cuenta días contra él: sin esto Next lo
  // prerenderiza y la app queda congelada en la fecha del build.
  await connection()
  const hoy = new Date()

  const [salasCrudas, riesgo, pulso] = await Promise.all([
    estadoDeSalas(),
    acuerdosEnRiesgo(),
    pulsoDelMes(),
  ])
  const salas = ordenarPorUrgencia(salasCrudas)

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <div className={estilos.marca}>
          <span className={estilos.marcaLogo}>M<span className={estilos.marcaRayo}>/</span>C</span>
          <span className={estilos.marcaSub}>Marketing Corp</span>
        </div>
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
        <div className={estilos.encabezado}>
          <h1 className={estilos.saludo}>Salas</h1>
          <p className={estilos.saludoSub}>El estado de la relación con cada unidad, de un vistazo.</p>

          <div className={estilos.pulso}>
            <div className={estilos.pulsoItem}>
              <span className={estilos.pulsoCifra}>{pulso.salas}</span>
              <span className={estilos.pulsoLabel}>salas</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className={estilos.pulsoCifra}>{pulso.sesionesUltimos30}</span>
              <span className={estilos.pulsoLabel}>con sesión este mes</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className={estilos.pulsoCifra}>{pulso.acuerdosAbiertos}</span>
              <span className={estilos.pulsoLabel}>acuerdos abiertos</span>
            </div>
            <div className={estilos.pulsoItem}>
              <span className={`${estilos.pulsoCifra} ${pulso.acuerdosVencidos > 0 ? estilos.alerta : ''}`}>
                {pulso.acuerdosVencidos}
              </span>
              <span className={estilos.pulsoLabel}>vencidos</span>
            </div>
            {pulso.salaMasDesatendida && (
              <div className={estilos.pulsoDesatendida}>
                <div className={estilos.n}>más desatendida</div>
                <div className={estilos.v}>
                  {pulso.salaMasDesatendida.nombre} ·{' '}
                  {pulso.salaMasDesatendida.dias == null
                    ? 'sin sesión aún'
                    : `${pulso.salaMasDesatendida.dias} d`}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={estilos.cuerpo}>
          {/* Lista de salas por urgencia */}
          <section>
            <h2 className={estilos.seccionTitulo}>
              Las 10 salas
              <span className={estilos.conteo}>ordenadas por atención pendiente</span>
            </h2>
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
                    className={estilos.sala}
                    style={{ '--marca': s.color } as CSSProperties}
                  >
                    <div className={estilos.salaCabecera}>
                      <span className={estilos.salaNombre}>{s.nombre}</span>
                      <span className={estilos.flecha}>→</span>
                    </div>

                    <div className={estilos.salaCuando}>
                      <span className={estilos.salaDato}>
                        <span className={`${estilos.salaDatoV} ${estilos.temp} ${estilos[t]}`}>
                          {textoDiasDesde(s.diasDesdeUltima)}
                        </span>
                        <span className={estilos.salaDatoL}>última</span>
                      </span>
                      {/* Sale de la agenda: una sesión agendada tiene fecha
                          aunque nadie haya empezado a prepararla. */}
                      <span className={estilos.salaDato}>
                        <span
                          className={`${estilos.salaDatoV} ${s.proximaSesion ? '' : estilos.pendiente}`}
                        >
                          {s.proximaSesion
                            ? `${fechaBreve(s.proximaSesion)}${dias != null && dias >= 0 ? ` · ${dias} d` : ''}`
                            : 'por agendar'}
                        </span>
                        <span className={estilos.salaDatoL}>próxima</span>
                      </span>
                    </div>

                    {s.enPreparacion && s.seccionesTotales ? (
                      <div className={estilos.salaAvance}>
                        <span className={estilos.salaAvanceTexto}>
                          <span>{s.seccionesEscritas} de {s.seccionesTotales} secciones</span>
                          <span>{s.avancePreparacion}%</span>
                        </span>
                        <span className={estilos.salaAvanceBarra}>
                          <span
                            className={estilos.salaAvanceRelleno}
                            style={{ width: `${s.avancePreparacion ?? 0}%` }}
                          />
                        </span>
                      </div>
                    ) : (
                      <span />
                    )}

                    <div className={estilos.chips}>
                      {s.enPreparacion && <span className={`${estilos.chip} ${estilos.prep}`}>en preparación</span>}
                      {vencidos > 0 && <span className={`${estilos.chip} ${estilos.vencidos}`}>{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
                      {abiertos > 0 && <span className={estilos.chip}>{abiertos} abierto{abiertos > 1 ? 's' : ''}</span>}
                      {abiertos === 0 && vencidos === 0 && (
                        <span className={`${estilos.chip} ${estilos.limpio}`}>sin acuerdos abiertos</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Acuerdos en riesgo */}
          <aside className={estilos.riesgo}>
            <h2 className={estilos.seccionTitulo}>
              Acuerdos en riesgo
              <span className={estilos.conteo}>{riesgo.length}</span>
            </h2>
            {riesgo.length === 0 ? (
              <p className={estilos.vacio}>Nada vencido ni sin fecha. Todo bajo control.</p>
            ) : (
              <div className={estilos.riesgoLista}>
                {riesgo.map((a) => (
                  <Link key={a.id} href={`/sala/${a.salaSlug}`} className={estilos.riesgoItem}>
                    <span className={estilos.riesgoColor} style={{ background: a.salaColor }} />
                    <div>
                      <div className={estilos.riesgoQue}>{a.que}</div>
                      <div className={estilos.riesgoMeta}>
                        <span className={`${estilos.riesgoEstado} ${a.estatus === 'vencido' ? estilos.vencido : estilos.sinfecha}`}>
                          {a.estatus === 'vencido' ? 'vencido' : 'sin fecha'}
                        </span>
                        <span className={estilos.riesgoSala}>{a.salaNombre}</span>
                        {a.responsable && a.responsable !== 'por asignar' && <span>· {a.responsable}</span>}
                        {a.responsable === 'por asignar' && <span>· sin dueño</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
