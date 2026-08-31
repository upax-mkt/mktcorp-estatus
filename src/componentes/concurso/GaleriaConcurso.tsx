'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import type { PropuestaAnonima } from '@/db/concurso'
import { votarAction } from '@/app/concurso/acciones'

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
}: {
  propuestas: PropuestaAnonima[]
  votoInicial: string | null
  votacionAbierta: boolean
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
      <div className={estilos.tituloSeccion}><span>05</span><div><p>EL LINEUP · SIN FIRMAS</p><h2 id="galeria-titulo">Elige lo que vamos a vestir</h2></div></div>
      {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
      <div className={estilos.galeriaGrid}>
        {propuestas.map((propuesta, indice) => {
          const propia = propuesta.esMia
          const seleccionada = voto === propuesta.id
          return (
            <article className={estilos.propuesta} key={propuesta.id} data-seleccionada={seleccionada || undefined}>
              <span className={estilos.propuestaNumero}>#{String(indice + 1).padStart(2, '0')}</span>
              <div className={estilos.imagenesGrid}>
                {propuesta.imagenes.map((imagen, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={imagen.id} src={`/api/concurso/imagen/${imagen.id}`} alt={`${propuesta.titulo}, vista ${i + 1}`} />
                ))}
              </div>
              <div className={estilos.propuestaCuerpo}>
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
      {votacionAbierta && voto && <p className={estilos.ticketConfirmado} role="status">ADMIT ONE · Tu pase está activo. Puedes moverlo hasta el martes a las 18:00.</p>}
    </section>
  )
}

