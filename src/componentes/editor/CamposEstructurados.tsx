'use client'

import type { DecisionSlide } from '@/decision/esquema'
import { TIPOS_DE_GRAFICO } from '@/decision/esquema'
import {
  parsearVinetas, escribirVinetas,
  parsearRejilla, escribirRejilla,
  parsearDatosDeGrafico, escribirDatosDeGrafico,
  parsearPartes, escribirPartes,
  parsearTonos, escribirTonos, TONOS,
  estadoDeTexto, parsearLineas,
} from '@/secciones/parseo'
import { Repetible } from './Repetible'
import estilos from './editor.module.css'

/**
 * Los campos con estructura del editor. Uno por cosa que una sección puede
 * llevar: cifras, columnas, tablas, gráficos, matriz, meta contra real,
 * cifras con desglose y bloques.
 *
 * TRES REGLAS que valen en todos, y por eso no hay que aprenderlos uno a uno:
 *
 * - **Lo tabular se pega.** Cualquier rejilla —tabla, matriz, datos de un
 *   gráfico— se copia de Sheets y se pega. Es el gesto que la gente ya hace.
 * - **La jerarquía se escribe con sangría.** Dos espacios cuelgan una línea de
 *   la de arriba. Sin widgets anidados, que son lentos de llenar y peores de
 *   corregir.
 * - **Lo repetido se añade y se quita igual.** Ver `Repetible`.
 */

type Kpi = NonNullable<DecisionSlide['kpis']>[number]
type Columna = NonNullable<DecisionSlide['columnas']>[number]
type Tabla = NonNullable<DecisionSlide['tablas']>[number]
type Grafico = NonNullable<DecisionSlide['graficos']>[number]
type Serie = Grafico['series'][number]
type Bloque = NonNullable<DecisionSlide['bloques']>[number]
type Cifra = NonNullable<DecisionSlide['cifrasDesglosadas']>[number]
type MetaReal = NonNullable<DecisionSlide['metaReal']>
type Matriz = NonNullable<DecisionSlide['matriz']>

// ---- cifras (KPIs) --------------------------------------------------------

export function CampoKpis({ valor, onChange }: { valor: Kpi[]; onChange: (v: Kpi[]) => void }) {
  return (
    <Repetible<Kpi>
      nombre="cifra"
      items={valor}
      onChange={onChange}
      maximo={4}
      nuevo={() => ({ valor: '', rotulo: '' })}
    >
      {(kpi, i, cambiar) => (
        <div className={estilos.filaCampos}>
          <label className={estilos.campoChico}>
            <span>Valor</span>
            <input
              value={kpi.valor}
              onChange={(e) => cambiar({ ...kpi, valor: e.target.value })}
              placeholder="79.8k"
              aria-label={`Valor de la cifra ${i + 1}`}
            />
          </label>
          <label className={estilos.campoAncho}>
            <span>Rótulo</span>
            <input
              value={kpi.rotulo}
              onChange={(e) => cambiar({ ...kpi, rotulo: e.target.value })}
              placeholder="Impresiones"
              aria-label={`Rótulo de la cifra ${i + 1}`}
            />
          </label>
          <label className={estilos.campoChico}>
            <span>Variación</span>
            <input
              value={kpi.delta ?? ''}
              onChange={(e) => cambiar({ ...kpi, delta: e.target.value || undefined })}
              placeholder="-10%"
              aria-label={`Variación de la cifra ${i + 1}`}
            />
          </label>
        </div>
      )}
    </Repetible>
  )
}

// ---- columnas de texto ----------------------------------------------------

