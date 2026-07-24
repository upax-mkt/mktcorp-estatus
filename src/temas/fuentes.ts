import {
  Outfit, Montserrat, Raleway, Mukta_Mahee, Figtree,
  Anton, Bungee, Hanken_Grotesk, Archivo,
} from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], variable: '--f-outfit' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--f-montserrat' })
const raleway = Raleway({ subsets: ['latin'], variable: '--f-raleway' })
const muktaMahee = Mukta_Mahee({ subsets: ['latin'], weight: ['300','400','500','600','700','800'], variable: '--f-mukta' })
const figtree = Figtree({ subsets: ['latin'], variable: '--f-figtree' })
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--f-anton' })
const bungee = Bungee({ subsets: ['latin'], weight: '400', variable: '--f-bungee' })
const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], variable: '--f-hanken' })
const archivoExpanded = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--f-archivo' })

/** Todas las variables de fuente, para colgar del <body>. */
export const CLASES_DE_FUENTES = [
  outfit, montserrat, raleway, muktaMahee, figtree,
  anton, bungee, hankenGrotesk, archivoExpanded,
].map((f) => f.variable).join(' ')

const VARIABLES: Record<string, string> = {
  outfit: 'var(--f-outfit)',
  montserrat: 'var(--f-montserrat)',
  raleway: 'var(--f-raleway)',
  muktaMahee: 'var(--f-mukta)',
  figtree: 'var(--f-figtree)',
  anton: 'var(--f-anton)',
  bungee: 'var(--f-bungee)',
  hankenGrotesk: 'var(--f-hanken)',
  archivoExpanded: 'var(--f-archivo)',
  // Special Gothic Expanded y Satoshi se añaden en la Fase 2 como fuentes locales.
  specialGothic: 'var(--f-archivo)',
  satoshi: 'var(--f-hanken)',
}

export function familiaCss(clave: string): string {
  return VARIABLES[clave] ?? 'var(--f-outfit)'
}
