import Link from 'next/link'
import { fechaBreve } from '@/lib/fecha'
import { tonoDeVencimiento } from '@/dominio/orden-acuerdos'
import { colorDeTextoDeMarca } from '@/temas'
import estilos from '@/app/cliente/cliente.module.css'
import type { ReactNode, CSSProperties } from 'react'

/**
 * UN ACUERDO, CON LA MISMA CARA EN LA SALA Y EN EL HOME.
 *
 * Franco, dos veces: *"hay que mejorar la lógica de los acuerdos… en el home
 * es otra versión"* y después *"en el home siguen apareciendo el mismo módulo
 * de reuniones y acuerdos, te dije que no es lo mismo que vemos en las salas"*.
 *
 * Y no lo era. El mismo compromiso se pintaba distinto según la pantalla:
 *
 *   EN LA SALA   ● Sesión de trabajo para bosquejar la agenda…     ABIERTO
 *                  sin dueño · 31 jul · de la reunión del 23 jul
 *
 *   EN EL HOME     Sesión de trabajo para bosquejar la agenda…
 *                  Marketing United · sin dueño      [31 jul] [Cumplido] ★
 *
 * En el Home faltaban el punto de estado, la etiqueta de estatus y de qué
 * reunión salía; y la fecha era un botón que abría un selector. Dos gramáticas
 * para el mismo dato hacen que haya que aprender la pantalla antes de leerla
 * — y quien mira el Home y luego entra a la sala ve el mismo acuerdo dos veces
 * sin reconocerlo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE CAMBIA ENTRE LOS DOS CONTEXTOS, y por eso son props y no ramas:
 *
 * - **`sala`**: en la sala sobra decir de quién es el acuerdo (están todos en
 *   la suya); el Home cruza nueve, así que ahí SÍ va, con su color de marca y
 *   como enlace.
 * - **`origen`**: "de la reunión del 23 jul". Dentro de la sala es un ancla a
 *   la misma página (`#r-<id>`); desde el Home tiene que ser la URL completa
 *   de esa sala. Llega ya resuelto: quien lo pinta no sabe dónde está.
 * - **`children`**: los controles de la derecha. Cada pantalla ofrece los
 *   suyos —la sala mueve estatus y fecha, el Home alterna cumplido— y este
 *   componente no tiene por qué conocerlos.
 *
 * EL CSS ES EL DE LA SALA (`cliente.module.css`), a propósito y no por pereza:
 * es donde el patrón se resolvió, y tener dos hojas con `.acuerdo` es
 * exactamente lo que las dejó divergir. Mismo criterio que `Seccion`.
 */

export interface DatosFilaAcuerdo {
  id: string
  que: string
  responsable: string
  squad?: string | null
  estatus: 'abierto' | 'cumplido' | 'vencido'
  fechaCompromiso: string | null
  /**
   * Un acuerdo abierto de una sala EN PAUSA. Su estatus ya llega como
   * 'abierto' —`estatusEfectivo` no lo pasa a vencido mientras la sala está
   * apagada—, pero decir solo "abierto" sobre una fecha vieja no explicaría
   * por qué no está en rojo. Se lo dice la etiqueta.
   */
  congelado?: boolean
}

export const ETIQUETA_ESTADO: Record<DatosFilaAcuerdo['estatus'], string> = {
  abierto: 'Abierto',
  cumplido: 'Cumplido',
  vencido: 'Vencido',
}

/**
 * La fecha del compromiso y con qué tono se escribe.
 *
 * CON `hoy`, LA FECHA ES UN SEMÁFORO (ronda 13). Franco: *"tal vez la fecha
 * podría ir tiñéndose como semáforo"*. Rojo lo vencido, ámbar lo que cae
 * dentro de la semana, verde lo que tiene margen — la regla y sus umbrales
 * viven en `dominio/orden-acuerdos.ts`, no aquí.
 *
 * SIN `hoy` se comporta como antes (solo rojo para lo vencido): hay pantallas
 * que pintan esta fila sin saber qué día es, y encender medio semáforo sería
 * peor que no encenderlo.
 */