export function CampoColumnas({ valor, onChange }: { valor: Columna[]; onChange: (v: Columna[]) => void }) {
  return (
    <Repetible<Columna>
      nombre="columna"
      items={valor}
      onChange={onChange}
      maximo={4}
      nuevo={() => ({ titulo: '', puntos: [] })}
    >
      {(col, i, cambiar) => (
        <>
          <div className={estilos.filaCampos}>
            <label className={estilos.campoAncho}>
              <span>Encabezado</span>
              <input
                value={col.titulo}
                onChange={(e) => cambiar({ ...col, titulo: e.target.value })}
                placeholder="Principales hallazgos"
                aria-label={`Encabezado de la columna ${i + 1}`}
              />
            </label>
            <label className={estilos.campoChico}>
              <span>Etiqueta</span>
              <input
                value={col.etiqueta ?? ''}
                onChange={(e) => cambiar({ ...col, etiqueta: e.target.value || undefined })}
                placeholder="12-jun"
                aria-label={`Etiqueta de la columna ${i + 1}`}
              />
            </label>
          </div>
          <label className={estilos.campo}>
            <span>Puntos — uno por línea</span>
            <textarea
              rows={5}
              defaultValue={escribirVinetas(col.puntos)}
              onBlur={(e) => cambiar({ ...col, puntos: parsearVinetas(e.target.value) })}
              placeholder={'One sheets por servicio\n  Social content\n  Producción'}
              aria-label={`Puntos de la columna ${i + 1}`}
            />
            <em className={estilos.pista}>
              Sangra con dos espacios para colgar una línea de la de arriba (hasta 3 niveles). Para
              enlazar, termina la línea con «| https://…».
            </em>
          </label>
        </>
      )}
    </Repetible>
  )
}

// ---- tablas ---------------------------------------------------------------

/** La columna de estatus de una tabla de pendientes, si la hay. */
function indiceDeEstatus(columnas: string[]): number {
  return columnas.findIndex((c) => /^(estatus|estado)$/i.test(c.trim()))
}

export function CampoTablas({
  valor,
  onChange,
  conSemaforo,
}: {
  valor: Tabla[]
  onChange: (v: Tabla[]) => void
  /** La sección de pendientes lee el semáforo de la columna «Estatus». */
  conSemaforo: boolean
}) {
  return (
    <Repetible<Tabla>
      nombre="tabla"
      items={valor}
      onChange={onChange}
      maximo={3}
      nuevo={() => ({ columnas: ['', ''], filas: [] })}
    >
      {(tabla, i, cambiar) => (
        <>
          <label className={estilos.campo}>
            <span>Título de la tabla (opcional)</span>
            <input
              value={tabla.titulo ?? ''}
              onChange={(e) => cambiar({ ...tabla, titulo: e.target.value || undefined })}
              placeholder="Estado de MQLs"
              aria-label={`Título de la tabla ${i + 1}`}
            />
          </label>
          <label className={estilos.campo}>
            <span>Pega la tabla — la primera línea son los encabezados</span>
            <textarea
              rows={6}
              defaultValue={escribirRejilla(tabla.columnas, tabla.filas.map((f) => f.celdas))}
              onBlur={(e) => cambiar(construirTabla(e.target.value, tabla, conSemaforo))}
              placeholder={conSemaforo
                ? 'Responsable | Tarea | Estatus\nIleana Cruz | Cerrar el brief | Listo'
                : ' | Mayo | Junio\nSesiones | 3,591 | 2,519'}
              aria-label={`Datos de la tabla ${i + 1}`}
            />
            <em className={estilos.pista}>
              Copiar y pegar desde Sheets o Excel funciona tal cual. A mano, separa las celdas con «|».
              {conSemaforo && ' Escribe «Listo», «En proceso» o «No realizado» en la columna Estatus y el semáforo se pinta solo; déjala vacía si no consta.'}
            </em>
          </label>
          <div className={estilos.filaOpciones}>
            <label className={estilos.casilla}>
              <input
                type="checkbox"
                checked={tabla.agruparPrimeraColumna === true}
                onChange={(e) => cambiar({ ...tabla, agruparPrimeraColumna: e.target.checked || undefined })}
              />
              Agrupar la primera columna cuando se repite
            </label>
            <label className={estilos.casilla}>
              <input
                type="checkbox"
                checked={tabla.filas.some((f) => f.destacada)}
                onChange={(e) => cambiar(marcarUltimaFila(tabla, e.target.checked))}
              />
              La última fila es un total
            </label>
          </div>
        </>
      )}
    </Repetible>
  )
}

