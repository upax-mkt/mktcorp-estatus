'use client'

import { useRef, useState, useTransition } from 'react'
import { upload } from '@vercel/blob/client'
import type { ArchivoSala, CategoriaArchivo } from '@/db/archivos'
import { extensionDe, pesoLegible, rutaDeArchivo, TAMANO_MAXIMO } from '@/lib/blob'
import { fechaBreveConAnio } from '@/lib/fecha'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * Los archivos colgados en una sala: subir, renombrar, refechar y quitar.
 *
 * Sirve igual a las presentaciones antiguas y a los archivos de interés
 * porque la diferencia entre ambas es dónde se muestran, no qué se hace con
 * ellas. Lo que cambia entre las dos es el texto y si la fecha se pide.
 *
 * La subida va del navegador DIRECTO a Blob (ver `src/lib/blob.ts`) y solo
 * después se registra la fila. Por eso el formulario pide el título ANTES de
 * elegir el archivo: si el registro se hiciera con lo que hay en pantalla
 * cuando termina la subida, un título escrito a medias quedaría a medias.
 */

/** Las dos categorías que SÍ se listan en una sala. La tercera —`imagen`—
 *  vive dentro de una presentación, no en esta lista. */
type CategoriaDeSala = Extract<CategoriaArchivo, 'presentacion' | 'interes'>

interface Props {
  salaSlug: string
  categoria: CategoriaDeSala
  archivos: ArchivoSala[]
  /** Solo el equipo sube y edita; el director lee y descarga. */
  equipo: boolean
  registrarAction: (datos: {
    categoria: CategoriaDeSala
    titulo: string
    fecha: string | null
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
  }) => Promise<{ error?: string }>
  editarAction: (id: string, cambios: { titulo: string; fecha: string | null }) => Promise<void>
  eliminarAction: (id: string) => Promise<void>
}

const TEXTOS: Record<CategoriaDeSala, { anadir: string; vacio: string; pideFecha: boolean }> = {
  presentacion: {
    anadir: 'Subir una presentación anterior',
    vacio: 'Aquí van las presentaciones que se suban directamente a la sala.',
    pideFecha: true,
  },
  interes: {
    anadir: 'Subir un archivo',
    vacio: 'Presentaciones comerciales, excels, imágenes: lo que convenga tener a mano.',
    pideFecha: false,
  },
}

export function ArchivosSala({
  salaSlug,
  categoria,
  archivos,
  equipo,
  registrarAction,
  editarAction,
  eliminarAction,
}: Props) {
  const textos = TEXTOS[categoria]

  return (
    <>
      {archivos.length === 0 ? (
        <p className={estilos.vacioNota}>{textos.vacio}</p>
      ) : (
        <ul className={estilos.archivos}>
          {archivos.map((a) => (
            <FilaArchivo
              key={a.id}
              archivo={a}
              equipo={equipo}
              pideFecha={textos.pideFecha}
              editarAction={editarAction}
              eliminarAction={eliminarAction}
            />
          ))}
        </ul>
      )}

      {equipo && (
        <SubirArchivo
          salaSlug={salaSlug}
          categoria={categoria}
          etiqueta={textos.anadir}
          pideFecha={textos.pideFecha}
          registrarAction={registrarAction}
        />
      )}
    </>
  )
}

