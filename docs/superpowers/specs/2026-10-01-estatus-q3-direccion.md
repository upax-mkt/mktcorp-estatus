# Estatus Q3 — dirección y aceptación

## Encargo autorizado
Mejorar la presentación existente en `/estatus` para la sesión de Cecilia del 2 de octubre de 2026. El usuario autorizó narrativa, diseño, gráficos, materiales, iconos y representación de datos. Google Slides del equipo es la fuente oficial; no se crea otro deck. Grok participa como revisor creativo; Codex contrasta e implementa.

## Dirección
Tres actos: resultado comercial Q3 → aporte de canales y capacidades → ejecución Q4. Apertura con lectura ejecutiva y cierre que conecta resultados con acciones. Alternar composiciones editoriales: cifra y desglose, comparativo, cinco cortes del funnel, pieza visual, calendario. Púrpura profundo, papel cálido, tinta oscura y acentos coral/lila. Logos y fotografías reales.

## Invariantes
- Conservar todas las áreas y las siete UDN, incluidos RRSS, Paid y web en el cuerpo.
- Facturado $5.94 M y cumplimiento **reportado** 9.4%; no sustituir por un Forecast externo. No inventar denominador monetario ausente en la fuente.
- Ganados y pipeline distinguen su estado; los canales no se suman entre sí ni al CRM.
- Funnel muestra los cinco cortes sin convertirlos en cohortes supuestas.
- UiX permanece en Paid aunque sus MQL/CPL/SQL estén vacíos. Vacío ≠ cero.
- Kaitai usa 64 confirmados del encabezado oficial, con los 25 logos de la selección; no vuelve a sumar el brief interno de 65.
- Párrafo IA literal; matriz de materiales mantiene los seis estados. Conteos salen de la matriz: 16 listos, 9 modificación, 12 aprobación, 10 elaboración, 1 no aplica, 1 sin estado.
- Q4 es plan; renders de ONE son concepto, no evento realizado. No inventar resultados ni estatus de entrega.

## Implementación y gates
1. Componentes pequeños de gráficos con selector y visor de materiales. Pruebas previas de selección, nulos y teclado.
2. Nueva composición y orden en EstatusQ3, estilos aislados y datos oficiales. Mantener autenticación y otras secciones.
3. Verificar fuente, assets, siete UDN, estados, lectura sin animación, navegación en navegador, escritorio/móvil, impresión y reduced motion.
4. Tests relevantes, TypeScript (incluye tests), ESLint, build; revisión de código y router `--phase complete`.

Estado: en implementación. Vista real pendiente antes del cierre.

## Límites de las skills
Las skills React/Next/TS, accesibilidad, pruebas, implementación incremental y revisión gobiernan los cambios. La verificación de navegador usa CUA. No hay backend nuevo, migración, proveedor nuevo, Canvas, GSAP ni formulario nuevo. No se activa una auditoría integral de sistemas ajenos a esta presentación. Las preferencias de estilos y retornos de skills comunitarias no sustituyen el contrato del dato: `null` se preserva.

## Grok: criterio adoptado
Se adopta la separación de tiempos, las cinco composiciones y el peso de las piezas visuales. Se descartan sus inferencias no respaldadas: facturado no equivale a caja; Inner Circle no se declara operando; las diferencias por redondeo no son de un centavo. Los conteos de materiales se verifican contra la matriz, no contra el resumen del prompt.
