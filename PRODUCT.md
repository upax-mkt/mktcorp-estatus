# mktcorp-estatus

**register:** product

## Qué es

La aplicación interna donde Marketing Corporativo de Grupo UPAX vive el ciclo de estatus con sus 10 salas (8 unidades de negocio + Ceci, la CEO + el corporativo Grupo UPAX): preparar → presentar → minutar → archivar. Reemplaza el desorden de Slides, correos y minutas dispersas.

## Usuarios

Dos públicos, muy distintos:

- **El equipo de Mkt Corp** (~24 personas, 6 squads): la vista interna. Preparan sesiones, maquetan, minutan, siguen acuerdos. Trabajan en laptop, de día, en oficina. Necesitan ver de un vistazo el estado de la relación con cada sala: quién está atendido, quién desatendido, qué acuerdo vence.
- **Los directores y gerentes senior de cada UDN**: la vista de sala. Gente ejecutiva que revisa decenas de reportes y capta la señal en segundos. Entran a SU sala (por un link) a ver su presentación, sus acuerdos con estatus, su histórico, su benchmark competitivo. No ven la maquinaria interna.

## Tono

Material de comité ejecutivo. Serio, con autoridad, premium. No un dashboard de startup ni un panel de datos genérico. Cada pantalla comunica una lectura, no un volcado de datos. La app se siente como una extensión de una organización que "enciende evolución" (voz de marca UPAX), no como una herramienta improvisada.

## Marca

Grupo UPAX es una casa de marcas (house of brands). La app es de Mkt Corp, pero **cada sala se viste con la identidad de su UDN**: al entrar a Mexa Creativa se siente Mexa (magenta), a NeraCode se siente NeraCode (azul violeta → turquesa), a Zeus se siente Zeus (rojo). El hub es territorio neutro de Mkt Corp (hereda de Grupo UPAX: naranja `#E34714` → magenta `#D72A5A` → índigo). Paletas y tipografías de las 10 marcas en `~/.claude/upax-context/brand/brand-matrix.md` y en `src/temas/`.

## Anti-referencias (lo que NO debe parecer)

- **"Diseño de IA"**: degradados morados sobre blanco, tarjetas idénticas con icono+título+texto repetidas, la plantilla hero-métrica (número gigante + label + stats), Inter/Roboto/system fonts genéricas.
- Un dashboard SaaS cualquiera (Linear/Notion/Vercel clonado).
- Un panel de BI (Looker, Tableau) — precisamente lo que la app viene a reemplazar.

## Principios estratégicos

- **La unidad no es el documento, es la relación con cada sala.** El hub muestra el estado de cada relación (días desde la última sesión, acuerdos vivos), no una lista de archivos.
- **La señal se destaca, el ruido se subordina.** Una sala desatendida, un acuerdo vencido, deben saltar a la vista sin que nadie los busque.
- **Cada sala reconoce su casa.** El director entra y ve su marca, no la de Mkt Corp.
