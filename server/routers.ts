import { publicProcedure, router } from './_core/trpc';
import {
    getKPIs,
    getAllApontamentos,
    getApontamentosPorSala,
    getApontamentosPorDisciplina,
    getTopDivergencias,
    getApontamentosPorSemana,
    getEdificacoes,
    getKPIsPorEdificacao,
    getSalasPorEdificacao,
    getApontamentosPorEdificacao,
    getValidacaoIntegridade,
    getStatsStatus,
    getTopSalasImpactadas,
    getAllSalas,
    getAllRoomsWithColors,
    getAllIfcFiles,
    getIfcFilesByEdificacao,
    getSalaByNome,
    getApontamentosBySala,
    linkIfcToRoom,
    unlinkIfcFromRoom,
    getEntregas,
    upsertEntrega,
    deleteEntrega,
    getEntregasStats,
    getEntregasHistorico,
    createApontamento,
    updateSalaStatus,
    getSalaById,
    getDb,
    salas,
    apontamentos,
} from './db';
import { eq } from "drizzle-orm";
import { handleExcelUpload } from './uploadHandler';
import { handleIfcUpload, deleteIfcFile } from './ifcHandler';
import { generatePDFReport, generateExcelReport, generateAsBuiltReport } from "./reportGenerator";
import {
    calculateStatusRA,
    assignResponsavel,
    calculateRoomStatus
} from './automationService';
import { z } from 'zod';

