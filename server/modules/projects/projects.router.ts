import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure, viewerProcedure, adminProcedure } from "../../common/trpc";
import {
    listProjects,
    createProject,
    getProjectById,
    updateProject,
    updateProjectBaseline,
} from "./projects.service";
import { listProjectMembers } from "../members/members.service";

export const projectsRouter = router({
    list: authedProcedure.query(async ({ ctx }) => {
        return await listProjects(ctx.userId!, ctx.userEmail);
    }),

    create: authedProcedure
        .input(
            z.object({
                code: z.string().min(1, "Código é obrigatório"),
                name: z.string().min(1, "Nome é obrigatório"),
                description: z.string().optional(),
                client: z.string().optional(),
                location: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const emailNorm = (ctx.userEmail || "").toLowerCase();
            const isSteclaOrAdmin =
                emailNorm === "renata.vianna@stecla.com.br" ||
                emailNorm.endsWith("@stecla.com.br");
            if (!isSteclaOrAdmin) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Apenas administradores Stecla podem criar novos projetos.",
                });
            }
            return await createProject({
                ...input,
                ownerId: ctx.userId!,
                startDate: input.startDate ? new Date(input.startDate) : null,
                endDate: input.endDate ? new Date(input.endDate) : null,
            });
        }),

    getById: viewerProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return await getProjectById(input.id);
        }),

    getUserRole: authedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            const emailNorm = (ctx.userEmail || "").toLowerCase();
            const isSteclaOrAdmin =
                emailNorm === "renata.vianna@stecla.com.br" ||
                emailNorm.endsWith("@stecla.com.br");

            if (isSteclaOrAdmin) {
                return {
                    role: "owner",
                    isOwner: true,
                    isAdmin: true,
                    isEditor: true,
                    isParceiro: false,
                    empresa: "Stecla",
                };
            }

            const members = await listProjectMembers(input.projectId);
            const me = members.find(
                (m) =>
                    m.userId === ctx.userId ||
                    (ctx.userEmail && m.email.toLowerCase() === ctx.userEmail.toLowerCase())
            );
            return {
                role: me ? me.role : "viewer",
                isOwner: me?.role === "owner",
                isAdmin: me?.role === "owner" || me?.role === "admin",
                isEditor: me?.role === "owner" || me?.role === "admin" || me?.role === "editor",
                isParceiro: me?.role === "parceiro",
                empresa: me?.empresa || null,
            };
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.string(),
                code: z.string().optional(),
                name: z.string().optional(),
                description: z.string().nullish(),
                client: z.string().nullish(),
                location: z.string().nullish(),
                startDate: z.string().nullish(),
                endDate: z.string().nullish(),
                status: z.string().optional(),
                disciplinesConfig: z.string().nullish(),
                companiesConfig: z.string().nullish(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            const updatePayload: any = { ...data };
            if (data.startDate !== undefined) {
                updatePayload.startDate = data.startDate ? new Date(data.startDate) : null;
            }
            if (data.endDate !== undefined) {
                updatePayload.endDate = data.endDate ? new Date(data.endDate) : null;
            }
            return await updateProject(id, updatePayload);
        }),

    updateBaseline: adminProcedure
        .input(
            z.object({
                id: z.string(),
                baselineTargetDate: z.string().nullable().optional(),
                baselineRoomsPerWeek: z.number().nullable().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const targetDate = input.baselineTargetDate
                ? new Date(input.baselineTargetDate)
                : null;
            return await updateProjectBaseline(
                input.id,
                targetDate,
                input.baselineRoomsPerWeek ?? null
            );
        }),
});
