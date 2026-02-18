import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import path from 'path';
import { appRouter } from '../routers';
import type { Context } from './trpc';
import { ENV } from './env';
import multer from 'multer';
import { handleExcelUpload } from '../uploadHandler';
import fs from 'fs';

const upload = multer({ storage: multer.memoryStorage() });
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || 'antigravity-sync-2024';

const app = express();

// Middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

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

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// External API for automated Excel Sync
app.post('/api/external/upload-excel', upload.single('file'), async (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log(`📡 Automated sync: Received file ${req.file.originalname}`);
        const result = await handleExcelUpload(req.file.buffer, req.file.originalname, 0); // User ID 0 for system/automation
        return res.json(result);
    } catch (error: any) {
        console.error('❌ External upload error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Image Upload for Field Reports
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    try {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, req.file.buffer);

        return res.json({
            success: true,
            url: `/uploads/${fileName}`
        });
    } catch (error: any) {
        console.error('❌ Image upload error:', error);
        return res.status(500).json({ error: 'Failed to save image' });
    }
});

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const { getDb, users } = await import('../db');
        const db = await getDb();
        if (!db) throw new Error('DB Connection failed');
        const count = await db.select({ count: sql`count(*)` }).from(users); // Attempt query
        res.json({ status: 'ok', db: 'connected', users: count[0].count, env: process.env.NODE_ENV });
    } catch (e: any) {
        res.status(500).json({ status: 'error', error: e.message, stack: e.stack });
    }
});

import { sql } from 'drizzle-orm';

// tRPC endpoint
app.use(
    '/api/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: ({ req, res }): Context => ({
            req,
            res,
            user: undefined, // Add auth logic here if needed
        }),
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
