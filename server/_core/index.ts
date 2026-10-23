import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sql, eq, and, or } from 'drizzle-orm';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import path from 'path';
import { appRouter } from '../routers';
import type { Context } from './trpc';
import { ENV } from './env';
import { verifyExportToken, buildSlideExportPayload } from '../modules/export/export.service';

const SUPABASE_URL =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://mwjgsaurifctbatsindf.supabase.co';
const SUPABASE_ANON_KEY =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13amdzYXVyaWZjdGJhdHNpbmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjMwMzUsImV4cCI6MjA4Njk5OTAzNX0.GSAzXMeKAoCW5CfcByZeo6torE7JIw_AKrJq2GQa5J0';

const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

interface VerifiedJwtEntry {
    userId: string;
    email?: string;
    expiresAt: number;
}

const jwtCache = new Map<string, VerifiedJwtEntry>();
const JWT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function verifyBearerToken(
    rawToken: string
): Promise<{ userId?: string; userEmail?: string; exportProjectId?: string }> {
    const token = rawToken.trim();
    if (!token) return {};

    // 1. Personal Export Token (stcl_exp_...)
    if (token.startsWith('stcl_exp_')) {
        const verified = await verifyExportToken(token);
        if (verified.valid && verified.projectId) {
            return {
                userId: `export-token:${verified.tokenId}`,
                userEmail: verified.createdBy,
                exportProjectId: verified.projectId,
            };
        }
        return {};
    }

    // 2. Standard Supabase JWT verification with cache
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const cached = jwtCache.get(tokenHash);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        return { userId: cached.userId, userEmail: cached.email };
    }

    try {
        const { data, error } = await supabaseServer.auth.getUser(token);
        if (!error && data?.user?.id) {
            jwtCache.set(tokenHash, {
                userId: data.user.id,
                email: data.user.email,
                expiresAt: now + JWT_CACHE_TTL_MS,
            });
            return {
                userId: data.user.id,
                userEmail: data.user.email,
            };
        }
    } catch {
        // Network fallback: verify issuer & expiration if Supabase Auth endpoint is momentarily unreachable
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                const isExpired = payload.exp && payload.exp * 1000 < now;
                const validIss =
                    typeof payload.iss === 'string' && payload.iss.includes('mwjgsaurifctbatsindf.supabase.co');
                if (!isExpired && validIss && payload.sub) {
                    return {
                        userId: payload.sub,
                        userEmail: payload.email,
                    };
                }
            }
        } catch {
            // Invalid token
        }
    }

    return {};
}

const app = express();

// Middleware - Optimized JSON limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS - Restrict to trusted origins & authenticated desktop add-ins
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowedOrigin =
        !origin ||
        origin === 'null' ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.stecla.com.br');

    if (isAllowedOrigin && origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Export-Token');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Health Check
app.get('/api/health', async (_req, res) => {
    try {
        const { getDb, users, salas } = await import('../db');
        const db = await getDb();
        if (!db) throw new Error('DB Connection failed (db is null)');

        const [rUsers] = await db
            .select({ count: sql`count(*)` })
            .from(users)
            .catch((e: any) => [{ count: e.message }]);
        const [rSalas] = await db
            .select({ count: sql`count(*)` })
            .from(salas)
            .catch((e: any) => [{ count: e.message }]);

        res.json({
            status: 'ok',
            db: 'connected',
            dbType: process.env.DATABASE_URL ? 'Postgres' : 'SQLite',
            counts: {
                users: rUsers?.count ?? 'error',
                salas: rSalas?.count ?? 'error',
            },
            env: process.env.NODE_ENV,
        });
    } catch (e: any) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

// Evolução B: API dedicada para o Suplemento PowerPoint (GET /api/export/v1/projects/:id/slide)
app.get('/api/export/v1/projects/:id/slide', async (req, res) => {
    try {
        const projectId = req.params.id;
        const authHeader = req.headers.authorization;
        const headerExportToken = req.headers['x-export-token'] as string | undefined;
        const queryToken = req.query.token as string | undefined;

        const rawToken =
            (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
            headerExportToken?.trim() ||
            queryToken?.trim();

        if (!rawToken) {
            return res.status(401).json({
                error: 'Token de autenticação ausente. Envie Authorization: Bearer <token> ou X-Export-Token.',
            });
        }

        let isAuthorized = false;
        let usedExportToken: string | undefined;

        if (rawToken.startsWith('stcl_exp_')) {
            const check = await verifyExportToken(rawToken, projectId);
            if (check.valid && check.projectId === projectId) {
                isAuthorized = true;
                usedExportToken = rawToken;
            }
        } else {
            const verified = await verifyBearerToken(rawToken);
            if (verified.userId) {
                const emailNorm = (verified.userEmail || '').toLowerCase();
                if (
                    emailNorm === 'renata.vianna@stecla.com.br' ||
                    emailNorm.endsWith('@stecla.com.br')
                ) {
                    isAuthorized = true;
                } else {
                    const { getDb, projects, projectMembers } = await import('../db');
                    const db = await getDb();
                    if (db) {
                        const [proj] = await db
                            .select()
                            .from(projects)
                            .where(eq(projects.id, projectId))
                            .limit(1);
                        if (proj?.ownerId === verified.userId) {
                            isAuthorized = true;
                        } else if (proj) {
                            const userFilters = [eq(projectMembers.userId, verified.userId)];
                            if (verified.userEmail) {
                                userFilters.push(eq(projectMembers.email, verified.userEmail));
                            }
                            const [member] = await db
                                .select()
                                .from(projectMembers)
                                .where(
                                    and(
                                        eq(projectMembers.projectId, projectId),
                                        or(...userFilters) as any
                                    ) as any
                                )
                                .limit(1);
                            if (member) {
                                isAuthorized = true;
                            }
                        }
                    }
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                error: 'Token inválido, revogado ou sem permissão para este projeto.',
            });
        }

        const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
        const host = req.headers.host || `localhost:${ENV.port}`;
        const baseUrl = `${proto}://${host}`;

        const payload = await buildSlideExportPayload(projectId, baseUrl, usedExportToken);
        return res.json(payload);
    } catch (e: any) {
        console.error('❌ Error in /api/export/v1/projects/:id/slide:', e);
        return res.status(500).json({ error: e.message || 'Erro interno ao gerar dados do slide.' });
    }
});

// tRPC endpoint
app.use(
    '/api/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: async ({ req, res }): Promise<Context> => {
            let userId: string | undefined;
            let userEmail: string | undefined;
            let exportProjectId: string | undefined;

            const authHeader = req.headers.authorization;
            const exportHeader = req.headers['x-export-token'] as string | undefined;
            const rawToken = authHeader?.startsWith('Bearer ')
                ? authHeader.slice(7)
                : exportHeader;

            if (rawToken) {
                const verified = await verifyBearerToken(rawToken);
                userId = verified.userId;
                userEmail = verified.userEmail;
                exportProjectId = verified.exportProjectId;
            }

            return {
                req,
                res,
                user: undefined,
                userId,
                userEmail,
                exportProjectId,
            };
        },
        onError: ({ path: routePath, error }) => {
            console.error(`❌ tRPC Error on [${routePath}]:`, error);
        },
    })
);

// Serve static files in production
if (ENV.nodeEnv === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));

    app.get('*', (_, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/index.html'));
    });
}

// Start server if not in Vercel
if (!process.env.VERCEL) {
    const PORT = ENV.port;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}`);
        console.log(`🔌 tRPC API: http://localhost:${PORT}/api/trpc`);
    });
}

export default app;
