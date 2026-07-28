ALTER TYPE "public"."categoria_archivo" ADD VALUE 'imagen';--> statement-breakpoint
ALTER TABLE "archivos" ALTER COLUMN "sala_slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN "sesion_id" text;--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE no action ON UPDATE no action;