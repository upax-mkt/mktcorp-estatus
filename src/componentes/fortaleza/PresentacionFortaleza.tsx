import base from './base.module.css'
import { Portada } from './escenas/Portada'
import { Descubrimos } from './escenas/Descubrimos'
import { Creemos } from './escenas/Creemos'
import { Ayudamos } from './escenas/Ayudamos'
import { Plan } from './escenas/Plan'
import { Cierre } from './escenas/Cierre'

/**
 * FORTALEZA MEXICANA (ronda 4, 21-oct-2026): lo que descubrimos y cómo puede ayudar Grupo UPAX a Fortaleza Mexicana
 * —Malinche, el Frontón México y Pelota Mestiza—. Para la Sra. María Laura Medina de Salinas; la presentan Ceci y Franco.
 *
 * Ceci vio la versión anterior («Lo queremos lleno», 18 pantallas) el 20-oct y la rehízo con su propia estructura
 * (Notas de Voz «Feedback Ceci Fortaleza Mexicana 1» y «UPAX GS 10»):
 * 1. Fortaleza Mexicana es el bastión.
 * 2. Qué descubrimos: el dolor, aterrizado («si no conoces el antecedente y el dolor, no sabes qué arreglar»).
 * 3. Por qué creemos en Fortaleza Mexicana.
 * 4. Cómo ayudamos: un dibujo con Fortaleza al centro y cada unidad alrededor, como botones que se despliegan.
 * Sin jerga, sin el aforo («eso no es mi trabajo, mi trabajo es ofrecerte todas estas herramientas»), con ejemplos de
 * lo que haría cada unidad y con la ruta de octubre a enero, que sí le gustó.
 *
 * El texto vive en `contenido.ts`; el guion y la fuente de cada dato, en
 * `~/CMO Copilot/sesiones/2026-10-20-fortaleza-presentacion/guion-tecnico.md` (sección «Ronda 4»).
 *
 * Cada `<section data-layout>` es una pantalla: se lee con scroll y `ModoPresentar` la proyecta a pantalla completa.
 */
export function PresentacionFortaleza() {
  return (
    <div className={base.documento}>
      <Portada />
      <Descubrimos parte={1} />
      <Descubrimos parte={2} />
      <Creemos />
      <Ayudamos />
      <Plan />
      <Cierre />
    </div>
  )
}
