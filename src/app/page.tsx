import Link from 'next/link'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import estilos from './hub.module.css'
import {
  estadoDeSalas, ordenarPorUrgencia, temperatura, acuerdosAbiertos,
  acuerdosVencidos, acuerdosEnRiesgo, pulsoDelMes,
} from '@/db/consultas'
import { fechaLarga, textoDiasDesde, textoProxima } from '@/lib/fecha'
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
                <div className={estilos.v}>{pulso.salaMasDesatendida.nombre} · {pulso.salaMasDesatendida.dias} d</div>
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
                return (
                  <Link key={s.slug} href={`/sala/${s.slug}`} className={estilos.sala}>
                    <div className={estilos.salaCentro}>
                      <div className={estilos.salaNombre}>
                        <span className={estilos.salaPunto} style={{ background: s.color }} />
                        {s.nombre}
                      </div>
                      <div className={estilos.salaMeta}>
                        <span className={`${estilos.temp} ${estilos[t]}`}>{textoDiasDesde(s.diasDesdeUltima)}</span>
                        <span className={estilos.sep}>·</span>
                        <span>{textoProxima(s.proximaSesion, hoy)}</span>
                      </div>
                    </div>
                    <div className={estilos.salaDcha}>
                      <div className={estilos.chips}>
                        {s.enPreparacion && <span className={estilos.chip + ' ' + estilos.prep}>en preparación</span>}
                        {vencidos > 0 && <span className={estilos.chip + ' ' + estilos.vencidos}>{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
                        {abiertos > 0 && <span className={estilos.chip}>{abiertos} abierto{abiertos > 1 ? 's' : ''}</span>}
                      </div>
                      <span className={estilos.flecha}>→</span>
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
