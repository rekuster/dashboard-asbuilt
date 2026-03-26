/*
 * ESTE ARQUIVO É O "CARTEIRO" (ROTAS DA API).
 * Ele organiza como as informações viajam entre o banco de dados e a tela que você vê.
 * Se você pedir para ver o status dos modelos, este arquivo "pergunta" ao banco de dados e "entrega" a resposta para a tela.
 */

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
    getTendenciaVerificacao,
    getTendenciaVerificacaoPorEdificacao,
    getSalaByNome,
    getApontamentosBySala,
    linkIfcToRoom,
    unlinkIfcFromRoom,
    getEntregas,
    upsertEntrega,
    deleteEntrega,
    getEntregasStats,
    getEntregasHistorico,
    getAsBuiltStatus,
    getEscopos,
    upsertEscopo,
    deleteEscopo,
    getEntregasByEscopo,
    registrarVerificacao,
    createApontamento,
    updateSalaStatus,
    getSalaById,
    getDb,
    salas,
    apontamentos,
    listProjects,
    createProject,
    getProjectById,
    updateProject,
    updateProjectBaseline,
    saveMasterList,
    getSalasByProjectId,
    updateSala,
    deleteSala,
    renumberSalasInEdificacao,
    getVerificacoes,
    upsertVerificacao,
    getAllVerificacoes,
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

    // =========================================================================
    // PROJECTS ROUTER
    // =========================================================================
    projects: router({
        list: publicProcedure
            .query(async ({ ctx }) => {
                // For now, use a dummy ownerId until auth middleware passes the real user
                const userId = (ctx as any).userId || 'anonymous';
                return await listProjects(userId);
            }),

        create: publicProcedure
            .input(z.object({
                code: z.string().min(1),
                name: z.string().min(1),
                client: z.string().optional(),
                description: z.string().optional(),
                location: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }) => {
                const userId = (ctx as any).userId || 'anonymous';
                return await createProject({
                    code: input.code,
                    name: input.name,
                    client: input.client || null,
                    description: input.description || null,
                    location: input.location || null,
                    startDate: input.startDate ? new Date(input.startDate) : null,
                    endDate: input.endDate ? new Date(input.endDate) : null,
                    ownerId: userId,
                    status: 'ativo',
                } as any);
            }),

        getById: publicProcedure
            .input(z.object({ id: z.string() }))
            .query(async ({ input }) => {
                return await getProjectById(input.id);
            }),

        update: publicProcedure
            .input(z.object({
                id: z.string(),
                code: z.string().optional(),
                name: z.string().optional(),
                client: z.string().optional(),
                description: z.string().optional(),
                location: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                status: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const updateData: any = { ...data };
                if (data.startDate) updateData.startDate = new Date(data.startDate);
                if (data.endDate) updateData.endDate = new Date(data.endDate);
                return await updateProject(id, updateData);
            }),

        updateBaseline: publicProcedure
            .input(z.object({
                id: z.string(),
                baselineTargetDate: z.string().nullable(),
                baselineRoomsPerWeek: z.number().nullable(),
            }))
            .mutation(async ({ input }) => {
                const targetDate = input.baselineTargetDate ? new Date(input.baselineTargetDate) : null;
                return await updateProjectBaseline(input.id, targetDate, input.baselineRoomsPerWeek);
            }),

        saveMasterList: publicProcedure
            .input(z.object({
                projectId: z.string(),
                salas: z.array(z.object({
                    edificacao: z.string(),
                    pavimento: z.string(),
                    setor: z.string(),
                    nome: z.string(),
                    numeroSala: z.string(),
                })),
            }))
            .mutation(async ({ input }) => {
                return await saveMasterList(input.projectId, input.salas);
            }),

        getSalasByProject: publicProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getSalasByProjectId(input.projectId);
            }),

        updateSalaInProject: publicProcedure
            .input(z.object({
                id: z.number(),
                nome: z.string().optional(),
                numeroSala: z.string().optional(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                setor: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, ...data } = input;
                return await updateSala(id, data);
            }),

        deleteSalaFromProject: publicProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }) => {
                return await deleteSala(input.id);
            }),

        insertSalaWithRenumber: publicProcedure
            .input(z.object({
                projectId: z.string(),
                edificacao: z.string(),
                pavimento: z.string(),
                setor: z.string(),
                nome: z.string(),
                numeroSala: z.string(),
            }))
            .mutation(async ({ input }) => {
                const targetNum = parseInt(input.numeroSala, 10);
                // 1. Renumber: shift all rooms in this edificação with numero >= targetNum
                const shifted = await renumberSalasInEdificacao(
                    input.projectId,
                    input.edificacao,
                    targetNum
                );
                // 2. Insert the new room at the target number
                const result = await saveMasterList(input.projectId, [{
                    edificacao: input.edificacao,
                    pavimento: input.pavimento,
                    setor: input.setor,
                    nome: input.nome,
                    numeroSala: input.numeroSala,
                }]);
                return { shifted, created: result.created };
            }),
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

        getAllSalas: publicProcedure.query(async () => {
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

        deleteApontamento: publicProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }) => {
                const { deleteApontamento } = await import('./db');
                return await deleteApontamento(input.id);
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
            
        getTendenciaVerificacao: publicProcedure.query(async () => {
            return await getTendenciaVerificacao();
        }),

        getTendenciaVerificacaoPorEdificacao: publicProcedure
            .input(z.object({ edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getTendenciaVerificacaoPorEdificacao(input.edificacao);
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
            .input(z.object({ 
                edificacao: z.string().optional(),
                pavimento: z.string().optional()
            }).optional())
            .query(async ({ input }) => {
                const buffer = await generatePDFReport({ 
                    edificacao: input?.edificacao,
                    pavimento: input?.pavimento
                });
                return buffer.toString('base64');
            }),

        getExcelReport: publicProcedure
            .input(z.object({ 
                edificacao: z.string().optional(),
                pavimento: z.string().optional()
            }).optional())
            .query(async ({ input }) => {
                const buffer = await generateExcelReport(input?.edificacao); // Note: generateExcelReport might need update too if user wants pavimento there
                return buffer.toString('base64');
            }),

        getAsBuiltReport: publicProcedure
            .input(z.object({ 
                edificacao: z.string().optional(),
                pavimento: z.string().optional()
            }).optional())
            .query(async ({ input }) => {
                const buffer = await generateAsBuiltReport({ 
                    edificacao: input?.edificacao,
                    pavimento: input?.pavimento
                });
                return buffer.toString('base64');
            }),

        getPavimentos: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                const { getDistinctPavimentos } = await import('./db');
                return await getDistinctPavimentos(input?.edificacao);
            }),

        // Entregas As-Built
        getEntregas: publicProcedure.query(async () => {
            return await getEntregas();
        }),

        upsertEntrega: publicProcedure
            .input(z.object({
                id: z.number().optional(),
                escopoId: z.number().nullable().optional(),
                escopoIds: z.array(z.number()).optional(), // For batch registration
                nomeDocumento: z.string(),
                tipoDocumento: z.string(),
                edificacao: z.string(),
                disciplina: z.string(),
                empresaResponsavel: z.string(),
                dataPrevista: z.string().or(z.date()),
                dataRecebimento: z.string().or(z.date()).nullable().optional(),
                periodoInicio: z.string().or(z.date()).nullable().optional(),
                periodoFim: z.string().or(z.date()).nullable().optional(),
                status: z.string(),
                resultado: z.string().nullable().optional(),
                dataVerificacao: z.string().or(z.date()).nullable().optional(),
                apontamentosVerificacao: z.string().nullable().optional(),
                descricao: z.string().nullish(),
                comentario: z.string().optional(),
                
                // Novos campos
                numeroEntrega: z.number().optional(),
                identificadorEntrega: z.string().optional(),
                formato: z.string().optional(),
                isModelo: z.number().optional(),
                modeloBaseReferencia: z.string().optional(),
                acoesNecessarias: z.string().optional(),
                checkpointBep: z.string().optional(),
                avancoFisico: z.string().optional(),
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

        getAsBuiltStatus: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getAsBuiltStatus(input.edificacao);
            }),

        // Escopo As-Built (Lista Mestra)
        getEscopos: publicProcedure.query(async () => {
            return await getEscopos();
        }),

        upsertEscopo: publicProcedure
            .input(z.object({
                id: z.number().optional(),
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
            }))
            .mutation(async ({ input }) => {
                return await upsertEscopo(input);
            }),

        deleteEscopo: publicProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }) => {
                return await deleteEscopo(input.id);
            }),

        getEntregasByEscopo: publicProcedure
            .input(z.object({ escopoId: z.number() }))
            .query(async ({ input }) => {
                return await getEntregasByEscopo(input.escopoId);
            }),

        registrarVerificacao: publicProcedure
            .input(z.object({
                id: z.number(),
                resultado: z.string(),
                apontamentosVerificacao: z.string().nullish(),
            }))
            .mutation(async ({ input }) => {
                return await registrarVerificacao(input);
            }),

        // Field Report Mutations
        createApontamento: publicProcedure
            .input(z.object({
                projectId: z.string().optional(),
                numeroApontamento: z.number().optional(),
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
                dataVerificada: z.date().or(z.string()).nullable().optional(),
                // Phase 1 fields
                trackerPosicionado: z.number().optional(),
                plantaImpressa: z.number().optional(),
                qrCodePlastificado: z.number().optional(),
                dataVerificacao2: z.date().or(z.string()).nullable().optional(),
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

        getVerificacoes: publicProcedure
            .input(z.object({ salaId: z.number() }))
            .query(async ({ input }) => {
                return await getVerificacoes(input.salaId);
            }),

        upsertVerificacao: publicProcedure
            .input(z.object({
                salaId: z.number(),
                disciplina: z.string(),
                status: z.string(),
                observacao: z.string().nullish(),
            }))
            .mutation(async ({ input }) => {
                return await upsertVerificacao(input.salaId, input.disciplina, input.status, input.observacao);
            }),

        getAllVerificacoes: publicProcedure.query(async () => {
            return await getAllVerificacoes();
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
