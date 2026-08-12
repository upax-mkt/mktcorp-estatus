/**
 * EL TABLERO DE DATA & ANALYTICS DE LA UDN, incrustado en su sala.
 *
 * Franco: *"en cada sala hay que agregar un módulo más, debe estar arriba de
 * los acuerdos: es un iframe de un módulo que contiene data y analytics de la
 * UDN"*. Las instrucciones las pasó Diego Luna (RevOps) en #squad-revops el
 * 12-ago, y esto las sigue al pie:
 *
 * - Lo sirve ORBIT en `orbit-hub-fgap.vercel.app/embed/<slug>`.
 * - **No requiere login**: carga directo con los datos de esa UDN ya filtrados.
 * - **Solo se deja incrustar desde `mktcorp-estatus.vercel.app`** — ORBIT lo
 *   fija con `Content-Security-Policy: frame-ancestors`. Es a propósito, por
 *   seguridad.
 * - Alto ~900-950 px con el contenido de hoy.
 *
 * ⚠️ CONSECUENCIA PRÁCTICA DE ESE `frame-ancestors`: **en `localhost:3000` el
 * iframe sale en blanco y el navegador escribe un error de CSP en consola**.
 * No es un fallo de esta pantalla; es la política funcionando. Este módulo
 * solo se puede juzgar contra el despliegue.
 *
 * `loading="lazy"`: el tablero es lo primero de la sala y el más pesado. Sin
 * esto, una sala tarda en pintar lo suyo —acuerdos, reuniones— esperando a un
 * documento de otro dominio.
 *
 * SIN `sandbox`: es una app del propio grupo, y un sandbox mal ajustado la
 * rompe por dentro sin decir por qué. Lo que la aísla de verdad es que sea
 * otro origen — no comparte cookies, ni almacenamiento, ni DOM con esta app.
 */

import { Seccion } from './Seccion'
import estilos from '@/app/cliente/cliente.module.css'

export function TableroAnalytics({ url, nombreSala }: { url: string; nombreSala: string }) {
  return (
    <Seccion icono="benchmark" titulo="Data & Analytics" plegable>
      <div className={estilos.tableroMarco}>
        <iframe
          src={url}
          title={`Data & Analytics · ${nombreSala}`}
          className={estilos.tableroIframe}
          loading="lazy"
        />
      </div>
    </Seccion>
  )
}
