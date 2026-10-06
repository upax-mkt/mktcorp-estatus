import base from './base.module.css'
import { Portada } from './escenas/Portada'
import { Idea } from './escenas/Idea'
import { Orbita } from './escenas/Orbita'
import { Organigrama } from './escenas/Organigrama'
import { Journey } from './escenas/Journey'
import { Kpis } from './escenas/Kpis'
import { Candidatos } from './escenas/Candidatos'
import { Piloto } from './escenas/Piloto'
import { Plan } from './escenas/Plan'
import { Decisiones } from './escenas/Decisiones'

/**
 * LA PROPUESTA DE MARKETING CORPORATIVO PARA EL ÁREA COMERCIAL DE RESEARCH LAND (6-oct-2026).
 *
 * Tercera versión, hecha con motion-studio. Las dos anteriores se rechazaron:
 * la primera era «solo crítica»; la segunda traía realidad y números actuales
 * y le faltaban diseño y storytelling. El guion técnico y la hoja de movimiento
 * viven en `~/CMO Copilot/sesiones/2026-10-06 RL entrevistas PM/guion-presentacion-rl.md`.
 *
 * Historia de decisión: la respuesta primero (portada), la idea de su propio
 * plan, la estructura (órbita y organigrama), la cumbre (el journey: el cliente
 * nunca se queda sin dueño), una escena tranquila (KPIs), las personas
 * (candidatos y piloto), el plan y las tres decisiones que se piden.
 *
 * Hilo conductor: el cliente, un punto amarillo (`Punto`), presente en cada
 * escena y transformado en lo que esa escena cuenta. El amarillo es solo suyo
 * y de las dos puertas nuevas del journey.
 *
 * Cada `<section data-layout>` es una pantalla: se lee con scroll y
 * `ModoPresentar` la proyecta a pantalla completa. Base común en
 * `base.module.css` y `comun.tsx`; cada escena en `escenas/`.
 */
export function PresentacionRl() {
  return (
    <div className={base.documento}>
      <Portada />
      <Idea />
      <Orbita />
      <Organigrama />
      <Journey />
      <Kpis />
      <Candidatos />
      <Piloto />
      <Plan />
      <Decisiones />
    </div>
  )
}
