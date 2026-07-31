CREATE TABLE "enlace_agenda" (
	"id" integer PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
