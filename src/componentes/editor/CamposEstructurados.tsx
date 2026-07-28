'use client'

import { useState } from 'react'
import type { DecisionSlide } from '@/decision/esquema'
import { TIPOS_DE_GRAFICO } from '@/decision/esquema'
import {
  parsearVinetas, escribirVinetas,
  parsearPartes, escribirPartes,
  TONOS,
  estadoDeTexto, parsearLineas, numeroDeCelda,
} from '@/secciones/parseo'
import { Repetible } from './Repetible'
import { EditorRejilla } from './EditorRejilla'
import { AreaTexto } from './AreaTexto'
import { IconoGrafico } from './IconoGrafico'
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
          <AreaTexto
            inicial={escribirVinetas(col.puntos)}
            alEscribir={(texto) => cambiar({ ...col, puntos: parsearVinetas(texto) })}
            etiqueta={`Puntos de la columna ${i + 1} — uno por línea`}
            placeholder={'One sheets por servicio\n  Social content\n  Producción'}
            pista="Sangra con dos espacios para colgar una línea de la de arriba (hasta 3 niveles). Para enlazar, termina la línea con «| https://…»."
          />
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
          <div className={estilos.campo}>
            <span className={estilos.subtituloCampo}>Datos de la tabla</span>
            <EditorRejilla
              columnas={tabla.columnas}
              filas={tabla.filas.map((f) => f.celdas)}
              onChange={(columnas, filas) => cambiar(construirTabla(columnas, filas, tabla, conSemaforo))}
              nombreColumna="columna"
              nombreFila="fila"
              ejemploColumna={conSemaforo ? 'Tarea' : 'Mayo'}
              ejemploFila={conSemaforo ? 'Ileana Cruz' : 'Sesiones'}
            />
            {conSemaforo && (
              <em className={estilos.pista}>
                Titula una columna «Estatus» y escribe en ella «Listo», «En proceso» o «No realizado»:
                el semáforo se pinta solo. Déjala vacía si no consta — no se inventa un estado.
              </em>
            )}
          </div>
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

function construirTabla(columnas: string[], filas: string[][], previa: Tabla, conSemaforo: boolean): Tabla {
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
      {(grafico, i, cambiar) => <UnGrafico grafico={grafico} indice={i} cambiar={cambiar} />}
    </Repetible>
  )
}

/**
 * Un gráfico, armado en tres pasos y en el orden en que se decide de verdad:
 * PRIMERO los datos, DESPUÉS cuántas escalas hacen falta, y AL FINAL cómo se
 * dibuja.
 *
 * El orden importa. Elegir el tipo antes de tener los datos es elegir a
 * ciegas: no se sabe cuántas series hay, ni si sus magnitudes se parecen —que
 * es justo lo que decide si hace falta un segundo eje— ni si tiene sentido una
 * dona. Cada paso solo aparece cuando el anterior le da de comer, así que la
 * pantalla nunca pide algo que todavía no se puede contestar.
 */
