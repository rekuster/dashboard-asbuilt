CREATE TABLE "relatoriosDivergencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid,
	"titulo" text NOT NULL,
	"periodoInicio" timestamp,
	"periodoFim" timestamp,
	"disciplina" text,
	"quantidadeItens" integer DEFAULT 0,
	"geradoPor" text DEFAULT 'Sistema',
	"arquivoUrl" text,
	"status" text DEFAULT 'ENVIADO' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "dataEnvio" timestamp;--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "enviado" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "acaoRvt" text;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "statusTha" text;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "dataAtualizacaoTha" timestamp;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "obsTha" text;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "modeloBaseTha" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "baselineTargetDate" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "baselineRoomsPerWeek" numeric;--> statement-breakpoint
ALTER TABLE "relatoriosDivergencia" ADD CONSTRAINT "relatoriosDivergencia_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;