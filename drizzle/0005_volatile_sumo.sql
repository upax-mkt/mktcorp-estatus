ALTER TABLE "sesiones" ALTER COLUMN "sala_slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "plantilla" text DEFAULT 'estatus-udn' NOT NULL;