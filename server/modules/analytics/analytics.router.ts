import { z } from "zod";
import { router, viewerProcedure, editorProcedure } from "../../common/trpc";
import {
    getKPIs,
    getKPIsPorEdificacao,
    getTendenciaVerificacao,
    getTendenciaVerificacaoPorEdificacao,
    getStatsStatus,
    getTopSalasImpactadas,
    getApontamentosPorSala,
    getApontamentosPorDisciplina,
    getApontamentosPorSemana,
    getStatsPorDisciplina,
    getValidacaoIntegridade,
    getAsBuiltModelsSummary,
    getConstatacoes,
    saveConstatacoes,
} from "./analytics.service";

export const analyticsRouter = router({
    getAsBuiltModelsSummary: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                empresa: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getAsBuiltModelsSummary(input.projectId, input.empresa);
        }),

    getConstatacoes: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                empresa: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getConstatacoes(input.projectId, input.empresa);
        }),

    saveConstatacoes: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                empresa: z.string(),
                items: z.array(
                    z.object({
                        id: z.number().optional(),
                        edificacao: z.string(),
                        texto: z.string(),
                        destaque: z.number().optional(),
                        ordem: z.number().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ input }) => {
            return await saveConstatacoes(input);
        }),

    getKPIs: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getKPIs(input.projectId);
        }),

    getKPIsPorEdificacao: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
            })
        )
        .query(async ({ input }) => {
            const kpis = await getKPIsPorEdificacao(input.projectId, input.edificacao);
            return kpis ? { ...kpis, edificacao: input.edificacao } : null;
        }),

    getTendenciaVerificacao: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getTendenciaVerificacao(input.projectId);
        }),

    getTendenciaVerificacaoPorEdificacao: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getTendenciaVerificacaoPorEdificacao(input.projectId, input.edificacao);
        }),

    getStatsStatus: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getStatsStatus(input.projectId, input.edificacao);
        }),

    getTopSalasImpactadas: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getTopSalasImpactadas(input.projectId, input.edificacao);
        }),

    getApontamentosPorSala: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getApontamentosPorSala(input.projectId);
        }),

    getApontamentosPorDisciplina: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getApontamentosPorDisciplina(input.projectId, input.edificacao);
        }),

    getApontamentosPorSemana: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getApontamentosPorSemana(input.projectId, input.edificacao);
        }),

    getStatsPorDisciplina: viewerProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getStatsPorDisciplina(input.projectId, input.edificacao);
        }),

    getValidacaoIntegridade: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getValidacaoIntegridade(input.projectId);
        }),
});
