# Las bases de datos de mktcorp-upax

*Escrito el 1-sep-2026, el día que se separó desarrollo de producción.*

## Por qué existe este documento

Hasta el 1-sep-2026 había **una sola base**. `.env.local` apuntaba a la misma
rama de Neon que sirve el sitio, así que cualquier prueba en `npm run dev`
—rellenar un formulario para ver cómo queda, recorrer una pantalla dos veces—
escribía en lo que Franco ve publicado.

El 31-ago eso dejó **90 reuniones de prueba** en producción: nacieron entre las
11:51:12 y las 11:52:46, en plena sesión de desarrollo (entre los commits
`9b5c401` y `a51ab2c`), con títulos como `x`, `Libre`, `Mensual` y siete copias
de "Estatus de agosto" de Zeus. NeraCode llegó a mostrar 67 reuniones cuando
tenía 2. Franco lo vio el 1-sep y preguntó qué pasaba.

Se limpiaron. Esto es lo que se montó para que no vuelva a pasar.

## Las dos ramas

| | Rama de Neon | Quién escribe ahí |
|---|---|---|
| **Producción** | `main` (`br-plain-bread-au0ftbkv`) | El sitio desplegado en Vercel, y solo él |
| **Desarrollo** | `dev` (`br-spring-fire-auge0ieg`) | `npm run dev` y todo lo local |

`dev` nació como copia de `main`, así que se trabaja con datos realistas: las
mismas salas, las mismas marcas, las mismas reuniones reales. Lo que se
ensucie ahí no lo ve nadie.

## Los archivos de entorno

- **`.env.local`** → apunta a `dev`. Es el que usan `npm run dev`,
  `npm run db:migrate` y los scripts de `scripts/`.
- **`.env.prod.local`** → apunta a `main`. **No lo lee nada por defecto.**
  Solo lo abren, a propósito, `npm run db:migrate:prod` y `npm run db:respaldo`.

Los dos están fuera de git (`.gitignore`, línea `.env*`).

## Los tres comandos

```bash
npm run db:migrate        # migra DEV. Es el de todos los días.
npm run db:migrate:prod   # migra PRODUCCIÓN. Pide escribir "producción" para seguir.
npm run db:respaldo       # respalda PRODUCCIÓN a ~/Respaldos-mktcorp/
```

El orden al soltar un cambio de esquema: generar la migración, aplicarla en
dev, comprobar que la app va, aplicarla en producción, y luego desplegar el
código. La migración va antes que el código porque una columna que todavía no
existe rompe el código nuevo, mientras que una columna de más no molesta al
viejo.

## El respaldo, y por qué no basta con Neon

El proyecto está en el plan **`free_v3`**, cuya ventana de recuperación a un
punto en el tiempo es de **6 horas** (`history_retention_seconds: 21600`).

Dicho sin adornos: un borrado masivo que nadie note en 6 horas es
irreversible. Neon no guarda nada más atrás.

`npm run db:respaldo` es lo único que sobrevive a esa ventana. Vuelca todas las
tablas —las **pregunta** a `pg_tables`, así que una tabla nueva entra sola— a
`~/Respaldos-mktcorp/mktcorp-<fecha>.json.gz`, y conserva los últimos 60.

**Qué NO cubre**, y conviene tenerlo claro antes de necesitarlo:

- El **esquema** no va ahí, pero ya está versionado en `drizzle/`.
- Los **binarios de Vercel Blob** —presentaciones, logos, imágenes del
  concurso— viven en otro sistema y tienen su propia vida.

Restaurar es: base vacía → `db:migrate` → volver a meter las filas del JSON.

### Para que corra solo

Un respaldo que hay que acordarse de correr no es un respaldo. Para dejarlo
diario a las 9 de la mañana:

```bash
crontab -e
# y añadir:
0 9 * * * cd ~/mktcorp-estatus && /opt/homebrew/bin/npm run db:respaldo >> ~/Respaldos-mktcorp/registro.log 2>&1
```

## Lo que quedó pendiente

- **Proteger la rama `main` en Neon.** Se intentó el 1-sep y la API respondió
  `BRANCHES_PROTECTED_LIMIT_EXCEEDED`: el plan gratuito permite cero ramas
  protegidas. Requiere subir de plan.
- **Subir la retención de historia** por encima de esas 6 horas. Misma causa,
  mismo remedio.
- **La base acepta conexiones desde cualquier IP** (`allowed_ips` vacío). La
  lista blanca de IPs también es una función de pago en Neon.
