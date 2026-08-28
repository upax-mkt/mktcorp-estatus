import { LIMITE_DESCRIPCION, MAX_ARCHIVOS, MAX_BYTES_ARCHIVO, TIPOS_IMAGEN_CONCURSO } from './config'
import type { SquadMktCorp } from '@/lib/equipos'

export interface IntegrantePropuesta {
  correo: string
  squad: SquadMktCorp | null
}

export interface ArchivoPropuesta {
  ruta: string
  nombreOriginal: string
  tipoContenido: string
  tamanoBytes: number
}

export interface DatosPropuesta {
  titulo: string
  descripcion: string
  archivos: ArchivoPropuesta[]
}

export function validarIntegrantes(integrantes: IntegrantePropuesta[]): string[] {
  const errores: string[] = []
  if (integrantes.length < 1 || integrantes.length > 2) errores.push('Participa individualmente o en dupla.')
  if (integrantes.some((p) => p.squad === null)) {
    errores.push('Todos los participantes necesitan un squad asignado en Personas.')
  }
  if (new Set(integrantes.map((p) => p.correo.toLowerCase())).size !== integrantes.length) {
    errores.push('Una persona no puede ocupar los dos lugares de la dupla.')
  }
  if (integrantes.length === 2 && integrantes[0].squad === integrantes[1].squad) {
    errores.push('La dupla debe integrar squads distintos.')
  }
  return errores
}

export function validarPropuesta(datos: DatosPropuesta): string[] {
  const errores: string[] = []
  const titulo = datos.titulo.trim()
  if (titulo.length < 2 || titulo.length > 80) errores.push('El nombre debe tener entre 2 y 80 caracteres.')
  if (datos.descripcion.trim().length === 0) errores.push('Explica brevemente el concepto.')
  if (datos.descripcion.length > LIMITE_DESCRIPCION) errores.push('La explicación no puede superar 500 caracteres.')
  if (datos.archivos.length === 0) errores.push('Sube al menos una imagen.')
  if (datos.archivos.length > MAX_ARCHIVOS) errores.push('Puedes subir hasta tres imágenes.')
  if (datos.archivos.some((a) => !(TIPOS_IMAGEN_CONCURSO as readonly string[]).includes(a.tipoContenido))) {
    errores.push('Solo se aceptan imágenes JPG o PNG.')
  }
  if (datos.archivos.some((a) => a.tamanoBytes > MAX_BYTES_ARCHIVO)) {
    errores.push('Cada imagen debe pesar máximo 25 MB.')
  }
  return errores
}

