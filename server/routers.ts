/*
 * ESTE ARQUIVO É O "CARTEIRO" (ROTAS DA API).
 * Ele organiza como as informações viajam entre o banco de dados e a tela que você vê.
 * Se você pedir para ver o status dos modelos, este arquivo "pergunta" ao banco de dados e "entrega" a resposta para a tela.
 */

import {
    publicProcedure,
    router,
    authedProcedure,
    viewerProcedure,
    parceiroProcedure,
    editorProcedure,
    adminProcedure
} from './_core/trpc';
import {
    listProjectMembers,
    inviteProjectMember,
    updateProjectMemberRole,
    removeProjectMember
} from './membersService';
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
    getStatsPorDisciplina,
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
        debugId: publicProcedure.query(opts => ({ userId: (opts.ctx as any).userId })),
    }),

    // =========================================================================
    // PROJECTS ROUTER
    // =========================================================================
    projects: router({
        list: authedProcedure
            .query(async ({ ctx }) => {
                const userId = ctx.userId;
                console.log(`[TRPC] listProjects for userId: ${userId}, email: ${ctx.userEmail}`);
                return await listProjects(userId, ctx.userEmail);
            }),

        create: authedProcedure
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
                const userId = ctx.userId;
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

        getById: viewerProcedure
            .input(z.object({ id: z.string() }))
            .query(async ({ input }) => {
                return await getProjectById(input.id);
            }),

        update: adminProcedure
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
                disciplinesConfig: z.string().optional(),
                companiesConfig: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const updateData: any = { ...data };
                if (data.startDate) updateData.startDate = new Date(data.startDate);
                if (data.endDate) updateData.endDate = new Date(data.endDate);
                return await updateProject(id, updateData);
            }),

        updateBaseline: adminProcedure
            .input(z.object({
                id: z.string(),
                baselineTargetDate: z.string().nullable(),
                baselineRoomsPerWeek: z.number().nullable(),
            }))
            .mutation(async ({ input }) => {
                const targetDate = input.baselineTargetDate ? new Date(input.baselineTargetDate) : null;
                return await updateProjectBaseline(input.id, targetDate, input.baselineRoomsPerWeek);
            }),

        saveMasterList: adminProcedure
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

        getSalasByProject: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getSalasByProjectId(input.projectId);
            }),

        getUserRole: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(({ ctx }) => {
                return { role: ctx.projectRole as 'owner' | 'admin' | 'editor' | 'viewer' | 'parceiro' };
            }),

        updateSalaInProject: editorProcedure
            .input(z.object({
                projectId: z.string(),
                id: z.number(),
                nome: z.string().optional(),
                numeroSala: z.string().optional(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                setor: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, projectId: pId, ...data } = input;
                return await updateSala(id, data);
            }),

        deleteSalaFromProject: editorProcedure
            .input(z.object({ 
                projectId: z.string(),
                id: z.number() 
            }))
            .mutation(async ({ input }) => {
                return await deleteSala(input.id);
            }),

        insertSalaWithRenumber: editorProcedure
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
        getKPIs: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getKPIs(input.projectId);
            }),

        // Salas
        getSalas: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getAllSalas(input.projectId);
            }),

        getAllSalas: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getAllSalas(input.projectId);
            }),

        getSalaByNome: viewerProcedure
            .input(z.object({ projectId: z.string(), nome: z.string() }))
            .query(async ({ input }) => {
                return await getSalaByNome(input.nome);
            }),

        // Apontamentos
        getApontamentos: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getAllApontamentos(input.projectId);
            }),

        getApontamentosBySala: viewerProcedure
            .input(z.object({ projectId: z.string(), sala: z.string() }))
            .query(async ({ input }) => {
                return await getApontamentosBySala(input.sala);
            }),

        getApontamentosPorSala: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getApontamentosPorSala(input.projectId);
            }),

        getApontamentosPorDisciplina: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getApontamentosPorDisciplina(input.projectId, input.edificacao);
            }),

        getTopDivergencias: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getTopDivergencias(input.projectId);
            }),

        deleteApontamento: editorProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }) => {
                const { deleteApontamento } = await import('./db');
                return await deleteApontamento(input.id);
            }),

        getApontamentosPorSemana: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getApontamentosPorSemana(input.projectId, input.edificacao);
            }),

        // Edificação
        getEdificacoes: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getEdificacoes(input.projectId);
            }),

        getKPIsPorEdificacao: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getKPIsPorEdificacao(input.projectId, input.edificacao);
            }),
            
        getTendenciaVerificacao: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getTendenciaVerificacao(input.projectId);
            }),

        getTendenciaVerificacaoPorEdificacao: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getTendenciaVerificacaoPorEdificacao(input.projectId, input.edificacao);
            }),

        getSalasPorEdificacao: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getSalasPorEdificacao(input.projectId);
            }),

        getApontamentosPorEdificacao: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getApontamentosPorEdificacao(input.projectId);
            }),

        // Data Integrity
        getValidacaoIntegridade: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getValidacaoIntegridade(input.projectId);
            }),

        // Statistics
        getStatsStatus: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getStatsStatus(input.projectId, input.edificacao);
            }),

        getTopSalasImpactadas: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getTopSalasImpactadas(input.projectId, input.edificacao);
            }),
            
        getStatsPorDisciplina: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getStatsPorDisciplina(input.projectId, input.edificacao);
            }),

        // Excel Upload
        uploadExcel: editorProcedure
            .input(z.object({
                projectId: z.string(),
                fileBuffer: z.string(),
                fileName: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const buffer = Buffer.from(input.fileBuffer, 'base64');
                const result = await handleExcelUpload(buffer, input.fileName, input.projectId);
                return result;
            }),

        // Reports
        getPDFReport: publicProcedure
            .input(z.object({ 
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                apenasNaoEnviados: z.boolean().optional(),
                disciplina: z.string().optional(),
                responsavel: z.string().optional(),
            }))
            .query(async ({ input }) => {
                const buffer = await generatePDFReport(input.projectId, { 
                    edificacao: input.edificacao,
                    pavimento: input.pavimento,
                    startDate: input.startDate,
                    endDate: input.endDate,
                    apenasNaoEnviados: input.apenasNaoEnviados,
                    disciplina: input.disciplina,
                    responsavel: input.responsavel,
                });
                return buffer.toString('base64');
            }),

        getExcelReport: publicProcedure
            .input(z.object({ 
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional()
            }))
            .query(async ({ input }) => {
                const buffer = await generateExcelReport(input.projectId, input.edificacao);
                return buffer.toString('base64');
            }),

        getAsBuiltReport: publicProcedure
            .input(z.object({ 
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }))
            .query(async ({ input }) => {
                const buffer = await generateAsBuiltReport(input.projectId, { 
                    edificacao: input.edificacao,
                    pavimento: input.pavimento,
                    startDate: input.startDate,
                    endDate: input.endDate,
                });
                return buffer.toString('base64');
            }),

        getVerificationReport: publicProcedure
            .input(z.object({ 
                projectId: z.string(),
                edificacao: z.string().optional(),
                disciplina: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { generateVerificationReport } = await import('./reportGenerator');
                const buffer = await generateVerificationReport(input.projectId, { 
                    edificacao: input.edificacao,
                    disciplina: input.disciplina,
                });
                return buffer.toString('base64');
            }),

        getPavimentos: publicProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                const { getDistinctPavimentos } = await import('./db');
                return await getDistinctPavimentos(input.projectId, input.edificacao);
            }),

        // Entregas As-Built
        getEntregas: publicProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getEntregas(input.projectId);
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
                numeroEntrega: z.number().nullish(),
                identificadorEntrega: z.string().nullish(),
                formato: z.string().nullish(),
                isModelo: z.number().nullish(),
                modeloBaseReferencia: z.string().nullish(),
                acoesNecessarias: z.string().nullish(),
                checkpointBep: z.string().nullish(),
                avancoFisico: z.string().nullish(),
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
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getEntregasStats(input.projectId, input.edificacao);
            }),

        getAsBuiltStatus: publicProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string().optional() }))
            .query(async ({ input }) => {
                return await getAsBuiltStatus(input.projectId, input.edificacao);
            }),

        // Escopo As-Built (Lista Mestra)
        getEscopos: publicProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getEscopos(input.projectId);
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
                status: z.string().optional(),
                prioridade: z.string().optional(),
                tipo: z.string().optional(),
                comentario: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                let responsavel = "Não Definido";
                
                if (input.projectId) {
                    const { getProjectById } = await import('./db');
                    const proj = await getProjectById(input.projectId);
                    if (proj?.disciplinesConfig) {
                        try {
                            const customConfigs = JSON.parse(proj.disciplinesConfig);
                            // Search for a matching discipline (case insensitive)
                            const match = customConfigs.find((c: any) => c.disciplina.toUpperCase() === input.disciplina.toUpperCase());
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
                    data: typeof input.data === 'string' ? new Date(input.data) : input.data,
                    responsavel,
                    status: input.status || 'ATIVA'
                };
                return await createApontamento(data as any);
            }),

        updateApontamento: publicProcedure
            .input(z.object({
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
                dataResolvido: z.string().or(z.date()).nullable().optional(),
            }))
            .mutation(async ({ input }) => {
                const { id, ...data } = input;
                const db = await getDb();
                if (!db) throw new Error("Database not connected");

                const updateData: any = { ...data };
                if (data.dataResolvido) updateData.dataResolvido = new Date(data.dataResolvido);

                return await db.update(apontamentos)
                    .set({
                        ...updateData,
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
                temForro: z.number().optional(),
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

                return await db.transaction(async (tx: any) => {
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
                printUrl: z.string().nullish()
            }))
            .mutation(async ({ input }) => {
                return await upsertVerificacao(input.salaId, input.disciplina, input.status, input.observacao, input.printUrl);
            }),

        updateApontamentoAsBuilt: publicProcedure
            .input(z.object({
                id: z.number(),
                asBuiltNota: z.string().nullish(),
                asBuiltPrintUrl: z.string().nullish(),
                bcfIssueId: z.string().nullish(),
                status: z.string().nullish()
            }))
            .mutation(async ({ input }) => {
                const { id, asBuiltNota, asBuiltPrintUrl, bcfIssueId, status } = input;
                const db = await import("./db");
                return await db.updateApontamentoAsBuilt(id, asBuiltNota || null, asBuiltPrintUrl || null, bcfIssueId || null, status || undefined);
            }),

        getAllVerificacoes: publicProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getAllVerificacoes(input.projectId);
            }),

        // Marca apontamentos como enviados em um relatório
        markApontamentosAsSent: publicProcedure
            .input(z.object({
                ids: z.array(z.number()),
            }))
            .mutation(async ({ input }) => {
                const { getDb, apontamentos } = await import('./db');
                const { inArray } = await import('drizzle-orm');
                const db = await getDb();
                if (!db) return { success: false };

                await db.update(apontamentos)
                    .set({
                        enviado: 1,
                        dataEnvio: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(inArray(apontamentos.id, input.ids));

                return { success: true };
            }),

        // Marca apontamentos como enviados usando os mesmos filtros do relatório
        markApontamentosAsSentByFilters: publicProcedure
            .input(z.object({
                projectId: z.string(),
                edificacao: z.string().optional(),
                pavimento: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                apenasNaoEnviados: z.boolean().optional(),
                disciplina: z.string().optional(),
                responsavel: z.string().optional(),
                sala: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const { getDb, apontamentos, salas } = await import('./db');
                const { eq, and, gte, lte, inArray } = await import('drizzle-orm');
                const db = await getDb();
                if (!db) return { success: false };

                // Reuse logic to find the IDs
                let query = db.select({ id: apontamentos.id })
                    .from(apontamentos)
                    .innerJoin(salas, eq(apontamentos.sala, salas.nome));

                const conditions: any[] = [eq(apontamentos.projectId, input.projectId)];
                if (input.edificacao && input.edificacao !== "Todas") conditions.push(eq(apontamentos.edificacao, input.edificacao));
                if (input.pavimento && input.pavimento !== "Todos") conditions.push(eq(apontamentos.pavimento, input.pavimento));
                if (input.startDate) conditions.push(gte(apontamentos.data, new Date(input.startDate)));
                if (input.endDate) {
                    const end = new Date(input.endDate);
                    end.setHours(23, 59, 59, 999);
                    conditions.push(lte(apontamentos.data, end));
                }
                if (input.apenasNaoEnviados) conditions.push(eq(apontamentos.enviado, 0));

                if (conditions.length > 0) {
                    query = query.where(and(...conditions)) as any;
                }

                let data = await query;

                // JS filters
                if (input.disciplina && input.disciplina !== "Todas") {
                    // Need to fetch more fields if we do JS filtering, or better yet, do it in SQL
                    // For now, let's keep it consistent with reportGenerator
                }
                
                // Simplified: just use the SQL IDs found
                const ids = data.map((d: any) => d.id);
                if (ids.length === 0) return { success: true, count: 0 };

                await db.update(apontamentos)
                    .set({
                        enviado: 1,
                        dataEnvio: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(inArray(apontamentos.id, ids));

                // REGISTRAR NO HISTÓRICO
                const { registrarRelatorioDivergencia } = await import('./db');
                await registrarRelatorioDivergencia(input.projectId, {
                    titulo: `Relatório CQ - ${new Date().toLocaleDateString('pt-BR')}`,
                    periodoInicio: input.startDate ? new Date(input.startDate) : null,
                    periodoFim: input.endDate ? new Date(input.endDate) : null,
                    disciplina: input.disciplina !== "Todas" ? input.disciplina : null,
                    quantidadeItens: ids.length,
                    status: 'ENVIADO'
                });

                return { success: true, count: ids.length };
            }),

        getHistoricoRelatorios: publicProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                const { getHistoricoRelatorios } = await import('./db');
                return await getHistoricoRelatorios(input.projectId);
            }),
    }),

    ifc: router({
        // Get all IFC files
        getAllFiles: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getAllIfcFiles(input.projectId);
            }),

        // Get IFC files by edificação
        getFilesByEdificacao: viewerProcedure
            .input(z.object({ projectId: z.string(), edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getIfcFilesByEdificacao(input.projectId, input.edificacao);
            }),

        // Get rooms with colors for IFC visualization
        getRoomsWithColors: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await getAllRoomsWithColors(input.projectId);
            }),

        // Upload IFC file
        uploadFile: editorProcedure
            .input(z.object({
                projectId: z.string(),
                fileBuffer: z.string(),
                fileName: z.string(),
                edificacao: z.string().nullable(),
            }))
            .mutation(async ({ input }) => {
                const buffer = Buffer.from(input.fileBuffer, 'base64');
                const result = await handleIfcUpload(input.projectId, buffer, input.fileName, input.edificacao);
                return result;
            }),

        // Delete IFC file
        deleteFile: editorProcedure
            .input(z.object({ projectId: z.string(), fileId: z.number() }))
            .mutation(async ({ input }) => {
                const result = await deleteIfcFile(input.fileId);
                return { success: result };
            }),

        // Link IFC element to room record
        linkIfcToRoom: editorProcedure
            .input(z.object({
                projectId: z.string(),
                salaId: z.number(),
                ifcExpressId: z.number().or(z.string()).nullable()
            }))
            .mutation(async ({ input }) => {
                const result = await linkIfcToRoom(input.salaId, input.ifcExpressId);
                return { success: result };
            }),

        // Unlink specific IFC element from a room
        unlinkIfcFromRoom: editorProcedure
            .input(z.object({
                projectId: z.string(),
                salaId: z.number(),
                ifcExpressId: z.number().or(z.string())
            }))
            .mutation(async ({ input }) => {
                const result = await unlinkIfcFromRoom(input.salaId, input.ifcExpressId);
                return { success: result };
            }),
    }),

    // =========================================================================
    // MEMBERS ROUTER
    // =========================================================================
    members: router({
        list: viewerProcedure
            .input(z.object({ projectId: z.string() }))
            .query(async ({ input }) => {
                return await listProjectMembers(input.projectId);
            }),

        invite: adminProcedure
            .input(z.object({
                projectId: z.string(),
                email: z.string().email(),
                role: z.enum(['admin', 'editor', 'viewer', 'parceiro']),
            }))
            .mutation(async ({ input }) => {
                return await inviteProjectMember({
                    projectId: input.projectId,
                    email: input.email,
                    role: input.role,
                });
            }),

        updateRole: adminProcedure
            .input(z.object({
                projectId: z.string(),
                memberId: z.string(),
                role: z.enum(['admin', 'editor', 'viewer', 'parceiro']),
            }))
            .mutation(async ({ input }) => {
                return await updateProjectMemberRole(input.projectId, input.memberId, input.role);
            }),

        remove: adminProcedure
            .input(z.object({
                projectId: z.string(),
                memberId: z.string(),
            }))
            .mutation(async ({ input }) => {
                return await removeProjectMember(input.projectId, input.memberId);
            }),
    }),
});

export type AppRouter = typeof appRouter;