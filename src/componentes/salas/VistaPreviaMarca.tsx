import { marcaConSobrescritos } from '@/lib/marca'
import { altoDesdeTinta } from '@/temas/logos'
import estilos from '@/app/salas/salas.module.css'

/**
 * CÓMO QUEDARÁ LA MARCA, ANTES DE GUARDAR.
 *
 * `FormularioSala` pide un solo color; todo lo demás —secundario, acento, las
 * dos superficies, los dos colores de texto, el degradado— lo deriva
 * `derivarMarca` (src/lib/marca.ts). Esta vista previa es donde esa
 * derivación se vuelve algo que se puede juzgar a ojo, no solo confiar.
 *
 * SIN INTERACTIVIDAD PROPIA: no lleva 'use client' porque no la necesita —
 * recibe valores ya resueltos por su padre (que sí es cliente) y solo pinta.
 *
 * LA COLISIÓN CONOCIDA: con un primario casi blanco, `derivarMarca` desatura
 * y aclara ese mismo matiz hasta la superficie clara — y si el primario ya
 * estaba pegado al blanco, las dos salen literalmente el mismo hex. El
 * contraste del TEXTO sigue cumpliendo (se ajusta contra la superficie, no
 * contra el primario), pero cualquier borde o muestra que pinte el primario
 * ENCIMA de esa superficie desaparece — mismo color, no "difícil de ver". Se
 * detecta comparando los hex tal cual (ya normalizados a minúsculas por
 * `derivarMarca`) y se avisa en vez de enseñar una muestra en blanco.
 */

interface Props {
  nombre: string
  /** Hex de 6 dígitos ya validado por quien llama; si no lo es, no hay nada que derivar todavía. */
  primario: string | null
  /**
   * Escritos a mano en el formulario, si los hay. Vacíos, se derivan del
   * primario como siempre. SIN ESTO LA PREVIA MIENTE: hasta la ronda 12 solo
   * recibía el primario, así que a quien acababa de escribir un secundario
   * azul —porque su marca es negra y azul, y de un negro no se deriva nada—
   * le seguía enseñando el gris que venía justo a corregir.
   */
  secundario?: string | null
  acento?: string | null
  logoUrl?: string | null
  logoRelacionDeTinta?: number | null
}

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/

export function VistaPreviaMarca({ nombre, primario, secundario, acento, logoUrl, logoRelacionDeTinta }: Props) {
  if (!primario || !HEX_VALIDO.test(primario)) {
    return (
      <div className={`tarjeta ${estilos.previa}`}>
        <p className={estilos.previaVacia}>Elige un color para ver la marca completa.</p>
      </div>
    )
  }

  const marca = marcaConSobrescritos(nombre.trim() || 'Nombre de la sala', primario, secundario, acento)
  const colisionSuperficieClara = marca.primario === marca.superficieClara
  const altoLogo = altoDesdeTinta(logoRelacionDeTinta)

  return (
    <div className={`tarjeta ${estilos.previa}`}>
      {/* La portada: el degradado, tal como se ve en una sesión o en el
          espacio del cliente. El logo, si ya se subió, en su variante sobre
          color — a la altura que le tocará de verdad, no una fija. */}
      <div
        className={estilos.previaPortada}
        style={{ background: `linear-gradient(120deg, ${marca.gradiente.join(', ')})`, color: marca.textoSobreOscura }}
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo recién elegido: no es un asset del proyecto, es un blob: URL o una URL de Blob ya subida.
          <img src={logoUrl} alt="" className={estilos.previaLogo} style={{ height: `${altoLogo}px` }} />
        )}
        <span className={estilos.previaPortadaTitulo}>{marca.nombre || 'Nombre de la sala'}</span>
      </div>

      {/* El contenido: superficie clara, texto legible encima. Aquí es donde
          vive la colisión: un chip con el borde del primario. */}
      <div className={estilos.previaContenido} style={{ background: marca.superficieClara, color: marca.textoSobreClara }}>
        <span className={estilos.previaContenidoTitulo}>Así se lee un slide de contenido</span>
        <span className={estilos.previaMuestra} style={{ borderColor: marca.primario, color: marca.primario }}>
          Dato destacado
        </span>

        {colisionSuperficieClara && (
          <p className={estilos.previaAviso}>
            ⚠ El primario y la superficie clara salen idénticos ({marca.primario}): cualquier borde,
            punto o muestra que pinte el color de marca sobre esta superficie se vuelve INVISIBLE —
            mismo hex, no difícil de ver (el chip de arriba es un ejemplo: su borde no se distingue
            del fondo). El texto sigue leyéndose bien. Si esto importa, elige un primario con algo
            más de color; si no, se puede guardar igual.
          </p>
        )}
      </div>

      {/* La paleta completa, en hex: lo que un swatch no puede decir cuando
          colisiona con su fondo, el texto sí. */}
      <ul className={estilos.previaPaleta}>
        {(
          [
            ['Primario', marca.primario],
            ['Secundario', marca.secundario],
            ['Acento', marca.acento],
            ['Superficie oscura', marca.superficieOscura],
            ['Texto sobre clara', marca.textoSobreClara],
            ['Texto sobre oscura', marca.textoSobreOscura],
          ] as const
        ).map(([etiqueta, hex]) => (
          <li key={etiqueta} className={estilos.previaColor}>
            <span className={estilos.previaColorMuestra} style={{ background: hex }} />
            <span className={estilos.previaColorTexto}>
              <span className={estilos.previaColorEtiqueta}>{etiqueta}</span>
              <span className={estilos.previaColorHex}>{hex}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
