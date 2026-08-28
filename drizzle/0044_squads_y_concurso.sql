CREATE TABLE "calificaciones_jurado_concurso" (
	"propuesta_id" text NOT NULL,
	"posicion_jurado" integer NOT NULL,
	"creatividad" integer NOT NULL,
	"cultura" integer NOT NULL,
	"viabilidad" integer NOT NULL,
	"atractivo" integer NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calificaciones_jurado_concurso_propuesta_id_posicion_jurado_pk" PRIMARY KEY("propuesta_id","posicion_jurado")
);
--> statement-breakpoint
CREATE TABLE "imagenes_propuesta_concurso" (
	"id" text PRIMARY KEY NOT NULL,
	"propuesta_id" text NOT NULL,
	"ruta" text NOT NULL,
	"nombre_original" text NOT NULL,
	"tipo_contenido" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"orden" integer NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrantes_propuesta_concurso" (
	"concurso_id" text NOT NULL,
	"propuesta_id" text NOT NULL,
	"correo" text NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "integrantes_propuesta_concurso_concurso_id_correo_pk" PRIMARY KEY("concurso_id","correo")
);
--> statement-breakpoint
CREATE TABLE "jurados_concurso" (
	"concurso_id" text NOT NULL,
	"posicion" integer NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "jurados_concurso_concurso_id_posicion_pk" PRIMARY KEY("concurso_id","posicion")
);
--> statement-breakpoint
CREATE TABLE "propuestas_concurso" (
	"id" text PRIMARY KEY NOT NULL,
	"concurso_id" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"oculta" boolean DEFAULT false NOT NULL,
	"motivo_oculta" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votos_concurso" (
	"concurso_id" text NOT NULL,
	"votante_hash" text NOT NULL,
	"propuesta_id" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votos_concurso_concurso_id_votante_hash_pk" PRIMARY KEY("concurso_id","votante_hash")
);
--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "squad" text;--> statement-breakpoint
ALTER TABLE "calificaciones_jurado_concurso" ADD CONSTRAINT "calificaciones_jurado_concurso_propuesta_id_propuestas_concurso_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas_concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagenes_propuesta_concurso" ADD CONSTRAINT "imagenes_propuesta_concurso_propuesta_id_propuestas_concurso_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas_concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrantes_propuesta_concurso" ADD CONSTRAINT "integrantes_propuesta_concurso_propuesta_id_propuestas_concurso_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas_concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrantes_propuesta_concurso" ADD CONSTRAINT "integrantes_propuesta_concurso_correo_personas_correo_fk" FOREIGN KEY ("correo") REFERENCES "public"."personas"("correo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votos_concurso" ADD CONSTRAINT "votos_concurso_propuesta_id_propuestas_concurso_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas_concurso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "imagenes_propuesta_ruta_unica" ON "imagenes_propuesta_concurso" USING btree ("ruta");--> statement-breakpoint
CREATE UNIQUE INDEX "imagenes_propuesta_orden_unico" ON "imagenes_propuesta_concurso" USING btree ("propuesta_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "integrantes_propuesta_orden_unico" ON "integrantes_propuesta_concurso" USING btree ("propuesta_id","orden");--> statement-breakpoint
ALTER TABLE "integrantes_propuesta_concurso" ADD CONSTRAINT "integrantes_orden_valido" CHECK ("orden" IN (1, 2));--> statement-breakpoint
ALTER TABLE "imagenes_propuesta_concurso" ADD CONSTRAINT "imagenes_orden_valido" CHECK ("orden" BETWEEN 1 AND 3);--> statement-breakpoint
ALTER TABLE "imagenes_propuesta_concurso" ADD CONSTRAINT "imagenes_tamano_valido" CHECK ("tamano_bytes" BETWEEN 1 AND 26214400);--> statement-breakpoint
ALTER TABLE "jurados_concurso" ADD CONSTRAINT "jurado_posicion_valida" CHECK ("posicion" BETWEEN 1 AND 3);--> statement-breakpoint
ALTER TABLE "calificaciones_jurado_concurso" ADD CONSTRAINT "calificacion_posicion_valida" CHECK ("posicion_jurado" BETWEEN 1 AND 3);--> statement-breakpoint
ALTER TABLE "calificaciones_jurado_concurso" ADD CONSTRAINT "calificaciones_rango_valido" CHECK (
  "creatividad" BETWEEN 0 AND 10 AND
  "cultura" BETWEEN 0 AND 10 AND
  "viabilidad" BETWEEN 0 AND 10 AND
  "atractivo" BETWEEN 0 AND 10
);--> statement-breakpoint

-- Backfill contra EQUIPO DETALLE del Org Truth Sheet (actualizado 20-ago-2026),
-- cruzado con los correos que Slack realmente devolvió en este directorio.
UPDATE "personas" SET "squad" = 'Squad Paid y RRSS'
WHERE "correo" IN ('fernando.borges@elektra.com.mx', 'andry.carvajal@elektra.com.mx', '1066419@onuriscp.com');--> statement-breakpoint
UPDATE "personas" SET "squad" = 'Squad Web y Contenidos'
WHERE "correo" IN ('1086996@onuriscp.com', '1162032@onuriscp.com', 'diana.cruz@upax.com.mx', 'santiago.arango@elektra.com.mx');--> statement-breakpoint
UPDATE "personas" SET "squad" = 'RevOps & Analytics'
WHERE "correo" IN ('1159043@onuriscp.com', 'diego.lunal@elektra.com.mx', 'adrian.gonzalezo@elektra.com.mx');--> statement-breakpoint
UPDATE "personas" SET "squad" = 'Portafolio y Ecosistema'
WHERE "correo" IN ('1033543@onuriscp.com', 'carolina.rojass@elektra.com.mx', 'sergio.franco@upax.com.mx', 'francisco.escamilla@upax.com.mx');--> statement-breakpoint
UPDATE "personas" SET "squad" = 'Outbound y Pipeline'
WHERE "correo" IN ('1115712@onuriscp.com', 'edna.gonzalez@upax.com.mx', 'amanda.ruiz@elektra.com.mx', 'antonio.vargas@upax.com.mx', 'aliosha.albor@upax.com.mx', 'elizabeth.gomez@elektra.com.mx', 'jennifer.silva@upax.com.mx');--> statement-breakpoint
UPDATE "personas" SET "squad" = 'Sin squad'
WHERE "correo" = 'angel.toledano@elektra.com.mx';

-- Franco (jurado), Efraín (baja en la fuente) y cualquier alta no reconocida
-- permanecen NULL: ausencia de dato nunca se convierte en elegibilidad.
