'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { seEstaArmando, tienePresentacion, type Reunion } from '@/dominio/reunion'
import { claveDeClase, etiquetaDeClase } from '@/secciones/plantillas'
import type { Participante } from '@/db/participacion'
import type { CategoriaArchivo } from '@/db/archivos'
import { fechaBreve, fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import { TAMANO_MAXIMO, pesoLegible } from '@/lib/blob'
import { ParticipantesSesion } from '@/componentes/sesion/ParticipantesSesion'
import { CopiarBoton } from './CopiarBoton'
import { CorreoMinuta } from './CorreoMinuta'
import { CarasDeReunion } from './reuniones/CarasDeReunion'
import { AcuerdosDeReunion } from './reuniones/AcuerdosDeReunion'
import { NuevoAcuerdoForm } from './NuevoAcuerdoForm'
import type { PersonaResponsable } from '@/lib/personas'
import { subirArchivoDirecto } from '@/lib/subir'
import estilos from '@/app/cliente/cliente.module.css'
// La píldora de acción ("+ Subir presentación", "Armarla en el editor") se
// define UNA vez, en el módulo de las caras de una reunión. Importarla aquí
// en vez de copiar sus diez líneas es lo que evita que las dos versiones se
// separen: sin esto, `estilos.caraAccion` llegaba `undefined` y el botón se
// pintaba con el borde por defecto del navegador junto a un enlace pelado.
import caras from './reuniones/CarasDeReunion.module.css'

/**
 * EL TÍTULO DE UNA REUNIÓN, CON SU LÁPIZ.
 *
 * Franco: *"no puedo cambiar el nombre de una reunión que ya ocurrió desde la
 * sala de un cliente"*. En esta misma pantalla el lápiz ya existía para los
 * ARCHIVOS de la reunión (`ArchivoDeReunion`, en `CarasDeReunion.tsx`) pero no
 * para la reunión misma, así que se podía corregir el nombre del PDF y no el
 * de la junta a la que pertenece.
 *
 * MISMO PATRÓN QUE EL DE LOS ARCHIVOS, a propósito: alterna entre pintar
 * (título + lápiz) y editar (input + Guardar/Cancelar), con las mismas
 * palabras en los botones. Un segundo gesto para la misma operación en la
 * misma pantalla es exactamente lo que hace que una interfaz se sienta
 * improvisada.
 *
 * `Etiqueta` porque los dos sitios donde vive un título de reunión usan nivel
 * distinto —`h3` en la destacada, `h4` en las anteriores— y bajar el nivel del
 * encabezado para poder reutilizar el componente rompería el esquema del
 * documento para un lector de pantalla.
 */
function TituloDeReunion({
  reunion,
  equipo,
  renombrarAction,
  Etiqueta,
  className,
  id,
}: {
  reunion: Reunion
  equipo: boolean
  renombrarAction?: (id: string, titulo: string) => Promise<{ error?: string }>
  Etiqueta: 'h3' | 'h4'
  className?: string
  id?: string
}) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(reunion.titulo)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  // Las dos condiciones, como en los archivos: un director de UDN nunca
  // recibe la acción, y un llamador que se olvide de pasarla no deja un lápiz
  // que no hace nada.
  const puedeEditar = equipo && Boolean(renombrarAction)

  if (puedeEditar && editando) {
    return (
      <div className={estilos.tituloEditando}>
        <input
          type="text"
          className={estilos.tituloInput}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label={`Título de la reunión ${reunion.titulo}`}
          autoFocus
          onKeyDown={(e) => {
            // Enter guarda y Escape cancela: en un campo de una sola línea es
            // lo que la mano espera, y sin ellos hay que ir al ratón para
            // confirmar un cambio de una palabra.
            if (e.key === 'Escape') { setTitulo(reunion.titulo); setError(null); setEditando(false) }
          }}
        />
        <button
          type="button"
          className={estilos.tituloGuardar}
          disabled={pendiente || titulo.trim().length === 0}
          onClick={() =>
            empezar(async () => {
              const r = await renombrarAction!(reunion.id, titulo.trim())
              // ⚠️ SI FALLA, NO SE CIERRA. Cerrar igual dejaría en pantalla el
              // título viejo con la sensación de que se guardó el nuevo, que
              // es el peor de los dos finales posibles.
              if (r?.error) { setError(r.error); return }
              setError(null)
              setEditando(false)
            })
          }
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          className={estilos.tituloCancelar}
          disabled={pendiente}
          onClick={() => { setTitulo(reunion.titulo); setError(null); setEditando(false) }}
        >
          Cancelar
        </button>
        {error && <span className={estilos.tituloError} role="alert">{error}</span>}
      </div>
    )
  }

  return (
    <div className={estilos.tituloConLapiz}>
      <Etiqueta id={id} className={className}>{reunion.titulo}</Etiqueta>
      {puedeEditar && (
        <button
          type="button"
          className={estilos.tituloLapiz}
          onClick={() => setEditando(true)}
          aria-label={`Cambiar el nombre de la reunión ${reunion.titulo}`}
          title="Cambiar el nombre"
        >
          ✎
        </button>
      )}
    </div>
  )
}