function construirTabla(texto: string, previa: Tabla, conSemaforo: boolean): Tabla {
  const rejilla = parsearRejilla(texto)
  const [columnas, ...filas] = rejilla
  if (!columnas) return { ...previa, columnas: ['', ''], filas: [] }

  const iEstatus = conSemaforo ? indiceDeEstatus(columnas) : -1
  const destacarUltima = previa.filas.some((f) => f.destacada)

  return {
    ...previa,
    columnas,
    filas: filas.map((celdas, i) => {
      const fila: Tabla['filas'][number] = { celdas }
      if (iEstatus >= 0) {
        const estado = estadoDeTexto(celdas[iEstatus] ?? '')
        if (estado) fila.estado = estado
      }
      if (destacarUltima && i === filas.length - 1) fila.destacada = true
      return fila
    }),
  }
}

function marcarUltimaFila(tabla: Tabla, destacar: boolean): Tabla {
  return {
    ...tabla,
    filas: tabla.filas.map((f, i) => {
      const copia = { ...f }
      delete copia.destacada
      if (destacar && i === tabla.filas.length - 1) copia.destacada = true
      return copia
    }),
  }
}

// ---- gráficos -------------------------------------------------------------

const NOMBRE_DE_TIPO: Record<(typeof TIPOS_DE_GRAFICO)[number], string> = {
  'barras': 'Barras',
  'barras-comparadas': 'Barras comparadas',
  'barras-horizontales': 'Barras horizontales',
  'barras-horizontales-agrupadas': 'Barras horizontales agrupadas',
  'linea': 'Línea',
  'lineas-multiples': 'Líneas múltiples',
  'combo-barras-lineas': 'Barras + líneas (con meta)',
  'area': 'Área',
  'dona': 'Dona',
}

const FORMAS: Array<{ valor: NonNullable<Serie['forma']>; nombre: string }> = [
  { valor: 'barra', nombre: 'Barra' },
  { valor: 'linea', nombre: 'Línea' },
  { valor: 'linea-punteada', nombre: 'Meta (punteada)' },
]

