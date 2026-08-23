import { z } from "zod";
import { router, publicProcedure } from "../../common/trpc";
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
    getAsBuiltModelsSummary: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                empresa: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getAsBuiltModelsSummary(input.projectId, input.empresa);
        }),

    getConstatacoes: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                empresa: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getConstatacoes(input.projectId, input.empresa);
        }),

    saveConstatacoes: publicProcedure
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

    getKPIs: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getKPIs(input.projectId);
        }),

    getKPIsPorEdificacao: publicProcedure
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

    getTendenciaVerificacao: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getTendenciaVerificacao(input.projectId);
        }),

    getTendenciaVerificacaoPorEdificacao: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getTendenciaVerificacaoPorEdificacao(input.projectId, input.edificacao);
        }),

    getStatsStatus: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getStatsStatus(input.projectId, input.edificacao);
        }),

    getTopSalasImpactadas: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getTopSalasImpactadas(input.projectId, input.edificacao);
        }),

    getApontamentosPorSala: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getApontamentosPorSala(input.projectId);
        }),

    getApontamentosPorDisciplina: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getApontamentosPorDisciplina(input.projectId, input.edificacao);
        }),

    getApontamentosPorSemana: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getApontamentosPorSemana(input.projectId, input.edificacao);
        }),

    getStatsPorDisciplina: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getStatsPorDisciplina(input.projectId, input.edificacao);
        }),

    getValidacaoIntegridade: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getValidacaoIntegridade(input.projectId);
        }),
});
