export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }

export function hexARgb(hex: string): Rgb {
  const limpio = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Hex inválido: ${hex}`)
  }
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  }
}

export function rgbAHex(r: number, g: number, b: number): string {
  const parte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).toUpperCase().padStart(2, '0')
  return `#${parte(r)}${parte(g)}${parte(b)}`
}

export function hexAHsl(hex: string): Hsl {
  const { r, g, b } = hexARgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break
      case gn: h = (bn - rn) / d + 2; break
      default: h = (rn - gn) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s: s * 100, l: l * 100 }
}

export function hslAHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = ln - c / 2

  let rp = 0, gp = 0, bp = 0
  if (hp < 1) { rp = c; gp = x }
  else if (hp < 2) { rp = x; gp = c }
  else if (hp < 3) { gp = c; bp = x }
  else if (hp < 4) { gp = x; bp = c }
  else if (hp < 5) { rp = x; bp = c }
  else { rp = c; bp = x }

  return rgbAHex((rp + m) * 255, (gp + m) * 255, (bp + m) * 255)
}

export function luminancia(hex: string): number {
  const { r, g, b } = hexARgb(hex)
  const canal = (v: number) => {
    const n = v / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const claro = Math.max(la, lb)
  const oscuro = Math.min(la, lb)
  return (claro + 0.05) / (oscuro + 0.05)
}
