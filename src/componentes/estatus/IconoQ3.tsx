/**
 * LA ICONOGRAFÍA DEL ESTATUS: un solo juego de trazo, 24 × 24, grosor 1.6.
 * Cada icono nombra una cosa de la presentación (un bloque, una métrica, un
 * canal), no adorna: va junto a la etiqueta que explica.
 */
const trazos = {
  avance: 'M4 17 10 11 14 15 21 6 M14 6h7v7',
  objetivo: 'M20 12a8 8 0 1 1-8-8 M16 12a4 4 0 1 1-4-4 M12 12 21 3 M17 3h4v4',
  personas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M22 21v-2a4 4 0 0 0-3-3.87 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 3a4 4 0 0 1 0 8',
  señal: 'M3 20h18 M6 16v-4 M12 16V8 M18 16V4',
  pantalla: 'M3 3h18v14H3z M8 21h8 M12 17v4 M7 7h10 M7 11h6',
  calendario: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
  estrella: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  mensaje: 'M21 3H3v14h4v4l5-4h9z M7 7h10 M7 11h6',
  // Bloques
  lectura: 'M3 5h7a3 3 0 0 1 2 1 3 3 0 0 1 2-1h7v14h-7a3 3 0 0 0-2 1 3 3 0 0 0-2-1H3z M12 6v14',
  copas: 'M7 3h10l-1 6a4 4 0 0 1-8 0z M12 13v6 M8 21h8 M5 3h14',
  embudo: 'M3 4h18l-7 8.5V19l-4 2v-8.5z',
  dinero: 'M12 2v20 M17 6.5C17 4.6 14.8 4 12 4S7 5 7 7.5 9.5 11 12 11.5s5 1.2 5 4-2.2 4-5 4-5-1-5-3',
  periodico: 'M4 4h13v16H6a2 2 0 0 1-2-2z M17 9h3v9a2 2 0 0 1-2 2 M8 8h5 M8 12h5 M8 16h5',
  canales: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20',
  herramienta: 'M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.5-.6-.6-2.5z',
  cohete: 'M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2 M12 15l-3-3a15 15 0 0 1 4-7c3-3 7-3 8-3 0 1 0 5-3 8a15 15 0 0 1-6 5z M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0 M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5 M15.5 8.5h.01',
  bandera: 'M5 21V4 M5 4h12l-2 4 2 4H5',
  // Métricas y canales
  megafono: 'M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z M18 9a4 4 0 0 1 0 6 M8 14v5h3',
  documento: 'M14 3H6v18h12V7z M14 3v4h4 M9 12h6 M9 16h6',
  trofeo: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M7 6H4v1a3 3 0 0 0 3 3 M17 6h3v1a3 3 0 0 1-3 3',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
  lugar: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.800 7 11 7 11z M12 12.5a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5',
  cursor: 'M5 3l6 16 2.200-6.800L20 10z M14 14l6 6',
  globo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c2.500 2.700 2.500 15.300 0 18 M12 3c-2.500 2.700-2.500 15.300 0 18',
  chispa: 'M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z M19 16l.800 2.200L22 19l-2.200.800L19 22l-.800-2.200L16 19l2.200-.800z',
  capas: 'M12 3 2 8l10 5 10-5z M2 13l10 5 10-5 M2 17.500l10 5 10-5',
  edificio: 'M5 21V5l8-2v18 M13 9h6v12 M3 21h18 M8 8h2 M8 12h2 M8 16h2 M16 13h.01 M16 17h.01',
  recibo: 'M6 2h12v20l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h4',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17.500 6.500h.01',
  linkedin: 'M4 9h3.500v11H4z M5.750 4a1.750 1.750 0 1 0 0 3.500A1.750 1.750 0 0 0 5.750 4z M11 9h3.300v1.600c.600-1.100 1.900-1.900 3.600-1.900C20.800 8.700 21 11 21 13.500V20h-3.500v-5.800c0-1.300-.300-2.400-1.700-2.400s-1.300 1.200-1.300 2.500V20H11z',
  youtube: 'M3 7.500A2.500 2.500 0 0 1 5.500 5h13A2.500 2.500 0 0 1 21 7.500v9a2.500 2.500 0 0 1-2.500 2.500h-13A2.500 2.500 0 0 1 3 16.500z M10 9l5 3-5 3z',
} as const

export type NombreIcono = keyof typeof trazos

export function IconoQ3({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  return <svg aria-hidden="true" className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={trazos[nombre]} /></svg>
}
