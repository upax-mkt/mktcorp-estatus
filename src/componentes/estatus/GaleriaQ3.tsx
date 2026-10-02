'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Material } from '@/estatus/q3-2026'
import { DetalleQ3 } from './DetalleQ3'
import estilos from './estatus.module.css'

export function GaleriaQ3({ grupos }: { grupos: { nombre: string; materiales: Material[] }[] }) {
  const [grupo, setGrupo] = useState(0)
  const [pieza, setPieza] = useState(0)
  const actual = grupos[grupo]
  const material = actual?.materiales[pieza]
  if (!actual || !material) return <p>Materiales por incorporar.</p>
  return <div className={estilos.galeria} onKeyDown={e => e.stopPropagation()}>
    <div className={estilos.selector} role="group" aria-label="Campaña">
      {grupos.map((g, i) => <button key={g.nombre} type="button" aria-pressed={i === grupo} onClick={() => { setGrupo(i); setPieza(0) }}>{g.nombre}</button>)}
    </div>
    <div className={estilos.galeriaEscenario}>
      <figure className={estilos.piezaPrincipal}>
        <Image src={material.src} alt={material.alt} width={material.ancho} height={material.alto} unoptimized />
      </figure>
      <div className={estilos.galeriaLateral}>
        <p className={estilos.micro}>Testigos de campaña</p><h3>{actual.nombre}</h3>
        <div className={estilos.listaPiezas} role="group" aria-label="Pieza de campaña">
          {actual.materiales.map((m, i) => <button key={m.src} type="button" aria-pressed={i === pieza} onClick={() => setPieza(i)}><span>{String(i + 1).padStart(2, '0')}</span>{m.alt}</button>)}
        </div>
        <DetalleQ3 etiqueta="Ver pieza completa" titulo={material.alt}>
          <Image src={material.src} alt={material.alt} width={material.ancho} height={material.alto} unoptimized className={estilos.imagenCompleta} />
        </DetalleQ3>
      </div>
    </div>
  </div>
}
