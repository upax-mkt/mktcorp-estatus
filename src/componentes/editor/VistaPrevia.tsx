'use client'

import { useState } from 'react'
import { maquetarBorrador } from '@/motor/maquetar'
import { SeccionDocumento } from '@/componentes/sesion/SeccionDocumento'
import { ProveedorTema } from '@/componentes/ProveedorTema'
import type { BorradorSeccion } from '@/secciones/borrador'
import type { Tema } from '@/temas/tipos'
import type { Acuerdo } from '@/dominio/salas'
import estilos from './editor.module.css'
import documento from '@/componentes/sesion/documento.module.css'

/**
 * Lo que se está escribiendo, ya maquetado, al lado del formulario.
 *
 * Era el problema nº1 de la auditoría de UX: se llenaban catorce secciones a
 * ciegas y el resultado se veía al final, de golpe, cuando corregir significa
 * volver a entrar en cada una. Aquí el bucle se cierra en el sitio: se escribe
 * un título y se ve el título; se pega una tabla y se ve la tabla.
 *
 * Cómo puede ser esto un componente de cliente: `maquetarBorrador` es puro y
 * síncrono —la ruta manual del motor no llama a ningún modelo— y
 * `SeccionDocumento` no toca ninguna API de servidor. No hace falta ni una
 * petición: se recalcula en cada tecla, en el navegador.
 *
 * Y muestra lo MISMO que se va a presentar, no una aproximación: es el mismo
 * componente que dibuja el documento final, con el tema de la sala puesto.
 * Una vista previa que se parece pero no es idéntica es peor que ninguna,
 * porque enseña a desconfiar de ella.
 */

interface Props {
  borrador: BorradorSeccion
  tituloDeRespaldo?: string
  tema: Tema
  /** Acuerdos retomados de la sala en este item, ya resueltos (ronda 9, tarea 6). */
  acuerdosRetomados?: Acuerdo[]
}

export function VistaPrevia({ borrador, tituloDeRespaldo, tema, acuerdosRetomados }: Props) {
  const [abierta, setAbierta] = useState(true)
  const resultado = maquetarBorrador(borrador, tituloDeRespaldo ?? 'Sección', acuerdosRetomados)

  return (
    <aside className={estilos.previa} data-abierta={abierta ? 'true' : undefined}>
      <div className={estilos.previaBarra}>
        <span className={estilos.previaTitulo}>Cómo se va a ver</span>
        <button
          type="button"
          className={estilos.previaBoton}
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
        >
          {abierta ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {abierta && (
        <div className={estilos.previaLienzo}>
          {/* El tema de LA SALA, con el MISMO proveedor que el documento
              final: una sección de Mexa se previsualiza en rosa Mexa, con su
              escala de datos y su tipografía. Republicar los tokens a mano
              aquí habría dejado los gráficos sin `--dato-N` y la vista previa
              mintiendo justo en lo que más cuesta acertar. */}
          <ProveedorTema tema={tema} superficie="clara">
            <div className={documento.documento}>
              {/* `indice` solo decide el ancla de navegación del documento;
                  aquí no hay documento al que navegar, así que 0. */}
              <SeccionDocumento decision={resultado.decision} indice={0} />
            </div>
          </ProveedorTema>

          {resultado.degradado && (
            <p className={estilos.previaAviso}>
              Con lo que hay ahora, esta sección se presentaría solo con su título.{' '}
              {resultado.motivo}
            </p>
          )}
        </div>
      )}
    </aside>
  )
}
