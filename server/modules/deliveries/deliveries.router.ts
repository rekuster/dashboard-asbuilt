import { z } from "zod";
import { router, publicProcedure } from "../../common/trpc";
import {
    getEscopos,
    upsertEscopo,
    deleteEscopo,
    getEntregas,
    getEntregasByEscopo,
    getEntregasHistorico,
    upsertEntrega,
    createBatchEntregas,
    deleteEntrega,
    registrarVerificacao,
    getAsBuiltStatus,
    getEntregasStats,
} from "./deliveries.service";

export const deliveriesRouter = router({
    getEscopoAsBuilt: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getEscopos(input.projectId);
        }),

    getEscopos: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getEscopos(input.projectId);
        }),

    upsertEscopo: publicProcedure
        .input(
            z.object({
                id: z.number().optional(),
                projectId: z.string().optional(),
                empresa: z.string(),
                disciplina: z.string(),
                edificacao: z.string(),
                nomeModelo: z.string(),
                nomeModeloFinal: z.string().optional(),
                descricao: z.string().nullish(),
                temRvtOriginal: z.number().optional(),
                pendenciaRvt: z.string().nullish(),
                acaoRvt: z.string().nullish(),
                ativo: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            return await upsertEscopo(input);
        }),

    deleteEscopo: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return await deleteEscopo(input.id);
        }),

    getEntregasAsBuilt: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getEntregas(input.projectId);
        }),

    getEntregas: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getEntregas(input.projectId);
        }),

    getEntregasByEscopo: publicProcedure
        .input(z.object({ escopoId: z.number() }))
        .query(async ({ input }) => {
            return await getEntregasByEscopo(input.escopoId);
        }),

    getEntregasHistorico: publicProcedure
        .input(
            z.object({
                id: z.number().optional(),
                entregaId: z.number().optional(),
            })
        )
        .query(async ({ input }) => {
            const targetId = input.entregaId ?? input.id!;
            return await getEntregasHistorico(targetId);
        }),

    getHistoricoEntrega: publicProcedure
        .input(
            z.object({
                id: z.number().optional(),
                entregaId: z.number().optional(),
            })
        )
        .query(async ({ input }) => {
            const targetId = input.entregaId ?? input.id!;
            return await getEntregasHistorico(targetId);
        }),

    getEntregasStats: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getEntregasStats(input.projectId, input.edificacao);
        }),

    upsertEntrega: publicProcedure
        .input(
            z.object({
                id: z.number().optional(),
                escopoId: z.number().optional(),
                escopoIds: z.array(z.number()).optional(),
                escopoNames: z.record(z.string(), z.string()).optional(),
                nomeDocumento: z.string(),
                tipoDocumento: z.string(),
                edificacao: z.string(),
                disciplina: z.string(),
                empresaResponsavel: z.string(),
                dataPrevista: z.date().or(z.string()),
                dataRecebimento: z.date().or(z.string()).nullable().optional(),
                periodoInicio: z.date().or(z.string()).nullable().optional(),
                periodoFim: z.date().or(z.string()).nullable().optional(),
                status: z.string().optional(),
                resultado: z.string().nullish(),
                dataVerificacao: z.date().or(z.string()).nullable().optional(),
                apontamentosVerificacao: z.string().nullish(),
                descricao: z.string().nullish(),
                comentario: z.string().optional(),
                identificadorEntrega: z.string().nullish(),
                formato: z.string().nullish(),
                isModelo: z.number().optional(),
                modeloBaseReferencia: z.string().nullish(),
                acoesNecessarias: z.string().nullish(),
                checkpointBep: z.string().nullish(),
                avancoFisico: z.string().nullish(),
            })
        )
        .mutation(async ({ input }) => {
            return await upsertEntrega(input);
        }),

    deleteEntrega: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return await deleteEntrega(input.id);
        }),

    createBatchEntregas: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                identificadorEntrega: z.string(),
                dataRecebimento: z.date().or(z.string()),
                empresaResponsavel: z.string(),
                status: z.string().default("COM_PENDENCIAS"),
                edificacaoPadrao: z.string().optional(),
                disciplinaPadrao: z.string().optional(),
                descricao: z.string().nullish(),
                documentos: z.array(
                    z.object({
                        nomeDocumento: z.string(),
                        formato: z.string().optional(),
                        edificacao: z.string().optional(),
                        disciplina: z.string().optional(),
                        escopoId: z.number().nullable().optional(),
                        modeloBaseReferencia: z.string().nullable().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ input }) => {
            return await createBatchEntregas(input);
        }),

    registrarVerificacao: publicProcedure
        .input(
            z.object({
                id: z.number(),
                resultado: z.string(),
                apontamentosVerificacao: z.string().nullish(),
            })
        )
        .mutation(async ({ input }) => {
            return await registrarVerificacao(input);
        }),

    getAsBuiltStatus: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getAsBuiltStatus(input.projectId, input.edificacao);
        }),
});
