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
          {/* TRES BANDAS, no una pila. El logo es la primera, el mensaje la
              segunda —centrado en el hueco que sobre— y los datos la tercera.
              Antes los seis bloques colgaban sueltos del hero y cada uno ponía
              su propio margen: salían 68 px bajo el logo, 5 bajo el antetítulo
              y −6 en la bajada, que se solapaba con el titular. */}
          <div className={estilos.heroMensaje}>
            <p className={estilos.eyebrow}>CONCURSO INTERNO · EDICIÓN 2026</p>
            <h1>DISEÑA<br /><span>LO QUE SOMOS</span></h1>
            <p className={estilos.heroBajada}>Tu idea. Nuestra sudadera. Una pieza para llevar el talento de MKT Corp puesto.</p>
          </div>
          <div className={estilos.heroPie}>
            {fase === 'recepcion' && <CuentaRegresiva objetivo={FECHAS_CONCURSO.cierrePropuestas.toISOString()} etiqueta="La galería se revela en" />}
            {fase === 'votacion' && <CuentaRegresiva objetivo={FECHAS_CONCURSO.cierreVotacion.toISOString()} etiqueta="Tu pase cierra en" />}
            {fase === 'cerrado' && <CuentaRegresiva objetivo={FECHAS_CONCURSO.ceremonia.toISOString()} etiqueta="El ganador se revela en" />}
            {fase === 'resultados' && ganador && <div className={estilos.ganadorHero}><small>GANADOR 2026</small><strong>{ganador.propuesta.titulo}</strong><span>{ganador.propuesta.integrantes.map((p) => p.nombre).join(' + ')}</span></div>}
            <div className={estilos.fechasHero}><span>VOTA 7–8 SEP</span><span>REVELACIÓN 9 SEP · 15 H</span><span>SKY LOBBY · SALA 2</span></div>
          </div>
        </section>

        <div className={estilos.contenido}>
          <section className={estilos.premio}>
            <p className={estilos.eyebrow}>01 · LO QUE ESTÁ EN JUEGO</p>
            <h2>EL DISEÑO GANADOR<br /><span>SE LLEVA TODO</span></h2>
            <div className={estilos.premioGrid}>
              <article><small>INDIVIDUAL</small><strong>Pase doble Arena CDMX</strong><span>Gift card $1,000 MXN</span><span>+ 1 día adicional</span></article>
              <div className={estilos.rayo} aria-hidden="true">ϟ</div>
              <article><small>DUPLA · CADA PERSONA</small><strong>Pase doble Arena CDMX</strong><span>Gift card $500 MXN</span><span>+ 1 día adicional</span></article>
            </div>
            <p className={estilos.legal}>Pases sujetos a disponibilidad. Día adicional previa coordinación con tu formador.</p>
          </section>
          {/* LA DINÁMICA, COMO SECUENCIA Y NO COMO SEIS CAJAS IGUALES.
              Eran seis `article` del mismo tamaño con número, título y párrafo
              — la anti-referencia literal del PRODUCT.md ("tarjetas idénticas
              con icono+título+texto repetidas")— y sobre todo no contaban un
              proceso: seis reglas sueltas en las que nada indicaba por dónde
              empezar. Ahora son TRES PASOS numerados, que es lo que de verdad
              hay que hacer, y las condiciones bajan a letra chica agrupada,
              que es su peso real. */}
          <section className={estilos.bases} id="bases">
            <div className={estilos.tituloSeccion}><span>02</span><div><p>TRES PASOS</p><h2>Cómo entrar al escenario</h2></div></div>
            <ol className={estilos.pasos}>
              <li>
                <b>01</b>
                <h3>Diseña</h3>
                <p>Con o sin capucha; frente, espalda o mangas. Base negra, blanca, gris, arena o azul marino. Vale un diseño terminado <em>o</em> un concepto: si gana un boceto, te ayudamos a rematarlo.</p>
              </li>
              <li>
                <b>02</b>
                <h3>Súbelo antes del 7 de septiembre</h3>
                <p>Hasta tres imágenes JPG o PNG y una explicación corta. Puedes editarlo todas las veces que quieras hasta que cierre la recepción.</p>
              </li>
              <li>
                <b>03</b>
                <h3>Que el equipo lo vote</h3>
                <p>El 7 se publican todas a la vez y cada persona tiene un voto. El resultado es <strong>70% del equipo y 30% del jurado</strong>.</p>
              </li>
            </ol>
            <div className={estilos.letraChica}>
              <h3>La letra chica, que sí es corta</h3>
              <ul>
                <li>Una propuesta por persona, sola o en dupla — y la dupla une <strong>squads distintos</strong>.</li>
                <li>Tres firmas obligatorias y sin alterar: Grupo UPAX, Marketing Corp y «¡ASÍ SOMOS!».</li>
                <li>Hecho por ti: <strong>sin IA generativa</strong>.</li>
                <li>El archivo editable solo se le pide al ganador.</li>
                <li>El jurado puntúa creatividad, cultura, viabilidad y atractivo visual.</li>
              </ul>
            </div>
          </section>
          {admin && <PanelJurado propuestas={propuestasAdmin} estado={estadoJurado} />}
          {/* SIN SQUAD TAMBIÉN SE PARTICIPA. El formulario se condicionaba a
              `persona.squad`, así que quien no pertenece a ningún squad —el CMO,
              que está por encima de los seis, y las personas indirectas— no
              veía siquiera el formulario. Las bases dicen «cualquier colaborador
              activo, sin importar puesto o squad»; lo único que el squad decide
              es si puedes ir en dupla. Ver `validarIntegrantes`. */}
          {fase === 'recepcion' && persona && (
            <FormularioPropuesta persona={persona} disponibles={disponibles} existente={propia} />
          )}
          {fase === 'recepcion' && !persona && (
            <section className={estilos.aviso} role="alert"><strong>No te encontramos en el directorio.</strong><p>Avisa a Marketing Corporativo para que te den de alta en Personas y puedas participar.</p></section>
          )}
          {fase === 'recepcion' && (
            <section className={estilos.espera}>
              <span className={estilos.numeroGrande}>04</span><h2>El lineup sigue bajo llave</h2>
              <p>Todas las propuestas se revelan al mismo tiempo el lunes 7 de septiembre a las 11:00.</p>
            </section>
          )}
          {fase !== 'recepcion' && correo && (
            <GaleriaConcurso propuestas={galeria} miCorreo={correo} votoInicial={voto} votacionAbierta={fase === 'votacion'} />
          )}


        </div>
      </main>
    </div>
  )
}
