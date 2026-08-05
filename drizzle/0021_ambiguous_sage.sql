ALTER TABLE "acuerdos" ADD COLUMN "reunion_origen_id" text;--> statement-breakpoint
ALTER TABLE "archivos" ADD COLUMN "reunion_id" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "documento_id" text;--> statement-breakpoint
ALTER TABLE "minutas" ADD COLUMN "reunion_id" text;--> statement-breakpoint
ALTER TABLE "participacion" ADD COLUMN "reunion_id" text;--> statement-breakpoint
ALTER TABLE "acuerdos" ADD CONSTRAINT "acuerdos_reunion_origen_id_reuniones_id_fk" FOREIGN KEY ("reunion_origen_id") REFERENCES "public"."reuniones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_reunion_id_reuniones_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reuniones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_reunion_id_reuniones_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reuniones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_reunion_id_reuniones_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reuniones"("id") ON DELETE no action ON UPDATE no action;