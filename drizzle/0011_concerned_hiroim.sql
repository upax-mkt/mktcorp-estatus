CREATE TABLE "enlace_agenda" (
	"token" text PRIMARY KEY NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
