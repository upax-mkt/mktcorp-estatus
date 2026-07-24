import type { Tema } from './tipos'
import { neracode } from './neracode'
import { researchLand } from './research-land'
import { promoEspacio } from './promo-espacio'
import { mexaCreativa } from './mexa-creativa'
import { marketingUnited } from './marketing-united'
import { houseOfFilms } from './house-of-films'
import { uix } from './uix'
import { zeus } from './zeus'
import { ceci } from './ceci'
import { grupoUpax } from './grupo-upax'

export type { Tema } from './tipos'

export const TEMAS: Record<string, Tema> = {
  [neracode.slug]: neracode,
  [researchLand.slug]: researchLand,
  [promoEspacio.slug]: promoEspacio,
  [mexaCreativa.slug]: mexaCreativa,
  [marketingUnited.slug]: marketingUnited,
  [houseOfFilms.slug]: houseOfFilms,
  [uix.slug]: uix,
  [zeus.slug]: zeus,
  [ceci.slug]: ceci,
  [grupoUpax.slug]: grupoUpax,
}

export function obtenerTema(slug: string): Tema {
  const tema = TEMAS[slug]
  if (!tema) throw new Error(`No existe la sala "${slug}"`)
  return tema
}

export function slugsDeSalas(): string[] {
  return Object.keys(TEMAS)
}
