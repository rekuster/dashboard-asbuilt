import { initTRPC, TRPCError } from '@trpc/server';
import type { Request, Response } from 'express';
import superjson from 'superjson';
import { getDb, projectMembers, projects, salas, apontamentos } from './db';
import { eq, and, or } from 'drizzle-orm';

export interface Context {
    req: Request;
    res: Response;
    user?: any;
    userId?: string;
    userEmail?: string;
    projectRole?: string;
    _roleCache?: Map<string, string>;
}

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

const ROLE_LEVELS: Record<string, number> = {
    'viewer': 1,
    'parceiro': 2,
    'editor': 3,
    'admin': 4,
    'owner': 4
};

export const authedProcedure = publicProcedure.use(({ ctx, next }) => {
    if (!ctx.userId) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Você precisa estar autenticado para acessar este recurso.',
        });
    }
    return next({
        ctx: {
            ...ctx,
            userId: ctx.userId,
        },
    });
});

export function createProjectProcedure(minRole: 'viewer' | 'parceiro' | 'editor' | 'admin') {
    return authedProcedure.use(async (opts: any) => {
        const { ctx, next } = opts;
        
        if (!ctx._roleCache) {
            ctx._roleCache = new Map<string, string>();
        }

        const rawInput = typeof opts.getRawInput === 'function' 
            ? await opts.getRawInput() 
            : opts.rawInput;
        let projectId: string | undefined;
        if (rawInput && typeof rawInput === 'object') {
            projectId = (rawInput as any).projectId || (rawInput as any).id;
        }

        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Banco de dados inacessível.',
            });
        }

        if (!projectId && rawInput && typeof rawInput === 'object') {
            const lookupId = (rawInput as any).id || (rawInput as any).salaId || (rawInput as any).entregaId;
            if (typeof lookupId === 'number') {
                const salaResult = await db.select({ projectId: salas.projectId }).from(salas).where(eq(salas.id, lookupId)).limit(1);
                if (salaResult.length > 0 && salaResult[0].projectId) {
                    projectId = salaResult[0].projectId;
                } else {
                    const apontResult = await db.select({ projectId: apontamentos.projectId }).from(apontamentos).where(eq(apontamentos.id, lookupId)).limit(1);
                    if (apontResult.length > 0 && apontResult[0].projectId) {
                        projectId = apontResult[0].projectId;
                    }
                }
            }
        }

        if (!projectId) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'projectId é obrigatório para esta operação.',
            });
        }

        const cacheKey = `${ctx.userId}:${projectId}`;
        let userRole: string | undefined = ctx._roleCache.get(cacheKey);

        const emailNorm = (ctx.userEmail || "").toLowerCase();
        const isSteclaOrAdmin =
            emailNorm === "renata.vianna@stecla.com.br" ||
            emailNorm.endsWith("@stecla.com.br");

        if (isSteclaOrAdmin) {
            userRole = 'owner';
        }

        if (!userRole) {
            const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
            if (projectResult.length === 0) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Projeto não encontrado.',
                });
            }

            const project = projectResult[0];

            if (project.ownerId === ctx.userId) {
                userRole = 'owner';
            } else {
                const conditions = [eq(projectMembers.projectId, projectId)];
                const userFilters = [eq(projectMembers.userId, ctx.userId!)];
                
                if (ctx.userEmail) {
                    userFilters.push(eq(projectMembers.email, ctx.userEmail));
                }
                
                conditions.push(or(...userFilters) as any);

                const memberResult = await db.select()
                    .from(projectMembers)
                    .where(and(...conditions) as any)
                    .limit(1);

                if (memberResult.length > 0) {
                    const member = memberResult[0];
                    userRole = member.role;

                    if (!member.userId || member.userId !== ctx.userId) {
                        await db.update(projectMembers)
                            .set({ 
                                userId: ctx.userId,
                                acceptedAt: new Date()
                            })
                            .where(eq(projectMembers.id, member.id));
                    }
                }
            }

            if (userRole) {
                ctx._roleCache.set(cacheKey, userRole);
            }
        }

        if (!userRole) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Você não faz parte deste projeto.',
            });
        }

        const userLevel = ROLE_LEVELS[userRole] || 1;
        const requiredLevel = ROLE_LEVELS[minRole];

        if (userLevel < requiredLevel) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Acesso negado. Nível de permissão necessário: ${minRole}.`,
            });
        }

        return next({
            ctx: {
                ...ctx,
                projectRole: userRole,
            }
        });
    });
}

export const viewerProcedure = createProjectProcedure('viewer');
export const parceiroProcedure = createProjectProcedure('parceiro');
export const editorProcedure = createProjectProcedure('editor');
export const adminProcedure = createProjectProcedure('admin');
