import estilos from '@/app/concurso/concurso.module.css'
import { AdminPropuestas } from './AdminPropuestas'
import type { PropuestaConcurso } from '@/db/concurso'

/**
 * EL PANEL DE ADMINISTRACIÓN DEL CONCURSO.
 *
 * ⚠️ YA NO HAY JURADO. Franco, 31-ago-2026: *«hoy definimos que no habrá
 * jurado, solo voto del equipo»*. Este panel tenía dos secciones más —designar
 * a los tres jueces y capturar su rúbrica de creatividad, cultura, viabilidad y
 * atractivo— retiradas enteras, junto con el estado que las sostenía. Lo que
 * queda es lo único que Franco necesita: ver las propuestas y decidir sobre
 * ellas.
 *
 * DEJA DE SER UN CLIENTE. Sin formularios de jurado no hay estado que guardar
 * aquí, así que el `'use client'` y sus tres `useState` se van: la interacción
 * vive dentro de `AdminPropuestas`, que sí la necesita. Un componente de
 * servidor menos que hidratar.
 *
 * Y ES EL ÚNICO SITIO CON LOS NOMBRES. El lineup es anónimo (ver
 * `PropuestaAnonima`, src/db/concurso.ts): aquí llegan las propuestas
 * completas, con autor y squad, porque administrar sin saber de quién es cada
 * cosa no es administrar.
 *
 * El nombre del archivo se conserva a propósito para no mover imports en una
 * semana de cambios diarios; su contenido ya no es un jurado.
 */
export function PanelJurado({ propuestas }: { propuestas: PropuestaConcurso[] }) {
  return (
    <details className={estilos.admin}>
      <summary>Administración · propuestas recibidas</summary>
      <div className={estilos.adminCuerpo}>
        <p className={estilos.adminAviso}>
          Solo tú ves esta sección, y es el único sitio donde aparece quién firma cada propuesta:
          en la galería van sin autor hasta la revelación.
        </p>
        <AdminPropuestas propuestas={propuestas} />
      </div>
    </details>
  )
}
