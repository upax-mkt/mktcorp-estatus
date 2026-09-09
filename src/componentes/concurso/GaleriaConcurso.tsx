'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import type { PropuestaAnonima } from '@/db/concurso'
import { votarAction } from '@/app/concurso/acciones'
import { FECHAS_CONCURSO } from '@/concurso/config'
import { diaSemana, hora } from '@/concurso/textos'
import { SliderImagenes } from './SliderImagenes'

/**
 * EL LINEUP, ANÓNIMO.
 *
 * Franco, 31-ago-2026: *«en el lineup las propuestas serán anónimas, solo yo
 * podré ver desde la administración quién fue»*. Se vota el diseño, no la
 * firma — que es lo que evita que gane quien más amigos tiene.
 *
 * ⚠️ NO RECIBE `miCorreo` NI LOS INTEGRANTES, y eso es el arreglo, no un
 * descuido. Antes llegaban todos los autores y el componente comparaba correos
 * en el navegador para saber cuál era la tuya: con ese diseño, ocultar los
 * nombres en el JSX no sería anonimato, porque seguirían viajando en el HTML al
 * alcance de cualquiera que abra las herramientas del navegador. Ahora el
 * servidor manda `esMia` ya resuelto (`PropuestaAnonima`, src/db/concurso.ts) y
 * los nombres no salen de allí.
 */
export function GaleriaConcurso({
  propuestas,
  votoInicial,
  votacionAbierta,
  enFila = false,
  admin = false,
  titulo = 'Elige lo que vamos a vestir',
  antetitulo = 'EL LINEUP · SIN FIRMAS',
}: {
  propuestas: PropuestaAnonima[]
  votoInicial: string | null
  votacionAbierta: boolean
  /**
   * El conteo de vistas SOLO PARA ADMINISTRACIÓN (César, 9-sep-2026). A quien
   * vota no le suma —los puntos del slider ya dicen cuántas hay— y quien
   * administra necesita contarlas sin abrir propuesta por propuesta.
   *
   * Es una etiqueta, no un dato reservado: no revela autoría ni voto, así que
   * no hace falta que el servidor la recorte como hace con los integrantes.
   */
  admin?: boolean
  /**
   * En la revelación las propuestas van en UNA SOLA FILA bajo el podio: ahí ya
   * no se está eligiendo, se está repasando quién compitió, y una rejilla de
   * dos columnas volvería a darles el peso de candidatas.
   */
  enFila?: boolean
  titulo?: string
  antetitulo?: string
}) {
  const [voto, setVoto] = useState(votoInicial)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, comenzar] = useTransition()

  function votar(id: string) {
    setError(null)
    comenzar(async () => {
      const resultado = await votarAction(id)
      if (resultado.error) return setError(resultado.error)
      setVoto(id)
    })
  }

  return (
    <section className={estilos.galeria} aria-labelledby="galeria-titulo">
      <div className={estilos.tituloSeccion}><span>05</span><div><p>{antetitulo}</p><h2 id="galeria-titulo">{titulo}</h2></div></div>
      {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
      <div className={enFila ? estilos.galeriaFila : estilos.galeriaGrid}>
        {propuestas.map((propuesta, indice) => {
          const propia = propuesta.esMia
          const seleccionada = voto === propuesta.id
          return (
            <article className={estilos.propuesta} key={propuesta.id} data-seleccionada={seleccionada || undefined}>
              <span className={estilos.propuestaNumero}>#{String(indice + 1).padStart(2, '0')}</span>
              <SliderImagenes titulo={propuesta.titulo} imagenes={propuesta.imagenes} />
              <div className={estilos.propuestaCuerpo}>
                {admin && propuesta.imagenes.length > 1 && (
                  <p className={estilos.vistasEtiqueta}>{`${propuesta.imagenes.length} vistas de esta propuesta`}</p>
                )}
                <h3>{propuesta.titulo}</h3>
                <p>{propuesta.descripcion}</p>
                {/* Sin autores: el lineup es anónimo. Se dice en voz alta en
                    vez de dejar un hueco, porque un espacio en blanco donde
                    antes había un nombre se lee como un fallo. */}
                <p className={estilos.propuestaAnonima}>{propia ? 'Tu propuesta' : 'Autoría anónima hasta la revelación'}</p>
                {votacionAbierta && (
                  <button className={estilos.pase} type="button" disabled={propia || pendiente} onClick={() => votar(propuesta.id)}>
                    {propia ? 'Es tu propuesta' : seleccionada ? '✓ Pase registrado' : '⚡ Usar mi pase'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {votacionAbierta && voto && <p className={estilos.ticketConfirmado} role="status">{`ADMIT ONE · Tu pase está activo. Puedes moverlo hasta el ${diaSemana(FECHAS_CONCURSO.cierreVotacion)} a las ${hora(FECHAS_CONCURSO.cierreVotacion)}.`}</p>}
    </section>
  )
}

