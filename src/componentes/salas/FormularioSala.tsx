'use client'

import { useState, useTransition } from 'react'
import { upload } from '@vercel/blob/client'
import { slugDesdeNombre } from '@/lib/marca'
import { medirTinta } from '@/lib/tinta'
import { rutaDeArchivo, pesoLegible, TAMANO_MAXIMO } from '@/lib/blob'
import { VistaPreviaMarca } from './VistaPreviaMarca'
import { SelectorTipografia } from './SelectorTipografia'
import estilos from '@/app/salas/salas.module.css'

/**
 * CREAR Y EDITAR UNA SALA (tarea 6, ronda 8) — la pantalla que existe porque
 * las nueve salas se acaban de mudar de código a la base (tarea 5): sin esta
 * pantalla, esa mudanza no habría cambiado nada para Franco, solo movido
 * dónde vive el problema.
 *
 * Pide nombre, identificador, logo, color y —desde la tarea 7— las dos
 * tipografías; deriva todo lo demás con `derivarMarca` (vía
 * `VistaPreviaMarca`, que enseña el resultado antes de guardar) y sube el
 * logo a Vercel Blob igual que ya suben archivos las salas desde la ronda 2
 * (ver `src/componentes/ArchivosSala.tsx` — mismo patrón: el navegador
 * escribe directo en Blob con un token de un solo uso, y esta pantalla solo
 * registra la URL al terminar).
 */

/** La familia por defecto de una sala nueva — la misma que ya tenían las diez antes de que existiera este selector. */
const FAMILIA_POR_DEFECTO = 'outfit'

/** Lo que este formulario le manda a `guardar` — ya validado del lado del cliente. */
export interface DatosSala {
  nombre: string
  slug: string
  primario: string
  /** Clave de `CATALOGO_DE_FUENTES` (src/temas/fuentes.ts) — tarea 7. */
  familiaDisplay: string
  familiaTexto: string
  logoUrl: string | null
  logoRelacionDeTinta: number | null
}

/** Lo mínimo de una sala YA CREADA que este formulario necesita para editarla. */
export interface SalaExistente {
  slug: string
  nombre: string
  primario: string
  /**
   * Opcionales por el mismo motivo que `logoUrl`/`logoRelacionDeTinta`: una
   * sala real siempre las trae (ver `src/app/salas/page.tsx`), pero el
   * formulario no debe asumirlo — si faltan, arranca en `FAMILIA_POR_DEFECTO`.
   */
  familiaDisplay?: string
  familiaTexto?: string
  logoUrl?: string | null
  logoRelacionDeTinta?: number | null
}

interface Props {
  guardar: (datos: DatosSala) => Promise<{ error?: string }>
  /**
   * Los identificadores YA EN USO por OTRAS salas — quien arma la lista es
   * responsable de excluir la propia sala cuando se edita: este componente no
   * sabe si "zeus" está repetido porque es otra sala o porque es esta misma.
   */
  slugsUsados: string[]
  /** Si viene, el formulario edita esta sala: el identificador queda fijo. */
  sala?: SalaExistente
}

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/

