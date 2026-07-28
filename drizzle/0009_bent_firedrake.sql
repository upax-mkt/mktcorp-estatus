CREATE TYPE "public"."tipo_plantilla" AS ENUM('sesion', 'minuta');--> statement-breakpoint
CREATE TABLE "plantillas" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" "tipo_plantilla" NOT NULL,
	"nombre" text NOT NULL,
	"para_que" text DEFAULT '' NOT NULL,
	"sala_slug" text,
	"contenido" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_sala_slug_salas_slug_fk" FOREIGN KEY ("sala_slug") REFERENCES "public"."salas"("slug") ON DELETE no action ON UPDATE no action;