export function CampoGraficos({ valor, onChange }: { valor: Grafico[]; onChange: (v: Grafico[]) => void }) {
  return (
    <Repetible<Grafico>
      nombre="gráfico"
      items={valor}
      onChange={onChange}
      maximo={2}
      nuevo={() => ({ tipo: 'barras', periodos: [], series: [] })}
    >
      {(grafico, i, cambiar) => {
        const esCombo = grafico.tipo === 'combo-barras-lineas'
        return (
        <>
          <div className={estilos.filaCampos}>
            <label className={estilos.campoAncho}>
              <span>Título (opcional)</span>
              <input
                value={grafico.titulo ?? ''}
                onChange={(e) => cambiar({ ...grafico, titulo: e.target.value || undefined })}
                placeholder="Tráfico website"
                aria-label={`Título del gráfico ${i + 1}`}
              />
            </label>
            <label className={estilos.campoChico}>
              <span>Tipo</span>
              <select
                value={grafico.tipo}
                onChange={(e) => cambiar({ ...grafico, tipo: e.target.value as Grafico['tipo'] })}
                aria-label={`Tipo del gráfico ${i + 1}`}
              >
                {TIPOS_DE_GRAFICO.map((t) => (
                  <option key={t} value={t}>{NOMBRE_DE_TIPO[t]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={estilos.campo}>
            <span>Pega los datos — primera línea los periodos, una línea por serie</span>
            <textarea
              rows={5}
              defaultValue={escribirDatosDeGrafico(grafico.periodos, grafico.series)}
              onBlur={(e) => cambiar(construirGrafico(e.target.value, grafico))}
              placeholder={' | Enero | Febrero | Marzo\nTotal 2026 | 4393 | 7244 | 4997\nMeta | 5000 | 5000 | 5000'}
              aria-label={`Datos del gráfico ${i + 1}`}
            />
            <em className={estilos.pista}>
              La primera celda de la primera línea se deja vacía. Los números pueden traer comas y
              símbolo de moneda: se leen igual.
            </em>
          </label>

          {grafico.series.length > 0 && (
            <div className={estilos.series}>
              <span className={estilos.subtituloCampo}>Cómo se dibuja cada serie</span>
              {grafico.series.map((serie, s) => (
                <div key={`serie-${s}`} className={estilos.filaCampos}>
                  <span className={estilos.serieNombre} title={serie.etiqueta}>{serie.etiqueta}</span>
                  <label className={estilos.campoChico}>
                    <span>Forma</span>
                    <select
                      value={serie.forma ?? (esCombo ? 'barra' : '')}
                      onChange={(e) => cambiar(cambiarSerie(grafico, s, { forma: (e.target.value || undefined) as Serie['forma'] }))}
                      aria-label={`Forma de la serie ${serie.etiqueta}`}
                    >
                      {/* En un combo NO hay "según el tipo": el tipo es
                          justamente "cada serie decide". Ofrecerlo dejaba
                          series sin forma que se dibujaban como barra aunque
                          se hubieran configurado como línea en el eje
                          derecho. */}
                      {!esCombo && <option value="">Según el tipo</option>}
                      {FORMAS.map((f) => (
                        <option key={f.valor} value={f.valor}>{f.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className={estilos.campoChico}>
                    <span>Eje</span>
                    <select
                      value={serie.eje ?? 'izquierdo'}
                      onChange={(e) => cambiar(cambiarSerie(grafico, s, { eje: e.target.value === 'derecho' ? 'derecho' : undefined }))}
                      aria-label={`Eje de la serie ${serie.etiqueta}`}
                    >
                      <option value="izquierdo">Izquierdo</option>
                      <option value="derecho">Derecho</option>
                    </select>
                  </label>
                  <label className={estilos.campoMinimo}>
                    <span>Antes</span>
                    <input
                      value={serie.prefijo ?? ''}
                      onChange={(e) => cambiar(cambiarSerie(grafico, s, { prefijo: e.target.value || undefined }))}
                      placeholder="$"
                      aria-label={`Prefijo de la serie ${serie.etiqueta}`}
                    />
                  </label>
                  <label className={estilos.campoMinimo}>
                    <span>Después</span>
                    <input
                      value={serie.sufijo ?? ''}
                      onChange={(e) => cambiar(cambiarSerie(grafico, s, { sufijo: e.target.value || undefined }))}
                      placeholder="%"
                      aria-label={`Sufijo de la serie ${serie.etiqueta}`}
                    />
                  </label>
                </div>
              ))}
              <em className={estilos.pista}>
                Usa el eje derecho cuando dos series tienen escalas que no se parecen (un coste en
                miles junto a unas decenas de conversiones): con un solo eje, la pequeña se dibuja
                como una línea plana pegada al suelo.
              </em>
              <label className={estilos.casilla}>
                <input
                  type="checkbox"
                  checked={grafico.mostrarValores === true}
                  onChange={(e) => cambiar({ ...grafico, mostrarValores: e.target.checked || undefined })}
                />
                Escribir el número sobre cada punto o barra
              </label>
            </div>
          )}
        </>
        )
      }}
    </Repetible>
  )
}

/** Cambia una serie conservando lo que el equipo ya eligió para ella. */
function cambiarSerie(grafico: Grafico, indice: number, parcial: Partial<Serie>): Grafico {
  return {
    ...grafico,
    series: grafico.series.map((s, i) => (i === indice ? limpiar({ ...s, ...parcial }) : s)),
  }
}

/** Quita las claves en `undefined`: el esquema es estricto y no las quiere. */
function limpiar<T extends object>(objeto: T): T {
  const copia = { ...objeto } as Record<string, unknown>
  for (const clave of Object.keys(copia)) {
    if (copia[clave] === undefined) delete copia[clave]
  }
  return copia as T
}

/**
 * Reconstruye el gráfico con los datos pegados, CONSERVANDO la forma, el eje y
 * las unidades que ya se hubieran elegido por serie.
 *
 * Sin esto, corregir un número en la tabla pegada borraría que la serie "Meta"
 * era una línea punteada en el eje derecho — el trabajo fino se perdería en
 * cada retoque del dato.
 */
function construirGrafico(texto: string, previo: Grafico): Grafico {
  const { periodos, series } = parsearDatosDeGrafico(texto)
  const ajustesPrevios = new Map(previo.series.map((s) => [s.etiqueta, s]))
  return {
    ...previo,
    periodos,
    series: series.map((s) => {
      const antes = ajustesPrevios.get(s.etiqueta)
      return limpiar({
        etiqueta: s.etiqueta,
        valores: s.valores,
        forma: antes?.forma,
        eje: antes?.eje,
        prefijo: antes?.prefijo,
        sufijo: antes?.sufijo,
      })
    }),
  }
}

// ---- meta contra real -----------------------------------------------------

export function CampoMetaReal({
  valor,
  onChange,
}: {
  valor: MetaReal | undefined
  onChange: (v: MetaReal | undefined) => void
}) {
  const actual: MetaReal = valor ?? { titulo: '', filas: [] }
  return (
    <div className={estilos.bloqueCampo}>
      <label className={estilos.campo}>
        <span>Qué se mide</span>
        <input
          value={actual.titulo}
          onChange={(e) => onChange({ ...actual, titulo: e.target.value })}
          placeholder="SQLs"
          aria-label="Qué se mide contra su meta"
        />
      </label>
      <Repetible<MetaReal['filas'][number]>
        nombre="renglón"
        items={actual.filas}
        onChange={(filas) => onChange({ ...actual, filas })}
        nuevo={() => ({ rotulo: '', meta: '', real: '', porcentaje: '' })}
      >
        {(fila, i, cambiar) => (
          <div className={estilos.filaCampos}>
            <label className={estilos.campoAncho}>
              <span>Corte</span>
              <input
                value={fila.rotulo}
                onChange={(e) => cambiar({ ...fila, rotulo: e.target.value })}
                placeholder="Total"
                aria-label={`Corte del renglón ${i + 1}`}
              />
            </label>
            <label className={estilos.campoChico}>
              <span>Meta</span>
              <input value={fila.meta} onChange={(e) => cambiar({ ...fila, meta: e.target.value })} placeholder="7" aria-label={`Meta del renglón ${i + 1}`} />
            </label>
            <label className={estilos.campoChico}>
              <span>Real</span>
              <input value={fila.real} onChange={(e) => cambiar({ ...fila, real: e.target.value })} placeholder="1" aria-label={`Real del renglón ${i + 1}`} />
            </label>
            <label className={estilos.campoChico}>
              <span>%</span>
              <input value={fila.porcentaje} onChange={(e) => cambiar({ ...fila, porcentaje: e.target.value })} placeholder="14%" aria-label={`Porcentaje del renglón ${i + 1}`} />
            </label>
          </div>
        )}
      </Repetible>
      <em className={estilos.pista}>
        El primer renglón suele ser el total, y los siguientes lo abren por equipo.
      </em>
    </div>
  )
}

// ---- cifras con desglose --------------------------------------------------

export function CampoCifrasDesglosadas({ valor, onChange }: { valor: Cifra[]; onChange: (v: Cifra[]) => void }) {
  return (
    <Repetible<Cifra>
      nombre="cifra"
      items={valor}
      onChange={onChange}
      maximo={6}
      nuevo={() => ({ rotulo: '', valor: '' })}
    >
      {(cifra, i, cambiar) => (
        <>
          <div className={estilos.filaCampos}>
            <label className={estilos.campoAncho}>
              <span>Qué mide</span>
              <input
                value={cifra.rotulo}
                onChange={(e) => cambiar({ ...cifra, rotulo: e.target.value })}
                placeholder="Pipeline generado YTD"
                aria-label={`Rótulo de la cifra ${i + 1}`}
              />
            </label>
            <label className={estilos.campoChico}>
              <span>Total</span>
              <input
                value={cifra.valor}
                onChange={(e) => cambiar({ ...cifra, valor: e.target.value })}
                placeholder="$39.4 MDP"
                aria-label={`Total de la cifra ${i + 1}`}
              />
            </label>
          </div>
          <label className={estilos.campo}>
            <span>En qué se reparte — «parte | valor» por línea</span>
            <textarea
              rows={3}
              defaultValue={escribirPartes(cifra.partes)}
              onBlur={(e) => {
                const partes = parsearPartes(e.target.value)
                cambiar(limpiar({ ...cifra, partes: partes.length > 0 ? partes : undefined }))
              }}
              placeholder={'Mkt | $36.1 MDP\nComercial | $3.4 MDP'}
              aria-label={`Desglose de la cifra ${i + 1}`}
            />
          </label>
          <label className={estilos.casilla}>
            <input
              type="checkbox"
              checked={cifra.destacada === true}
              onChange={(e) => cambiar(limpiar({ ...cifra, destacada: e.target.checked || undefined }))}
            />
            Es la noticia del bloque
          </label>
        </>
      )}
    </Repetible>
  )
}

// ---- bloques numerados ----------------------------------------------------

export function CampoBloques({ valor, onChange }: { valor: Bloque[]; onChange: (v: Bloque[]) => void }) {
  return (
    <Repetible<Bloque>
      nombre="bloque"
      items={valor}
      onChange={onChange}
      maximo={5}
      nuevo={() => ({ titulo: '' })}
    >
      {(bloque, i, cambiar) => (
        <>
          <div className={estilos.filaCampos}>
            <label className={estilos.campoAncho}>
              <span>Título</span>
              <input
                value={bloque.titulo}
                onChange={(e) => cambiar({ ...bloque, titulo: e.target.value })}
                placeholder="Comercio al por menor"
                aria-label={`Título del bloque ${i + 1}`}
              />
            </label>
            <label className={estilos.campoChico}>
              <span>Distintivo</span>
              <input
                value={bloque.etiqueta ?? ''}
                onChange={(e) => cambiar(limpiar({ ...bloque, etiqueta: e.target.value || undefined }))}
                placeholder="Prioridad alta"
                aria-label={`Distintivo del bloque ${i + 1}`}
              />
            </label>
          </div>
          <label className={estilos.campo}>
            <span>Planteamiento</span>
            <textarea
              rows={3}
              value={bloque.parrafo ?? ''}
              onChange={(e) => cambiar(limpiar({ ...bloque, parrafo: e.target.value || undefined }))}
              placeholder="Es una de las mejores industrias para Mexa porque…"
              aria-label={`Planteamiento del bloque ${i + 1}`}
            />
          </label>
          <label className={estilos.campo}>
            <span>Detalle — uno por línea</span>
            <textarea
              rows={4}
              defaultValue={escribirVinetas(bloque.puntos)}
              onBlur={(e) => {
                const puntos = parsearVinetas(e.target.value)
                cambiar(limpiar({ ...bloque, puntos: puntos.length > 0 ? puntos : undefined }))
              }}
              placeholder={'Campañas de marca\nEstrategia creativa'}
              aria-label={`Detalle del bloque ${i + 1}`}
            />
          </label>
          <div className={estilos.filaCampos}>
            <label className={estilos.campoChico}>
              <span>Línea de cierre</span>
              <input
                value={bloque.pie?.rotulo ?? ''}
                onChange={(e) => cambiar(cambiarPie(bloque, { rotulo: e.target.value }))}
                placeholder="Oferta gancho"
                aria-label={`Rótulo del cierre del bloque ${i + 1}`}
              />
            </label>
            <label className={estilos.campoAncho}>
              <span>Su contenido</span>
              <input
                value={bloque.pie?.texto ?? ''}
                onChange={(e) => cambiar(cambiarPie(bloque, { texto: e.target.value }))}
                placeholder="Ayudamos a marcas de retail a convertir temporada…"
                aria-label={`Contenido del cierre del bloque ${i + 1}`}
              />
            </label>
          </div>
        </>
      )}
    </Repetible>
  )
}

function cambiarPie(bloque: Bloque, parcial: Partial<NonNullable<Bloque['pie']>>): Bloque {
  const pie = { rotulo: bloque.pie?.rotulo ?? '', texto: bloque.pie?.texto ?? '', ...parcial }
  // Un pie a medias no vale: o lleva rótulo y texto, o no existe.
  if (pie.rotulo.trim().length === 0 && pie.texto.trim().length === 0) {
    const copia = { ...bloque }
    delete copia.pie
    return copia
  }
  return { ...bloque, pie }
}

// ---- matriz de estados ----------------------------------------------------

export function CampoMatriz({
  valor,
  onChange,
}: {
  valor: Matriz | undefined
  onChange: (v: Matriz | undefined) => void
}) {
  const actual: Matriz = valor ?? { columnas: ['', ''], filas: [] }
  const tonos = tonosDeLaMatriz(actual)

  return (
    <div className={estilos.bloqueCampo}>
      <label className={estilos.campo}>
        <span>Pega la rejilla — primera línea los periodos, una línea por concepto</span>
        <textarea
          rows={6}
          defaultValue={escribirRejilla(
            ['', ...actual.columnas],
            actual.filas.map((f) => [f.encabezado, ...f.celdas.map((c) => c.texto)]),
          )}
          onBlur={(e) => onChange(construirMatriz(e.target.value, actual, tonos))}
          placeholder={' | Julio | Agosto | Septiembre\nComercio al por menor | Vende | Prepara | Vende'}
          aria-label="Datos de la matriz"
        />
      </label>

      <label className={estilos.campo}>
        <span>Qué intensidad tiene cada palabra</span>
        <textarea
          rows={4}
          defaultValue={escribirTonos(tonos)}
          onBlur={(e) => onChange(construirMatriz(
            escribirRejilla(['', ...actual.columnas], actual.filas.map((f) => [f.encabezado, ...f.celdas.map((c) => c.texto)])),
            actual,
            parsearTonos(e.target.value),
          ))}
          placeholder={`Vende | alto\nPrepara | medio\nExplora | bajo\nEspera | neutro`}
          aria-label="Intensidad de cada palabra de la matriz"
        />
        <em className={estilos.pista}>
          Las intensidades disponibles son: {TONOS.join(', ')}. Marcan dónde se concentra el esfuerzo;
          la palabra sigue escrita en la celda, así que el color nunca es la única señal.
        </em>
      </label>

      <label className={estilos.campo}>
        <span>Leyenda — una línea por estado</span>
        <textarea
          rows={4}
          defaultValue={(actual.leyenda ?? []).join('\n')}
          onBlur={(e) => {
            const leyenda = parsearLineas(e.target.value)
            onChange(limpiar({ ...actual, leyenda: leyenda.length > 0 ? leyenda : undefined }))
          }}
          placeholder={'Vende: pico de actividad, máxima disposición de compra.'}
          aria-label="Leyenda de la matriz"
        />
      </label>
    </div>
  )
}

function tonosDeLaMatriz(matriz: Matriz): Map<string, (typeof TONOS)[number]> {
  const mapa = new Map<string, (typeof TONOS)[number]>()
  for (const fila of matriz.filas) {
    for (const celda of fila.celdas) {
      if (celda.tono) mapa.set(celda.texto.trim().toLowerCase(), celda.tono)
    }
  }
  return mapa
}

function construirMatriz(
  texto: string,
  previa: Matriz,
  tonos: Map<string, (typeof TONOS)[number]>,
): Matriz {
  const rejilla = parsearRejilla(texto)
  const [encabezado, ...filas] = rejilla
  if (!encabezado) return previa

  const notasPrevias = new Map(previa.filas.map((f) => [f.encabezado, f.nota]))

  return limpiar({
    ...previa,
    columnas: encabezado.slice(1),
    filas: filas
      .filter((f) => f[0]?.length > 0)
      .map((f) => limpiar({
        encabezado: f[0],
        celdas: f.slice(1).map((texto) => limpiar({ texto, tono: tonos.get(texto.trim().toLowerCase()) })),
        nota: notasPrevias.get(f[0]),
      })),
  })
}
