CREATE TABLE "personas" (
	"correo" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"rol" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_acceso" timestamp with time zone
);
--> statement-breakpoint
-- El admin inicial: sin esta fila la tabla nace vacía y, en cuanto la tarea 2
-- conecte esto al login, nadie puede entrar — ni Franco. current_setting con
-- missing_ok=true es núcleo de Postgres (no una extensión), así que funciona
-- igual en Neon; si nadie fijó app.admin_inicial en la sesión (el caso normal
-- de `drizzle-kit migrate`), resuelve al correo literal de abajo.
INSERT INTO personas (correo, nombre, rol)
VALUES (lower(trim(coalesce(nullif(current_setting('app.admin_inicial', true), ''), 'franco.cruzat@upax.com.mx'))), 'Franco Cruzat', 'admin')
ON CONFLICT (correo) DO NOTHING;
