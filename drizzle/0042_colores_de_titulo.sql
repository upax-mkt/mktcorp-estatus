-- EL COLOR DEL TEXTO Y DE LOS ICONOS DE TÍTULO, EDITABLES (20-ago-2026).
--
-- Franco: "no puedo editar el color del texto, ni el color de los iconos que
-- acompañan los títulos". Los dos salían de un cálculo de contraste sin sitio
-- donde tocarlos: con el magenta de Mexa, el título de un módulo plegado sale
-- casi NEGRO sobre su propia franja de marca.
--
-- Las dos NULLABLES a propósito: nulo significa "derívalo como siempre", así
-- que ninguna sala cambia de aspecto al aplicar esto. Solo manda lo que
-- alguien escriba en los ajustes de su sala.
--
-- ⚠️ VA ANTES QUE EL DESMONTAJE DE MONDAY (0043) Y NO AL REVÉS, aunque se
-- escribió después. Añadir columnas no le hace nada al código que ya está en
-- producción; el DROP de 0043 sí lo tumbaría, porque ese código todavía las
-- consulta. Así esta se puede aplicar HOY y la otra espera al despliegue.

ALTER TABLE "salas" ADD COLUMN "icono_titulo" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "texto_sobre_gradiente" text;
