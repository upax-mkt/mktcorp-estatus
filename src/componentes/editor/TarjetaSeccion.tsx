import type { ItemSesion } from '@/db/sesiones'
import type { BorradorSeccion } from '@/secciones/borrador'
import { tipoDeSeccion } from '@/secciones/catalogo'
import { EditorSeccion } from './EditorSeccion'
import { EliminarSeccion } from './EliminarSeccion'
import { SeccionPlegable } from './SeccionPlegable'
import { loQueFalta } from '@/secciones/borrador'
import estilos from '@/app/preparar/preparar.module.css'

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
}

export function TarjetaSeccion({
  item, primera, ultima, subirAction, bajarAction,
  guardarSeccionAction, proponerAction, eliminarSeccionAction, esSub,
}: Props) {
  const borrador: BorradorSeccion = item.contenido.seccion ?? { layout: 'kpis-fila-dos-columnas' }
  const tipo = tipoDeSeccion(borrador.layout)
  const faltas = loQueFalta(borrador)

  return (
    <div className={estilos.tarjeta} data-llenado={item.llenado ? 'true' : 'false'} data-sub={esSub ? 'true' : undefined}>
      <div className={estilos.tarjetaCabecera}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={estilos.tarjetaTitulo}>
            {item.titulo}
            {item.llenado && faltas.length === 0 && (
              <span style={{ color: 'var(--ok)', fontSize: '0.8rem' }}>✓</span>
            )}
          </div>
          <p className={estilos.tarjetaPregunta}>
            {tipo?.nombre ?? borrador.layout}
            {item.esBase && ' · sección base'}
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

      {/* Plegada por defecto: con catorce secciones abiertas la página medía
          veinte mil píxeles. Se abre sola la que aún no está lista, que es
          justo donde hay trabajo pendiente. */}
      <SeccionPlegable
        abiertaPorDefecto={faltas.length > 0}
        cabecera="Contenido de la sección"
        resumen={faltas.length > 0 ? `Falta ${faltas.join(' y ')}` : 'Lista'}
      >
        <EditorSeccion
          borrador={borrador}
          guardarAction={guardarSeccionAction.bind(null, item.id)}
          textoCrudo={item.contenido.texto}
          proponerAction={proponerAction.bind(null, item.id)}
        />
      </SeccionPlegable>
    </div>
  )
}
