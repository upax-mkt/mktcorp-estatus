ALTER TABLE "sesiones" ADD COLUMN "participantes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sesiones" ADD COLUMN "lugar" text;