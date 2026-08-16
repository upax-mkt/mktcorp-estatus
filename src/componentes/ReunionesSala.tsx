'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { seEstaArmando, tienePresentacion, type Reunion } from '@/dominio/reunion'
import { PLANTILLAS } from '@/secciones/plantillas'
import type { Participante } from '@/db/participacion'
import type { CategoriaArchivo } from '@/db/archivos'
import { fechaBreve, fechaBreveConAnio, fechaCompleta } from '@/lib/fecha'
import { TAMANO_MAXIMO, pesoLegible } from '@/lib/blob'
import { ParticipantesSesion } from '@/componentes/sesion/ParticipantesSesion'
import { CopiarBoton } from './CopiarBoton'
import { CorreoMinuta } from './CorreoMinuta'
import { CarasDeReunion } from './reuniones/CarasDeReunion'
import { AcuerdosDeReunion } from './reuniones/AcuerdosDeReunion'
import { subirArchivoDirecto } from '@/lib/subir'
import estilos from '@/app/cliente/cliente.module.css'
// La píldora de acción ("+ Subir presentación", "Armarla en el editor") se
// define UNA vez, en el módulo de las caras de una reunión. Importarla aquí
// en vez de copiar sus diez líneas es lo que evita que las dos versiones se
// separen: sin esto, `estilos.caraAccion` llegaba `undefined` y el botón se
// pintaba con el borde por defecto del navegador junto a un enlace pelado.
import caras from './reuniones/CarasDeReunion.module.css'

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
 * ═══ LA CLASE DE JUNTA AGRUPA EL MÓDULO (ronda 14.3, tarea 1) ═════════════
 * `reuniones.plantilla` (`src/secciones/plantillas.ts`) ya se guardaba desde
 * ayer; lo que faltaba era que este módulo la usara. Doce Sync Comerciales al
 * trimestre, sin agrupar, ahogaban el estatus mensual en la misma lista.
 *
 * Cuatro funciones puras, module-scope (no dependen de nada del componente,
 * así que no hace falta `useMemo` para probarlas sueltas): `claveDeAgrupacion`
 * (por qué se agrupa de verdad), `etiquetaDeClase` (cómo se llama),
 * `ordenDeClase` (en qué orden va) y `agruparPorClase` (quién cae en qué
 * grupo). El componente las usa para partir `reuniones` en "la más reciente
 * DE CADA CLASE" (antes: una sola, "la última" a secas) y "las demás, en una
 * columna por clase".
 *
 * ⚠️ CORREGIDO EN LA REVISIÓN DE LA RONDA 14.3 (Importante I3): las tarjetas
 * "LA ÚLTIMA" se pintaban en el orden de `ordenDeClase` —el del catálogo—,
 * así que con dos clases la tarjeta de la IZQUIERDA no era necesariamente la
 * más reciente. Ese orden es correcto para las COLUMNAS de "Anteriores" (lo
 * pide el brief: "en el orden del catálogo"), pero las tarjetas destacadas
 * responden una pregunta distinta —"¿cuál es la más nueva?"— y se ordenan
 * por FECHA, no por catálogo. Ver dónde se ordenan cada una, más abajo en
 * el componente.
 */

/**
 * LA CLAVE DE AGRUPACIÓN de una reunión — no siempre es `plantilla` tal
 * cual. ⚠️ CORREGIDO EN LA REVISIÓN (menor, ronda 14.3): 'en-blanco' NO es
 * una clase de junta —es la salida de emergencia del catálogo para cuando
 * ninguna clase real encaja, ver `esClaseDeJunta` en
 * `src/secciones/plantillas.ts`—, así que agruparla en su propia columna
 * "En blanco" inventaría una clase que el catálogo mismo dice que no existe:
 * la misma pregunta que "¿qué junta es?" no tiene esa respuesta. Se trata
 * IGUAL que `null`: sin clase real, va a "Sin clasificar". Consultar
 * `esClaseDeJunta` aquí —y no solo comparar contra `'en-blanco'` a mano— es
 * lo que el catálogo pide (ver su propio comentario): una entrada futura con
 * `esClaseDeJunta: false` cae en el mismo sitio sin tocar este archivo.
 */
