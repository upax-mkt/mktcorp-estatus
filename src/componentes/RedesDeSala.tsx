import { IconoRed } from './IconoRed'
import { NOMBRE_DE_RED, redesConEnlace, type RedesDeSala as Redes } from '@/dominio/redes'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LA FILA DE ENLACES DE LA MARCA, en la cabecera de su sala.
 *
 * Franco: *"necesito que todas las salas en el header tengan sus respectivos
 * iconos de redes sociales, sitio web, blog, etc."*.
 *
 * Va en la franja de datos del hero, junto a "última reunión" y "acuerdos
 * abiertos", y no en un módulo aparte: es identidad, no gestión. Quien abre la
 * sala de una UDN —incluido el director al que se le comparte el enlace— tiene
 * ahí mismo por dónde ver a esa marca por fuera.
 *
 * SE ABREN EN OTRA PESTAÑA, con `rel="noreferrer"`: son destinos ajenos, y sin
 * `noopener` la página de destino recibe un puntero a la nuestra por
 * `window.opener`. `noreferrer` lo incluye.
 *
 * SIN NINGÚN ENLACE NO SE PINTA NADA — ni el hueco ni un "sin redes". La
 * cabecera de una sala sin redes tiene que verse exactamente como antes de que
 * esto existiera.
 */
export function RedesDeSala({ redes, nombre }: { redes: Redes | null | undefined; nombre: string }) {
  const enlaces = redesConEnlace(redes)
  if (enlaces.length === 0) return null

  return (
    <div className={estilos.heroRedes}>
      {enlaces.map(([red, url]) => (
        <a
          key={red}
          href={url}
          target="_blank"
          rel="noreferrer"
          className={estilos.heroRed}
          // El nombre lleva la marca: en un lector de pantalla, seis enlaces
          // llamados "LinkedIn, Instagram, YouTube" fuera de contexto no dicen
          // de quién son.
          aria-label={`${NOMBRE_DE_RED[red]} de ${nombre}`}
          title={NOMBRE_DE_RED[red]}
        >
          <IconoRed red={red} />
        </a>
      ))}
    </div>
  )
}
