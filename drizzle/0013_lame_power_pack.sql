ALTER TABLE "salas" ADD COLUMN "nombre" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "primario" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "secundario" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "acento" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "superficie_clara" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "superficie_oscura" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "texto_sobre_clara" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "texto_sobre_oscura" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "gradiente" jsonb;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "familia_display" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "familia_texto" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "logo_relacion_de_tinta" real;