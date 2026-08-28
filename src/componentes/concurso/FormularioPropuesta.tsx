'use client'

import { upload } from '@vercel/blob/client'
import { useMemo, useState, useTransition, type FormEvent } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import { MAX_ARCHIVOS, MAX_BYTES_ARCHIVO, TIPOS_IMAGEN_CONCURSO } from '@/concurso/config'
import type { ArchivoPropuesta } from '@/concurso/validacion'
import type { Persona } from '@/db/directorio'
import type { PropuestaConcurso } from '@/db/concurso'
import { actualizarPropuestaAction, crearPropuestaAction } from '@/app/concurso/acciones'

function rutaSegura(nombre: string): string {
  const limpio = nombre.replace(/[^\w.\-]+/g, '-').replace(/\.{2,}/g, '.').slice(-80)
  return `concurso/sudadera-mkt-corp-2026/${crypto.randomUUID()}-${limpio}`
}

export function FormularioPropuesta({
  persona,
  disponibles,
  existente,
}: {
  persona: Persona
  disponibles: Persona[]
  existente: PropuestaConcurso | null
}) {
  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '')
  const [coautor, setCoautor] = useState('')
  const [archivos, setArchivos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [pendiente, comenzar] = useTransition()

  // Sin squad no hay dupla posible —su única regla es unir squads distintos y
  // eso no se comprueba contra un dato que no existe—, así que la lista sale
  // vacía y abajo se explica en vez de ofrecer un desplegable inútil.
  const parejas = useMemo(() => (
    persona.squad === null
      ? []
      : disponibles.filter((p) => p.correo !== persona.correo && p.squad !== persona.squad)
  ), [disponibles, persona])
  const tieneImagen = archivos.length > 0 || Boolean(existente?.imagenes.length)

  function elegir(lista: FileList | null) {
    setError(null)
    const elegidos = Array.from(lista ?? [])
    if (elegidos.length > MAX_ARCHIVOS) return setError('Puedes subir hasta tres imágenes.')
    if (elegidos.some((a) => !(TIPOS_IMAGEN_CONCURSO as readonly string[]).includes(a.type))) {
      return setError('Solo se aceptan archivos JPG o PNG.')
    }
    if (elegidos.some((a) => a.size > MAX_BYTES_ARCHIVO)) return setError('Cada imagen debe pesar máximo 25 MB.')
    setArchivos(elegidos)
  }

  async function subirElegidos(): Promise<ArchivoPropuesta[]> {
    if (archivos.length === 0 && existente) {
      return existente.imagenes.map(({ ruta, nombreOriginal, tipoContenido, tamanoBytes }) => ({
        ruta, nombreOriginal, tipoContenido, tamanoBytes,
      }))
    }
    setSubiendo(true)
    try {
      return await Promise.all(archivos.map(async (archivo) => {
        const subido = await upload(rutaSegura(archivo.name), archivo, {
          access: 'private',
          handleUploadUrl: '/api/concurso/subir',
          contentType: archivo.type,
        })
        return {
          ruta: subido.pathname,
          nombreOriginal: archivo.name,
          tipoContenido: archivo.type,
          tamanoBytes: archivo.size,
        }
      }))
    } finally {
      setSubiendo(false)
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!tieneImagen || pendiente || subiendo) return
    setError(null)
    setOk(null)
    comenzar(async () => {
      try {
        const subidos = await subirElegidos()
        const resultado = existente
          ? await actualizarPropuestaAction(existente.id, { titulo, descripcion, archivos: subidos })
          : await crearPropuestaAction({ titulo, descripcion, coautorCorreo: coautor || null, archivos: subidos })
        if (resultado.error) return setError(resultado.error)
        setOk(resultado.ok ?? 'Guardado.')
        setArchivos([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo enviar la propuesta.')
      }
    })
  }

  return (
    <form className={estilos.formulario} onSubmit={enviar}>
      <div className={estilos.formularioCabecera}>
        <span className={estilos.numeroGrande}>{existente ? 'EDIT' : '03'}</span>
        <div><h2>{existente ? 'Ajusta tu propuesta' : 'Sube tu propuesta'}</h2><p>Tu autoría será pública cuando abra la galería.</p></div>
      </div>

      <div className={estilos.identidadGrid}>
        <label><span>Nombre</span><select value={persona.correo} onChange={() => {}} aria-readonly="true"><option value={persona.correo}>{persona.nombre}</option></select></label>
        <label><span>Squad</span><select value={persona.squad ?? ''} onChange={() => {}} aria-readonly="true"><option value={persona.squad ?? ''}>{persona.squad ?? 'Sin squad asignado'}</option></select></label>
        {!existente && persona.squad === null && (
          <p className={estilos.notaDupla}><strong>Participación individual.</strong> Para ir en dupla hace falta tener squad asignado: la dupla debe unir dos squads distintos.</p>
        )}
        {!existente && persona.squad !== null && (
          <label><span>Dupla · opcional</span><select value={coautor} onChange={(e) => setCoautor(e.target.value)}><option value="">Participación individual</option>{parejas.map((p) => <option value={p.correo} key={p.correo}>{p.nombre} · {p.squad}</option>)}</select></label>
        )}
      </div>

      <label className={estilos.campo}><span>Nombre de la propuesta</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} minLength={2} maxLength={80} required /></label>
      <label className={estilos.campo}><span>Concepto</span><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} rows={4} required /><small>{descripcion.length}/500</small></label>
      <label className={estilos.archivos}>
        <span>{existente ? 'Reemplazar imágenes' : 'Mockup o imagen'}</span>
        <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => elegir(e.target.files)} />
        <strong>{archivos.length > 0 ? `${archivos.length} archivo${archivos.length === 1 ? '' : 's'} listo${archivos.length === 1 ? '' : 's'}` : existente ? `${existente.imagenes.length} imagen${existente.imagenes.length === 1 ? '' : 'es'} guardada${existente.imagenes.length === 1 ? '' : 's'}` : 'Elige hasta 3 JPG o PNG'}</strong>
        <small>Máximo 25 MB por archivo</small>
      </label>
      {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
      {ok && <p className={estilos.mensajeOk} role="status">{ok}</p>}
      <button className={estilos.botonPunk} type="submit" disabled={!tieneImagen || pendiente || subiendo}>
        {subiendo ? 'Subiendo imágenes…' : pendiente ? 'Guardando…' : existente ? 'Guardar cambios' : 'Lanzar propuesta'}
      </button>
    </form>
  )
}

