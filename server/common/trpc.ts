import { initTRPC, TRPCError } from '@trpc/server';
import type { Request, Response } from 'express';
import superjson from 'superjson';
import { getDb, projectMembers, projects, salas, apontamentos, escopoAsBuilt, entregasAsBuilt } from './db';
import { eq, and, or } from 'drizzle-orm';

export interface Context {
    req: Request;
    res: Response;
    user?: any;
    userId?: string;
    userEmail?: string;
    exportProjectId?: string;
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
            if (typeof projectId !== 'string') {
                projectId = undefined;
            }
        }

        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Banco de dados inacessível.',
            });
        }

        if (!projectId && rawInput && typeof rawInput === 'object') {
            const inputObj = rawInput as any;
            const salaId = typeof inputObj.salaId === 'number' ? inputObj.salaId : undefined;
            const escopoId = typeof inputObj.escopoId === 'number' ? inputObj.escopoId : undefined;
            const entregaId = typeof inputObj.entregaId === 'number' ? inputObj.entregaId : undefined;
            const firstIdFromArray = Array.isArray(inputObj.ids) && typeof inputObj.ids[0] === 'number' ? inputObj.ids[0] : undefined;
            const genericId = typeof inputObj.id === 'number' ? inputObj.id : undefined;

            if (salaId) {
                const [r] = await db.select({ projectId: salas.projectId }).from(salas).where(eq(salas.id, salaId)).limit(1);
                if (r?.projectId) projectId = r.projectId;
            } else if (escopoId) {
                const [r] = await db.select({ projectId: escopoAsBuilt.projectId }).from(escopoAsBuilt).where(eq(escopoAsBuilt.id, escopoId)).limit(1);
                if (r?.projectId) projectId = r.projectId;
            } else if (entregaId) {
                const [r] = await db.select({ projectId: entregasAsBuilt.projectId }).from(entregasAsBuilt).where(eq(entregasAsBuilt.id, entregaId)).limit(1);
                if (r?.projectId) projectId = r.projectId;
            } else if (firstIdFromArray) {
                const [r] = await db.select({ projectId: apontamentos.projectId }).from(apontamentos).where(eq(apontamentos.id, firstIdFromArray)).limit(1);
                if (r?.projectId) projectId = r.projectId;
            } else if (genericId) {
                const [rSala] = await db.select({ projectId: salas.projectId }).from(salas).where(eq(salas.id, genericId)).limit(1);
                if (rSala?.projectId) {
                    projectId = rSala.projectId;
                } else {
                    const [rApont] = await db.select({ projectId: apontamentos.projectId }).from(apontamentos).where(eq(apontamentos.id, genericId)).limit(1);
                    if (rApont?.projectId) {
                        projectId = rApont.projectId;
                    } else {
                        const [rEscopo] = await db.select({ projectId: escopoAsBuilt.projectId }).from(escopoAsBuilt).where(eq(escopoAsBuilt.id, genericId)).limit(1);
                        if (rEscopo?.projectId) {
                            projectId = rEscopo.projectId;
                        } else {
                            const [rEntrega] = await db.select({ projectId: entregasAsBuilt.projectId }).from(entregasAsBuilt).where(eq(entregasAsBuilt.id, genericId)).limit(1);
                            if (rEntrega?.projectId) {
                                projectId = rEntrega.projectId;
                            }
                        }
                    }
                }
            }
        }

        // Handle Personal Export Token (read-only access scoped to ctx.exportProjectId)
        if (ctx.exportProjectId) {
            if (minRole !== 'viewer') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Token de exportação possui permissão exclusiva de leitura.',
                });
            }
            if (projectId && projectId !== ctx.exportProjectId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Token de exportação não autorizado para este projeto.',
                });
            }
            return next({
                ctx: {
                    ...ctx,
                    projectRole: 'viewer',
                },
            });
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
