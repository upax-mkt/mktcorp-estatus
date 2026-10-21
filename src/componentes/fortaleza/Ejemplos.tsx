import Image from 'next/image'
import type { CSSProperties } from 'react'
import base from './base.module.css'
import estilos from './Ejemplos.module.css'
import { Foto, MARCAS } from './comun'
import type { Ejemplo } from './contenido'

/**
 * LOS EJEMPLOS DE CADA UNIDAD (ronda 4, 21-oct-2026). Ceci: «puras letras, no hay ejemplos de nada». Cada unidad
 * enseña cómo se vería lo que propone: una foto (montaje sobre una foto real, rotulado «Simulación», o una imagen
 * generada, rotulada «Ilustración») o un dibujo hecho aquí mismo, con su rótulo «Ilustración»: el boleto en el
 * teléfono de un colaborador (Zeus), la invitación a nuestros clientes (Grupo UPAX), el recorrido de quien compra (UiX)
 * y la compra en tres pasos (NeraCode). Ningún dibujo lleva precios.
 */
export function EjemploVista({ ejemplo, className = '', style }: { ejemplo: Ejemplo; className?: string; style?: CSSProperties }) {
  if (ejemplo.tipo === 'foto') {
    return (
      <Foto
        src={ejemplo.src}
        alt={ejemplo.alt}
        marca={ejemplo.marca}
        pie={ejemplo.pie}
        posicion={ejemplo.posicion}
        className={`${estilos.foto} ${className}`}
        style={style}
      />
    )
  }
  const dibujo =
    ejemplo.tipo === 'telefono' ? (
      <Telefono />
    ) : ejemplo.tipo === 'invitacion' ? (
      <Invitacion />
    ) : ejemplo.tipo === 'recorrido' ? (
      <Recorrido />
    ) : (
      <Boletera />
    )
  return (
    <figure className={`${estilos.dibujo} ${className}`} style={style} data-tipo={ejemplo.tipo}>
      <span className={base.fotoMarca}>Ilustración</span>
      <div className={estilos.lienzo}>{dibujo}</div>
      <figcaption className={estilos.pie}>{ejemplo.pie}</figcaption>
    </figure>
  )
}

/**
 * EL QR, CON PATRÓN FIJO (25 × 25, aspecto de versión 2): buscadores, temporización y alineación de un QR real; los
 * datos salieron una sola vez de un generador con semilla fija y quedaron aquí como constante. No codifica nada.
 */
const QR = [
  '1111111010011000101111111',
  '1000001000111101001000001',
  '1011101011010110101011101',
  '1011101011001011101011101',
  '1011101011000100001011101',
  '1000001010000001101000001',
  '1111111010101010101111111',
  '0000000011010110100000000',
  '1011011011000000001010011',
  '0010110110111110000100101',
  '1010101001011111101101100',
  '0001010110101011001011010',
  '0111101011000000001101100',
  '1101100111010000001111000',
  '1011101111001001100001001',
  '0001110011111100110001111',
  '1100101000101001111111110',
  '0000000011101010100010111',
  '1111111001101000101010001',
  '1000001000111010100010111',
  '1011101001000001111110010',
  '1011101001111010110111111',
  '1011101011101000111000011',
  '1000001001100000011011001',
  '1111111010010101110110001',
] as const

/** Los módulos oscuros en un solo trazado: cada racha horizontal es un rectángulo. */
const QR_TRAZADO = QR.flatMap((fila, y) => {
  const partes: string[] = []
  let x = 0
  while (x < fila.length) {
    if (fila[x] !== '1') {
      x++
      continue
    }
    let largo = 1
    while (fila[x + largo] === '1') largo++
    partes.push(`M${x} ${y}h${largo}v1h-${largo}z`)
    x += largo
  }
  return partes
}).join('')

/** La mira: cuatro esquinas alrededor del QR (caja de 100 × 100). */
const MIRA = 'M0 24V0H24M76 0H100V24M100 76V100H76M24 100H0V76'

/** ZEUS: el boleto de Malinche con su QR, en el teléfono de un colaborador. */
function Telefono() {
  return (
    <div className={estilos.marcoTelefono}>
      <span className={estilos.halo} aria-hidden="true" />
      <div className={estilos.telefono} role="img" aria-label="Un teléfono con un boleto de Malinche y su código QR.">
        <div className={estilos.pantallaTel} aria-hidden="true">
          <span className={estilos.isla} />
          <span className={estilos.barraApp}>
            <span className={estilos.atras} />
            <span className={estilos.tituloApp} />
          </span>
          <div className={estilos.boleto}>
            <div className={estilos.arte}>
              <span className={estilos.fotoBoleto}>
                <Image
                  src="/fortaleza/elenco-principal.jpg"
                  alt=""
                  fill
                  sizes="300px"
                  unoptimized
                  style={{ objectPosition: '50% 30%' }}
                />
              </span>
              <Image
                src={MARCAS.malinche.src}
                alt=""
                width={MARCAS.malinche.ancho}
                height={MARCAS.malinche.alto}
                unoptimized
                className={estilos.logoMalinche}
              />
            </div>
            <div className={estilos.talon}>
              <span className={estilos.qr}>
                <span className={estilos.placa}>
                  <svg viewBox="-1 -1 27 27" className={estilos.modulos} shapeRendering="crispEdges" focusable="false">
                    <path d={QR_TRAZADO} />
                  </svg>
                </span>
                <svg viewBox="0 0 100 100" className={estilos.mira} focusable="false">
                  <path d={MIRA} />
                </svg>
              </span>
              <span className={estilos.renglon} />
              <span className={estilos.renglon} />
            </div>
          </div>
          <span className={estilos.inicio} />
        </div>
      </div>
    </div>
  )
}

