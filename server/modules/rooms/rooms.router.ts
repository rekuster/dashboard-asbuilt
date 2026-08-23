import { z } from "zod";
import { router, publicProcedure, viewerProcedure, editorProcedure } from "../../common/trpc";
import {
    getAllSalas,
    getSalas,
    getSalaById,
    getEdificacoes,
    getPavimentos,
    getSalasByEdificacao,
    getSalasByEdificacaoAndPavimento,
    updateSala,
    updateSalaStatus,
    deleteSala,
    saveMasterList,
    renumberSalasInEdificacao,
    getVerificacoes,
    getAllVerificacoes,
    upsertVerificacao,
} from "./rooms.service";

export const roomsRouter = router({
    getAllSalas: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getAllSalas(input.projectId);
        }),

    getSalas: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                limit: z.number().optional(),
                offset: z.number().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getSalas(input.projectId, input.limit, input.offset);
        }),

    getSala: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return await getSalaById(input.id);
        }),

    getEdificacoes: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getEdificacoes(input.projectId);
        }),

    getPavimentos: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getPavimentos(input.projectId, input.edificacao);
        }),

    getSalasByEdificacao: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getSalasByEdificacao(input.projectId, input.edificacao);
        }),

    getSalasByEdificacaoAndPavimento: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
                pavimento: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getSalasByEdificacaoAndPavimento(
                input.projectId,
                input.edificacao,
                input.pavimento
            );
        }),

    updateSala: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                id: z.number(),
                nome: z.string().optional(),
                numeroSala: z.string().optional(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                setor: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            return await updateSala(id, data);
        }),

    updateSalaStatus: publicProcedure
        .input(
            z.object({
                id: z.number(),
                status: z.string().optional(),
                statusRA: z.string().optional(),
                obs: z.string().optional(),
                revisar: z.string().optional(),
                faltouDisciplina: z.string().optional(),
                dataVerificada: z.date().or(z.string()).nullable().optional(),
                trackerPosicionado: z.number().optional(),
                plantaImpressa: z.number().optional(),
                qrCodePlastificado: z.number().optional(),
                dataVerificacao2: z.date().or(z.string()).nullable().optional(),
                obs2: z.string().optional(),
                augin: z.number().optional(),
                imagemPlantaUrl: z.string().optional(),
                temForro: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            const payload: any = { ...data };
            if (data.dataVerificada && typeof data.dataVerificada === "string") {
                payload.dataVerificada = new Date(data.dataVerificada);
            }
            if (data.dataVerificacao2 && typeof data.dataVerificacao2 === "string") {
                payload.dataVerificacao2 = new Date(data.dataVerificacao2);
            }
            return await updateSalaStatus(id, payload);
        }),

    deleteSala: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                id: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            return await deleteSala(input.id);
        }),

    saveMasterList: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                salas: z.array(
                    z.object({
                        edificacao: z.string(),
                        pavimento: z.string(),
                        setor: z.string(),
                        nome: z.string(),
                        numeroSala: z.string(),
                    })
                ),
            })
        )
        .mutation(async ({ input }) => {
            return await saveMasterList(input.projectId, input.salas);
        }),

    renumberSalasInEdificacao: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
                fromNumber: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            return await renumberSalasInEdificacao(
                input.projectId,
                input.edificacao,
                input.fromNumber
            );
        }),

    getVerificacoes: publicProcedure
        .input(z.object({ salaId: z.number() }))
        .query(async ({ input }) => {
            return await getVerificacoes(input.salaId);
        }),

    getAllVerificacoes: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getAllVerificacoes(input.projectId);
        }),

    upsertVerificacao: publicProcedure
        .input(
            z.object({
                salaId: z.number(),
                disciplina: z.string(),
                status: z.string(),
                observacao: z.string().nullish(),
                printUrl: z.string().nullish(),
            })
        )
        .mutation(async ({ input }) => {
            return await upsertVerificacao(
                input.salaId,
                input.disciplina,
                input.status,
                input.observacao,
                input.printUrl
            );
        }),
});
