ALTER TABLE "apontamentos" ALTER COLUMN "status" SET DEFAULT 'ATIVA';--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "prioridade" text DEFAULT 'NORMAL';--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "tipo" text DEFAULT 'DIVERGÊNCIA';--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "comentario" text;--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "dataResolvido" timestamp;--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "asBuiltNota" text;--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "asBuiltPrintUrl" text;--> statement-breakpoint
ALTER TABLE "verificacaoModelo" ADD COLUMN "printUrl" text;