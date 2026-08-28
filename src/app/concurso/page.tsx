import type { Metadata } from 'next'
import Image from 'next/image'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import estilos from './concurso.module.css'
import { exigirLectura, esAdmin } from '@/auth/roles'
import { cerrarSesion } from '@/auth/sesion'
import { buscarPersona, normalizarCorreo } from '@/db/directorio'
import {
  galeriaConcurso,
  participantesDisponiblesConcurso,
  propuestaDePersona,
  propuestasAdministracionConcurso,
  estadoJuradoConcurso,
  resultadosConcurso,
  votoDePersona,
} from '@/db/concurso'
import { faseDelConcurso } from '@/concurso/fase'
import { FECHAS_CONCURSO } from '@/concurso/config'
import { BarraNavegacion, clientesParaBarra } from '@/componentes/BarraNavegacion'
import { CuentaRegresiva } from '@/componentes/concurso/CuentaRegresiva'
import { FormularioPropuesta } from '@/componentes/concurso/FormularioPropuesta'
import { GaleriaConcurso } from '@/componentes/concurso/GaleriaConcurso'
import { PanelJurado } from '@/componentes/concurso/PanelJurado'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Diseña lo que somos',
  description: 'Concurso interno para crear la sudadera oficial de Marketing Corporativo.',
}

export default async function PaginaConcurso() {
  const sesion = await exigirLectura()
  await connection()
  const ahora = new Date()
  const fase = faseDelConcurso(ahora)
  const correo = sesion.sub ? normalizarCorreo(sesion.sub) : null

  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/entrar')
  }

  const admin = await esAdmin()
  const [persona, propia, disponibles, galeria, voto, resultados, clientes, propuestasAdmin, estadoJurado] = await Promise.all([
    correo ? buscarPersona(correo) : null,
    correo ? propuestaDePersona(correo) : null,
    fase === 'recepcion' ? participantesDisponiblesConcurso() : [],
    galeriaConcurso(ahora),
    correo && fase !== 'recepcion' ? votoDePersona(correo) : null,
    resultadosConcurso(ahora),
    clientesParaBarra(),
    admin ? propuestasAdministracionConcurso() : [],
    admin ? estadoJuradoConcurso() : { nombres: [], calificaciones: [] },
  ])
  const ganador = resultados[0]

  return (
    <div className={estilos.app}>
      <BarraNavegacion seccionActiva="concurso" hoy={ahora} admin={admin} clientes={clientes} salirAction={salir} />
      <main>
        <section className={estilos.hero}>
          <div className={estilos.halftone} aria-hidden="true" />
          <Image
            src="/logos/mkt-corp-grupo-upax-blanco.png"
            width={4500}
            height={1516}
            alt="Marketing Corp y Grupo UPAX"
            className={estilos.heroLogo}
            priority
          />
          <p className={estilos.eyebrow}>CONCURSO INTERNO · EDICIÓN 2026</p>
          <h1>DISEÑA<br /><span>LO QUE SOMOS</span></h1>
          <p className={estilos.heroBajada}>Tu idea. Nuestra sudadera. Una pieza para llevar el talento de MKT Corp puesto.</p>
          {fase === 'recepcion' && <CuentaRegresiva objetivo={FECHAS_CONCURSO.cierrePropuestas.toISOString()} etiqueta="La galería se revela en" />}
          {fase === 'votacion' && <CuentaRegresiva objetivo={FECHAS_CONCURSO.cierreVotacion.toISOString()} etiqueta="Tu pase cierra en" />}
          {fase === 'cerrado' && <CuentaRegresiva objetivo={FECHAS_CONCURSO.ceremonia.toISOString()} etiqueta="El ganador se revela en" />}
          {fase === 'resultados' && ganador && <div className={estilos.ganadorHero}><small>GANADOR 2026</small><strong>{ganador.propuesta.titulo}</strong><span>{ganador.propuesta.integrantes.map((p) => p.nombre).join(' + ')}</span></div>}
          <div className={estilos.fechasHero}><span>VOTA 7–8 SEP</span><span>REVELACIÓN 9 SEP · 15 H</span><span>SKY LOBBY · SALA 2</span></div>
        </section>

        <div className={estilos.contenido}>
          {admin && <PanelJurado propuestas={propuestasAdmin} estado={estadoJurado} />}
          {fase === 'recepcion' && persona && persona.squad && (
            <FormularioPropuesta persona={persona} disponibles={disponibles} existente={propia} />
          )}
          {fase === 'recepcion' && (!persona || !persona.squad) && (
            <section className={estilos.aviso} role="alert"><strong>Falta asignar tu squad.</strong><p>Pide a un administrador que lo seleccione en Personas para poder participar.</p></section>
          )}
          {fase === 'recepcion' && (
            <section className={estilos.espera}>
              <span className={estilos.numeroGrande}>02</span><h2>El lineup sigue bajo llave</h2>
              <p>Todas las propuestas se revelan al mismo tiempo el lunes 7 de septiembre a las 11:00.</p>
            </section>
          )}
          {fase !== 'recepcion' && correo && (
            <GaleriaConcurso propuestas={galeria} miCorreo={correo} votoInicial={voto} votacionAbierta={fase === 'votacion'} />
          )}

          <section className={estilos.bases} id="bases">
            <div className={estilos.tituloSeccion}><span>03</span><div><p>NO HAY LETRA CHIQUITA</p><h2>Cómo entrar al escenario</h2></div></div>
            <div className={estilos.basesGrid}>
              <article><b>01</b><h3>Solo o en dupla</h3><p>Una propuesta por persona. Las duplas deben unir squads distintos.</p></article>
              <article><b>02</b><h3>Diseña libre</h3><p>Con o sin capucha, frente, espalda o mangas. Base negra, blanca, gris, arena o azul marino.</p></article>
              <article><b>03</b><h3>Tres firmas</h3><p>Incluye Grupo UPAX, Marketing Corp y “¡ASÍ SOMOS!” sin alterar los logos.</p></article>
              <article><b>04</b><h3>Hazlo humano</h3><p>Diseño terminado o concepto propio. No se permite inteligencia artificial generativa.</p></article>
              <article><b>05</b><h3>Entrega visual</h3><p>Hasta tres JPG o PNG, máximo 25 MB cada uno. El editable se pedirá solo al ganador.</p></article>
              <article><b>06</b><h3>70 + 30</h3><p>70% pase del equipo y 30% jurado: creatividad, cultura, viabilidad y atractivo visual.</p></article>
            </div>
          </section>

          <section className={estilos.premio}>
            <p className={estilos.eyebrow}>HEADLINER PRIZE</p>
            <h2>EL DISEÑO GANADOR<br /><span>SE LLEVA TODO</span></h2>
            <div className={estilos.premioGrid}>
              <article><small>INDIVIDUAL</small><strong>Pase doble Arena CDMX</strong><span>Gift card $1,000 MXN</span><span>+ 1 día adicional</span></article>
              <div className={estilos.rayo} aria-hidden="true">ϟ</div>
              <article><small>DUPLA · CADA PERSONA</small><strong>Pase doble Arena CDMX</strong><span>Gift card $500 MXN</span><span>+ 1 día adicional</span></article>
            </div>
            <p className={estilos.legal}>Pases sujetos a disponibilidad. Día adicional previa coordinación con tu formador.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
