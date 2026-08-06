ALTER TABLE "minutas" ALTER COLUMN "reunion_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_reunion_id_unique" UNIQUE("reunion_id");