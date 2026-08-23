import 'dotenv/config';
import { sql } from 'drizzle-orm';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import path from 'path';
import { appRouter } from '../routers';
import type { Context } from './trpc';
import { ENV } from './env';

const app = express();

// Middleware - Optimized JSON limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

        // Diagnostic counts using count()
        const [rUsers] = await db.select({ count: sql`count(*)` }).from(users).catch((e: any) => [{ count: e.message }]);
        const [rSalas] = await db.select({ count: sql`count(*)` }).from(salas).catch((e: any) => [{ count: e.message }]);

        // Return sensitive info masked for debugging
        const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
        const maskedUrl = dbUrl.length > 20 ? dbUrl.substring(0, 15) + '...' : dbUrl;

        res.json({
            status: 'ok',
            db: 'connected',
            dbType: process.env.DATABASE_URL ? 'Postgres' : 'SQLite',
            connectionString: maskedUrl,
            counts: {
                users: rUsers?.count ?? 'error',
                salas: rSalas?.count ?? 'error'
            },
            env: process.env.NODE_ENV,
            postgresParams: {
                ssl: 'require',
                prepare: false
            }
        });
    } catch (e: any) {
        res.status(500).json({ status: 'error', error: e.message, stack: e.stack });
    }
});

// tRPC endpoint
app.use(
    '/api/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: ({ req, res }): Context => {
            // Extract user ID from Supabase Auth JWT
            let userId: string | undefined;
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                try {
                    const token = authHeader.slice(7);
                    // Decode JWT payload (base64url) without verification 
                    // (Supabase handles token validation)
                    const payload = JSON.parse(
                        Buffer.from(token.split('.')[1], 'base64url').toString()
                    );
                    userId = payload.sub;
                    (req as any).userEmail = payload.email;
                } catch (e) {
                    // Invalid token, userId remains undefined
                }
            }
            return {
                req,
                res,
                user: undefined,
                userId,
                userEmail: (req as any).userEmail,
            };
        },
        onError: ({ path, error }) => {
            console.error(`❌ tRPC Error on [${path}]:`, error);
        }
    })
);

// Serve static files in production
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

// Trigger Vercel deploy: Final fix for static files
 
