import type { ComponentType } from 'react'
import type { Tema } from '@/temas/tipos'
import { PresentacionRl } from '@/componentes/rl-comercial/PresentacionRl'
import { researchLand } from '@/temas/research-land'

/**
 * QUÉ SE PINTA EN CADA PRESENTACIÓN QUE VIVE EN UNA SALA (`/cliente/<sala>/presentaciones/<id>`), con la identidad
 * de su cliente. Va aparte del registro porque el registro es solo datos y lo leen pantallas que no deben cargar
 * estos componentes. Los estatus de grupo no pasan por aquí: tienen su página propia bajo `src/app/estatus/`.
 */
export const VISTAS_DE_SALA: Record<string, { Componente: ComponentType; tema: Tema }> = {
  'nueva-estructura-comercial-2027': { Componente: PresentacionRl, tema: researchLand },
}
