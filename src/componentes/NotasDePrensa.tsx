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
 * ⚠️ ESTO NACIÓ COMO REJILLA DE TARJETAS Y ESTABA MAL. Franco, al cargar sus
 * cinco primeras notas: *"el diseño del módulo de notas no se ve bien, quedó
 * igual a los otros módulos y con cajas mucho más grandes; tiene que verse
 * distinto ya que son notas de prensa"*.
 *
 * El defecto salió en cuanto entraron datos REALES: **ninguna de sus notas
 * trae portada** —lo normal, porque una nota se comparte por su enlace— así
 * que la "carátula" era un rectángulo de color con el nombre del medio, y ese
 * mismo nombre volvía a aparecer dos centímetros más abajo. Cinco notas
 * ocupaban 600 px para decir cinco titulares, en la misma rejilla de carátulas
 * que el módulo de arriba. Estaba diseñado para el caso CON imagen, que es el
 * que casi nunca ocurre.
 *
 * AHORA ES UNA LISTA, que es como se lee la prensa: una fila por nota, con el
 * medio y la fecha arriba y el TITULAR ocupando el ancho. Cinco notas en un
 * tercio del alto, y es la única forma del módulo que no se parece a ninguna
 * otra de la sala — todo lo demás son rejillas de tarjetas.
 *
 * POR QUÉ NO ES `MaterialesAgrupados` CON OTRO TÍTULO. Una nota no se
 * consulta como un material: de un material importa QUÉ ES (un PDF, un deck,
 * un vídeo) porque eso decide si sirve para lo que hay que hacer ahora; de una
 * nota importan QUIÉN LA PUBLICÓ y CUÁNDO — que es lo que la convierte en
 * prueba.
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
 * LA PORTADA, CUANDO LA HAY, es una miniatura al principio de la fila —como
 * el recorte de un periódico—, no una banda de color a media tarjeta. Y sin
 * portada no falta nada: la fila se lee igual, que es justo lo que una lista
 * resuelve y una rejilla no.
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
    <li className={estilos.prensaFila} style={{ '--tono': tono } as React.CSSProperties}>
      <a
        className={estilos.prensaEnlace}
        href={nota.enlace ?? '#'}
        target="_blank"
        // `noreferrer` además de `noopener`: al medio no tiene por qué llegarle
        // desde qué sala de qué cliente se abrió su nota.
        rel="noopener noreferrer"
      >
        {nota.ruta && (
          // `img` a pelo y no `next/image`, por el mismo motivo que en
          // `MaterialesSala`: sale de `/api/archivo/[id]`, que es dinámica y
          // privada, y optimizarla en el servidor obligaría a descargarla en
          // cada render.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={estilos.prensaMiniatura}
            src={`/api/archivo/${nota.id}`}
            alt=""
            loading="lazy"
          />
        )}
        <span className={estilos.prensaCuerpo}>
          <span className={estilos.prensaFicha}>
            {/* El punto de color es lo único que queda del tono del medio: la
                sala se viste con la identidad de SU UDN. */}
            <span className={estilos.prensaPunto} aria-hidden />
            <span className={estilos.prensaMedio}>{medio}</span>
            {nota.fecha && (
              <>
                <span className={estilos.prensaSeparador} aria-hidden>·</span>
                <span className={estilos.prensaFecha}>{fechaBreveConAnio(nota.fecha)}</span>
              </>
            )}
          </span>
          <span className={estilos.prensaTitular}>{nota.titulo}</span>
        </span>
        <span className={estilos.prensaFlecha} aria-hidden>↗</span>
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
