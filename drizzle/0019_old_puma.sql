CREATE TYPE "public"."estado_documento" AS ENUM('borrador', 'listo');--> statement-breakpoint
CREATE TYPE "public"."estado_reunion" AS ENUM('agendada', 'dada');--> statement-breakpoint
CREATE TYPE "public"."tipo_reunion" AS ENUM('semanal', 'quincenal', 'mensual');--> statement-breakpoint
ALTER TYPE "public"."cadencia" ADD VALUE 'quincenal' BEFORE 'mensual';--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"reunion_id" text NOT NULL,
	"estado" "estado_documento" DEFAULT 'borrador' NOT NULL,
	"estructura" jsonb,
	"plantilla" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_reunion_id_unique" UNIQUE("reunion_id")
);
--> statement-breakpoint
CREATE TABLE "reuniones" (
	"id" text PRIMARY KEY NOT NULL,
	"sala_slug" text NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"titulo" text NOT NULL,
	"tipo" "tipo_reunion" NOT NULL,
	"estado" "estado_reunion" DEFAULT 'agendada' NOT NULL,
	"no_dada_en" timestamp with time zone,
	"lugar" text,
	"alcance" text DEFAULT 'todos' NOT NULL,
	"participantes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_reunion_id_reuniones_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reuniones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_sala_slug_salas_slug_fk" FOREIGN KEY ("sala_slug") REFERENCES "public"."salas"("slug") ON DELETE no action ON UPDATE no action;