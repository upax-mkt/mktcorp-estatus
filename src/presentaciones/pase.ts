import { firmarDato, verificarDato } from '@/auth/firma'

/**
 * EL PASE DE UNA PRESENTACIÓN CON CLAVE (6-oct-2026).
 *
 * Quien llega por la sala y escribe bien la clave recibe esto en una cookie httpOnly limitada a la ruta de esa
 * presentación. Va firmado con el mismo secreto que la sesión, pero lleva `tipo: 'pase'` y no tiene `rol`: no sirve
 * como sesión, y una sesión no sirve como pase. Amarra presentación Y sala: el pase de una no abre otra.
 */
export const DIAS_DE_PASE = 30
const MS_POR_DIA = 86_400_000

export function cookieDePase(id: string): string {
  return `mktcorp_pase_${id}`
}

export async function firmarPase(pres: string, sala: string, secreto: string, ahora: Date = new Date()): Promise<string> {
  return firmarDato({ tipo: 'pase', pres, sala, exp: ahora.getTime() + DIAS_DE_PASE * MS_POR_DIA }, secreto)
}

export async function paseValido(
  token: string | undefined,
  secreto: string,
  pres: string,
  sala: string,
  ahora: Date = new Date(),
): Promise<boolean> {
  const dato = await verificarDato(token, secreto)
  if (typeof dato !== 'object' || dato === null) return false
  const p = dato as Record<string, unknown>
  return (
    p.tipo === 'pase' && p.pres === pres && p.sala === sala && typeof p.exp === 'number' && Number.isFinite(p.exp) && p.exp >= ahora.getTime()
  )
}
