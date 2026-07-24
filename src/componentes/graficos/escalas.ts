export function escalaLineal(
  dominio: [number, number],
  rango: [number, number],
): (valor: number) => number {
  const [d0, d1] = dominio
  const [r0, r1] = rango
  const ancho = d1 - d0
  if (ancho === 0) return () => r0
  return (valor) => r0 + ((valor - d0) / ancho) * (r1 - r0)
}
