import { z } from "zod";
import { router, publicProcedure, editorProcedure } from "../../common/trpc";
import {
    getAllApontamentos,
    getApontamentosBySala,
    createApontamento,
    updateApontamento,
    deleteApontamento,
    updateApontamentoAsBuilt,
    markApontamentosAsSent,
    saveBcfFile,
    getBcfFiles,
    syncBcfIssues,
} from "./issues.service";
import { assignResponsavel } from "../rooms/rooms.automation";
import { getProjectById } from "../projects/projects.service";

export const issuesRouter = router({
    getApontamentos: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getAllApontamentos(input.projectId);
        }),

    getApontamentosBySala: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                sala: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getApontamentosBySala(input.projectId, input.sala);
        }),

    createApontamento: publicProcedure
        .input(
            z.object({
                projectId: z.string().optional(),
                numeroApontamento: z.number().optional(),
                data: z.date().or(z.string()),
                edificacao: z.string().optional().default(""),
                pavimento: z.string().optional().default(""),
                setor: z.string().nullable().optional(),
                sala: z.string(),
                disciplina: z.string(),
                divergencia: z.string().nullable().optional(),
                fotoUrl: z.string().nullable().optional(),
                fotoReferenciaUrl: z.string().nullable().optional(),
                status: z.string().optional(),
                prioridade: z.string().optional(),
                tipo: z.string().optional(),
                comentario: z.string().nullable().optional(),
            })
        )
        .mutation(async ({ input }) => {
            let responsavel = "Não Definido";

            if (input.projectId) {
                const proj = await getProjectById(input.projectId);
                if (proj?.disciplinesConfig) {
                    try {
                        const customConfigs = JSON.parse(proj.disciplinesConfig);
                        const match = customConfigs.find(
                            (c: any) =>
                                c.disciplina.toUpperCase() === input.disciplina.toUpperCase()
                        );
                        if (match) {
                            responsavel = match.responsavel;
                        } else {
                            responsavel = assignResponsavel(input.disciplina);
                        }
                    } catch (e) {
                        responsavel = assignResponsavel(input.disciplina);
                    }
                } else {
                    responsavel = assignResponsavel(input.disciplina);
                }
            } else {
                responsavel = assignResponsavel(input.disciplina);
            }

            const data = {
                ...input,
                setor: input.setor || "-",
                fotoUrl: input.fotoUrl || null,
                fotoReferenciaUrl: input.fotoReferenciaUrl || null,
                data: typeof input.data === "string" ? new Date(input.data) : input.data,
                responsavel,
                status: input.status || "ATIVA",
            };
            return await createApontamento(data as any);
        }),

    updateApontamento: publicProcedure
        .input(
            z.object({
                id: z.number(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                setor: z.string().optional(),
                sala: z.string().optional(),
                disciplina: z.string().optional(),
                responsavel: z.string().optional(),
                divergencia: z.string().optional(),
                fotoUrl: z.string().optional(),
                fotoReferenciaUrl: z.string().optional(),
                status: z.string().optional(),
                prioridade: z.string().optional(),
                tipo: z.string().optional(),
                comentario: z.string().optional(),
                bcfIssueId: z.string().optional(),
                asBuiltNota: z.string().nullish(),
                asBuiltTexto: z.string().nullish(),
                asBuiltPrintUrl: z.string().nullish(),
                dataResolvido: z.string().or(z.date()).nullable().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            return await updateApontamento(id, data as any);
        }),

    deleteApontamento: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const success = await deleteApontamento(input.id);
            return { success };
        }),

    updateApontamentoAsBuilt: publicProcedure
        .input(
            z.object({
                id: z.number(),
                asBuiltNota: z.string().nullish(),
                asBuiltPrintUrl: z.string().nullish(),
                bcfIssueId: z.string().nullish(),
                status: z.string().nullish(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, asBuiltNota, asBuiltPrintUrl, bcfIssueId, status } = input;
            return await updateApontamentoAsBuilt(
                id,
                asBuiltNota || null,
                asBuiltPrintUrl || null,
                bcfIssueId || null,
                status || undefined
            );
        }),

    markApontamentosAsSent: publicProcedure
        .input(
            z.object({
                ids: z.array(z.number()),
            })
        )
        .mutation(async ({ input }) => {
            return await markApontamentosAsSent(input.ids);
        }),

    getBcfFiles: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                disciplina: z.string().optional(),
                edificacao: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await getBcfFiles(input.projectId, input.disciplina, input.edificacao);
        }),

    uploadBcfFile: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                disciplina: z.string(),
                edificacao: z.string(),
                fileName: z.string(),
                fileUrl: z.string(),
                fileSize: z.number(),
                uploadedBy: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            return await saveBcfFile(input);
        }),

    syncBcfData: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                disciplina: z.string(),
                edificacao: z.string(),
                isPartnerReturn: z.boolean().default(false),
                topics: z.array(
                    z.object({
                        index: z.union([z.number(), z.string()]),
                        title: z.string(),
                        description: z.string().optional(),
                        topicStatus: z.string().optional(),
                        author: z.string().optional(),
                        creationDate: z.string().optional(),
                        snapshotUrl: z.string().optional(),
                        comments: z
                            .array(
                                z.object({
                                    author: z.string().optional(),
                                    date: z.string().optional(),
                                    text: z.string().optional(),
                                    status: z.string().optional(),
                                })
                            )
                            .optional(),
                    })
                ),
            })
        )
        .mutation(async ({ input }) => {
            const { projectId, disciplina, edificacao, isPartnerReturn, topics } = input;
            return await syncBcfIssues(projectId, disciplina, edificacao, isPartnerReturn, topics);
        }),
});