/** GRUPO UPAX: la invitación a nuestros clientes, con la foto del elenco y su logo. */
function Invitacion() {
  return (
    <div className={estilos.invitacion} role="img" aria-label="Una invitación de Grupo UPAX a sus clientes para ver Malinche.">
      <div className={estilos.invArte} aria-hidden="true">
        <Image src="/fortaleza/portada-elenco.jpg" alt="" fill sizes="480px" unoptimized style={{ objectPosition: '50% 25%' }} />
        <Image
          src={MARCAS.malinche.src}
          alt=""
          width={MARCAS.malinche.ancho}
          height={MARCAS.malinche.alto}
          unoptimized
          className={estilos.invMalinche}
        />
      </div>
      <div className={estilos.invTexto} aria-hidden="true">
        <span className={estilos.invPara}>Para nuestros clientes</span>
        <span className={estilos.invTitulo}>Una noche en el Frontón México</span>
        <span className={estilos.invCuerpo}>Por ser cliente de Grupo UPAX, lo invitamos a Malinche con un beneficio para usted y su equipo.</span>
        <span className={estilos.invPie}>
          <span className={estilos.invBoton}>Reservar</span>
          <Image src="/logos/grupo-upax-blanco.png" alt="" width={639} height={164} unoptimized className={estilos.invLogo} />
        </span>
      </div>
    </div>
  )
}

const PASOS_RECORRIDO = [
  { paso: 'Lo descubre', texto: 'Dónde se entera' },
  { paso: 'Lo compra', texto: 'En línea o en taquilla' },
  { paso: 'Lo vive', texto: 'La función y la cena' },
  { paso: 'Regresa', texto: 'Y lo recomienda' },
] as const

/** UIX: el recorrido de quien compra, en cuatro momentos. */
function Recorrido() {
  return (
    <ol className={estilos.recorrido} aria-label="El recorrido de quien compra: lo descubre, lo compra, lo vive y regresa.">
      {PASOS_RECORRIDO.map((p, i) => (
        <li key={p.paso} className={estilos.recPaso}>
          <span className={estilos.recNumero} aria-hidden="true">
            {i + 1}
          </span>
          <span className={estilos.recTitulo}>{p.paso}</span>
          <span className={estilos.recTexto}>{p.texto}</span>
        </li>
      ))}
    </ol>
  )
}

/** Las funciones de Malinche (Jorge Obregón, junta del 14-oct): jueves y viernes a las 8 pm; sábado y domingo a la 1 y a las 5 pm. */
const FUNCIONES = ['Jue · 8 pm', 'Vie · 8 pm', 'Sáb · 1 pm', 'Sáb · 5 pm', 'Dom · 1 pm', 'Dom · 5 pm'] as const

/** Un patio de butacas chico: 6 filas de 14, con las elegidas en naranja. Sin precios. */
const FILAS = 6
const ASIENTOS = 14
const ELEGIDAS = new Set(['3-6', '3-7'])
const OCUPADAS = new Set(['0-2', '0-3', '0-9', '1-5', '1-6', '1-10', '2-1', '2-11', '2-12', '4-4', '4-8', '5-6', '5-7', '5-8'])

/** NERACODE: la boletera, comprar en tres pasos (función, lugares y pago). */
function Boletera() {
  return (
    <div className={estilos.boletera} role="img" aria-label="Una boletera: elegir la función, los lugares y pagar.">
      <div className={estilos.bolCabeza} aria-hidden="true">
        <Image
          src={MARCAS.malinche.src}
          alt=""
          width={MARCAS.malinche.ancho}
          height={MARCAS.malinche.alto}
          unoptimized
          className={estilos.bolLogo}
        />
        <span className={estilos.bolLugar}>Frontón México</span>
      </div>
      <ol className={estilos.bolPasos} aria-hidden="true">
        <li data-hecho="true">1 · Función</li>
        <li data-actual="true">2 · Lugares</li>
        <li>3 · Pago</li>
      </ol>
      <div className={estilos.bolFunciones} aria-hidden="true">
        {FUNCIONES.map((f, i) => (
          <span key={f} className={estilos.bolFuncion} data-elegida={i === 1 ? 'true' : undefined}>
            {f}
          </span>
        ))}
      </div>
      <div className={estilos.bolEscenario} aria-hidden="true">
        Escenario
      </div>
      <div className={estilos.bolButacas} aria-hidden="true">
        {Array.from({ length: FILAS }, (_, f) =>
          Array.from({ length: ASIENTOS }, (_, a) => {
            const clave = `${f}-${a}`
            const estado = ELEGIDAS.has(clave) ? 'elegida' : OCUPADAS.has(clave) ? 'ocupada' : undefined
            return <span key={clave} className={estilos.bolButaca} data-estado={estado} />
          }),
        )}
      </div>
      <span className={estilos.bolBoton} aria-hidden="true">
        Continuar con 2 lugares
      </span>
    </div>
  )
}
