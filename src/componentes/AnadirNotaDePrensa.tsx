'use client'

import { useRef, useState } from 'react'
import { subirArchivoDirecto } from '@/lib/subir'
import { normalizarEnlace, dominioDe } from '@/lib/materiales'
import { pesoLegible, TAMANO_MAXIMO } from '@/lib/blob'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * AÑADIR UNA NOTA DE PRENSA: su enlace, su titular, el medio, la fecha y —si
 * se quiere— una portada.
 *
 * EL ENLACE VA PRIMERO Y ES EL QUE TRABAJA. En cuanto se pega, el formulario
 * propone el medio a partir del dominio ("eleconomista.com.mx"), y quien sube
 * lo corrige a "El Economista" si quiere. Franco eligió esa forma frente a
 * derivarlo siempre —el dominio en la sala de un cliente se lee como una
 * dirección, no como un periódico— y frente a exigirlo a mano, que es un campo
 * más que llenar cada vez.
 *
 * ⚠️ LA SUGERENCIA NO PISA LO ESCRITO. Solo rellena mientras el campo esté
 * intacto: quien ya escribió "El Economista" y luego corrige la URL no ve cómo
 * su texto se convierte en un dominio. Es la misma regla que el selector de
 * responsable aprendió en la ronda 7 — lo que se ve en un campo es lo que se
 * guarda, y nada lo cambia por su cuenta después de que una persona lo tocó.
 *
 * LA PORTADA ES OPCIONAL y se sube DESPUÉS de que la nota existe (el botón
 * aparece en la tarjeta, no aquí): pedirla en el alta convertiría "guardar un
 * enlace" en "buscar y recortar una imagen", que es justo lo que hace que no
 * se cargue nada. Ver `NotasDePrensa.tsx` para qué se pinta cuando no hay.
 */
export function AnadirNotaDePrensa({
  salaSlug,
  registrarAction,
}: {
  salaSlug: string
  registrarAction: (datos: {
    titulo: string
    enlace: string
    medio: string
    fecha: string | null
    portada: { ruta: string; nombreOriginal: string; tipoContenido: string | null; tamanoBytes: number | null } | null
  }) => Promise<{ error?: string }>
}) {
  const [abierto, setAbierto] = useState(false)
  const [enlace, setEnlace] = useState('')
  const [titulo, setTitulo] = useState('')
  const [medio, setMedio] = useState('')
  const [medioTocado, setMedioTocado] = useState(false)
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  function cerrar() {
    setAbierto(false)
    setEnlace(''); setTitulo(''); setMedio(''); setMedioTocado(false); setFecha('')
    setError(null)
    if (entrada.current) entrada.current.value = ''
  }

  function escribirEnlace(valor: string) {
    setEnlace(valor)
    if (medioTocado) return
    // Se propone el dominio en cuanto la URL es reconocible; si todavía no lo
    // es, se deja el campo como está en vez de escribir un fragmento.
    const r = normalizarEnlace(valor)
    if ('url' in r) setMedio(dominioDe(r.url))
  }

  async function guardar() {
    setError(null)
    const r = normalizarEnlace(enlace)
    if ('error' in r) { setError(r.error); return }
    if (titulo.trim().length === 0) { setError('Falta el titular de la nota.'); return }

    setTrabajando(true)
    try {
      // La portada, si la hay, se sube ANTES de registrar: así la fila nace ya
      // con su imagen y no queda un momento en el que la nota existe a medias.
      let portada = null
      const archivo = entrada.current?.files?.[0]
      if (archivo) {
        if (archivo.size > TAMANO_MAXIMO) {
          setError(`La portada pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`)
          return
        }
        portada = await subirArchivoDirecto(salaSlug, 'prensa', archivo)
      }

      const res = await registrarAction({
        titulo: titulo.trim(),
        enlace: r.url,
        medio: medio.trim(),
        fecha: fecha || null,
        portada,
      })
      if (res.error) { setError(res.error); return }
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la nota.')
    } finally {
      setTrabajando(false)
    }
  }

  if (!abierto) {
    return (
      <button type="button" className={estilos.nuevaMinutaBoton} onClick={() => setAbierto(true)}>
        + Añadir nota de prensa
      </button>
    )
  }

  return (
    <div className={estilos.subirCaja}>
      <div className={estilos.subirCampos}>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Enlace a la nota</span>
          <input
            type="url"
            inputMode="url"
            className={estilos.archivoInput}
            value={enlace}
            onChange={(e) => escribirEnlace(e.target.value)}
            placeholder="eleconomista.com.mx/…"
            autoFocus
          />
        </label>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Titular</span>
          <input
            type="text"
            className={estilos.archivoInput}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Cómo tituló el medio"
          />
        </label>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Medio</span>
          <input
            type="text"
            className={estilos.archivoInput}
            value={medio}
            onChange={(e) => { setMedio(e.target.value); setMedioTocado(true) }}
            placeholder="El Economista"
          />
        </label>
          <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Fecha de publicación</span>
          <input
            type="date"
            className={estilos.archivoInput}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Portada (opcional)</span>
          <input ref={entrada} type="file" accept="image/*" className={estilos.subirEntrada} disabled={trabajando} />
        </label>
      </div>

      <p className={estilos.subirPista}>
        Sin portada, la tarjeta lleva el nombre del medio. La imagen no se le pide al medio: se sube.
      </p>

      {error && <p className={estilos.subirError}>{error}</p>}

      <div className={estilos.acuerdoEditorAcciones}>
        <button
          type="button"
          className={estilos.archivoGuardar}
          disabled={trabajando || enlace.trim().length === 0 || titulo.trim().length === 0}
          onClick={() => void guardar()}
        >
          {trabajando ? 'Guardando…' : 'Guardar la nota'}
        </button>
        <button type="button" className={estilos.botonVolverSesion} onClick={cerrar} disabled={trabajando}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
