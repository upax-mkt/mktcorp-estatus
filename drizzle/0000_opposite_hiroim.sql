CREATE TYPE "public"."cadencia" AS ENUM('semanal', 'mensual');--> statement-breakpoint
CREATE TYPE "public"."estado_sesion" AS ENUM('borrador', 'lista', 'presentada', 'minutada');--> statement-breakpoint
CREATE TYPE "public"."estatus_acuerdo" AS ENUM('abierto', 'cumplido', 'vencido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_sesion" AS ENUM('semanal', 'mensual');--> statement-breakpoint
CREATE TABLE "acuerdos" (
	"id" text PRIMARY KEY NOT NULL,
	"sala_slug" text NOT NULL,
	"que" text NOT NULL,
	"responsable" text NOT NULL,
	"squad" text,
	"prioridad" text,
	"fecha_compromiso" timestamp with time zone,
	"estatus" "estatus_acuerdo" DEFAULT 'abierto' NOT NULL,
	"sesion_origen_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"sala_slug" text NOT NULL,
	"competidores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dimensiones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lectura" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"sesion_id" text NOT NULL,
	"orden" integer NOT NULL,
	"tipo" text NOT NULL,
	"contenido_crudo" jsonb NOT NULL,
	"decision_maquetacion" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minutas" (
	"id" text PRIMARY KEY NOT NULL,
	"sesion_id" text NOT NULL,
	"transcripcion" text,
	"texto_final" text,
	"enviada_a" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salas" (
	"slug" text PRIMARY KEY NOT NULL,
	"cadencia" "cadencia" DEFAULT 'mensual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"sala_slug" text NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"tipo" "tipo_sesion" NOT NULL,
	"alcance" text DEFAULT 'todos' NOT NULL,
	"estado" "estado_sesion" DEFAULT 'borrador' NOT NULL,
	"estructura" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acuerdos" ADD CONSTRAINT "acuerdos_sala_slug_salas_slug_fk" FOREIGN KEY ("sala_slug") REFERENCES "public"."salas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD CONSTRAINT "acuerdos_sesion_origen_id_sesiones_id_fk" FOREIGN KEY ("sesion_origen_id") REFERENCES "public"."sesiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_sala_slug_salas_slug_fk" FOREIGN KEY ("sala_slug") REFERENCES "public"."salas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_sala_slug_salas_slug_fk" FOREIGN KEY ("sala_slug") REFERENCES "public"."salas"("slug") ON DELETE no action ON UPDATE no action;