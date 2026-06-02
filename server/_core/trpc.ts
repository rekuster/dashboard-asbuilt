import { initTRPC, TRPCError } from '@trpc/server';
import type { Request, Response } from 'express';
import superjson from 'superjson';
import { getDb, projectMembers, projects } from '../db';
import { eq, and, or } from 'drizzle-orm';

export interface Context {
    req: Request;
    res: Response;
    user?: any;
    userId?: string;
    userEmail?: string;
    projectRole?: string;
}

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Níveis de permissão para facilitar comparação
const ROLE_LEVELS: Record<string, number> = {
    'viewer': 1,
    'parceiro': 2,
    'editor': 3,
    'admin': 4,
    'owner': 4
};

// Procedimento que exige autenticação
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

// Middleware dinâmico para verificação de papéis no projeto
export function createProjectProcedure(minRole: 'viewer' | 'parceiro' | 'editor' | 'admin') {
    return authedProcedure.use(async (opts: any) => {
        const { ctx, next } = opts;
        // tRPC v11: rawInput was replaced by getRawInput()
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

        // Se o projectId não foi enviado diretamente, tentamos buscar no banco via id de Sala ou Apontamento
        if (!projectId && rawInput && typeof rawInput === 'object') {
            const lookupId = (rawInput as any).id || (rawInput as any).salaId || (rawInput as any).entregaId;
            if (typeof lookupId === 'number') {
                // 1. Tentar buscar em salas
                const { salas, apontamentos } = await import('../db');
                const salaResult = await db.select({ projectId: salas.projectId }).from(salas).where(eq(salas.id, lookupId)).limit(1);
                if (salaResult.length > 0 && salaResult[0].projectId) {
                    projectId = salaResult[0].projectId;
                } else {
                    // 2. Tentar buscar em apontamentos
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

        // 1. Verificar se o projeto existe
        const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        if (projectResult.length === 0) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Projeto não encontrado.',
            });
        }

        const project = projectResult[0];
        let userRole: string | undefined;

        // 2. Se o usuário for o dono (ownerId) do projeto, possui acesso total (owner/admin)
        if (project.ownerId === ctx.userId) {
            userRole = 'owner';
        } else {
            // 3. Caso contrário, buscar associação em projectMembers
            const conditions = [eq(projectMembers.projectId, projectId)];
            const userFilters = [eq(projectMembers.userId, ctx.userId)];
            
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

                // Auto-link: Se o membro foi convidado por e-mail mas o userId não estava associado, atualiza
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

        // Se nenhuma regra conceder acesso
        if (!userRole) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Você não faz parte deste projeto.',
            });
        }

        // Verificar o nível de privilégio
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

// Procedimentos atalhados prontos para uso
export const viewerProcedure = createProjectProcedure('viewer');
export const parceiroProcedure = createProjectProcedure('parceiro');
export const editorProcedure = createProjectProcedure('editor');
export const adminProcedure = createProjectProcedure('admin');
