export interface RubricaJurado {
  creatividad: number
  cultura: number
  viabilidad: number
  atractivo: number
}

function entreCeroYDiez(valor: number): number {
  return Math.min(10, Math.max(0, valor))
}

export function calificacionJurado(rubrica: RubricaJurado): number {
  return entreCeroYDiez(rubrica.creatividad) * 0.3
    + entreCeroYDiez(rubrica.cultura) * 0.25
    + entreCeroYDiez(rubrica.viabilidad) * 0.2
    + entreCeroYDiez(rubrica.atractivo) * 0.25
}

export function puntajeFinal(datos: { votos: number; votosTotales: number; jurado: number }): number {
  const votoEquipo = datos.votosTotales > 0 ? datos.votos / datos.votosTotales * 100 : 0
  const juradoNormalizado = entreCeroYDiez(datos.jurado) * 10
  return votoEquipo * 0.7 + juradoNormalizado * 0.3
}
