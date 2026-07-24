import Link from 'next/link'
import estilos from './preparar.module.css'
import { listarSesiones } from '@/db/sesiones'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: 'borrador',
  lista: 'lista para presentar',
  presentada: 'presentada',
  minutada: 'minutada',
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function etiquetaAlcance(alcance: string): string {
  return alcance === 'todos' ? 'todos los squads' : alcance
}

export default async function PagPreparar() {
  const sesiones = await listarSesiones()
  const enPreparacion = sesiones.filter((s) => s.estado === 'borrador' || s.estado === 'lista')
  const resto = sesiones.filter((s) => s.estado === 'presentada' || s.estado === 'minutada')

  return (
    <div className={estilos.app}>
      <header className={estilos.barra}>
        <Link href="/" className={estilos.volver}>← Salas</Link>
        <div className={estilos.barraTitulo}>Preparar</div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.encabezado}>
          <div>
            <h1 className={estilos.titulo}>Preparar una sesión</h1>
            <p className={estilos.subtitulo}>Crear → llenar → maquetar → ver el deck.</p>
          </div>
          <Link href="/preparar/nueva" className={`${estilos.boton} ${estilos.botonAcento}`}>
            + Nueva sesión
          </Link>
        </div>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-3)', fontWeight: 600, marginBottom: '0.9rem' }}>
            En preparación
          </h2>
          {enPreparacion.length === 0 ? (
            <p className={estilos.vacio}>Nada en preparación todavía. Arranca una sesión nueva.</p>
          ) : (
            <div className={estilos.lista}>
              {enPreparacion.map((s) => (
                <Link key={s.id} href={`/preparar/${s.id}`} className={estilos.fila}>
                  <div className={estilos.filaIzq}>
                    <div className={estilos.filaNombre}>
                      <span className={estilos.filaPunto} style={{ background: s.salaColor }} />
                      {s.salaNombre}
                    </div>
                    <div className={estilos.filaMeta}>
                      <span>{s.tipo}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{etiquetaAlcance(s.alcance)}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{fechaCorta(s.fecha)}</span>
                    </div>
                  </div>
                  <div className={estilos.filaDcha}>
                    <div className={estilos.avance}>
                      <div className={estilos.avanceBarra}>
                        <div
                          className={estilos.avanceRelleno}
                          style={{ width: `${s.totalItems > 0 ? Math.round((s.itemsLlenados / s.totalItems) * 100) : 0}%` }}
                        />
                      </div>
                      <span className={estilos.avanceTexto}>{s.itemsLlenados}/{s.totalItems}</span>
                    </div>
                    <span className={`${estilos.chip} ${estilos[s.estado]}`}>{ETIQUETA_ESTADO[s.estado]}</span>
                    <span className={estilos.flecha}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {resto.length > 0 && (
          <section>
            <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-3)', fontWeight: 600, marginBottom: '0.9rem' }}>
              Presentadas y minutadas
            </h2>
            <div className={estilos.lista}>
              {resto.map((s) => (
                <Link key={s.id} href={`/preparar/${s.id}`} className={estilos.fila}>
                  <div className={estilos.filaIzq}>
                    <div className={estilos.filaNombre}>
                      <span className={estilos.filaPunto} style={{ background: s.salaColor }} />
                      {s.salaNombre}
                    </div>
                    <div className={estilos.filaMeta}>
                      <span>{s.tipo}</span>
                      <span className={estilos.sep}>·</span>
                      <span>{fechaCorta(s.fecha)}</span>
                    </div>
                  </div>
                  <div className={estilos.filaDcha}>
                    <span className={`${estilos.chip} ${estilos[s.estado]}`}>{ETIQUETA_ESTADO[s.estado]}</span>
                    <span className={estilos.flecha}>→</span>
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
