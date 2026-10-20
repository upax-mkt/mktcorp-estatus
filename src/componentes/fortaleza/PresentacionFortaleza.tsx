import base from './base.module.css'
import { Portada } from './escenas/Portada'
import { Escuchamos } from './escenas/Escuchamos'
import { Joya } from './escenas/Joya'
import { Sumar } from './escenas/Sumar'
import { Ahora } from './escenas/Ahora'
import { Nuestro } from './escenas/Nuestro'
import { Ciudad } from './escenas/Ciudad'
import { Calle } from './escenas/Calle'
import { Grupo } from './escenas/Grupo'
import { Semana } from './escenas/Semana'
import { Usos } from './escenas/Usos'
import { Comprar } from './escenas/Comprar'
import { Medir } from './escenas/Medir'
import { Ruta } from './escenas/Ruta'
import { Lleno } from './escenas/Lleno'
import { Cierre } from './escenas/Cierre'

/**
 * «LO QUEREMOS LLENO» (20-oct-2026): la propuesta de Grupo UPAX para la Sra. María Laura Medina de Salinas —
 * Fortaleza Mexicana, Malinche, el Frontón México y Pelota Mestiza—. La presentan Ceci y Franco.
 *
 * Hecha con motion-studio. Guion técnico y hoja de movimiento:
 * `~/CMO Copilot/sesiones/2026-10-20-fortaleza-presentacion/guion-tecnico.md`. El texto de cada escena sale de ahí y
 * no se reescribe sin Franco.
 *
 * Historia: lo que escuchamos (sus palabras), lo que ya tienen (una joya), dónde podemos sumar, por qué ahora, lo
 * hacemos nuestro (cinco frentes), los cinco frentes uno por uno, la ruta, la cumbre y la petición.
 *
 * Ronda 2 (20-oct-2026, tras el revisor ciego): las doce láminas del guion quedan en dieciséis pantallas, con el
 * mismo texto y el mismo orden. A tamaño de proyección, la 7 (ciudad) y la 9 (semana) se parten en dos; la 12 se
 * parte en ruta, cumbre y cierre, para que la cumbre quede sola y la siga una lámina tranquila.
 *
 * Hilo conductor: el aforo (`Aforo`), el teatro visto desde arriba. Abre a la mitad, cada frente enciende su tramo y
 * la cumbre lo llena; ahí el dibujo se vuelve la foto real del teatro lleno.
 *
 * Cada `<section data-layout>` es una pantalla: se lee con scroll y `ModoPresentar` la proyecta a pantalla completa.
 * Base común en `base.module.css` y `comun.tsx`; cada escena en `escenas/`.
 */
export function PresentacionFortaleza() {
  return (
    <div className={base.documento}>
      <Portada />
      <Escuchamos />
      <Joya />
      <Sumar />
      <Ahora />
      <Nuestro />
      <Ciudad />
      <Calle />
      <Grupo />
      <Semana />
      <Usos />
      <Comprar />
      <Medir />
      <Ruta />
      <Lleno />
      <Cierre />
    </div>
  )
}
