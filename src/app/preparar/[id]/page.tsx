import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties } from 'react'
import estilos from '../preparar.module.css'
import {
  obtenerSesion,
  guardarItemContenido,
  moverItem,
  entradasCrudasDeSesion,
  guardarDecisiones,
  parsearCifrasTexto,
  formatearCifrasTexto,
  type ContenidoItemCrudo,
} from '@/db/sesiones'
import { maquetarSesion } from '@/motor/maquetar'

// El botón "Maquetar" llama al motor (etapa 2, Claude, ~25s en 2 intentos en
// serie): el default serverless de Vercel (10s) no alcanza.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: 'borrador',
  lista: 'lista para presentar',
  presentada: 'presentada',
  minutada: 'minutada',
}

function etiquetaAlcance(alcance: string): string {
  return alcance === 'todos' ? 'todos los squads' : alcance
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PagSesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesion(id)
  if (!sesion) notFound()

  // ---- Server actions ----

  async function guardarContenido(formData: FormData) {
    'use server'
    const sesionId = String(formData.get('sesionId') ?? '')
    const itemId = String(formData.get('itemId') ?? '')
    const texto = String(formData.get('texto') ?? '').trim()
    const notaTexto = String(formData.get('nota') ?? '').trim()
    const cifras = parsearCifrasTexto(String(formData.get('cifras') ?? ''))

    const contenido: ContenidoItemCrudo = {}
    if (texto.length > 0) contenido.texto = texto
    if (cifras.length > 0) contenido.cifras = cifras
    if (notaTexto.length > 0) contenido.nota = notaTexto

    await guardarItemContenido(sesionId, itemId, contenido)
    revalidatePath(`/preparar/${sesionId}`)
  }

  async function subirItem(formData: FormData) {
    'use server'
    const sesionId = String(formData.get('sesionId') ?? '')
    const itemId = String(formData.get('itemId') ?? '')
    await moverItem(sesionId, itemId, 'arriba')
    revalidatePath(`/preparar/${sesionId}`)
  }

  async function bajarItem(formData: FormData) {
    'use server'
    const sesionId = String(formData.get('sesionId') ?? '')
    const itemId = String(formData.get('itemId') ?? '')
    await moverItem(sesionId, itemId, 'abajo')
    revalidatePath(`/preparar/${sesionId}`)
  }

  async function maquetar(formData: FormData) {
    'use server'
    const sesionId = String(formData.get('sesionId') ?? '')
    const sesionActual = await obtenerSesion(sesionId)
    if (!sesionActual) throw new Error('Sesión no encontrada')

    const entradas = entradasCrudasDeSesion(sesionActual)
    if (entradas.length === 0) throw new Error('No hay items llenados para maquetar')

    const resultados = await maquetarSesion(entradas, sesionActual.salaSlug)
    await guardarDecisiones(sesionId, resultados)
    redirect(`/preparar/${sesionId}/deck`)
  }

  // ---- Vista ----

  const total = sesion.items.length

  return (
    <div className={estilos.app} style={{ '--sala': sesion.salaColor } as CSSProperties}>
      <header className={estilos.barra}>
        <Link href="/preparar" className={estilos.volver}>← Preparar</Link>
        <div className={estilos.barraTitulo}>{sesion.salaNombre}</div>
        <div className={estilos.barraDcha}>
          {sesion.estado !== 'borrador' && (
            <>
              <Link href={`/preparar/${sesion.id}/deck`} className={estilos.volver}>Ver deck →</Link>
              <Link href={`/preparar/${sesion.id}/minuta`} className={estilos.volver}>Minuta →</Link>
            </>
          )}
        </div>
      </header>

      <main className={estilos.main}>
        <div className={estilos.heroSesion}>
          <div className={estilos.heroFila}>
            <div>
              <div className={estilos.heroSala}>
                <span className={estilos.heroPunto} />
                {sesion.salaNombre}
              </div>
              <div className={estilos.heroMeta}>
                <span>{sesion.tipo}</span>
                <span className={estilos.sep}>·</span>
                <span>{etiquetaAlcance(sesion.alcance)}</span>
                <span className={estilos.sep}>·</span>
                <span>{fechaCorta(sesion.fecha)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`${estilos.chip} ${estilos[sesion.estado]}`}>{ETIQUETA_ESTADO[sesion.estado]}</span>
              <div className={estilos.avance} style={{ marginTop: '0.6rem', minWidth: 160 }}>
                <div className={estilos.avanceBarra}>
                  <div
                    className={estilos.avanceRelleno}
                    style={{ width: `${total > 0 ? Math.round((sesion.itemsLlenados / total) * 100) : 0}%` }}
                  />
                </div>
                <span className={estilos.avanceTexto}>{sesion.itemsLlenados}/{total} llenados</span>
              </div>
            </div>
          </div>
        </div>

        <div className={estilos.tarjetas}>
          {sesion.items.map((item, i) => (
            <form
              key={item.id}
              action={guardarContenido}
              className={estilos.tarjeta}
              data-llenado={item.llenado ? 'true' : 'false'}
            >
              <input type="hidden" name="sesionId" value={sesion.id} />
              <input type="hidden" name="itemId" value={item.id} />

              <div className={estilos.tarjetaCabecera}>
                <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', minWidth: 0 }}>
                  <span className={estilos.tarjetaNumero}>{i + 1}</span>
                  <div>
                    <div className={estilos.tarjetaTitulo}>
                      {item.titulo}
                      {item.llenado && <span style={{ color: 'var(--ok)', fontSize: '0.8rem' }}>✓</span>}
                    </div>
                    <p className={estilos.tarjetaPregunta}>{item.pregunta}</p>
                  </div>
                </div>
                <div className={estilos.tarjetaAcciones}>
                  <div className={estilos.tarjetaOrden}>
                    <button
                      type="submit"
                      formAction={subirItem}
                      className={estilos.botonIcono}
                      disabled={i === 0}
                      title="Subir"
                      aria-label="Subir item"
                    >
                      ↑
                    </button>
                    <button
                      type="submit"
                      formAction={bajarItem}
                      className={estilos.botonIcono}
                      disabled={i === total - 1}
                      title="Bajar"
                      aria-label="Bajar item"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>

              <div className={estilos.tarjetaCampos}>
                <div className={estilos.campoInline}>
                  <span className={estilos.campoInlineLabel}>Contenido</span>
                  <textarea
                    name="texto"
                    defaultValue={item.contenido.texto ?? ''}
                    className={estilos.textarea}
                    placeholder="Pega aquí el texto crudo: hallazgos, análisis, contexto…"
                  />
                </div>
                <div className={estilos.campoInline}>
                  <span className={estilos.campoInlineLabel}>
                    Cifras (opcional) — una por línea: valor | rótulo | delta
                  </span>
                  <textarea
                    name="cifras"
                    defaultValue={formatearCifrasTexto(item.contenido.cifras)}
                    className={`${estilos.textarea} ${estilos.textareaChica}`}
                    placeholder={'9.2 | Posición media | -0.3\n29k | Impresiones | -16%'}
                  />
                  <span className={estilos.pistaTextarea}>Deja vacío si este item no trae cifras.</span>
                </div>
                <div className={estilos.campoInline}>
                  <span className={estilos.campoInlineLabel}>Nota para la IA (opcional)</span>
                  <input
                    type="text"
                    name="nota"
                    defaultValue={item.contenido.nota ?? ''}
                    className={estilos.inputTexto}
                    placeholder="Ej. esto va destacado; no menciones el retraso"
                  />
                </div>
              </div>

              <div className={estilos.tarjetaGuardar}>
                <button type="submit" className={`${estilos.boton} ${estilos.botonSecundario}`}>
                  Guardar
                </button>
              </div>
            </form>
          ))}
        </div>

        {sesion.itemsLlenados > 0 ? (
          <form action={maquetar} className={estilos.panelMaquetar}>
            <input type="hidden" name="sesionId" value={sesion.id} />
            <span className={estilos.panelMaquetarTexto}>
              {sesion.itemsLlenados} de {total} items listos para maquetar.
              {sesion.estado !== 'borrador' && ' Ya hay un deck maquetado — volver a maquetar lo reemplaza.'}
            </span>
            <button type="submit" className={`${estilos.boton} ${estilos.botonAcento}`}>
              Maquetar →
            </button>
          </form>
        ) : (
          <p className={estilos.panelMaquetarAviso}>Llena al menos un item para poder maquetar la sesión.</p>
        )}
      </main>
    </div>
  )
}