export function FormularioSala({ guardar, slugsUsados, sala }: Props) {
  const editando = Boolean(sala)

  const [nombre, setNombre] = useState(sala?.nombre ?? '')
  // El identificador NO se re-normaliza en cada tecla mientras se corrige a
  // mano — normalizar de golpe un guion final a medio escribir ("mas-") lo
  // borraría antes de que se pudiera terminar de escribir "mas-salud". Lo que
  // se guarda pasa por `slugDesdeNombre` una sola vez, al validar y al
  // enviar (`identificadorFinal`, más abajo): la corrección se siente libre
  // mientras se escribe, y lo que llega al servidor siempre es una forma
  // segura de slug.
  const [identificador, setIdentificador] = useState(sala?.slug ?? '')
  const [identificadorTocado, setIdentificadorTocado] = useState(editando)
  const [primario, setPrimario] = useState(sala?.primario ?? '')
  const [familiaDisplay, setFamiliaDisplay] = useState(sala?.familiaDisplay ?? FAMILIA_POR_DEFECTO)
  const [familiaTexto, setFamiliaTexto] = useState(sala?.familiaTexto ?? FAMILIA_POR_DEFECTO)
  const [logoUrl, setLogoUrl] = useState<string | null>(sala?.logoUrl ?? null)
  const [logoRelacion, setLogoRelacion] = useState<number | null>(sala?.logoRelacionDeTinta ?? null)
  const [avisoLogo, setAvisoLogo] = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [pendiente, empezar] = useTransition()

  function alCambiarNombre(valor: string) {
    setNombre(valor)
    // Solo se auto-propone mientras nadie ha tocado el identificador a mano
    // Y solo al crear: al editar, el identificador es fijo pase lo que pase
    // con el nombre (es la URL de la sala — ver el test "al editar...").
    if (!editando && !identificadorTocado) {
      setIdentificador(slugDesdeNombre(valor))
    }
  }

  function alCambiarIdentificador(valor: string) {
    setIdentificadorTocado(true)
    setIdentificador(valor)
  }

  // La forma segura de lo que hay escrito ahora mismo, sea porque se
  // auto-propuso o porque se corrigió a mano — es lo único que de verdad
  // importa para validar y para guardar (ver el comentario en el useState de
  // arriba).
  const identificadorFinal = slugDesdeNombre(identificador)
  // El slug vacío puede llegar por DOS caminos: un nombre que solo trae
  // símbolos o emoji (el auto-propuesto sale vacío igual que el campo — ver
  // el contrato de `slugDesdeNombre`, src/lib/marca.ts) o un identificador
  // que se corrigió a mano hasta dejarlo sin ninguna letra o número. Por eso
  // se mira NOMBRE u IDENTIFICADOR, no solo uno: si se mirara solo
  // `identificador`, el primer caso —donde el campo visible TAMBIÉN queda
  // vacío por la auto-propuesta— nunca habría mostrado el aviso, y un slug
  // vacío no se guarda: hay que decir por qué en pantalla, no solo callar.
  const slugVacioConAlgoEscrito =
    identificadorFinal.length === 0 && (nombre.trim().length > 0 || identificador.trim().length > 0)
  const identificadorRepetido =
    identificadorFinal.length > 0 && slugsUsados.includes(identificadorFinal)

  const primarioValido = HEX_VALIDO.test(primario)
  const nombreListo = nombre.trim().length > 0
  const listo =
    nombreListo && identificadorFinal.length > 0 && !identificadorRepetido && primarioValido && !subiendoLogo

  async function alElegirLogo(archivo: File) {
    setAvisoLogo(null)
    setError(null)

    // `archivo.type` puede llegar vacío (algunos navegadores no lo rellenan
    // para ciertos SVG) — se rechaza solo cuando SÍ trae un tipo y ese tipo
    // no es de imagen; un tipo vacío se deja pasar y es `medirArchivoLocal`,
    // más abajo, quien de verdad decide: si no es una imagen, el `<img>` no
    // carga y el error llega igual, con la causa real.
    if (archivo.type.length > 0 && !archivo.type.startsWith('image/')) {
      setAvisoLogo('Eso no parece una imagen. Sube un PNG o SVG.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setAvisoLogo(`El archivo pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`)
      return
    }

    setSubiendoLogo(true)
    try {
      const relacion = await medirArchivoLocal(archivo)
      // LA TINTA SE MIDE ANTES DE SUBIR — mismo archivo, y así el aviso llega
      // aunque la subida tarde. Sale 1 cuando el archivo no trae ninguna
      // transparencia: el lienzo entero "es tinta", y ese logo se va a ver
      // más pequeño de lo que le toca frente a los que sí la traen.
      if (relacion >= 1) {
        setAvisoLogo(
          'Este logo no tiene transparencia: se va a ver más pequeño de lo que le corresponde. ' +
            'Sube un PNG o SVG con fondo transparente.',
        )
      }

      // El namespace del archivo en Blob es cosmético (organiza el store),
      // así que usar el identificador todavía-no-guardado es seguro: lo que
      // de verdad importa es la URL que Blob devuelve, y esa se guarda tal
      // cual en `logoUrl`.
      const carpeta = editando ? (sala as SalaExistente).slug : identificadorFinal || 'sala-nueva'
      const subido = await upload(rutaDeArchivo(carpeta, 'logo', archivo.name), archivo, {
        // PÚBLICO, a propósito: a diferencia de un deck comercial (privado,
        // servido por /api/archivo/[id] tras comprobar sesión — ver
        // src/lib/blob.ts), un logotipo es un activo de marca hecho para
        // mostrarse. Necesita una URL que se pueda pegar directo en un
        // <img>, sin pasar por un proxy autenticado.
        access: 'public',
        handleUploadUrl: '/api/archivos/subir',
        contentType: archivo.type || undefined,
      })
      setLogoUrl(subido.url)
      setLogoRelacion(relacion)
    } catch (e) {
      setAvisoLogo(e instanceof Error ? e.message : 'No se pudo subir el logo.')
    } finally {
      setSubiendoLogo(false)
    }
  }

  function alEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!listo) return
    setError(null)
    setGuardado(false)
    empezar(async () => {
      // La llamada a `guardar` va DENTRO del try (mismo criterio que
      // `PausaSala.ejecutar`): `crearSalaAction`/`editarSalaAction` empiezan
      // con `exigirEquipo()`, y una sesión vencida con esta pestaña todavía
      // abierta —la cookie de equipo dura 7 días— hace que ESO lance en vez
      // de devolver `{error}`. Sin el catch, esa promesa rechazada no tenía
      // dónde aterrizar: la pantalla reventaba sin decir "tu sesión venció,
      // vuelve a entrar", que es justo lo que necesita leer quien lo pulsó.
      try {
        const r = await guardar({
          nombre: nombre.trim(),
          slug: editando ? (sala as SalaExistente).slug : identificadorFinal,
          primario,
          familiaDisplay,
          familiaTexto,
          logoUrl,
          logoRelacionDeTinta: logoRelacion,
        })
        if (r.error) {
          setError(r.error)
          return
        }
        setGuardado(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <form className={estilos.formulario} onSubmit={alEnviar}>
      <div className={estilos.formularioCampos}>
        <div className={estilos.formularioCamposIzq}>
          <label className={estilos.campo}>
            <span className={estilos.etiqueta}>Nombre</span>
            <input
              type="text"
              className={estilos.entrada}
              value={nombre}
              onChange={(e) => alCambiarNombre(e.target.value)}
              placeholder="Research Land"
              autoFocus={!editando}
              required
            />
          </label>

          <div className={estilos.campo}>
            <label className={estilos.etiqueta} htmlFor="identificador-sala">Identificador</label>
            <input
              id="identificador-sala"
              type="text"
              className={estilos.entrada}
              value={identificador}
              onChange={(e) => alCambiarIdentificador(e.target.value)}
              disabled={editando}
              placeholder="research-land"
              required
            />
            <p className={estilos.pista}>
              {editando
                ? 'Es la URL de la sala: no se puede cambiar después de creada.'
                : 'La URL de la sala. Se propone del nombre y se puede corregir — no se podrá cambiar después de crearla.'}
              {!editando && identificadorFinal.length > 0 && identificadorFinal !== identificador && (
                <> Se guardará como <code>{identificadorFinal}</code>.</>
              )}
            </p>
            {slugVacioConAlgoEscrito && (
              <p className={estilos.formularioError}>
                Ni el nombre ni el identificador aportan ninguna letra o número latino: no hay con qué
                construir un identificador, y sin uno la sala no se puede guardar. Prueba con el nombre
                real de la sala.
              </p>
            )}
            {identificadorRepetido && (
              <p className={estilos.formularioError}>
                Ya existe una sala con este identificador (&quot;{identificadorFinal}&quot;). Elige otro.
              </p>
            )}
          </div>

          <div className={estilos.campo}>
            <span className={estilos.etiqueta}>Color primario</span>
            <div className={estilos.colorFila}>
              <input
                type="color"
                className={estilos.entradaColor}
                value={primarioValido ? primario : '#000000'}
                onChange={(e) => setPrimario(e.target.value)}
                aria-label="Elegir color con el selector del sistema"
              />
              <input
                type="text"
                className={estilos.entrada}
                value={primario}
                onChange={(e) => setPrimario(e.target.value.trim())}
                placeholder="#614ACA"
                required
              />
            </div>
            <p className={estilos.pista}>
              El color exacto del brandbook. Todo lo demás —secundario, acento, superficies, textos
              legibles y el degradado— se deriva de aquí.
            </p>
          </div>

          <div className={estilos.campo}>
            <span className={estilos.etiqueta}>Logotipo</span>
            <input
              type="file"
              className={estilos.entrada}
              accept="image/png,image/svg+xml,image/webp"
              disabled={subiendoLogo}
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                if (archivo) void alElegirLogo(archivo)
              }}
            />
            <p className={estilos.pista}>PNG o SVG con fondo transparente — así se mide bien su tinta.</p>
            {subiendoLogo && <p className={estilos.pista}>Midiendo y subiendo…</p>}
            {avisoLogo && <p className={estilos.avisoTexto}>{avisoLogo}</p>}
            {logoUrl && !subiendoLogo && <p className={estilos.pista}>Logo cargado.</p>}
          </div>
        </div>

        <VistaPreviaMarca
          nombre={nombre}
          primario={primarioValido ? primario : null}
          logoUrl={logoUrl}
          logoRelacionDeTinta={logoRelacion}
        />
      </div>

      {/* TIPOGRAFÍA (tarea 7) — a todo el ancho del formulario, aparte de las
          dos columnas de arriba: veinte muestras legibles necesitan más
          sitio del que le toca a la columna izquierda de campos. */}
      <div className={estilos.formularioTipografia}>
        <div className={estilos.formularioTipografiaCampo}>
          <span className={estilos.etiqueta}>Tipografía de títulos</span>
          <SelectorTipografia nombre="familiaDisplay" valor={familiaDisplay} alCambiar={setFamiliaDisplay} />
        </div>
        <div className={estilos.formularioTipografiaCampo}>
          <span className={estilos.etiqueta}>Tipografía de texto</span>
          <SelectorTipografia nombre="familiaTexto" valor={familiaTexto} alCambiar={setFamiliaTexto} />
        </div>
      </div>

      {error && <p className={estilos.formularioError}>{error}</p>}
      {guardado && (
        <p className={estilos.formularioOk}>
          {editando ? 'Cambios guardados.' : 'Sala creada.'} <a href="/salas">Volver a la lista →</a>
        </p>
      )}

      <div className={estilos.formularioAcciones}>
        <button type="submit" className="boton" disabled={pendiente || !listo}>
          {pendiente ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear sala'}
        </button>
        <a href="/salas" className="boton" data-tono="fantasma">
          Cancelar
        </a>
      </div>
    </form>
  )
}

/** Pinta el archivo elegido en una imagen fuera de pantalla y mide su tinta — ver src/lib/tinta.ts. */
async function medirArchivoLocal(archivo: File): Promise<number> {
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = new Image()
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve()
      imagen.onerror = () => reject(new Error('No se pudo leer la imagen elegida.'))
      imagen.src = url
    })
    return medirTinta(imagen)
  } finally {
    URL.revokeObjectURL(url)
  }
}
