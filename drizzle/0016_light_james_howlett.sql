CREATE TABLE "participacion" (
	"sesion_id" text NOT NULL,
	"correo" text NOT NULL,
	"primera_edicion" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_edicion" timestamp with time zone DEFAULT now() NOT NULL,
	"ediciones" integer DEFAULT 0 NOT NULL,
	"presento" boolean DEFAULT false NOT NULL,
	CONSTRAINT "participacion_sesion_id_correo_pk" PRIMARY KEY("sesion_id","correo")
);
--> statement-breakpoint
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE no action ON UPDATE no action;