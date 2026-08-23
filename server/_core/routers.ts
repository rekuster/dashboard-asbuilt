import { router, publicProcedure, authedProcedure, viewerProcedure, adminProcedure, editorProcedure } from "../common/trpc";
import { z } from "zod";

import { projectsRouter } from "../modules/projects/projects.router";
import { membersRouter } from "../modules/members/members.router";
import { roomsRouter } from "../modules/rooms/rooms.router";
import { issuesRouter } from "../modules/issues/issues.router";
import { deliveriesRouter } from "../modules/deliveries/deliveries.router";
import { analyticsRouter } from "../modules/analytics/analytics.router";
import { reportsRouter } from "../modules/reports/reports.router";

import {
    saveMasterList,
    getAllSalas,
    updateSala,
    deleteSala,
    renumberSalasInEdificacao,
} from "../modules/rooms/rooms.service";
import { getDb, salas } from "../common/db";

/**
 * Enhanced Projects router supporting both standalone and legacy project-scoped operations
 */
const combinedProjectsRouter = router({
    ...projectsRouter._def.procedures,

    // Legacy project-level room management methods maintained for backwards-compatibility
    saveMasterList: adminProcedure
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

    getSalas: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getAllSalas(input.projectId);
        }),

    getSalasByProject: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await getAllSalas(input.projectId);
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

    updateSalaInProject: editorProcedure
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

    deleteSalaFromProject: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                id: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            return await deleteSala(input.id);
        }),

    renumberSalas: editorProcedure
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

    insertSalaWithRenumber: editorProcedure
        .input(
            z.object({
                projectId: z.string(),
                edificacao: z.string(),
                pavimento: z.string(),
                setor: z.string(),
                nome: z.string(),
                numeroSala: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const fromNum = parseInt(input.numeroSala, 10);
            const shifted = await renumberSalasInEdificacao(
                input.projectId,
                input.edificacao,
                fromNum
            );
            const db = await getDb();
            if (!db) return { shifted, sala: null };
            const [newSala] = await db
                .insert(salas)
                .values({
                    projectId: input.projectId,
                    edificacao: input.edificacao,
                    pavimento: input.pavimento,
                    setor: input.setor,
                    nome: input.nome,
                    numeroSala: input.numeroSala,
                    status: "PENDENTE",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();
            return { shifted, sala: newSala };
        }),
});

/**
 * Unified Dashboard router combining all domain-specific procedures
 * for 100% frontend backwards-compatibility.
 */
const dashboardRouter = router({
    ...analyticsRouter._def.procedures,
    ...roomsRouter._def.procedures,
    ...issuesRouter._def.procedures,
    ...deliveriesRouter._def.procedures,
    ...reportsRouter._def.procedures,
});

/**
 * Main application tRPC router aggregated from domain sub-routers
 */
export const appRouter = router({
    auth: router({
        me: publicProcedure.query((opts) => opts.ctx.user),
        debugId: publicProcedure.query((opts) => ({ userId: (opts.ctx as any).userId })),
    }),

    projects: combinedProjectsRouter,
    members: membersRouter,
    dashboard: dashboardRouter,

    // Standalone domain routers
    rooms: roomsRouter,
    issues: issuesRouter,
    deliveries: deliveriesRouter,
    analytics: analyticsRouter,
    reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
