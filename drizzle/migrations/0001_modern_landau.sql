CREATE TABLE "escopoAsBuilt" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa" text NOT NULL,
	"disciplina" text NOT NULL,
	"edificacao" text NOT NULL,
	"nomeModelo" text NOT NULL,
	"nomeModeloFinal" text,
	"descricao" text,
	"periodicidadeDias" integer DEFAULT 15,
	"ativo" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "escopoId" integer;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "periodoInicio" timestamp;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "periodoFim" timestamp;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "resultado" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "dataVerificacao" timestamp;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "apontamentosVerificacao" text;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "imagemPlantaUrl" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD CONSTRAINT "entregasAsBuilt_escopoId_escopoAsBuilt_id_fk" FOREIGN KEY ("escopoId") REFERENCES "public"."escopoAsBuilt"("id") ON DELETE set null ON UPDATE no action;