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
export const VISTAS_DE_SALA: Record<
  string,
  { Componente: ComponentType; tema: Tema; transiciones?: boolean; controlesOcultos?: boolean }
> = {
  'nueva-estructura-comercial-2027': { Componente: PresentacionRl, tema: researchLand },
  // La de Fortaleza Mexicana para la Sra. María Laura de Salinas vive en la sala de Ceci (ella la presenta), con la
  // identidad de Grupo UPAX. Al presentarla, el corte entre pantallas es el de la casa y la barra de controles no se ve
  // en reposo.
  'lo-queremos-lleno': { Componente: PresentacionFortaleza, tema: grupoUpax, transiciones: true, controlesOcultos: true },
}
