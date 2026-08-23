import { z } from "zod";
import { router, authedProcedure, viewerProcedure, adminProcedure } from "../../common/trpc";
import {
    listProjectMembers,
    inviteProjectMember,
    updateProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
    searchRegisteredUsers,
    getUserProfile,
    updateUserProfile,
    listAllPlatformUsers,
    updateUserProjectMemberships,
} from "./members.service";

export const membersRouter = router({
    list: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await listProjectMembers(input.projectId);
        }),

    invite: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                email: z.string().email("E-mail inválido"),
                role: z.enum(["admin", "editor", "viewer", "parceiro"]),
                empresa: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            return await inviteProjectMember(input);
        }),

    updateMember: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                memberId: z.string(),
                role: z.enum(["admin", "editor", "viewer", "parceiro"]).optional(),
                empresa: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            return await updateProjectMember(input.projectId, input.memberId, {
                role: input.role,
                empresa: input.empresa,
            });
        }),

    updateRole: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                memberId: z.string(),
                role: z.enum(["admin", "editor", "viewer", "parceiro"]),
            })
        )
        .mutation(async ({ input }) => {
            return await updateProjectMemberRole(input.projectId, input.memberId, input.role);
        }),

    remove: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                memberId: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            return await removeProjectMember(input.projectId, input.memberId);
        }),

    searchUsers: authedProcedure
        .input(
            z.object({
                query: z.string().optional(),
                projectId: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            return await searchRegisteredUsers(input.query || "");
        }),

    getMyRole: authedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
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

    getProfile: authedProcedure.query(async ({ ctx }) => {
        return await getUserProfile(ctx.userId);
    }),

    updateProfile: authedProcedure
        .input(
            z.object({
                name: z.string().optional(),
                avatarUrl: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            return await updateUserProfile(ctx.userId, input);
        }),

    listAllUsers: authedProcedure.query(async () => {
        return await listAllPlatformUsers();
    }),

    updateUserMemberships: authedProcedure
        .input(
            z.object({
                email: z.string().email(),
                name: z.string().optional(),
                role: z.enum(["admin", "editor", "viewer", "parceiro"]),
                empresa: z.string().optional(),
                projectIds: z.array(z.string()),
            })
        )
        .mutation(async ({ input }) => {
            return await updateUserProjectMemberships(input);
        }),
});