function FilaArchivo({
  archivo,
  equipo,
  pideFecha,
  editarAction,
  eliminarAction,
}: {
  archivo: ArchivoSala
  equipo: boolean
  pideFecha: boolean
  editarAction: Props['editarAction']
  eliminarAction: Props['eliminarAction']
}) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(archivo.titulo)
  const [fecha, setFecha] = useState(archivo.fecha ?? '')
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  const peso = pesoLegible(archivo.tamanoBytes)

  if (editando) {
    return (
      <li className={estilos.archivoEditando}>
        <input
          type="text"
          className={estilos.archivoInput}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Título del archivo"
        />
        {pideFecha && (
          <input
            type="date"
            className={estilos.archivoFechaInput}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha del archivo"
          />
        )}
        <button
          type="button"
          className={estilos.archivoGuardar}
          disabled={pendiente || titulo.trim().length === 0}
          onClick={() =>
            empezar(async () => {
              await editarAction(archivo.id, { titulo: titulo.trim(), fecha: fecha || null })
              setEditando(false)
            })
          }
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          className={estilos.botonVolverSesion}
          onClick={() => {
            setTitulo(archivo.titulo)
            setFecha(archivo.fecha ?? '')
            setEditando(false)
          }}
        >
          Cancelar
        </button>
      </li>
    )
  }

  return (
    <li className={estilos.archivo}>
      <span className={estilos.archivoTipo} aria-hidden>
        {extensionDe(archivo.nombreOriginal)}
      </span>
      <a href={`/api/archivo/${archivo.id}`} target="_blank" rel="noopener" className={estilos.archivoEnlace}>
        <span className={estilos.archivoTitulo}>{archivo.titulo}</span>
        <span className={estilos.archivoMeta}>
          {archivo.fecha ? fechaBreveConAnio(archivo.fecha) : `subido ${fechaBreveConAnio(archivo.subidoEn)}`}
          {peso && <> · {peso}</>}
        </span>
      </a>

      {equipo &&
        (confirmando ? (
          <span className={estilos.confirmarBorrado}>
            <button
              type="button"
              className={estilos.botonBorrar}
              disabled={pendiente}
              onClick={() => empezar(async () => { await eliminarAction(archivo.id) })}
            >
              {pendiente ? 'Borrando…' : 'Borrar'}
            </button>
            <button
              type="button"
              className={estilos.botonCancelarBorrado}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </span>
        ) : (
          <span className={estilos.archivoAcciones}>
            <button type="button" className={estilos.botonVolverSesion} onClick={() => setEditando(true)}>
              Editar
            </button>
            <button
              type="button"
              className={estilos.botonIconoBorrar}
              onClick={() => setConfirmando(true)}
              aria-label={`Quitar ${archivo.titulo}`}
            >
              ✕
            </button>
          </span>
        ))}
    </li>
  )
}

function SubirArchivo({
  salaSlug,
  categoria,
  etiqueta,
  pideFecha,
  registrarAction,
}: {
  salaSlug: string
  categoria: CategoriaDeSala
  etiqueta: string
  pideFecha: boolean
  registrarAction: Props['registrarAction']
}) {
  const [abierto, setAbierto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  function cerrar() {
    setAbierto(false)
    setTitulo('')
    setFecha('')
    setError(null)
  }

  async function alElegirArchivo(archivo: File) {
    setError(null)

    // Se comprueba aquí ADEMÁS de en el servidor. El servidor es el que
    // manda; esto solo evita que alguien espere dos minutos a que suba un
    // archivo que iba a rechazarse al final.
    if (archivo.size > TAMANO_MAXIMO) {
      setError(`El archivo pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`)
      return
    }

    setSubiendo(true)
    try {
      const subido = await upload(rutaDeArchivo(salaSlug, categoria, archivo.name), archivo, {
        access: 'private',
        handleUploadUrl: '/api/archivos/subir',
        contentType: archivo.type || undefined,
      })

      const r = await registrarAction({
        categoria,
        titulo: titulo.trim(),
        fecha: fecha || null,
        ruta: subido.pathname,
        nombreOriginal: archivo.name,
        tipoContenido: archivo.type || null,
        tamanoBytes: archivo.size,
      })
      if (r.error) {
        setError(r.error)
        return
      }
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el archivo.')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  if (!abierto) {
    return (
      <button type="button" className={estilos.nuevaMinutaBoton} onClick={() => setAbierto(true)}>
        {etiqueta}
      </button>
    )
  }

  return (
    <div className={estilos.subirCaja}>
      <div className={estilos.subirCampos}>
        <label className={estilos.subirCampo}>
          <span className={estilos.subirEtiqueta}>Título</span>
          <input
            type="text"
            className={estilos.archivoInput}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Cómo se llama en la lista"
            autoFocus
          />
        </label>
        {pideFecha && (
          <label className={estilos.subirCampo}>
            <span className={estilos.subirEtiqueta}>Fecha de la sesión</span>
            <input
              type="date"
              className={estilos.archivoFechaInput}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
        )}
      </div>

      <input
        ref={entrada}
        type="file"
        className={estilos.subirEntrada}
        disabled={subiendo || titulo.trim().length === 0}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void alElegirArchivo(archivo)
        }}
      />

      {/* El archivo se pide DESPUÉS del título porque elegirlo dispara la
          subida: al revés, habría que subir primero y esperar a que alguien
          escriba el título con el archivo ya en el almacén. */}
      {titulo.trim().length === 0 && (
        <p className={estilos.subirPista}>Escribe el título y después elige el archivo.</p>
      )}
      {subiendo && <p className={estilos.subirPista}>Subiendo…</p>}
      {error && <p className={estilos.subirError}>{error}</p>}

      <button type="button" className={estilos.botonVolverSesion} onClick={cerrar} disabled={subiendo}>
        Cancelar
      </button>
    </div>
  )
}
