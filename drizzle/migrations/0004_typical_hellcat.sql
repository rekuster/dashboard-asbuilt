CREATE TABLE "verificacaoModelo" (
	"id" serial PRIMARY KEY NOT NULL,
	"salaId" integer NOT NULL,
	"disciplina" text NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"observacao" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "identificadorEntrega" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "formato" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "isModelo" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "modeloBaseReferencia" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "acoesNecessarias" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "checkpointBep" text;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "avancoFisico" text;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "temRvtOriginal" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "pendenciaRvt" text;--> statement-breakpoint
ALTER TABLE "verificacaoModelo" ADD CONSTRAINT "verificacaoModelo_salaId_salas_id_fk" FOREIGN KEY ("salaId") REFERENCES "public"."salas"("id") ON DELETE cascade ON UPDATE no action;