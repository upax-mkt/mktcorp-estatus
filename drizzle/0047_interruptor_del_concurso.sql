CREATE TABLE "ajustes_concurso" (
	"concurso_id" text PRIMARY KEY NOT NULL,
	"fase_forzada" text,
	"cambiada_por" text,
	"cambiada_en" timestamp with time zone DEFAULT now() NOT NULL
);