export const appRouter = router({
    auth: router({
        me: publicProcedure.query(opts => opts.ctx.user),
    }),

    dashboard: router({
        // KPIs
        getKPIs: publicProcedure.query(async () => {
            return await getKPIs();
        }),

        // Salas
        getSalas: publicProcedure.query(async () => {
            return await getAllSalas();
        }),

        getSalaByNome: publicProcedure
            .input(z.object({ nome: z.string() }))
            .query(async ({ input }) => {
                return await getSalaByNome(input.nome);
            }),

        // Apontamentos
        getApontamentos: publicProcedure.query(async () => {
            return await getAllApontamentos();
        }),

        getApontamentosBySala: publicProcedure
            .input(z.object({ sala: z.string() }))
            .query(async ({ input }) => {
                return await getApontamentosBySala(input.sala);
            }),

        getApontamentosPorSala: publicProcedure.query(async () => {
            return await getApontamentosPorSala();
        }),

        getApontamentosPorDisciplina: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getApontamentosPorDisciplina(input?.edificacao);
            }),

        getTopDivergencias: publicProcedure.query(async () => {
            return await getTopDivergencias();
        }),

        getApontamentosPorSemana: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getApontamentosPorSemana(input?.edificacao);
            }),

        // Edificação
        getEdificacoes: publicProcedure.query(async () => {
            return await getEdificacoes();
        }),

        getKPIsPorEdificacao: publicProcedure
            .input(z.object({ edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getKPIsPorEdificacao(input.edificacao);
            }),

        getSalasPorEdificacao: publicProcedure.query(async () => {
            return await getSalasPorEdificacao();
        }),

        getApontamentosPorEdificacao: publicProcedure.query(async () => {
            return await getApontamentosPorEdificacao();
        }),

        // Data Integrity
        getValidacaoIntegridade: publicProcedure.query(async () => {
            return await getValidacaoIntegridade();
        }),

        // Statistics
        getStatsStatus: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getStatsStatus(input?.edificacao);
            }),

        getTopSalasImpactadas: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getTopSalasImpactadas(input?.edificacao);
            }),

        // Excel Upload
        uploadExcel: publicProcedure
            .input(z.object({
                fileBuffer: z.string(),
                fileName: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const buffer = Buffer.from(input.fileBuffer, 'base64');
                const result = await handleExcelUpload(buffer, input.fileName);
                return result;
            }),

        // Reports
        getPDFReport: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                const buffer = await generatePDFReport({ edificacao: input?.edificacao });
                return buffer.toString('base64');
            }),

        getExcelReport: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                const buffer = await generateExcelReport(input?.edificacao);
                return buffer.toString('base64');
            }),

        getAsBuiltReport: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                const buffer = await generateAsBuiltReport(input?.edificacao);
                return buffer.toString('base64');
            }),

        // Entregas As-Built
        getEntregas: publicProcedure.query(async () => {
            return await getEntregas();
        }),

        upsertEntrega: publicProcedure
            .input(z.object({
                id: z.number().optional(),
                nomeDocumento: z.string(),
                tipoDocumento: z.string(),
                edificacao: z.string(),
                disciplina: z.string(),
                empresaResponsavel: z.string(),
                dataPrevista: z.string().or(z.date()),
                dataRecebimento: z.string().or(z.date()).nullable().optional(),
                status: z.string(),
                descricao: z.string().nullish(),
                comentario: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                return await upsertEntrega(input);
            }),

        getHistoricoEntrega: publicProcedure
            .input(z.object({ id: z.number() }))
            .query(async ({ input }) => {
                return await getEntregasHistorico(input.id);
            }),

        deleteEntrega: publicProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }) => {
                return await deleteEntrega(input.id);
            }),

        getEntregasStats: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getEntregasStats(input?.edificacao);
            }),

        // Field Report Mutations
        createApontamento: publicProcedure
            .input(z.object({
                numeroApontamento: z.number(),
                data: z.date().or(z.string()),
                edificacao: z.string(),
                pavimento: z.string(),
                setor: z.string(),
                sala: z.string(),
                disciplina: z.string(),
                divergencia: z.string().nullable(),
                fotoUrl: z.string().optional(),
                fotoReferenciaUrl: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const data = {
                    ...input,
                    data: typeof input.data === 'string' ? new Date(input.data) : input.data,
                    responsavel: assignResponsavel(input.disciplina),
                    status: 'PENDENTE'
                };
                return await createApontamento(data as any);
                return await createApontamento(data as any);
            }),

        updateApontamento: publicProcedure
            .input(z.object({
                id: z.number(),
                disciplina: z.string().optional(),
                responsavel: z.string().optional(),
                divergencia: z.string().optional(),
                fotoUrl: z.string().optional(),
                fotoReferenciaUrl: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const db = await getDb();
                if (!db) throw new Error("Database not connected");

                return await db.update(apontamentos)
                    .set({
                        ...data,
                        updatedAt: new Date()
                    })
                    .where(eq(apontamentos.id, id))
                    .returning();
            }),

        updateSalaStatus: publicProcedure
            .input(z.object({
                id: z.number(),
                status: z.string().optional(),
                statusRA: z.string().optional(),
                obs: z.string().optional(),
                revisar: z.string().optional(),
                faltouDisciplina: z.string().optional(),
                dataVerificada: z.date().or(z.string()).optional(),
                // Phase 1 fields
                trackerPosicionado: z.number().optional(),
                plantaImpressa: z.number().optional(),
                qrCodePlastificado: z.number().optional(),
                dataVerificacao2: z.date().or(z.string()).optional(),
                obs2: z.string().optional(),
                augin: z.number().optional(),
                imagemPlantaUrl: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, ...data } = input;

                // Parse dates if they are strings
                if (data.dataVerificada && typeof data.dataVerificada === 'string') {
                    data.dataVerificada = new Date(data.dataVerificada) as any;
                }
                if (data.dataVerificacao2 && typeof data.dataVerificacao2 === 'string') {
                    data.dataVerificacao2 = new Date(data.dataVerificacao2) as any;
                }

                const db = await getDb();
                if (!db) throw new Error("Database not connected");

                return await db.transaction(async (tx) => {
                    // 1. Fetch current data within transaction
                    const [existing] = await tx.select().from(salas).where(eq(salas.id, id)).limit(1);
                    if (!existing) throw new Error("Sala not found");

                    // 2. Merge data
                    const updatedData = { ...existing, ...data };

                    // 3. Recalculate statuses
                    const statusRA = calculateStatusRA(updatedData as any);
                    const status = calculateRoomStatus(updatedData as any);

                    // 4. Update with new values + statuses
                    const result = await tx.update(salas)
                        .set({
                            ...data,
                            statusRA,
                            status,
                            updatedAt: new Date()
                        })
                        .where(eq(salas.id, id))
                        .returning();

                    return result[0];
                });
            }),
    }),

    ifc: router({
        // Get all IFC files
        getAllFiles: publicProcedure.query(async () => {
            return await getAllIfcFiles();
        }),

        // Get IFC files by edificação
        getFilesByEdificacao: publicProcedure
            .input(z.object({ edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getIfcFilesByEdificacao(input.edificacao);
            }),

        // Get rooms with colors for IFC visualization
        getRoomsWithColors: publicProcedure.query(async () => {
            return await getAllRoomsWithColors();
        }),

        // Upload IFC file
        uploadFile: publicProcedure
            .input(z.object({
                fileBuffer: z.string(),
                fileName: z.string(),
                edificacao: z.string().nullable(),
            }))
            .mutation(async ({ input }) => {
                const buffer = Buffer.from(input.fileBuffer, 'base64');
                const result = await handleIfcUpload(buffer, input.fileName, input.edificacao);
                return result;
            }),

        // Delete IFC file
        deleteFile: publicProcedure
            .input(z.object({ fileId: z.number() }))
            .mutation(async ({ input }) => {
                const result = await deleteIfcFile(input.fileId);
                return { success: result };
            }),

        // Link IFC element to room record
        linkIfcToRoom: publicProcedure
            .input(z.object({
                salaId: z.number(),
                ifcExpressId: z.number().or(z.string()).nullable()
            }))
            .mutation(async ({ input }) => {
                const result = await linkIfcToRoom(input.salaId, input.ifcExpressId);
                return { success: result };
            }),

        // Unlink specific IFC element from a room
        unlinkIfcFromRoom: publicProcedure
            .input(z.object({
                salaId: z.number(),
                ifcExpressId: z.number().or(z.string())
            }))
            .mutation(async ({ input }) => {
                const result = await unlinkIfcFromRoom(input.salaId, input.ifcExpressId);
                return { success: result };
            }),

    }),
});

export type AppRouter = typeof appRouter;
