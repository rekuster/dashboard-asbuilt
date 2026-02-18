import { initTRPC } from '@trpc/server';
import type { Request, Response } from 'express';
import superjson from 'superjson';

export interface Context {
    req: Request;
    res: Response;
    user?: any;
}

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
