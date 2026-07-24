import type { Tema } from './tipos'

// Ceci hereda la identidad de Grupo UPAX; se distingue por su logo, no por su color.
export const ceci: Tema = {
  slug: 'ceci',
  nombre: 'Ceci',
  primario: '#D72A5A',
  secundario: '#E34714',
  acento: '#5367E1',
  superficieClara: '#FFFFFF',
  superficieOscura: '#1E1B4B',
  textoSobreClara: '#1E1B4B',
  textoSobreOscura: '#FFFFFF',
  gradiente: ['#D72A5A', '#5367E1'],
  familiaDisplay: 'outfit',
  familiaTexto: 'outfit',
}