export function textoFechaAcuerdo(
  a: Pick<DatosFilaAcuerdo, 'fechaCompromiso' | 'estatus'>,
  hoyCivil?: string,
): { txt: string; clase: string } {
  if (a.fechaCompromiso == null) return { txt: 'por definir', clase: 'pordef' }
  const clase = hoyCivil
    ? tonoDeVencimiento(a.fechaCompromiso, a.estatus, hoyCivil)
    : a.estatus === 'vencido' ? 'vencida' : ''
  return { txt: fechaBreve(a.fechaCompromiso), clase }
}

interface Props {
  acuerdo: DatosFilaAcuerdo
  /**
   * El texto del acuerdo. Se omite salvo que haya que pintarlo de otra forma
   * —en la sala es un editor en sitio—, y entonces por defecto se escribe
   * `acuerdo.que` con la clase de siempre. Así el Home no tiene que importar
   * la hoja de estilo de la sala solo para una clase.
   */
  texto?: ReactNode
  /** De qué sala es. Solo donde se cruzan varias — en la sala sobra. */
  sala?: { slug: string; nombre: string; color: string }
  /** La reunión de la que salió, con el destino YA resuelto por quien pinta. */
  origen?: { href: string; fecha: string }
  /** Los controles de la derecha: los suyos pone cada pantalla. */
  children?: ReactNode
  /**
   * El día de hoy (civil, yyyy-mm-dd). Con él la fecha se pinta como semáforo
   * y lo cumplido se apaga; sin él, la fila es la de siempre.
   */
  hoyCivil?: string
}

export function FilaAcuerdo({ acuerdo, texto, sala, origen, children, hoyCivil }: Props) {
  const f = textoFechaAcuerdo(acuerdo, hoyCivil)
  const claseEstado = acuerdo.congelado ? estilos.congelado : estilos[acuerdo.estatus]
  /**
   * LO CUMPLIDO SE APAGA. Franco: *"los que ya están cumplidos deberían pasar
   * abajito y verse más chiquitos y grises, no como que se vean cumplidos"*.
   * Bajarlos es cosa del orden (`ordenarAcuerdosDeSala`); esto es la otra
   * mitad — se siguen leyendo, pero no compiten con lo que sí corre.
   */
  const apagado = acuerdo.estatus === 'cumplido'

  return (
    <div
      className={`${estilos.acuerdo}${apagado ? ` ${estilos.acuerdoApagado}` : ''}`}
      // El color de marca solo cuando hay sala que distinguir: dentro de una,
      // el filo de color sería el mismo en las nueve filas.
      style={
        sala
          ? ({ '--marca': sala.color, '--marca-texto': colorDeTextoDeMarca(sala.color) } as CSSProperties)
          : undefined
      }
    >
      <span className={`${estilos.acuerdoEstado} ${claseEstado}`} />
      <div>
        {texto ?? <div className={estilos.acuerdoQue}>{acuerdo.que}</div>}
        <div className={estilos.acuerdoMeta}>
          {sala && (
            <>
              <Link href={`/cliente/${sala.slug}`} className={estilos.acuerdoSala}>
                {sala.nombre}
              </Link>
              <span className={estilos.sep}>·</span>
            </>
          )}
          <span>{acuerdo.responsable === 'por asignar' ? 'sin dueño' : acuerdo.responsable}</span>
          {acuerdo.squad && (
            <>
              <span className={estilos.sep}>·</span>
              <span>{acuerdo.squad}</span>
            </>
          )}
          <span className={estilos.sep}>·</span>
          <span className={`${estilos.acuerdoFecha} ${f.clase ? estilos[f.clase] : ''}`}>{f.txt}</span>
          {/* DE DÓNDE SALIÓ. Un compromiso sin su junta obliga a recordar en
              cuál se acordó para poder discutirlo. */}
          {origen && (
            <>
              <span className={estilos.sep}>·</span>
              <a href={origen.href} className={estilos.acuerdoOrigen}>
                de la reunión del {fechaBreve(origen.fecha)}
              </a>
            </>
          )}
        </div>
      </div>
      <div className={estilos.acuerdoDcha}>
        <span className={`${estilos.acuerdoBadge} ${claseEstado}`}>
          {acuerdo.congelado ? 'congelado' : ETIQUETA_ESTADO[acuerdo.estatus]}
        </span>
        {children}
      </div>
    </div>
  )
}