/**
 * LAS REUNIONES DE UNA SALA: lo que se presentó y lo que se acordó, juntos.
 *
 * Franco: "el módulo Presentaciones y minutas creo que debe ser uno, así la
 * presentación está asociada a una minuta, es decir a una reunión".
 *
 * Antes eran dos secciones paralelas, cada una ordenada por su cuenta. Para
 * saber qué se acordó en la presentación de mayo había que buscar mayo dos
 * veces y confiar en que las dos listas hablaban del mismo día. Ahora cada
 * reunión es una fila con sus dos caras, y lo que le falta se ve sin buscar:
 * una reunión presentada y sin minuta lo dice en su propia fila.
 *
 * La minuta se lee AQUÍ, en un `<dialog>` de verdad: el navegador ya atrapa el
 * foco dentro, cierra con Escape, deja inerte lo de detrás y lo anuncia a un
 * lector de pantalla. Reimplementar eso a mano es como se fabrican las trampas
 * de teclado.
 *
 * "+ SUBIR PRESENTACIÓN" SUBE DE VERDAD (ronda 10, tarea 9b). La Tarea 9 dejó
 * el hueco en `CarasDeReunion` (`onSubirPresentacion`, sin nadie que lo
 * llenara); la Tarea 11 dejó `registrarArchivoAction` listo para recibir un
 * `reunionId`. Nadie los unió — el botón se veía, se pulsaba, y no pasaba
 * nada, que es peor que el "Sin presentación" que vino a sustituir.
 *
 * El flujo vive AQUÍ, no en `CarasDeReunion` (que solo pide el clic, según su
 * propio comentario de cabecera) ni en `page.tsx` (Server Component: no
 * puede sostener un `<input type="file">` con estado propio). Un único input
 * de archivo, oculto, compartido por todas las filas, disparado
 * programáticamente por el botón de LA fila que se pulsó —guardada en un
 * `ref`, no en estado, para no depender de que un re-render llegue a tiempo
 * antes de que el usuario elija el archivo—. La subida en sí reutiliza
 * `subirArchivoDirecto`, extraída de `ArchivosSala` en esta misma tarea: el
 * mismo mecanismo (navegador → Blob → `registrarArchivoAction`), nunca un
 * segundo camino. `categoria` siempre `'presentacion'`; `reunionId` y
 * `fecha` siempre los de la reunión que abrió el selector — la fecha se
 * hereda de la reunión, nunca se le vuelve a pedir a quien sube.
 *
 * ═══ EL HISTORIAL SE LEE EN TRES BLOQUES (20-ago-2026) ═══════════════════
 * Franco: *"en el historial de reuniones solo se debe mostrar destacada la
 * última reunión de estatus mensual y luego abajo las reuniones anteriores
 * separadas entre estatus mensuales y otras reuniones"*.
 *
 * La ronda 14.3 había repartido el módulo en UNA TARJETA DESTACADA POR CLASE
 * y una columna de anteriores por clase. Con las cinco clases del catálogo eso
 * son cinco tarjetas grandes compitiendo entre sí y cinco columnas: quien abre
 * la sala de su UDN ya no sabe cuál mirar, y la pregunta que trae es siempre
 * la misma —*"¿qué me presentaron en el último estatus?"*—.
 *
 * Ahora hay UNA destacada, y es la del estatus. Lo demás baja a "Reuniones
 * anteriores", partido en dos grupos y nada más: el estatus tiene su propia
 * historia, y todo lo demás (syncs, comités, arranques, lo que no esté
 * clasificado) es una sola cosa desde el punto de vista de quien lee — "otras
 * reuniones".
 *
 * ⚠️ SI LA SALA NO TIENE NINGÚN ESTATUS TODAVÍA, destaca la más reciente de
 * las que haya. Una sala que arranca con dos syncs y ningún estatus no puede
 * quedarse sin cabecera: el bloque diría "Reuniones anteriores" sobre TODO su
 * contenido, que es una lista sin presente.
 */

/** La clase de junta que la sala existe para dar: el estatus mensual a su UDN. */
const CLASE_ESTATUS = 'estatus-udn'

export interface HistorialPartido {
  /** La última de estatus. Si la sala no tiene ninguno, la más reciente de lo que haya. */
  destacada: Reunion | null
  /** El resto de los estatus, sin la destacada. */
  estatusAnteriores: Reunion[]
  /** Todo lo demás: syncs, comités, arranques y lo que nadie clasificó. */
  otras: Reunion[]
}

/**
 * Parte el historial en los tres bloques que se leen (ver la cabecera).
 *
 * Ordena por fecha ANTES de repartir y no confía en que `reuniones` llegara
 * ordenada: en producción llega así (`reunionesDeSala`, `dominio/reunion.ts`),
 * pero este componente no depende de esa garantía del llamador — la ronda
 * 14.3 ya tomó esa precaución y se mantiene.
 *
 * La destacada se quita de su grupo POR IDENTIDAD (`!==`) y no por índice: es
 * la misma referencia del array, y comparar objetos es lo único que no se
 * equivoca si dos reuniones comparten fecha y título.
 */
function partirHistorial(reuniones: Reunion[]): HistorialPartido {
  const porFecha = [...reuniones].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const estatus = porFecha.filter((r) => claveDeClase(r.plantilla) === CLASE_ESTATUS)
  const otras = porFecha.filter((r) => claveDeClase(r.plantilla) !== CLASE_ESTATUS)
  const destacada = estatus[0] ?? otras[0] ?? null
  return {
    destacada,
    estatusAnteriores: estatus.filter((r) => r !== destacada),
    otras: otras.filter((r) => r !== destacada),
  }
}

