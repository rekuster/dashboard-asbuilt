import { z } from "zod";
import { router, publicProcedure, editorProcedure } from "../../common/trpc";
import {
    getHistoricoRelatorios,
    markApontamentosAsSentByFilters,
    generatePDFReport,
    generateExcelReport,
    generateAsBuiltReport,
    generateVerificationReport,
} from "./reports.service";
import { handleExcelUpload } from "../../uploadHandler";

export const reportsRouter = router({
    getHistoricoRelatorios: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getHistoricoRelatorios(input.projectId);
        }),

    markApontamentosAsSentByFilters: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                apenasNaoEnviados: z.boolean().optional(),
                disciplina: z.string().optional(),
                responsavel: z.string().optional(),
                sala: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            return await markApontamentosAsSentByFilters(input.projectId, input);
        }),

    getPDFReport: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                apenasNaoEnviados: z.boolean().optional(),
                disciplina: z.string().optional(),
                responsavel: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const buffer = await generatePDFReport(input.projectId, {
                edificacao: input.edificacao,
                pavimento: input.pavimento,
                startDate: input.startDate,
                endDate: input.endDate,
                apenasNaoEnviados: input.apenasNaoEnviados,
                disciplina: input.disciplina,
                responsavel: input.responsavel,
            });
            return buffer.toString("base64");
        }),

    getExcelReport: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const buffer = await generateExcelReport(input.projectId, input.edificacao);
            return buffer.toString("base64");
        }),

    getAsBuiltReport: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const buffer = await generateAsBuiltReport(input.projectId, {
                edificacao: input.edificacao,
                pavimento: input.pavimento,
                startDate: input.startDate,
                endDate: input.endDate,
            });
            return buffer.toString("base64");
        }),

    getVerificationReport: publicProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
                disciplina: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const buffer = await generateVerificationReport(input.projectId, {
                edificacao: input.edificacao,
                disciplina: input.disciplina,
            });
            return buffer.toString("base64");
        }),

    uploadExcel: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                fileBuffer: z.string(),
                fileName: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const buffer = Buffer.from(input.fileBuffer, "base64");
            const result = await handleExcelUpload(buffer, input.fileName, input.projectId);
            return result;
        }),
});
