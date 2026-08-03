import type { ReactNode } from 'react'
import type { ItemSesion } from '@/db/sesiones'
import type { BorradorSeccion } from '@/secciones/borrador'
import type { Tema } from '@/temas/tipos'
import { tipoDeSeccion } from '@/secciones/catalogo'
import { EditorSeccion, type SubirImagen } from './EditorSeccion'
import type { SubirVideo } from './CampoVideo'
import { EliminarSeccion } from './EliminarSeccion'
import { SeccionPlegable } from './SeccionPlegable'
import { loQueFalta } from '@/secciones/borrador'
import estilos from '@/app/deck/deck.module.css'

/**
 * Una sección de la sesión dentro del editor: su cabecera (nombre, tipo,
 * mover, quitar) y su formulario.
 *
 * Vive aparte de la página porque se pinta dos veces con la misma forma —una
 * como sección base y otra como subsección— y duplicar esa cabecera era
 * garantizar que las dos se separaran en el primer retoque.
 */
interface Props {
  item: ItemSesion
  primera: boolean
  ultima: boolean
  subirAction: (formData: FormData) => Promise<void>
  bajarAction: (formData: FormData) => Promise<void>
  guardarSeccionAction: (itemId: string, seccion: BorradorSeccion) => Promise<void>
  proponerAction: (itemId: string, texto: string) => Promise<BorradorSeccion | { error: string }>
  /** Ausente en las ocho secciones base: la estructura de la reunión no se borra. */
  eliminarSeccionAction?: (itemId: string) => Promise<void>
  esSub?: boolean
  /** El tema de la sala, para que la vista previa se pinte con sus colores. */
  tema: Tema
  sesionId: string
  subirImagenAction: SubirImagen
  subirVideoAction: SubirVideo
  /**
   * La zona donde soltar un acuerdo arrastrado desde `AcuerdosArrastrables`
   * (ronda 9, tarea 6). Ausente en cualquier tarjeta que no sea la sección de
   * Acuerdos y Pendientes de la sesión — ver `itemDeAcuerdosPendientes`,
   * src/db/sesiones.ts. Se pinta ANTES de `SeccionPlegable`, a propósito: una
   * sección recién creada empieza plegada, y una zona de destino que solo
   * existiera dentro de un acordeón cerrado no se podría alcanzar sin abrirlo
   * primero.
   */
  zonaDeAcuerdos?: ReactNode
}

/** Qué hay dentro, sin abrir. Una sección intacta no es un error: está por empezar. */
function resumen(llenado: boolean, faltas: string[]): string {
  if (!llenado) return 'Sin empezar'
  return faltas.length > 0 ? `Falta ${faltas.join(' y ')}` : 'Lista'
}

export function TarjetaSeccion({
  item, primera, ultima, subirAction, bajarAction,
  guardarSeccionAction, proponerAction, eliminarSeccionAction, esSub, tema,
  sesionId, subirImagenAction, subirVideoAction, zonaDeAcuerdos,
}: Props) {
  const borrador: BorradorSeccion = item.contenido.seccion ?? { layout: 'kpis-fila-dos-columnas' }
  const tipo = tipoDeSeccion(borrador.layout)
  const faltas = loQueFalta(borrador, item.titulo)

  return (
    <div
      id={`seccion-${item.id}`}
      className={estilos.tarjeta}
      data-llenado={item.llenado ? 'true' : 'false'}
      data-sub={esSub ? 'true' : undefined}
    >
      <div className={estilos.tarjetaCabecera}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={estilos.tarjetaTitulo}>
            {item.titulo}
            {item.llenado && faltas.length === 0 && (
              <span style={{ color: 'var(--ok)', fontSize: '0.8rem' }}>✓</span>
            )}
            <span className={estilos.chipTipo}>{tipo?.nombre ?? borrador.layout}</span>
          </div>
          {/* La PREGUNTA GUÍA es lo que orienta a alguien que arma un estatus
              una vez al mes: "Prospección, cumplimiento y pipeline". Vivía en
              la base de datos y no se pintaba en ningún sitio, así que cinco
              tarjetas base decían lo mismo — "Divisor" — y nada distinguía
              RevOps de Campañas 360. El tipo de sección baja a distintivo. */}
          <p className={estilos.tarjetaPregunta}>
            {item.pregunta || tipo?.nombre || borrador.layout}
          </p>
        </div>
        <div className={estilos.tarjetaAcciones}>
          <div className={estilos.tarjetaOrden}>
            <form action={subirAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button type="submit" className={estilos.botonIcono} disabled={primera} title="Subir" aria-label={`Subir ${item.titulo}`}>↑</button>
            </form>
            <form action={bajarAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button type="submit" className={estilos.botonIcono} disabled={ultima} title="Bajar" aria-label={`Bajar ${item.titulo}`}>↓</button>
            </form>
          </div>
          {eliminarSeccionAction && (
            <EliminarSeccion
              nombre={item.titulo}
              eliminarAction={eliminarSeccionAction.bind(null, item.id)}
            />
          )}
        </div>
      </div>

      {zonaDeAcuerdos}

      {/* Plegada por defecto: con catorce secciones abiertas la página medía
          veinte mil píxeles. Se abre sola la EMPEZADA y a medias — donde hay
          trabajo pendiente— pero NO la intacta: en una sesión nueva todas
          están incompletas, así que abrirlas por «incompleta» abría las ocho
          y daba la bienvenida con ocho errores en rojo. */}
      <SeccionPlegable
        abiertaPorDefecto={item.llenado && faltas.length > 0}
        cabecera="Contenido de la sección"
        resumen={resumen(item.llenado, faltas)}
      >
        <EditorSeccion
          borrador={borrador}
          tituloDeRespaldo={item.titulo}
          tema={tema}
          sesionId={sesionId}
          subirImagenAction={subirImagenAction}
          subirVideoAction={subirVideoAction}
          guardarAction={guardarSeccionAction.bind(null, item.id)}
          textoCrudo={item.contenido.texto}
          proponerAction={proponerAction.bind(null, item.id)}
          acuerdosRetomados={item.acuerdosRetomados}
        />
      </SeccionPlegable>
    </div>
  )
}
