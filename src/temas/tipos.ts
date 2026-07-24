export interface Tema {
  slug: string
  nombre: string
  /** Color de marca dominante. */
  primario: string
  secundario: string
  acento: string
  /** Fondo claro de los slides de contenido. */
  superficieClara: string
  /** Fondo oscuro de portadas y divisores. */
  superficieOscura: string
  textoSobreClara: string
  textoSobreOscura: string
  /** Paradas del gradiente de portada, en orden. */
  gradiente: string[]
  /** Clave de familia tipográfica, resuelta en src/temas/fuentes.ts */
  familiaDisplay: string
  familiaTexto: string
}
