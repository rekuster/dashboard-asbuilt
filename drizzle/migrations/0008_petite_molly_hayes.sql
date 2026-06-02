ALTER TABLE "salas" ADD COLUMN "temForro" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "apontamentos_project_id_idx" ON "apontamentos" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "apontamentos_sala_idx" ON "apontamentos" USING btree ("sala");--> statement-breakpoint
CREATE INDEX "apontamentos_edificacao_idx" ON "apontamentos" USING btree ("edificacao");--> statement-breakpoint
CREATE INDEX "apontamentos_disciplina_idx" ON "apontamentos" USING btree ("disciplina");--> statement-breakpoint
CREATE INDEX "entregas_project_id_idx" ON "entregasAsBuilt" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "entregas_escopo_id_idx" ON "entregasAsBuilt" USING btree ("escopoId");--> statement-breakpoint
CREATE INDEX "entregas_edificacao_idx" ON "entregasAsBuilt" USING btree ("edificacao");--> statement-breakpoint
CREATE INDEX "entregas_disciplina_idx" ON "entregasAsBuilt" USING btree ("disciplina");--> statement-breakpoint
CREATE INDEX "escopo_project_id_idx" ON "escopoAsBuilt" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "escopo_empresa_idx" ON "escopoAsBuilt" USING btree ("empresa");--> statement-breakpoint
CREATE INDEX "escopo_edificacao_idx" ON "escopoAsBuilt" USING btree ("edificacao");--> statement-breakpoint
CREATE INDEX "salas_project_id_idx" ON "salas" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "salas_edificacao_idx" ON "salas" USING btree ("edificacao");--> statement-breakpoint
CREATE INDEX "salas_nome_idx" ON "salas" USING btree ("nome");