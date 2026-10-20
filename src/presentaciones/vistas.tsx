import type { ComponentType } from 'react'
import type { Tema } from '@/temas/tipos'
import { PresentacionRl } from '@/componentes/rl-comercial/PresentacionRl'
import { researchLand } from '@/temas/research-land'
import { PresentacionFortaleza } from '@/componentes/fortaleza/PresentacionFortaleza'
import { grupoUpax } from '@/temas/grupo-upax'

/**
 * QUÉ SE PINTA EN CADA PRESENTACIÓN QUE VIVE EN UNA SALA (`/cliente/<sala>/presentaciones/<id>`), con la identidad
 * de su cliente. Va aparte del registro porque el registro es solo datos y lo leen pantallas que no deben cargar
 * estos componentes. Los estatus de grupo no pasan por aquí: tienen su página propia bajo `src/app/estatus/`.
 */
export const VISTAS_DE_SALA: Record<string, { Componente: ComponentType; tema: Tema; transiciones?: boolean }> = {
  'nueva-estructura-comercial-2027': { Componente: PresentacionRl, tema: researchLand },
  // La propuesta para la Sra. María Laura de Salinas vive en la sala de Ceci (ella la presenta), con la identidad de Grupo UPAX.
  // Al presentarla, el aforo viaja de una escena a la siguiente (corte con transición de vista, `ModoPresentar`).
  'lo-queremos-lleno': { Componente: PresentacionFortaleza, tema: grupoUpax, transiciones: true },
}