function claveDeAgrupacion(r: Reunion): string | null {
  const id = r.plantilla ?? null
  if (id === null) return null
  const plantilla = PLANTILLAS.find((p) => p.id === id)
  return plantilla?.esClaseDeJunta ? id : null
}

/**
 * LA ETIQUETA DE UNA CLASE YA NORMALIZADA (la que devuelve
 * `claveDeAgrupacion`, nunca `Reunion.plantilla` crudo) — para pintarla,
 * jamás para preguntarle al catálogo sin tratar `null` ANTES.
 * `obtenerPlantilla(null)` cae a la PRIMERA entrada del catálogo POR DISEÑO
 * (es lo que necesita un `<select>` que nunca puede quedar vacío, ver
 * `SelectorClaseDeJunta.tsx`) — usarla a secas aquí pintaría "Estatus de
 * UDN" sobre una junta sin clasificar: un dato inventado, en una pantalla
 * que ve el director de la UDN. Por eso el `null` se resuelve ANTES de
 * tocar el catálogo, no con su fallback.
 *
 * Un id que el catálogo no reconoce —no debería pasar nunca:
 * `crearReunion`/`editarReunion` ya lo rechazan, ver `esPlantillaConocida`
 * en `src/db/reuniones.ts`— se pinta TAL CUAL, igual que `identidadDe` en
 * `src/db/reuniones.ts` con una sala sin tema: ni la primera del catálogo
 * (fingiría una clase real) ni "Sin clasificar" (fingiría que no tiene
 * ninguna, cuando sí trae un valor, solo que uno raro).
 */
function etiquetaDeClase(clave: string | null): string {
  if (clave === null) return 'Sin clasificar'
  const plantilla = PLANTILLAS.find((p) => p.id === clave)
  return plantilla ? plantilla.nombre : clave
}

/**
 * Dónde cae una clase en el orden de columnas: el orden del catálogo
 * (`PLANTILLAS`), y "Sin clasificar" siempre al final — las 6 reuniones
 * reales sin clase de hoy no se esconden, pero tampoco compiten por el
 * primer lugar con una clase de verdad. Un id que el catálogo no reconoce
 * se manda al final también, en vez de reventar el orden — mismo criterio
 * defensivo que `etiquetaDeClase`, arriba.
 */
function ordenDeClase(clave: string | null): number {
  if (clave === null) return PLANTILLAS.length
  const indice = PLANTILLAS.findIndex((p) => p.id === clave)
  return indice === -1 ? PLANTILLAS.length : indice
}

/**
 * Agrupa por `claveDeAgrupacion` (`null` = sin clasificar, incluido
 * 'en-blanco') y ordena cada grupo de la reunión más reciente a la más
 * antigua — con eso, el primer elemento de cada grupo YA es "la última de
 * esa clase", sin tener que confiar en que `reuniones` llegara ordenada por
 * fecha (en producción siempre llega así, ver `reunionesDeSala` en
 * `dominio/reunion.ts`, pero este componente no depende de esa garantía del
 * llamador).
 */
