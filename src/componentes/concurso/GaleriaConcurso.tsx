'use client'

import { useState, useTransition } from 'react'
import estilos from '@/app/concurso/concurso.module.css'
import type { PropuestaConcurso } from '@/db/concurso'
import { votarAction } from '@/app/concurso/acciones'

export function GaleriaConcurso({
  propuestas,
  miCorreo,
  votoInicial,
  votacionAbierta,
}: {
  propuestas: PropuestaConcurso[]
  miCorreo: string
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
      <div className={estilos.tituloSeccion}><span>02</span><div><p>EL LINEUP</p><h2 id="galeria-titulo">Elige lo que vamos a vestir</h2></div></div>
      {error && <p className={estilos.mensajeError} role="alert">{error}</p>}
      <div className={estilos.galeriaGrid}>
        {propuestas.map((propuesta, indice) => {
          const propia = propuesta.integrantes.some((p) => p.correo === miCorreo)
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
                <ul>{propuesta.integrantes.map((p) => <li key={p.correo}><strong>{p.nombre}</strong><span>{p.squad}</span></li>)}</ul>
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

