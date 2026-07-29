CREATE TABLE "personas_monday" (
	"monday_id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"cargado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acuerdos" ADD COLUMN "responsable_monday_id" text;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD COLUMN "destacado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD COLUMN "monday_tipo" text;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD COLUMN "monday_url" text;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD COLUMN "monday_sincronizado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD COLUMN "bandeja" text DEFAULT 'no_aplica' NOT NULL;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "activa" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "pausada_desde" timestamp with time zone;