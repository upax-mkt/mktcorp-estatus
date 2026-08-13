'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { fechaBreveConAnio } from '@/lib/fecha'
import { dominioDe, tonoDeDominio } from '@/lib/materiales'
import { Seccion } from './Seccion'
import estilos from '@/app/cliente/cliente.module.css'

/**
 * LAS NOTAS DE PRENSA DE LA UDN, entre los Materiales Comerciales y los
 * Archivos de Interés.
 *
 * Franco (13-ago): *"debemos agregar antes de archivos de interés, abajo de
 * archivos comerciales, algo que se llame Notas de Prensa Destacadas o algo
 * así; la mayoría son link pero se deben ver distintas a como se ve el otro
 * módulo de materiales"*.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO ES `MaterialesAgrupados` CON OTRO TÍTULO. Una nota no se
 * consulta como un material: de un material importa QUÉ ES (un PDF, un deck,
 * un vídeo) porque eso decide si sirve para lo que hay que hacer ahora; de una
 * nota importan QUIÉN LA PUBLICÓ y CUÁNDO — que es lo que la convierte en
 * prueba. Por eso la tarjeta lleva el medio y la fecha delante, y no una
 * carátula que diga «PDF».
 *
 * Y por eso tampoco tiene subcategorías ni arrastre: el orden de una hemeroteca
 * lo pone la fecha, y ordenarla a mano sería trabajo repetido que además
 * envejece solo. Los grupos existen en el otro módulo porque ahí el orden es
 * una decisión comercial ("credenciales primero"); aquí no hay tal decisión.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA PORTADA SE SUBE Y LA SIRVE ESTA APP. Nunca se le pide la imagen —ni el
 * favicon— al sitio del medio: la sala de un cliente es PÚBLICA desde el
 * 12-ago, así que cada visitante haría una petición a ese tercero y le
 * revelaría su IP. Es la misma razón por la que las carátulas de material se
 * dibujan en vez de descargarse (ver CaratulaMaterial.tsx).
 *
 * Sin portada, la tarjeta NO deja un rectángulo gris: pone el nombre del medio
 * en grande sobre un color calculado a partir de su dominio —estable, sin
 * guardar nada—, que es lo que ya hace un enlace en el otro módulo. Una
 * hemeroteca sin imágenes tiene que seguir leyéndose como una hemeroteca.
 */

export interface NotaDePrensa {
  id: string
  titulo: string
  /** La nota, en el sitio del medio. Siempre presente: es el destino. */
  enlace: string | null
  /** "El Economista". Puede faltar en una nota vieja; entonces manda el dominio. */
  medio?: string | null
  /** ISO corto (yyyy-mm-dd), o null si no se sabe cuándo se publicó. */
  fecha: string | null
  /** El pathname de la PORTADA en Blob, si se subió una. */
  ruta: string | null
  nombreOriginal: string | null
}

export function NotasDePrensa({
  titulo,
  notas,
  equipo,
  eliminarAction,
  children,
  id,
}: {
  titulo: string
  notas: NotaDePrensa[]
  equipo: boolean
  /** Solo llega si quien mira puede editar. Sin ella no se ofrece quitar nada. */
  eliminarAction?: (archivoId: string) => Promise<void | { error?: string }>
  /** El formulario de añadir, que monta la sala. */
  children?: ReactNode
  id?: string
}) {
  // Un módulo vacío no existe para quien solo mira (regla de la ronda 12); al
  // equipo se le enseña igual, porque ese vacío es su puerta para cargarlo.
  if (notas.length === 0 && !equipo) return null

  return (
    <Seccion id={id} icono="prensa" titulo={titulo} conteo={notas.length || undefined} plegable>
      {notas.length === 0 ? (
        <p className={estilos.vacioNota}>
          Todavía no hay notas. Lo que se publique sobre la UDN —una entrevista, una mención en un
          reportaje, un premio— vive aquí, con su medio y su fecha.
        </p>
      ) : (
        <ul className={estilos.prensaLista}>
          {notas.map((n) => (
            <Nota key={n.id} nota={n} equipo={equipo} eliminarAction={eliminarAction} />
          ))}
        </ul>
      )}
      {children}
    </Seccion>
  )
}

function Nota({
  nota,
  equipo,
  eliminarAction,
}: {
  nota: NotaDePrensa
  equipo: boolean
  eliminarAction?: (archivoId: string) => Promise<void | { error?: string }>
}) {
  const dominio = nota.enlace ? dominioDe(nota.enlace) : ''
  // El medio escrito manda; si falta, el dominio es mejor que un hueco.
  const medio = nota.medio?.trim() || dominio
  // El color sale del DOMINIO y no del medio escrito: así dos notas del mismo
  // periódico comparten color aunque una diga "El Economista" y otra
  // "El Economista MX".
  const tono = tonoDeDominio(dominio)

  return (
    <li className={estilos.prensaTarjeta} style={{ '--tono': tono } as React.CSSProperties}>
      <a
        className={estilos.prensaEnlace}
        href={nota.enlace ?? '#'}
        target="_blank"
        // `noreferrer` además de `noopener`: al medio no tiene por qué llegarle
        // desde qué sala de qué cliente se abrió su nota.
        rel="noopener noreferrer"
      >
        <span className={estilos.prensaPortada}>
          {nota.ruta ? (
            // `img` a pelo y no `next/image`, por el mismo motivo que en
            // `MaterialesSala`: la portada sale de `/api/archivo/[id]`, que es
            // dinámica y privada, y optimizarla en el servidor obligaría a
            // descargarla en cada render.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={estilos.prensaImagen}
              // La sirve la app, con los permisos de la sala: el store de Blob
              // es privado y su URL no vale sin firma.
              src={`/api/archivo/${nota.id}`}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className={estilos.prensaMedioGrande} aria-hidden="true">{medio}</span>
          )}
        </span>
        <span className={estilos.prensaTexto}>
          <span className={estilos.prensaFicha}>
            <span className={estilos.prensaMedio}>{medio}</span>
            {nota.fecha && (
              <>
                <span aria-hidden>·</span>
                <span>{fechaBreveConAnio(nota.fecha)}</span>
              </>
            )}
          </span>
          <span className={estilos.prensaTitular}>{nota.titulo}</span>
        </span>
      </a>

      {equipo && eliminarAction && <Quitar id={nota.id} eliminarAction={eliminarAction} />}
    </li>
  )
}

/**
 * Quitar una nota, en dos tiempos y con el mismo gesto que el resto de la app.
 * El botón solo aparece al acercarse o al recibir el foco: esta pantalla la ve
 * también el director de la UDN, y una × permanente en cada tarjeta convierte
 * una hemeroteca en un panel de administración.
 */
function Quitar({
  id,
  eliminarAction,
}: {
  id: string
  eliminarAction: (archivoId: string) => Promise<void | { error?: string }>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [pendiente, empezar] = useTransition()

  if (!confirmando) {
    return (
      <button
        type="button"
        className={estilos.prensaQuitar}
        onClick={() => setConfirmando(true)}
        aria-label="Quitar la nota"
        title="Quitar"
      >
        ✕
      </button>
    )
  }

  return (
    <span className={estilos.prensaConfirmar}>
      <button
        type="button"
        className={estilos.botonBorrar}
        disabled={pendiente}
        onClick={() => empezar(async () => { await eliminarAction(id) })}
      >
        Borrar
      </button>
      <button type="button" className={estilos.botonCancelarBorrado} onClick={() => setConfirmando(false)}>
        No
      </button>
    </span>
  )
}