function agruparPorClase(reuniones: Reunion[]): Map<string | null, Reunion[]> {
  const grupos = new Map<string | null, Reunion[]>()
  for (const r of reuniones) {
    const clave = claveDeAgrupacion(r)
    const lista = grupos.get(clave)
    if (lista) lista.push(r)
    else grupos.set(clave, [r])
  }
  for (const lista of grupos.values()) lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
  return grupos
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
  eliminarReunionAction,
  descartarBorradorAction,
  marcarDadaAction,
}: Props) {
  const [abierta, setAbierta] = useState<Reunion | null>(null)
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
   * `reuniones` partido por clase (ronda 14.3, tarea 1): un grupo por
   * `claveDeAgrupacion` (`null` = sin clasificar, ver su comentario arriba),
   * cada uno de la más reciente a la más antigua — ver `agruparPorClase`,
   * arriba. `clases` fija el ORDEN DE LAS COLUMNAS (el del catálogo, sin
   * clasificar al final); de ahí salen las dos listas que antes eran
   * `[ultima, ...anteriores]`:
   *
   * - `ultimasPorClase`: la cabeza de cada grupo — antes era una reunión
   *   sola, ahora una por clase presente. ⚠️ Orden DISTINTO al de las
   *   columnas (I3, revisión ronda 14.3): estas tarjetas se leen por
   *   RECENCIA, no por catálogo — la más nueva de todas va primero, sin
   *   importar de qué clase sea, porque es la respuesta a "¿qué fue lo
   *   último?", no a "¿qué clase es esta?".
   * - `anterioresPorClase`: el resto de cada grupo, ya sin su cabeza, y SIN
   *   las clases que se quedan vacías al quitarla (una columna vacía es
   *   ruido, no información). Estas SÍ van en orden de catálogo — lo pide
   *   el brief tal cual para las columnas.
   */
  const gruposPorClase = agruparPorClase(reuniones)
  const clases = [...gruposPorClase.keys()].sort((a, b) => ordenDeClase(a) - ordenDeClase(b))
  const ultimasPorClase = clases
    .map((clave) => gruposPorClase.get(clave)![0])
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  const anterioresPorClase = clases
    .map((clave) => ({ clave, etiqueta: etiquetaDeClase(clave), lista: gruposPorClase.get(clave)!.slice(1) }))
    .filter((grupo) => grupo.lista.length > 0)
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

  return (
    <>
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
        <div className={estilos.porVenir}>
          <div className={estilos.porVenirRotulo}>
            Lo que viene
            <span className={estilos.conteo}>{porVenir.length}</span>
          </div>
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
        </div>
      )}

      {!hayHistorial && (
        <p className={estilos.vacioNota}>
          Todavía no se ha dado ninguna reunión con este cliente. La primera nace al preparar una
          presentación; su minuta se levanta al terminarla.
        </p>
      )}

      {/* `id` en cada fila: para poder llegar hasta una reunión desde el
          acuerdo que salió de ella (ver `origenDeAcuerdo`, en la página de la
          sala) — que es donde está su minuta, a un clic.

          ═══ LA ÚLTIMA, DE CADA CLASE (ronda 14.3) ═══ Antes era una sola
          tarjeta destacada; ahora es una POR CLASE presente en el
          historial —`ultimasPorClase` ya trae solo la cabeza de cada grupo,
          ver su comentario más arriba—. Con la única clase que tiene HOY
          cada sala (o ninguna) esto sigue siendo una tarjeta sola, a lo
          ancho completo: el grid de `.ultimasPorClase` se estira solo
          cuando hay una, mismo mecanismo que `.columnasAnteriores` más
          abajo. */}
      {hayHistorial && (
      <div className={estilos.ultimasPorClase} data-testid="ultimas-por-clase">
        {ultimasPorClase.map((r) => {
          const participantes = participantesDeReunion(r)
          return (
            <div className={estilos.reunionDestacada} id={`r-${r.id}`} key={r.id}>
              <div className={estilos.reunionCabecera}>
                <div>
                  <div className={estilos.presTag}>La última</div>
                  <h3 className={estilos.presTitulo}>{r.titulo}</h3>
                  {/* La clase va PEGADA a la fecha, no en una píldora aparte:
                      con la única clase de hoy esto sigue leyéndose como
                      antes ("15 jul 2026"), solo que un poco más largo
                      ("15 jul 2026 · Estatus de UDN") — no un elemento nuevo
                      que aprender. `claveDeAgrupacion(r)`, NO `r.plantilla`
                      crudo: esta tarjeta tiene que decir la MISMA clase que
                      la columna de "Anteriores" donde caería si dejara de
                      ser "la última" — si aquí se leyera el dato crudo, una
                      reunión 'en-blanco' diría "En blanco" en su tarjeta
                      pero aparecería bajo "Sin clasificar" en su columna: la
                      misma reunión, dos respuestas distintas a "¿qué junta
                      es?". */}
                  <div className={estilos.presFecha}>
                    {fechaCompleta(r.fecha)} · {etiquetaDeClase(claveDeAgrupacion(r))}
                  </div>
                </div>
                {/* La salida, también en el historial: la reunión que sobra
                    puede ser una vieja tanto como una por venir. */}
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
              {participantes && <ParticipantesSesion participantes={participantes} />}
            </div>
          )
        })}
      </div>
      )}

      {/* ═══ REUNIONES ANTERIORES ═══ Franco: *"en el módulo Reuniones hay
          que agregar la subsección de Reuniones Anteriores dentro del mismo
          módulo"*. La lista ya estaba —debajo de "La última", sin rótulo— y
          por eso se leía como una continuación de esa tarjeta en vez de como
          lo que es: la historia de la relación. Mismo rótulo que "Lo que
          viene", que es el otro bloque del módulo — SIN el conteo que
          llevaba antes: el número ya vive en la cabecera de cada columna
          (`.grupoCabecera`, más abajo), y repetirlo aquí arriba sería el
          mismo total dicho dos veces con una sola clase, que es justo el
          caso de HOY en todas las salas.

          ═══ EN COLUMNAS, POR CLASE (ronda 14.3) ═══ `anterioresPorClase` ya
          viene sin las clases vacías (una columna vacía es ruido) y en el
          orden del catálogo, "Sin clasificar" al final (`ordenDeClase`,
          arriba). `.columnasAnteriores` es el MISMO mecanismo de rejilla que
          ya resuelve `.bmCompetidores` (benchmark) en esta hoja: con una
          columna se estira a lo ancho completo —el caso de hoy—, con varias
          se reparten, y en móvil se apilan solas por el propio `minmax`, sin
          un `@media` nuevo. `.grupoMaterial`/`.grupoCabecera`/`.grupoNombre`
          son las MISMAS clases que ya agrupan los materiales de la sala
          (`MaterialesAgrupados.tsx`): la misma idea —una etiqueta y un
          conteo por grupo— no se reinventa aquí. */}
      {anterioresPorClase.length > 0 && (
        <>
        <div className={estilos.porVenirRotulo} style={{ marginTop: '1.4rem' }}>
          Reuniones anteriores
        </div>
        <div className={estilos.columnasAnteriores}>
          {anterioresPorClase.map(({ clave, etiqueta, lista }) => {
            // `role="group"` + `aria-labelledby`: un lector de pantalla
            // anuncia "Estatus de UDN, grupo de 2" al entrar, en vez de una
            // lista de filas sin ningún contexto de a qué clase pertenecen.
            const tituloId = `clase-anteriores-${salaSlug}-${clave ?? 'sin-clasificar'}`
            return (
              <div key={clave ?? 'sin-clasificar'} role="group" aria-labelledby={tituloId} className={estilos.grupoMaterial}>
                <div className={estilos.grupoCabecera}>
                  <h3 id={tituloId} className={estilos.grupoNombre}>{etiqueta}</h3>
                  <span className={estilos.conteo}>{lista.length}</span>
                </div>
                <div className={estilos.reuniones}>
                  {lista.map((r) => {
                    const participantes = participantesDeReunion(r)
                    return (
                      <div key={r.id} className={estilos.reunionFila} id={`r-${r.id}`}>
                        <div className={estilos.reunionFilaTexto}>
                          <span className={estilos.presFilaTitulo}>{r.titulo}</span>
                          <span className={estilos.presFilaFecha}>{fechaBreveConAnio(r.fecha)}</span>
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
                        {participantes && (
                          <div className={estilos.reunionFilaParticipacion}>
                            <ParticipantesSesion participantes={participantes} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}

      <dialog
        ref={dialogo}
        className={estilos.lightbox}
        aria-label={abierta ? `Minuta · ${abierta.titulo}` : 'Minuta'}
        // El backdrop cierra, pero solo si el clic cayó EN el backdrop: un
        // `<dialog>` recibe los clics de su contenido, así que sin comprobar el
        // destino se cierra al soltar el ratón dentro del propio texto.
        onClick={(e) => {
          if (e.target === dialogo.current) setAbierta(null)
        }}
        onClose={() => setAbierta(null)}
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
                onClick={() => setAbierta(null)}
                aria-label="Cerrar la minuta"
              >
                ✕
              </button>
            </header>

            {minutaDe(abierta)!.texto ? (
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
              {minutaDe(abierta)!.texto && (
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
              {abierta.documentoListo && (
                <Link href={`/reunion/${abierta.id}`} className={estilos.lightboxEnlace}>
                  Ver la presentación →
                </Link>
              )}
              {equipo && (
                <Link href={`/deck/${abierta.id}/minuta`} className={estilos.lightboxEnlace}>
                  Corregir el texto →
                </Link>
              )}
            </footer>
          </div>
        )}
      </dialog>
    </>
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

  return (
    <div className={estilos.porVenirFila}>
      <div className={estilos.porVenirTexto}>
        <strong>{reunion.titulo}</strong>
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
    </div>
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
