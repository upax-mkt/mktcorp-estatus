import base from './base.module.css'
import { Portada } from './escenas/Portada'
import { Descubrimos } from './escenas/Descubrimos'
import { Creemos } from './escenas/Creemos'
import { Indice } from './escenas/Indice'
import { Propuesta } from './escenas/Propuesta'
import { Plan } from './escenas/Plan'
import { Cierre } from './escenas/Cierre'
import { DESCUBRIMOS, PROPUESTAS } from './contenido'

/**
 * FORTALEZA MEXICANA (ronda 6, 21-oct-2026): lo que descubrimos y cómo puede ayudar Grupo UPAX a Fortaleza Mexicana
 * —Malinche, el Frontón México y Pelota Mestiza—. Para la Sra. María Laura Medina de Salinas; la presentan Ceci y Franco.
 *
 * La estructura de Ceci (20-oct): Fortaleza Mexicana es el bastión → qué descubrimos → por qué creemos → cómo ayudamos,
 * con Fortaleza al centro. Lo que ajustó al revisarla con las unidades (Notas de Voz «UPAX GS 11», 21-oct):
 * - primero solo los problemas, mejor definidos y uno por idea; las soluciones, después («no todo junto»);
 * - lo que proponemos, por las cuatro partes que Marketing United propuso impulsar: Malinche, el Frontón, Pelota
 *   Mestiza y las experiencias gastronómicas;
 * - palabras llanas, cada propuesta con lo que mandó su unidad, y ejemplos que se vean.
 *
 * El texto vive en `contenido.ts`; el guion y la fuente de cada dato, en
 * `~/CMO Copilot/sesiones/2026-10-20-fortaleza-presentacion/guion-tecnico.md` (sección «Ronda 6»).
 *
 * Cada `<section data-layout>` es una pantalla: se lee con scroll y `ModoPresentar` la proyecta a pantalla completa.
 */
export function PresentacionFortaleza() {
  return (
    <div className={base.documento}>
      <Portada />
      {DESCUBRIMOS.map((g, i) => (
        <Descubrimos key={g.id} grupo={g} parte={i + 1} />
      ))}
      <Creemos />
      <Indice />
      {PROPUESTAS.map((p) => (
        <Propuesta key={p.id} propuesta={p} />
      ))}
      <Plan />
      <Cierre />
    </div>
  )
}
