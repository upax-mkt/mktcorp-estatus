CREATE TYPE "public"."categoria_archivo" AS ENUM('presentacion', 'interes');--> statement-breakpoint
CREATE TABLE "archivos" (
	"id" text PRIMARY KEY NOT NULL,
	"sala_slug" text NOT NULL,
	"categoria" "categoria_archivo" NOT NULL,
	"titulo" text NOT NULL,
	"fecha" timestamp with time zone,
	"ruta" text NOT NULL,
	"nombre_original" text NOT NULL,
	"tipo_contenido" text,
	"tamano_bytes" integer,
	"subido_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_sala_slug_salas_slug_fk" FOREIGN KEY ("sala_slug") REFERENCES "public"."salas"("slug") ON DELETE no action ON UPDATE no action;