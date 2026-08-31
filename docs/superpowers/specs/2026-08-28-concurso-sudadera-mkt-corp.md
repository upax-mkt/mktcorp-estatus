# Concurso «Diseña MKT Corp» — especificación aprobada

**Fecha:** 28 de agosto de 2026  
**Fuente funcional:** conversación con Franco Cruzat + bases de Capital Humano  
**Fuente de estructura:** `UPAX Org Truth · CMO Copilot`, sección `EQUIPO DETALLE`, actualizada 2026-08-20

## Objetivo

Integrar a Marketing Corporativo a través del diseño de su sudadera oficial. Puede participar cualquier colaborador activo, sin importar puesto o squad, de forma individual o en dupla de squads distintos.

## Calendario (America/Mexico_City)

- Recepción: 28-ago-2026 → 07-sep-2026, 11:00.
- Galería pública y votación: 07-sep-2026, 11:00 → 08-sep-2026, 18:00.
- Ceremonia y revelación: 09-sep-2026, 15:00, SKY LOBBY · Sala 2.

Antes de la votación ninguna propuesta ajena es visible. La portada muestra una cuenta regresiva. Al abrir la votación se publican todas simultáneamente y se activa «Tu pase al escenario».

## Participación y entrega

- Una propuesta por persona, individual o en dupla.
- En dupla, los dos integrantes deben pertenecer a squads distintos.
- Se aceptan sudaderas con o sin capucha; la prenda final puede adaptarse en producción.
- Bases neutras: negro, blanco, gris, beige/arena y azul marino.
- Obligatorios, sin alterar: logo Grupo UPAX, logo Marketing Corp y frase «¡ASÍ SOMOS!».
- Libertad de composición en frente, espalda y mangas.
- Se aceptan diseño terminado o concepto/boceto; si gana un concepto, se apoya su desarrollo gráfico.
- ~~Sin IA generativa.~~ **Retirada por Franco el 28-ago-2026.** La herramienta con la que alguien llega a su idea deja de ser una condición: lo que se juzga es el diseño. Se tacha en vez de borrarse porque estuvo publicada y conviene que se vea que se quitó a propósito.
- Entrega: nombre, descripción de máximo 500 caracteres y hasta tres JPG/PNG de máximo 25 MB cada uno.
- No se exige editable al participar; se solicitará a la propuesta ganadora.
- La publicación no requiere moderación previa, pero un admin puede ocultar incumplimientos.
- Los autores pueden editar texto e imágenes hasta el cierre de recepción.
- La identidad y el squad parten del login/directorio. La identidad autenticada se valida en servidor.

## Votación

**Cambios del 31-ago-2026, decididos por Franco.** Se tachan en vez de borrarse: estuvieron publicados.

- ~~Propuestas públicas y **atribuidas**~~ → **las propuestas se publican SIN AUTOR**. Se vota el diseño, no la firma. El nombre solo se ve desde la administración, y se revela en la ceremonia.
- Voto individual anónimo.
- Cada colaborador tiene un pase digital: un único voto activo, modificable hasta el cierre.
- Nadie puede votar por su propia propuesta.
- Los conteos permanecen ocultos hasta la ceremonia.
- ~~Resultado: 70% voto del equipo y 30% jurado externo~~ → **el resultado es el voto del equipo, al 100%. NO HAY JURADO.** Gana la más votada.
- ~~Jurado: la organización y dos directores~~ — retirado.
- ~~Rúbrica del jurado~~ — retirada.
- ~~Empate: mayor evaluación del jurado~~ → sin jurado no queda criterio automático: **un empate a votos se resuelve a mano**, y se deja a la vista en lugar de romperlo con una regla inventada.

## Premio

- Individual: pase doble para Arena CDMX sujeto a disponibilidad, gift card de $1,000 MXN y un día adicional de vacaciones.
- Dupla: cada integrante recibe pase doble para Arena CDMX sujeto a disponibilidad, gift card de $500 MXN y un día adicional de vacaciones.
- El día adicional se usa previa coordinación con el formador.

## Identidad visual

Collage punk/rock original: alto contraste, tramas de semitono, recortes, desregistro cromático, diagonales, cinta y tipografía contundente. No usa arte, personajes, logotipos ni composiciones de Spider-Man/Spider-Verse.

## Invariantes técnicas

1. Fechas comparadas en instantes absolutos y presentadas en CDMX.
2. Un integrante solo puede ocupar una propuesta; la base lo garantiza, no solo la UI.
3. Un voto activo por sesión/persona; se guarda un HMAC del correo, nunca el correo del votante.
4. El servidor vuelve a comprobar fase, identidad, squad, autoría, MIME, tamaño y permisos.
5. La galería y sus binarios no se sirven antes de la apertura salvo a sus autores o administradores.
6. Resultados y conteos no se exponen antes de la ceremonia.
7. La falta de squad no vuelve elegible una dupla inválida ni se interpreta favorablemente.

## Criterios de aceptación

- Personas muestra y permite cambiar squad; las altas lo solicitan.
- La galería NO expone autoría: los nombres no viajan al navegador, no solo se ocultan en pantalla.
- El directorio usa el catálogo vigente del Org Truth Sheet y conserva `null` cuando la fuente no identifica squad.
- La navegación incluye Concurso para cualquier rol de equipo.
- El Home enseña un anuncio accesible una vez por navegador y enlaza al concurso.
- Recepción, cuenta regresiva, publicación, voto y resultado cambian automáticamente por calendario.
- Las restricciones de participación y voto tienen pruebas de regresión y constraints de base.
- Formularios funcionan con teclado, errores anunciados y foco visible; `prefers-reduced-motion` elimina animación no esencial.
