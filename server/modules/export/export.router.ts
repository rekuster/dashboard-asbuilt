import { z } from "zod";
import { router, adminProcedure, viewerProcedure } from "../../common/trpc";
import {
    listExportTokens,
    createExportToken,
    revokeExportToken,
    buildSlideExportPayload,
} from "./export.service";

export const exportRouter = router({
    listTokens: adminProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return await listExportTokens(input.projectId);
        }),

    createToken: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                name: z.string().min(1).max(100),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const createdBy = ctx.userEmail || ctx.userId || "Admin";
            return await createExportToken(input.projectId, input.name, createdBy);
        }),

    revokeToken: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                tokenId: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            return await revokeExportToken(input.projectId, input.tokenId);
        }),

    getSlideData: viewerProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            const proto = (ctx.req.headers["x-forwarded-proto"] as string) || ctx.req.protocol || "http";
            const host = ctx.req.headers.host || "localhost:5188";
            const baseUrl = `${proto}://${host}`;
            return await buildSlideExportPayload(input.projectId, baseUrl);
        }),
});