interface Props {
  /** El historial: lo que ya ocurrió, con su documento, minuta y acuerdos. */
  reuniones: Reunion[]
  /**
   * LO QUE VIENE: lo que todavía hay que preparar. Llega aparte y ya
   * ordenado —del más próximo al más lejano— porque son dos preguntas
   * distintas y mezclarlas es lo que estaba roto.
   */
  porVenir: Reunion[]
  /**
   * Cuántas secciones lleva el documento de cada reunión por venir, por id.
   * `null` (o ausente) = todavía no hay documento; entonces no se ofrece
   * "seguir editando" nada, que es el defecto que reportó Franco al descartar
   * una presentación y seguir viéndola como editable.
   */
  avancePorReunion?: Record<string, { llenados: number; total: number } | null>
  /** El equipo puede corregir la minuta; el director solo la lee. */
  equipo: boolean
  /**
   * Quién preparó y quién presentó cada reunión, por `id` de reunión — SOLO
   * llega poblado cuando quien mira es equipo (ver el comentario junto a
   * donde se arma, en `src/app/cliente/[slug]/page.tsx`). Con un director de
   * UDN mirando, este objeto llega vacío: no hay nombres que ocultar al
   * pintar porque no hay nombres que hayan viajado hasta aquí.
   *
   * RENOMBRADO EN LA TAREA 7 (`participacionPorSesion` → `participacionPorReunion`):
   * mismo dato, misma regla de privacidad — solo cambia que la clave es el id
   * de la reunión (`Reunion.id`, siempre presente) y no el de una sesión que
   * ya no existe como concepto en pantalla.
   */
  participacionPorReunion?: Record<string, Participante[]>
  /** La sala de estas reuniones — construye la ruta del blob (ronda 10, tarea 9b). */
  salaSlug: string
  /**
   * AÑADIR UN ACUERDO A UNA REUNIÓN QUE YA PASÓ (20-ago-2026). Franco: *"se me
   * olvida meter un acuerdo, debo poder hacerlo y que también se refleje en la
   * minuta ya publicada"*. Llega enlazada al `reunionId` desde `page.tsx`, que
   * es quien exige editor y quien retoca la minuta.
   *
   * Opcional: sin ella —un director de UDN mirando su sala— no se pinta el
   * formulario. La guarda que manda sigue estando en la Server Action.
   */
  crearAcuerdoEnReunionAction?: (
    reunionId: string,
    datos: { que: string; responsable: string; fechaCompromiso: string | null },
  ) => Promise<{ error?: string; aviso?: string }>
  /** La gente de Mkt Corp para el selector de responsable de ese formulario. */
  personas?: PersonaResponsable[]
  /**
   * CORREGIR LA MINUTA SIN SALIR DE LA SALA (20-ago-2026). Franco: *"una vez
   * generada la minuta, en el mismo módulo me debería permitir editar la
   * minuta"*. Sin ella el visor solo lee, que es lo que ve un director.
   */
  editarMinutaAction?: (reunionId: string, texto: string) => Promise<{ error?: string }>
  /**
   * LA MISMA Server Action que usa `ArchivosSala` para "archivos de
   * interés" (`registrarArchivoAction`, definida en
   * `cliente/[slug]/page.tsx`): ya exige `exigirEditor()` y ya acepta y
   * reenvía `reunionId` (Tarea 11). Aquí se llama con `categoria:
   * 'presentacion'` y el `reunionId`/`fecha` de la reunión concreta desde la
   * que se pulsó "+ Subir presentación" (Tarea 9b) — cierra el hueco que
   * dejó la Tarea 9 en `CarasDeReunion`. NO es opcional: page.tsx siempre la
   * tiene lista, y dejarla opcional invitaría a que un llamador nuevo la
   * olvidara otra vez.
   */
  registrarArchivoAction: (datos: {
    categoria: CategoriaArchivo
    titulo: string
    fecha: string | null
    ruta: string
    nombreOriginal: string
    tipoContenido: string | null
    tamanoBytes: number | null
    reunionId?: string | null
  }) => Promise<{ error?: string }>
  /**
   * Edita el TÍTULO de un archivo de una reunión (ronda 11, tarea 3) — se
   * reenvía tal cual a `CarasDeReunion`, que es quien de verdad pinta el
   * lápiz y el input. LA MISMA `editarArchivoAction` que ya usa `ArchivosSala`
   * para los archivos de interés (`cliente/[slug]/page.tsx`), ya exige
   * editor. Se pasa SIN `fecha` a propósito — ver el comentario de esta
   * misma prop en `CarasDeReunion.tsx`.
   *
   * OPCIONAL, a diferencia de `registrarArchivoAction`: esta pantalla es el
   * único llamador de producción hoy, pero `ReunionesSala.test.tsx` monta el
   * componente en más de una decena de casos que no ejercitan la edición de
   * archivos — pedirla siempre habría forzado tocar cada uno de esos casos
   * por una prop que no usan. `page.test.ts` (cliente/[slug]) es quien
   * comprueba que page.tsx SÍ la manda de verdad, para que no quede huérfana.
   */
  editarArchivoAction?: (id: string, cambios: { titulo: string }) => Promise<void>
  /**
   * BORRAR UNA REUNIÓN DESDE LA SALA (Franco: *"la otra reunión tampoco puedo
   * eliminarla de la sala"*). No se podía: eliminar una reunión solo existía
   * en Presentaciones, y la sala es donde se la encuentra.
   *
   * Opcional porque el director de la UDN no la recibe —solo `equipo` la
   * usa— y porque las suites que montan este componente sin ejercitarla no
   * tienen por qué fabricarla.
   */
  /**
   * Cambiar el NOMBRE de una reunión ya ocurrida, desde su propia sala.
   * Solo el título: ver `renombrarReunionAction` en la página de la sala.
   */
  renombrarReunionAction?: (id: string, titulo: string) => Promise<{ error?: string }>
  eliminarReunionAction?: (id: string) => Promise<{ error?: string }>
  /**
   * Tirar el BORRADOR de la presentación sin tocar la reunión (ronda 13). Se
   * reenvía tal cual a `CarasDeReunion`, que decide cuándo tiene sentido
   * ofrecerlo — aquí no se duplica esa regla.
   */
  descartarBorradorAction?: (reunionId: string) => Promise<void>
  /**
   * CERRAR EL CICLO: dar por dada una reunión cuya presentación ya está
   * lista (Franco: *"debería ofrecerme… finalizar o marcar como completada,
   * ya que el journey se cumplió, y pasar al grupo que le corresponda"*).
   * Marcarla es lo que la mueve de "Lo que viene" al historial, sin tocar su
   * fecha: `reunionesPorVenir` filtra `estado !== 'dada'`.
   *
   * Es la MISMA acción que ya usaba "Por confirmar" para responder "¿se
   * dio?" — no una segunda forma de marcar lo mismo.
   */
  marcarDadaAction?: (id: string) => Promise<void>
}