function UnGrafico({
  grafico,
  indice,
  cambiar,
}: {
  grafico: Grafico
  indice: number
  cambiar: (g: Grafico) => void
}) {
  const hayDatos = grafico.periodos.length > 0 && grafico.series.length > 0
  const dosEjes = grafico.series.some((s) => s.eje === 'derecho')
  const esCombo = grafico.tipo === 'combo-barras-lineas'
  const compatibles = TIPOS_COMPATIBLES(grafico.series.length, dosEjes)

  /**
   * QUÉ SERIES ESTABAN A LA DERECHA antes de pulsar "una escala".
   *
   * Volver a "dos escalas" mandaba SIEMPRE la última serie a la derecha, así
   * que quien hubiera puesto la 1 y la 3 allí perdía su reparto por mirar la
   * otra opción un segundo. El reparto no puede vivir en el gráfico —una sola
   * escala significa exactamente que ninguna serie tiene eje— así que se
   * recuerda aquí, mientras la pantalla siga abierta.
   */
  const [ejesRecordados, setEjesRecordados] = useState<boolean[] | null>(null)

  return (
    <>
      {/* Paso 1 — los datos */}
      <div className={estilos.paso}>
        <span className={estilos.pasoTitulo}>1 · Los datos</span>
        <EditorRejilla
          columnas={['', ...grafico.periodos]}
          filas={grafico.series.map((s) => [s.etiqueta, ...s.valores.map((v) => String(v))])}
          onChange={(columnas, filas) => cambiar(construirGrafico(columnas, filas, grafico))}
          nombreColumna="periodo"
          nombreFila="serie"
          ejemploColumna="Enero"
          ejemploFila="Total 2026"
        />
        <em className={estilos.pista}>
          Cada columna es un periodo y cada fila una serie. La primera celda de cada fila es su
          nombre; la esquina se deja vacía. Los números pueden traer comas y símbolo de moneda.
        </em>
      </div>

      {/* Paso 2 — las escalas. Solo tiene sentido con dos series o más. */}
      {hayDatos && grafico.series.length > 1 && (
        <div className={estilos.paso}>
          <span className={estilos.pasoTitulo}>2 · Las escalas</span>
          <div className={estilos.opcionesEje}>
            <label className={estilos.radio}>
              <input
                type="radio"
                name={`ejes-${indice}`}
                checked={!dosEjes}
                onChange={() => {
                  setEjesRecordados(grafico.series.map((s) => s.eje === 'derecho'))
                  cambiar(ponerTodasEnUnEje(grafico))
                }}
              />
              <span>
                <strong>Una escala</strong>
                <em>Todas las series se comparan entre sí con el mismo eje.</em>
              </span>
            </label>
            <label className={estilos.radio}>
              <input
                type="radio"
                name={`ejes-${indice}`}
                checked={dosEjes}
                onChange={() => cambiar(restaurarEjes(grafico, ejesRecordados))}
              />
              <span>
                <strong>Dos escalas</strong>
                <em>
                  Cuando las magnitudes no se parecen —un coste en miles junto a unas decenas de
                  conversiones—. Con una sola, la pequeña se dibuja plana pegada al suelo.
                </em>
              </span>
            </label>
          </div>

          {dosEjes && (
            <div className={estilos.asignacionEjes}>
              {grafico.series.map((serie, s) => (
                <label key={`eje-${s}`} className={estilos.campoChico}>
                  <span>{serie.etiqueta || `Serie ${s + 1}`}</span>
                  <select
                    value={serie.eje ?? 'izquierdo'}
                    onChange={(e) =>
                      cambiar(cambiarSerie(grafico, s, { eje: e.target.value === 'derecho' ? 'derecho' : undefined }))
                    }
                    aria-label={`Escala de la serie ${serie.etiqueta || s + 1}`}
                  >
                    <option value="izquierdo">Escala izquierda</option>
                    <option value="derecho">Escala derecha</option>
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paso 3 — cómo se dibuja */}
      {hayDatos && (
        <div className={estilos.paso}>
          <span className={estilos.pasoTitulo}>
            {grafico.series.length > 1 ? '3' : '2'} · Cómo se dibuja
          </span>
          <div className={estilos.tiposGrafico}>
            {compatibles.map((tipo) => (
              <button
                key={tipo}
                type="button"
                className={estilos.tipoGrafico}
                data-elegido={grafico.tipo === tipo ? 'true' : undefined}
                onClick={() => cambiar(elegirTipo(grafico, tipo))}
              >
                <IconoGrafico tipo={tipo} />
                <span className={estilos.tipoNombre}>{NOMBRE_DE_TIPO[tipo]}</span>
              </button>
            ))}
          </div>

          {/* La forma por serie solo existe en el combo: es su razón de ser. */}
          {esCombo && (
            <div className={estilos.asignacionEjes}>
              {grafico.series.map((serie, s) => (
                <label key={`forma-${s}`} className={estilos.campoChico}>
                  <span>{serie.etiqueta || `Serie ${s + 1}`}</span>
                  <select
                    value={serie.forma ?? 'barra'}
                    onChange={(e) => cambiar(cambiarSerie(grafico, s, { forma: e.target.value as Serie['forma'] }))}
                    aria-label={`Forma de la serie ${serie.etiqueta || s + 1}`}
                  >
                    {FORMAS.map((f) => (
                      <option key={f.valor} value={f.valor}>{f.nombre}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          <div className={estilos.filaCampos}>
            <label className={estilos.campoAncho}>
              <span>Título del gráfico (opcional)</span>
              <input
                value={grafico.titulo ?? ''}
                onChange={(e) => cambiar(limpiar({ ...grafico, titulo: e.target.value || undefined }))}
                placeholder="Tráfico website"
                aria-label={`Título del gráfico ${indice + 1}`}
              />
            </label>
          </div>

          <div className={estilos.filaOpciones}>
            <label className={estilos.casilla}>
              <input
                type="checkbox"
                checked={grafico.mostrarValores === true}
                onChange={(e) => cambiar(limpiar({ ...grafico, mostrarValores: e.target.checked || undefined }))}
              />
              Escribir el número sobre cada punto o barra
            </label>
          </div>

          {/* Unidades por serie: lo último y lo más fino. */}
          <details className={estilos.detalles}>
            <summary>Unidades de cada serie</summary>
            <div className={estilos.asignacionEjes}>
              {grafico.series.map((serie, s) => (
                <div key={`unidad-${s}`} className={estilos.filaCampos}>
                  <span className={estilos.serieNombre}>{serie.etiqueta || `Serie ${s + 1}`}</span>
                  <label className={estilos.campoMinimo}>
                    <span>Antes</span>
                    <input
                      value={serie.prefijo ?? ''}
                      onChange={(e) => cambiar(cambiarSerie(grafico, s, { prefijo: e.target.value || undefined }))}
                      placeholder="$"
                      aria-label={`Prefijo de ${serie.etiqueta || s + 1}`}
                    />
                  </label>
                  <label className={estilos.campoMinimo}>
                    <span>Después</span>
                    <input
                      value={serie.sufijo ?? ''}
                      onChange={(e) => cambiar(cambiarSerie(grafico, s, { sufijo: e.target.value || undefined }))}
                      placeholder="%"
                      aria-label={`Sufijo de ${serie.etiqueta || s + 1}`}
                    />
                  </label>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </>
  )
}

/**
 * Qué tipos tienen sentido con estos datos.
 *
 * No es decoración: ofrecer una dona para tres series es ofrecer un gráfico
 * que va a mentir, y ofrecer el combo con una sola serie es ofrecer una
 * decisión que no hay que tomar. Se filtra en lugar de dejar elegir mal y
 * explicarlo después.
 */
function TIPOS_COMPATIBLES(cuantasSeries: number, dosEjes: boolean): Array<(typeof TIPOS_DE_GRAFICO)[number]> {
  return TIPOS_DE_GRAFICO.filter((tipo) => {
    // Una dona reparte UN total entre sus partes: con dos series son dos donas.
    if (tipo === 'dona') return cuantasSeries === 1 && !dosEjes
    // El combo existe para mezclar formas: con una sola serie no mezcla nada.
    if (tipo === 'combo-barras-lineas') return cuantasSeries > 1
    if (tipo === 'barras-comparadas' || tipo === 'barras-horizontales-agrupadas') return cuantasSeries > 1
    if (tipo === 'lineas-multiples') return cuantasSeries > 1
    // Las barras horizontales no llevan eje de valores, así que no pueden
    // tener dos escalas.
    if (dosEjes && tipo === 'barras-horizontales') return false
    return true
  })
}

/** Al elegir un tipo, las formas por serie que ya no aplican se limpian. */
function elegirTipo(grafico: Grafico, tipo: Grafico['tipo']): Grafico {
  if (tipo === 'combo-barras-lineas') {
    // El combo exige forma explícita: sin ella una serie cae en barra aunque
    // se hubiera puesto en el eje derecho esperando una línea.
    return {
      ...grafico,
      tipo,
      series: grafico.series.map((s) => ({ ...s, forma: s.forma ?? 'barra' })),
    }
  }
  return { ...grafico, tipo, series: grafico.series.map((s) => limpiar({ ...s, forma: undefined })) }
}

function ponerTodasEnUnEje(grafico: Grafico): Grafico {
  return { ...grafico, series: grafico.series.map((s) => limpiar({ ...s, eje: undefined })) }
}

/**
 * Al pedir dos escalas: se devuelve el reparto que había, si lo hubo.
 *
 * Sin recuerdo, la última serie se manda a la derecha como punto de partida —
 * que es lo razonable la primera vez. Lo que no era razonable es hacerlo
 * TAMBIÉN cuando ya había un reparto hecho a mano.
 */
function restaurarEjes(grafico: Grafico, recordados: boolean[] | null): Grafico {
  const sirve = recordados?.length === grafico.series.length && recordados.some(Boolean)
  if (sirve) {
    return {
      ...grafico,
      series: grafico.series.map((s, i) =>
        recordados![i] ? { ...s, eje: 'derecho' as const } : limpiar({ ...s, eje: undefined }),
      ),
    }
  }
  const ultima = grafico.series.length - 1
  return {
    ...grafico,
    series: grafico.series.map((s, i) => (i === ultima ? { ...s, eje: 'derecho' as const } : limpiar({ ...s, eje: undefined }))),
  }
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
 * Reconstruye el gráfico con lo que hay en la rejilla, CONSERVANDO la forma,
 * el eje y las unidades que ya se hubieran elegido por serie.
 *
 * Sin esto, corregir un número borraría que la serie "Meta" era una línea
 * punteada en el eje derecho: el trabajo fino se perdería en cada retoque.
 */
function construirGrafico(columnas: string[], filas: string[][], previo: Grafico): Grafico {
  const periodos = columnas.slice(1).filter((p) => p.trim().length > 0)
  const ajustesPrevios = new Map(previo.series.map((s) => [s.etiqueta, s]))
  return {
    ...previo,
    periodos,
    series: filas
      .filter((f) => (f[0] ?? '').trim().length > 0)
      .map((f) => {
        const etiqueta = f[0]
        const antes = ajustesPrevios.get(etiqueta)
        return limpiar({
          etiqueta,
          valores: periodos.map((_, i) => numeroDeCelda(f[i + 1] ?? '')),
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
          <AreaTexto
            inicial={escribirPartes(cifra.partes)}
            alEscribir={(texto) => {
              const partes = parsearPartes(texto)
              cambiar(limpiar({ ...cifra, partes: partes.length > 0 ? partes : undefined }))
            }}
            filas={3}
            etiqueta={`Desglose de la cifra ${i + 1} — «parte | valor» por línea`}
            placeholder={'Mkt | $36.1 MDP\nComercial | $3.4 MDP'}
          />
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
          <AreaTexto
            inicial={escribirVinetas(bloque.puntos)}
            alEscribir={(texto) => {
              const puntos = parsearVinetas(texto)
              cambiar(limpiar({ ...bloque, puntos: puntos.length > 0 ? puntos : undefined }))
            }}
            filas={4}
            etiqueta={`Detalle del bloque ${i + 1} — uno por línea`}
            placeholder={'Campañas de marca\nEstrategia creativa'}
          />
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
  const palabras = palabrasDeLaMatriz(actual)

  return (
    <div className={estilos.bloqueCampo}>
      <div className={estilos.paso}>
        <span className={estilos.pasoTitulo}>1 · La rejilla</span>
        <EditorRejilla
          columnas={['', ...actual.columnas]}
          filas={actual.filas.map((f) => [f.encabezado, ...f.celdas.map((c) => c.texto)])}
          onChange={(columnas, filas) => onChange(construirMatriz(columnas, filas, actual, tonos))}
          nombreColumna="periodo"
          nombreFila="concepto"
          ejemploColumna="Julio"
          ejemploFila="Comercio al por menor"
          minimoColumnas={2}
        />
        <em className={estilos.pista}>
          Cada columna es un periodo y cada fila un concepto. En el cruce, qué toca hacer.
        </em>
      </div>

      {/* La intensidad solo se puede pedir cuando ya hay palabras que calificar. */}
      {palabras.length > 0 && (
        <div className={estilos.paso}>
          <span className={estilos.pasoTitulo}>2 · La intensidad de cada palabra</span>
          <div className={estilos.asignacionEjes}>
            {palabras.map((palabra) => (
              <label key={palabra} className={estilos.campoChico}>
                <span>{palabra}</span>
                <select
                  value={tonos.get(palabra.toLowerCase()) ?? 'neutro'}
                  onChange={(e) => {
                    const nuevos = new Map(tonos)
                    nuevos.set(palabra.toLowerCase(), e.target.value as (typeof TONOS)[number])
                    onChange(reasignarTonos(actual, nuevos))
                  }}
                  aria-label={`Intensidad de «${palabra}»`}
                >
                  {TONOS.map((t) => (
                    <option key={t} value={t}>{NOMBRE_DE_TONO[t]}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <em className={estilos.pista}>
            Marca dónde se concentra el esfuerzo. La palabra sigue escrita en la celda, así que el
            color nunca es la única señal.
          </em>
        </div>
      )}

      <AreaTexto
        inicial={(actual.leyenda ?? []).join('\n')}
        alEscribir={(texto) => {
          const leyenda = parsearLineas(texto)
          onChange(limpiar({ ...actual, leyenda: leyenda.length > 0 ? leyenda : undefined }))
        }}
        filas={4}
        etiqueta="Leyenda — una línea por estado (opcional)"
        placeholder={'Vende: pico de actividad, máxima disposición de compra.'}
      />
    </div>
  )
}

const NOMBRE_DE_TONO: Record<(typeof TONOS)[number], string> = {
  alto: 'Alta — el pico',
  medio: 'Media',
  bajo: 'Baja',
  neutro: 'Sin intensidad',
}

/** Las palabras distintas que aparecen en la rejilla, en orden de aparición. */
function palabrasDeLaMatriz(matriz: Matriz): string[] {
  const vistas = new Set<string>()
  const orden: string[] = []
  for (const fila of matriz.filas) {
    for (const celda of fila.celdas) {
      const texto = celda.texto.trim()
      if (texto.length === 0 || vistas.has(texto.toLowerCase())) continue
      vistas.add(texto.toLowerCase())
      orden.push(texto)
    }
  }
  return orden
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

function reasignarTonos(matriz: Matriz, tonos: Map<string, (typeof TONOS)[number]>): Matriz {
  return {
    ...matriz,
    filas: matriz.filas.map((f) => ({
      ...f,
      celdas: f.celdas.map((c) => limpiar({ ...c, tono: tonos.get(c.texto.trim().toLowerCase()) })),
    })),
  }
}

function construirMatriz(
  columnas: string[],
  filas: string[][],
  previa: Matriz,
  tonos: Map<string, (typeof TONOS)[number]>,
): Matriz {
  const notasPrevias = new Map(previa.filas.map((f) => [f.encabezado, f.nota]))
  const periodos = columnas.slice(1)

  return limpiar({
    ...previa,
    columnas: periodos,
    filas: filas
      .filter((f) => (f[0] ?? '').trim().length > 0)
      .map((f) => limpiar({
        encabezado: f[0],
        celdas: periodos.map((_, i) => {
          const texto = f[i + 1] ?? ''
          return limpiar({ texto, tono: tonos.get(texto.trim().toLowerCase()) })
        }),
        nota: notasPrevias.get(f[0]),
      })),
  })
}