export function ReunionesSala({
  reuniones,
  porVenir,
  avancePorReunion = {},
  equipo,
  participacionPorReunion = {},
  salaSlug,
  registrarArchivoAction,
  editarArchivoAction,
  renombrarReunionAction,
  eliminarReunionAction,
  descartarBorradorAction,
  marcarDadaAction,
  crearAcuerdoEnReunionAction,
  personas,
  editarMinutaAction,
}: Props) {
  const [abierta, setAbierta] = useState<Reunion | null>(null)
  /**
   * El texto que se está corrigiendo, o `null` si solo se está leyendo. Vive
   * aquí y no dentro del pie del diálogo porque el CUERPO cambia con él: se
   * lee con formato (`CorreoMinuta`) y se corrige en crudo, que es como está
   * guardado.
   */
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)
  const [errorMinuta, setErrorMinuta] = useState<string | null>(null)
  const [guardandoMinuta, empezarGuardadoMinuta] = useTransition()

  /**
   * ⚠️ CERRAR LIMPIA EL BORRADOR, y no es una precaución teórica: este repo ya
   * pagó ese bug exacto el 17-ago —el diálogo de agendar recordaba la clase de
   * la junta anterior porque `cerrar()` no reseteaba y un `<dialog>` NO SE
   * DESMONTA al cerrarse—. Sin esto, abrir la minuta de julio, empezar a
   * corregirla, cerrar, y abrir la de junio enseñaría el texto de julio dentro
   * de la de junio, con el botón de guardar listo para escribirlo encima.
   */
  function cerrarMinuta() {
    setAbierta(null)
    setCorrigiendo(null)
    setErrorMinuta(null)
  }
  const dialogo = useRef<HTMLDialogElement>(null)

  // ---- "+ Subir presentación" (Tarea 9b): un input compartido, la reunión
  // objetivo en un ref (no en estado: no depende de que un re-render llegue
  // antes de que el usuario elija el archivo del selector nativo). ----
  const objetivoSubida = useRef<Reunion | null>(null)
  const entradaArchivo = useRef<HTMLInputElement>(null)
  const [subiendoReunionId, setSubiendoReunionId] = useState<string | null>(null)
  const [errorSubida, setErrorSubida] = useState<{ reunionId: string; mensaje: string } | null>(null)

  function alPulsarSubirPresentacion(reunion: Reunion) {
    objetivoSubida.current = reunion
    setErrorSubida(null)
    entradaArchivo.current?.click()
  }

  async function alElegirArchivoDePresentacion(archivo: File | undefined) {
    const reunion = objetivoSubida.current
    if (!archivo || !reunion) return

    // Mismo aviso de cortesía que `ArchivosSala`: el servidor es el que
    // manda (`/api/archivos/subir`), esto solo evita esperar a que suba un
    // archivo que iba a rechazarse al final.
    if (archivo.size > TAMANO_MAXIMO) {
      setErrorSubida({
        reunionId: reunion.id,
        mensaje: `El archivo pesa ${pesoLegible(archivo.size)} y el máximo son 100 MB.`,
      })
      return
    }

    setSubiendoReunionId(reunion.id)
    try {
      const subido = await subirArchivoDirecto(salaSlug, 'presentacion', archivo)
      const r = await registrarArchivoAction({
        categoria: 'presentacion',
        titulo: archivo.name,
        fecha: reunion.fecha,
        reunionId: reunion.id,
        ...subido,
      })
      if (r.error) setErrorSubida({ reunionId: reunion.id, mensaje: r.error })
    } catch (e) {
      setErrorSubida({
        reunionId: reunion.id,
        mensaje: e instanceof Error ? e.message : 'No se pudo subir el archivo.',
      })
    } finally {
      setSubiendoReunionId(null)
      objetivoSubida.current = null
    }
  }

  // `showModal()` es lo que da el modo modal. Un `<dialog open>` declarativo
  // NO es modal: sale en el flujo y el resto sigue siendo tabulable por detrás.
  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierta && !nodo.open) nodo.showModal()
    if (!abierta && nodo.open) nodo.close()
  }, [abierta])

  // El input de archivo tiene que existir aunque no haya historial: lo usan
  // también las filas de "Lo que viene". Por eso el vacío ya no corta la
  // función entera — se decide más abajo, dentro del render.
  const hayHistorial = reuniones.length > 0

  /**
   * El historial en sus tres bloques (ver `partirHistorial`, arriba): la
   * destacada, los estatus anteriores y todo lo demás.
   *
   * `gruposAnteriores` los pinta en el orden en que se leen —el estatus
   * primero, porque es la historia que a la UDN le importa seguir— y deja
   * fuera el que se quede vacío: un grupo sin filas es ruido, no información
   * (misma regla que traía el reparto por clase que esto sustituye).
   */
  const { destacada, estatusAnteriores, otras } = partirHistorial(reuniones)
  /**
   * ⚠️ EL RÓTULO DICE QUÉ ES ESA TARJETA, NO LO QUE NOS GUSTARÍA QUE FUERA.
   *
   * Decía "Más reciente" siempre, heredado de cuando la destacada era la más
   * nueva de la sala. Desde que destaca EL ÚLTIMO ESTATUS puede no serlo, y en
   * Marketing United se vio con todas las letras: la tarjeta rotulaba "MÁS
   * RECIENTE" sobre el estatus de mayo teniendo dos reuniones de julio y
   * agosto listadas justo debajo. Una etiqueta que contradice lo que se ve dos
   * centímetros más abajo no es un detalle de copy: es la pantalla mintiendo.
   */
  const destacadaEsEstatus = destacada !== null && claveDeClase(destacada.plantilla) === CLASE_ESTATUS
  const rotuloDestacada = destacadaEsEstatus ? 'Último estatus' : 'Más reciente'
  const gruposAnteriores = [
    { clave: CLASE_ESTATUS, etiqueta: etiquetaDeClase(CLASE_ESTATUS), lista: estatusAnteriores },
    { clave: 'otras', etiqueta: 'Otras reuniones', lista: otras },
  ].filter((grupo) => grupo.lista.length > 0)
  const minutaDe = (r: Reunion) => r.minuta
  /**
   * Quién tocó ESTA reunión, o `undefined` si no hay nada que decir.
   *
   * Defensa doble a propósito, no redundancia inútil: el mapa ya llega vacío
   * para un director (page.tsx no lo pide), pero este componente tampoco lo
   * pintaría aunque llegara poblado — `equipo` se comprueba también aquí.
   */
  const participantesDeReunion = (r: Reunion): Participante[] | undefined =>
    equipo ? participacionPorReunion[r.id] : undefined
  const proximasTituloId = `proximas-reuniones-${salaSlug}`
  const historialTituloId = `historial-reuniones-${salaSlug}`
  const anterioresTituloId = `reuniones-anteriores-${salaSlug}`

  return (
    <div className={estilos.reunionesModulo}>
      {/* Compartido por TODAS las filas: se dispara programáticamente desde
          `alPulsarSubirPresentacion`, nunca se ve ni se clica directo. */}
      <input
        ref={entradaArchivo}
        type="file"
        className={estilos.entradaOculta}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          e.target.value = '' // permite volver a elegir el mismo archivo si algo falla
          void alElegirArchivoDePresentacion(archivo)
        }}
      />

      {/* ═══ LO QUE VIENE ═══ Lo que todavía hay que preparar. Antes vivía
          en una tira suelta arriba de la sala que decía "Seguir editando" a
          toda reunión agendada, mirara o no si había algo que editar. */}
      {porVenir.length > 0 && (
        <section className={estilos.porVenir} aria-labelledby={proximasTituloId}>
          <header className={estilos.bloqueReunionesCabecera}>
            <div>
              <h2 id={proximasTituloId} className={estilos.bloqueReunionesTitulo}>
                Próximas reuniones
              </h2>
              <p className={estilos.bloqueReunionesPista}>
                {equipo ? 'Prepara lo que falta antes de la fecha.' : 'Lo siguiente en la agenda de esta sala.'}
              </p>
            </div>
            <span className={estilos.bloqueReunionesConteo}>
              {porVenir.length} {porVenir.length === 1 ? 'reunión' : 'reuniones'}
            </span>
          </header>
          {porVenir.map((r) => (
            <FilaPorVenir
              key={r.id}
              reunion={r}
              equipo={equipo}
              avance={avancePorReunion[r.id] ?? null}
              subiendo={subiendoReunionId === r.id}
              error={errorSubida?.reunionId === r.id ? errorSubida.mensaje : null}
              onSubirPresentacion={equipo ? () => alPulsarSubirPresentacion(r) : undefined}
              onLeerMinuta={() => setAbierta(r)}
              eliminarAction={equipo ? eliminarReunionAction : undefined}
              marcarDadaAction={equipo ? marcarDadaAction : undefined}
              editarArchivoAction={editarArchivoAction}
            />
          ))}
        </section>
      )}

      {!hayHistorial && (
        <p className={estilos.vacioNota}>
          {porVenir.length > 0
            ? 'Todavía no hay reuniones en el historial. Cuando ocurra la primera, su presentación y su minuta aparecerán aquí.'
            : 'Todavía no se ha dado ninguna reunión con este cliente. La primera nace al preparar una presentación; su minuta se levanta al terminarla.'}
        </p>
      )}

      {/* Cada reunión conserva su ancla para llegar desde el acuerdo que
          nació en ella. La cabecera muestra la más reciente de cada clase;
          el resto permanece agrupado debajo por esa misma clase. */}
      {hayHistorial && (
        <section className={estilos.historialReuniones} aria-labelledby={historialTituloId}>
          <header className={estilos.bloqueReunionesCabecera}>
            <div>
              <h2 id={historialTituloId} className={estilos.bloqueReunionesTitulo}>
                Historial de reuniones
              </h2>
              <p className={estilos.bloqueReunionesPista}>
                Presentaciones, minutas y acuerdos, unidos por la reunión donde ocurrieron.
              </p>
            </div>
            <span className={estilos.bloqueReunionesConteo}>
              {reuniones.length} {reuniones.length === 1 ? 'reunión' : 'reuniones'}
            </span>
          </header>
          {/* UNA SOLA DESTACADA, y es la del estatus (ver la cabecera). El
              contenedor se queda —es el que le da su ancho y su aire— pero ya
              nunca lleva más de una tarjeta. */}
          <div className={estilos.ultimasPorClase} data-testid="ultimas-por-clase">
            {[destacada].filter((r): r is Reunion => r !== null).map((r) => {
              const participantes = participantesDeReunion(r)
              const tituloId = `reunion-reciente-${r.id}`
              return (
                <article
                  className={estilos.reunionDestacada}
                  id={`r-${r.id}`}
                  key={r.id}
                  aria-labelledby={tituloId}
                >
                  <div className={estilos.reunionCabecera}>
                    <div>
                      <div className={estilos.presTag}>{rotuloDestacada}</div>
                      <TituloDeReunion
                        reunion={r}
                        equipo={equipo}
                        renombrarAction={renombrarReunionAction}
                        Etiqueta="h3"
                        id={tituloId}
                        className={estilos.presTitulo}
                      />
                      {/* La misma clave normalizada gobierna esta etiqueta y
                          el grupo de reuniones anteriores. */}
                      <time className={estilos.presFecha} dateTime={r.fecha}>
                        {fechaCompleta(r.fecha)} · {etiquetaDeClase(claveDeClase(r.plantilla))}
                      </time>
                    </div>
                    {equipo && (
                      <div className={estilos.reunionBorrar}>
                        <BorrarReunion reunion={r} eliminarAction={eliminarReunionAction} />
                      </div>
                    )}
                  </div>
                  <CarasDeReunion
                    reunion={r}
                    equipo={equipo}
                    onLeerMinuta={() => setAbierta(r)}
                    onSubirPresentacion={equipo ? () => alPulsarSubirPresentacion(r) : undefined}
                    editarArchivoAction={editarArchivoAction}
                    descartarBorradorAction={descartarBorradorAction}
                  />
                  {subiendoReunionId === r.id && (
                    <p className={estilos.subirPista} aria-live="polite">Subiendo…</p>
                  )}
                  {errorSubida?.reunionId === r.id && (
                    <p className={estilos.subirError} role="alert">{errorSubida.mensaje}</p>
                  )}
                  <AcuerdosDeReunion acuerdos={r.acuerdos} />
                  {equipo && crearAcuerdoEnReunionAction && (
                    <NuevoAcuerdoForm
                      crearAction={(datos) => crearAcuerdoEnReunionAction(r.id, datos)}
                      personas={personas ?? []}
                      etiqueta="+ Añadir acuerdo a esta reunión"
                      sinSquad
                      discreto
                    />
                  )}
                  {participantes && <ParticipantesSesion participantes={participantes} />}
                </article>
              )
            })}
          </div>

          {/* Dos grupos y solo dos: el estatus por un lado y todo lo demás
              por otro. El que se quede vacío no se pinta. */}
          {gruposAnteriores.length > 0 && (
            <section className={estilos.historialAnterior} aria-labelledby={anterioresTituloId}>
              <div className={estilos.historialAnteriorCabecera}>
                <h3 id={anterioresTituloId} className={estilos.historialAnteriorTitulo}>
                  Reuniones anteriores
                </h3>
                <span className={estilos.historialAnteriorLinea} aria-hidden />
              </div>
              <div className={estilos.columnasAnteriores}>
                {gruposAnteriores.map(({ clave, etiqueta, lista }) => {
                  const tituloId = `clase-anteriores-${salaSlug}-${clave}`
                  return (
                    <div
                      key={clave}
                      role="group"
                      aria-labelledby={tituloId}
                      className={estilos.grupoMaterial}
                    >
                      <div className={estilos.grupoCabecera}>
                        <h3 id={tituloId} className={estilos.grupoNombre}>{etiqueta}</h3>
                        <span className={estilos.conteo}>{lista.length}</span>
                      </div>
                      <div className={estilos.reuniones}>
                        {lista.map((r) => {
                          const participantes = participantesDeReunion(r)
                          const reunionTituloId = `reunion-anterior-${r.id}`
                          return (
                            <article
                              key={r.id}
                              className={estilos.reunionFila}
                              id={`r-${r.id}`}
                              aria-labelledby={reunionTituloId}
                            >
                              <div className={estilos.reunionFilaTexto}>
                                <TituloDeReunion
                                  reunion={r}
                                  equipo={equipo}
                                  renombrarAction={renombrarReunionAction}
                                  Etiqueta="h4"
                                  id={reunionTituloId}
                                  className={estilos.presFilaTitulo}
                                />
                                <time className={estilos.presFilaFecha} dateTime={r.fecha}>
                                  {fechaBreveConAnio(r.fecha)}
                                </time>
                                {equipo && (
                                  <span className={estilos.reunionBorrar}>
                                    <BorrarReunion reunion={r} eliminarAction={eliminarReunionAction} />
                                  </span>
                                )}
                              </div>
                              <CarasDeReunion
                                reunion={r}
                                equipo={equipo}
                                onLeerMinuta={() => setAbierta(r)}
                                onSubirPresentacion={equipo ? () => alPulsarSubirPresentacion(r) : undefined}
                                editarArchivoAction={editarArchivoAction}
                                descartarBorradorAction={descartarBorradorAction}
                                compacta
                              />
                              {subiendoReunionId === r.id && (
                                <p className={estilos.subirPista} aria-live="polite">Subiendo…</p>
                              )}
                              {errorSubida?.reunionId === r.id && (
                                <p className={estilos.subirError} role="alert">{errorSubida.mensaje}</p>
                              )}
                              <AcuerdosDeReunion acuerdos={r.acuerdos} />
                              {equipo && crearAcuerdoEnReunionAction && (
                                <NuevoAcuerdoForm
                                  crearAction={(datos) => crearAcuerdoEnReunionAction(r.id, datos)}
                                  personas={personas ?? []}
                                  etiqueta="+ Añadir acuerdo a esta reunión"
                                  sinSquad
                                  discreto
                                />
                              )}
                              {participantes && (
                                <div className={estilos.reunionFilaParticipacion}>
                                  <ParticipantesSesion participantes={participantes} />
                                </div>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </section>
      )}

      <dialog
        ref={dialogo}
        className={estilos.lightbox}
        aria-label={abierta ? `Minuta · ${abierta.titulo}` : 'Minuta'}
        // El backdrop cierra, pero solo si el clic cayó EN el backdrop: un
        // `<dialog>` recibe los clics de su contenido, así que sin comprobar el
        // destino se cierra al soltar el ratón dentro del propio texto.
        onClick={(e) => {
          if (e.target === dialogo.current) cerrarMinuta()
        }}
        onClose={() => cerrarMinuta()}
      >
        {abierta && minutaDe(abierta) && (
          <div className={estilos.lightboxCaja}>
            <header className={estilos.lightboxCabecera}>
              <div>
                <h3 className={estilos.lightboxTitulo}>{minutaDe(abierta)!.titulo}</h3>
                <div className={estilos.lightboxFecha}>
                  {fechaCompleta(minutaDe(abierta)!.fecha)} · {textoEnvio(minutaDe(abierta)!.enviadaA)}
                </div>
              </div>
              <button
                type="button"
                className={estilos.lightboxCerrar}
                onClick={() => cerrarMinuta()}
                aria-label="Cerrar la minuta"
              >
                ✕
              </button>
            </header>

            {corrigiendo !== null ? (
              /* CORRIGIENDO. El textarea trae el texto CRUDO —con sus barras
                 de tabla— y no el HTML con formato: es lo que está guardado y
                 lo que `CorreoMinuta` sabe volver a pintar. Enseñar aquí el
                 formateado obligaría a convertirlo de vuelta al guardar, y esa
                 ida y vuelta es donde se pierden las tablas. */
              <div className={estilos.lightboxTexto}>
                <textarea
                  className={estilos.minutaTextarea}
                  value={corrigiendo}
                  onChange={(e) => setCorrigiendo(e.target.value)}
                  aria-label="Texto de la minuta"
                  autoFocus
                />
                {errorMinuta && <p className={estilos.minutaError} role="alert">{errorMinuta}</p>}
              </div>
            ) : minutaDe(abierta)!.texto ? (
              /* CON SU FORMATO, no como texto plano (Franco: *"cuando se
                 publica la minuta, después para verla pierde el formato
                 bonito"*). Este visor pintaba `minuta.texto` a pelo dentro de
                 un `pre-wrap`: los encabezados llegaban como una línea más y
                 la tabla de acuerdos —alineada con barras— se deshacía, que es
                 justo lo que `CorreoMinuta` existe para arreglar. Se reusa ESE
                 componente, el mismo que ya pinta la vista previa antes de
                 publicar y el mismo HTML que se copia al portapapeles: lo que
                 se revisa, lo que se manda y lo que se archiva son la misma
                 cosa. */
              <div className={estilos.lightboxTexto}>
                <CorreoMinuta texto={minutaDe(abierta)!.texto ?? ''} />
              </div>
            ) : (
              <p className={estilos.lightboxVacio}>
                Esta minuta no tiene texto guardado. Se generó antes de que la sala pudiera
                mostrarlas, o se publicó sin cuerpo.
              </p>
            )}

            <footer className={estilos.lightboxPie}>
              {/* ⚠️ MIENTRAS SE CORRIGE, LAS SALIDAS SE APAGAN. Copiar copiaría
                  el texto GUARDADO, no el que se acaba de escribir —y quien
                  pulsa "copiar" después de corregir da por hecho lo
                  contrario—; e irse a la presentación se lleva por delante el
                  borrador, que no está guardado en ninguna parte. */}
              {corrigiendo === null && minutaDe(abierta)!.texto && (
                <CopiarBoton texto={minutaDe(abierta)!.texto!} formatoCorreo className={estilos.lightboxBoton} />
              )}
              {/* Desde la minuta se llega al documento de SU reunión: es la
                  pregunta que sigue a leer un acuerdo — "¿qué se presentó?".

                  ⚠️ `documentoListo` Y NO `tienePresentacion` (ronda 13). Este
                  enlace llevaba a un 404 y lo veía CUALQUIERA que abriera la
                  sala pública: `tienePresentacion` es "documento listo O algún
                  archivo", y una reunión cuya presentación es un PDF subido
                  —todas las reales de esta app— cumple esa condición sin tener
                  documento que `/reunion/<id>` pueda pintar (esa página hace
                  `notFound()` si no hay secciones maquetadas). El PDF sigue a
                  un toque: su chip está en la tarjeta de la reunión.
                  `CarasDeReunion` ya usaba el criterio correcto; era esta la
                  que se desviaba. */}
              {corrigiendo === null && abierta.documentoListo && (
                <Link href={`/reunion/${abierta.id}`} className={estilos.lightboxEnlace}>
                  Ver la presentación →
                </Link>
              )}
              {/* ---- CORREGIR AQUÍ MISMO (20-ago-2026) ----
                  Antes esto era un enlace a `/deck/[id]/minuta`: sacaba de la
                  sala para cambiar una errata. El editor de allá sigue
                  existiendo y escribe el MISMO campo (`editarTextoMinuta`);
                  lo que cambia es que ya no hace falta ir. */}
              {equipo && editarMinutaAction && minutaDe(abierta)!.texto && corrigiendo === null && (
                <button
                  type="button"
                  className={estilos.lightboxEnlace}
                  onClick={() => { setErrorMinuta(null); setCorrigiendo(minutaDe(abierta)!.texto ?? '') }}
                >
                  ✎ Corregir el texto
                </button>
              )}
              {corrigiendo !== null && editarMinutaAction && (
                <>
                  <button
                    type="button"
                    className={estilos.lightboxBoton}
                    disabled={guardandoMinuta}
                    onClick={() => {
                      const reunionId = abierta.id
                      const texto = corrigiendo
                      empezarGuardadoMinuta(async () => {
                        const r = await editarMinutaAction(reunionId, texto)
                        // Con error, el borrador SE QUEDA en pantalla: quien
                        // acaba de reescribir un párrafo no lo pierde porque
                        // la red fallara.
                        if (r.error) { setErrorMinuta(r.error); return }
                        setCorrigiendo(null)
                        setErrorMinuta(null)
                      })
                    }}
                  >
                    {guardandoMinuta ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    className={estilos.lightboxEnlace}
                    onClick={() => { setCorrigiendo(null); setErrorMinuta(null) }}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </footer>
          </div>
        )}
      </dialog>
    </div>
  )
}

/** "enviada a 0" es la forma más fría de decir que no se ha mandado. */
function textoEnvio(cuantos: number): string {
  if (cuantos === 0) return 'sin enviar'
  return `enviada a ${cuantos}`
}

/**
 * UNA REUNIÓN QUE TODAVÍA NO HA OCURRIDO: qué le falta y qué se puede hacer.
 *
 * Tres estados posibles y tres respuestas distintas, que es justo lo que la
 * sala no distinguía:
 *
 * 1. **Tiene un documento empezado** → "Seguir editando", con su avance real.
 * 2. **No tiene documento** → las dos vías: subir la presentación que ya
 *    existe, o armarla aquí. Es el caso de una reunión recién creada y el de
 *    una cuya presentación se descartó — antes las dos decían "Seguir
 *    editando · 0 de 0 secciones", que no llevaba a ninguna parte.
 * 3. **Ya tiene un archivo subido** → se enseña, y se puede seguir añadiendo.
 *
 * Y siempre, para el equipo, la salida: **borrarla**. Una reunión creada por
 * error se quedaba para siempre en el calendario de la sala porque el único
 * borrado vivía en Presentaciones.
 */
function FilaPorVenir({
  reunion,
  equipo,
  avance,
  subiendo,
  error,
  onSubirPresentacion,
  onLeerMinuta,
  eliminarAction,
  marcarDadaAction,
  editarArchivoAction,
}: {
  reunion: Reunion
  equipo: boolean
  avance: { llenados: number; total: number } | null
  subiendo: boolean
  error: string | null
  onSubirPresentacion?: () => void
  onLeerMinuta: () => void
  eliminarAction?: (id: string) => Promise<{ error?: string }>
  marcarDadaAction?: (id: string) => Promise<void>
  editarArchivoAction?: (id: string, cambios: { titulo: string }) => Promise<void>
}) {
  const [cerrando, empezarCierre] = useTransition()
  const lista = tienePresentacion(reunion)
  const tituloId = `reunion-proxima-${reunion.id}`

  return (
    <article className={estilos.porVenirFila} aria-labelledby={tituloId}>
      <div className={estilos.porVenirTexto}>
        <h3 id={tituloId} className={estilos.porVenirTitulo}>{reunion.titulo}</h3>
        <span>
          {fechaBreve(reunion.fecha)}
          {' · '}
          {/* QUÉ LE FALTA, dicho sin rodeos. Un documento existente pero sin
              secciones llenas no es "0 de 0": es un documento empezado. */}
          {lista
            ? 'presentación lista'
            : seEstaArmando(reunion) && avance
              ? `${avance.llenados} de ${avance.total} secciones`
              : seEstaArmando(reunion)
                ? 'presentación empezada'
                : 'sin presentación todavía'}
        </span>
      </div>

      {/* QUÉ HAY Y QUÉ SIGUE. `CarasDeReunion` es la ÚNICA que decide eso —
          documento y archivos si los hay, "seguir editando" si está a medias,
          las dos vías si no hay nada, y levantar la minuta— así que aquí no
          se repite ninguna de esas decisiones. */}
      <div className={estilos.porVenirAcciones}>
        <CarasDeReunion
          reunion={reunion}
          equipo={equipo}
          onLeerMinuta={onLeerMinuta}
          onSubirPresentacion={onSubirPresentacion}
          editarArchivoAction={editarArchivoAction}
          compacta
        />

        {/**
         * CERRAR EL CICLO (Franco: *"cuando ya creé la reunión y subí la
         * presentación, debería ofrecerme generar la minuta, generar acuerdos
         * y finalizar o marcar como completada, ya que el journey se cumplió,
         * y pasar al grupo que le corresponda"*).
         *
         * Solo con la presentación lista: antes de eso no hay nada que dar
         * por dado, y ofrecerlo invitaría a cerrar una junta que no ocurrió.
         * Al marcarla, `reunionesPorVenir` deja de contarla (filtra `estado
         * !== 'dada'`) y cae sola en el historial — como "La última" si es la
         * más reciente. Eso es lo que la mueve de grupo, sin tocar su fecha.
         *
         * LOS ACUERDOS SALEN DE LA MINUTA, no de un botón aparte: publicarla
         * es lo que los crea y los deja vivos en la sala. Por eso el ciclo se
         * ofrece en este orden y "Levantar minuta" ya viene de `CarasDeReunion`.
         */}
        {equipo && lista && marcarDadaAction && (
          <button
            type="button"
            className={caras.caraAccion}
            disabled={cerrando}
            onClick={() => empezarCierre(async () => { await marcarDadaAction(reunion.id) })}
          >
            <span aria-hidden>✓</span> {cerrando ? 'Cerrando…' : 'Ya se dio'}
          </button>
        )}

        {equipo && <BorrarReunion reunion={reunion} eliminarAction={eliminarAction} />}
      </div>

      {subiendo && <p className={estilos.subirPista} aria-live="polite">Subiendo…</p>}
      {error && <p className={estilos.subirError} role="alert">{error}</p>}
    </article>
  )
}

/**
 * BORRAR UNA REUNIÓN, desde donde uno se la encuentra.
 *
 * Franco: *"la otra reunión tampoco puedo eliminarla de la sala"*. No se
 * podía: el borrado vivía solo en Presentaciones (`/deck`). Aquí sirve para
 * los DOS bloques —lo que viene y el historial— porque es la misma operación.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA FRICCIÓN ESCALA CON LO QUE SE PIERDE (Franco: *"borrar una reunión que
 * ya se dio y se marcó como tal no puede ser eliminada solo con un clic;
 * debería el editor o admin teclear un captcha o escribir ELIMINAR"*).
 *
 * No son el mismo acto. Tirar una junta del jueves que se creó por error no
 * destruye nada: se vuelve a crear en diez segundos. Tirar una que YA SE DIO
 * se lleva su presentación, su minuta y el registro de que ocurrió — y eso no
 * se rehace, porque la transcripción de la que salió el acta ya no está.
 *
 * Así que hay dos puertas:
 *
 * - **Vacía y por venir** → confirmar en dos tiempos, como hasta ahora.
 * - **Con historia** (se dio, o tiene minuta, presentación o acuerdos) →
 *   además hay que TECLEAR "ELIMINAR". No es un trámite decorativo: obliga a
 *   leer qué se lleva antes de poder pulsar, que es justo lo que un segundo
 *   clic no consigue. Un captcha no aportaría nada aquí — no protege de un
 *   robot, protege de un descuido, y para eso lo que sirve es escribir.
 *
 * Los acuerdos ya publicados NO se van en ninguno de los dos casos: cuelgan
 * de la sala y pueden llevar semanas moviéndose. Decirlo importa: es justo la
 * duda que frena a alguien delante de un botón de borrar.
 */
const PALABRA = 'ELIMINAR'

function BorrarReunion({
  reunion,
  eliminarAction,
}: {
  reunion: Reunion
  eliminarAction?: (id: string) => Promise<{ error?: string }>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [tecleado, setTecleado] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!eliminarAction) return null

  /**
   * ¿Esta reunión tiene algo que perder? `estado === 'dada'` es lo explícito
   * —alguien dijo que ocurrió— y el resto es respaldo: lo que se llevaría por
   * delante el borrado. Cualquiera de las dos cosas cierra la puerta fácil.
   */
  const pesa =
    reunion.estado === 'dada' ||
    Boolean(reunion.minuta) ||
    reunion.documentoListo ||
    reunion.archivos.length > 0 ||
    reunion.acuerdos.length > 0

  const listo = !pesa || tecleado.trim().toUpperCase() === PALABRA

  function cerrar() {
    setConfirmando(false)
    setTecleado('')
    setError(null)
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        className={estilos.botonIconoBorrar}
        onClick={() => setConfirmando(true)}
        aria-label={`Borrar la reunión ${reunion.titulo}`}
      >
        ✕
      </button>
    )
  }

  return (
    <>
      <p className={estilos.porVenirAviso}>
        {pesa ? (
          <>
            Esta reunión <strong>ya se dio</strong>. Se borran su presentación, su minuta y el
            registro de que ocurrió — la transcripción de la que salió el acta no se puede
            recuperar. Los acuerdos ya publicados en esta sala se quedan.
          </>
        ) : (
          <>
            Se borra la reunión con su presentación y su minuta. Los acuerdos ya publicados en esta
            sala se quedan.
          </>
        )}
      </p>

      {pesa && (
        <label className={estilos.borrarTecleo}>
          <span>
            Escribe <strong>{PALABRA}</strong> para confirmar
          </span>
          <input
            type="text"
            className={estilos.archivoInput}
            value={tecleado}
            onChange={(e) => setTecleado(e.target.value)}
            // Sin autocompletar ni corregir: el navegador ofreciendo la
            // palabra convertiría el candado en un clic más.
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={`Escribe ${PALABRA} para borrar la reunión ${reunion.titulo}`}
            autoFocus
          />
        </label>
      )}

      <div className={estilos.reunionBorrar}>
        <button
          type="button"
          className={estilos.botonBorrar}
          disabled={borrando || !listo}
          onClick={() => {
            setBorrando(true)
            setError(null)
            void eliminarAction(reunion.id)
              .then((r) => { if (r?.error) setError(r.error) })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo borrar.'))
              .finally(() => setBorrando(false))
          }}
        >
          {borrando ? 'Borrando…' : 'Sí, borrar la reunión'}
        </button>
        <button
          type="button"
          className={estilos.botonCancelarBorrado}
          onClick={cerrar}
          disabled={borrando}
        >
          Cancelar
        </button>
      </div>
      {error && <p className={estilos.subirError} role="alert">{error}</p>}
    </>
  )
}
