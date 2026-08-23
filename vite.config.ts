import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom plugin to copy WASM files
const wasmCopyPlugin = () => ({
    name: "wasm-copy",
    buildStart() {
        const src = path.resolve(__dirname, "node_modules/web-ifc");
        const dest = path.resolve(__dirname, "client/public/wasm");
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

        ["web-ifc.wasm", "web-ifc-mt.wasm"].forEach((file) => {
            if (fs.existsSync(path.join(src, file))) {
                fs.copyFileSync(path.join(src, file), path.join(dest, file));
            }
        });
    },
});

// Helper to suppress ECONNREFUSED and dual-stack AggregateError during startup
const handleProxyError = (proxy: any, apiName: string) => {
    proxy.on('error', (err: any, _req: any, res: any) => {
        const isConnRefused = err.code === 'ECONNREFUSED' || 
            err.name === 'AggregateError' || 
            (err.errors && err.errors.some((e: any) => e.code === 'ECONNREFUSED'));
        if (isConnRefused) {
            if (res && !res.headersSent) {
                res.writeHead(503, {
                    'Content-Type': 'text/plain',
                });
                res.end('Backend server is starting up. Please wait...');
            }
            return;
        }
        console.error(`Proxy Error (${apiName}):`, err);
    });
};

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "client", "src"),
            "@shared": path.resolve(__dirname, "shared"),
        },
    },
    root: path.resolve(__dirname, "client"),
    envDir: __dirname,
    publicDir: path.resolve(__dirname, "client", "public"),
    build: {
        outDir: path.resolve(__dirname, "dist"),
        emptyOutDir: true,
    },
    server: {
        host: true,
        port: 5188,
        proxy: {
            '/api/trpc': {
                target: 'http://127.0.0.1:3008',
                changeOrigin: true,
                secure: false,
                configure: (proxy) => handleProxyError(proxy, '/api/trpc')
            },
            '/uploads': {
                target: 'http://127.0.0.1:3008',
                changeOrigin: true,
                secure: false,
                configure: (proxy) => handleProxyError(proxy, '/uploads')
            },
            '/api/external': {
                target: 'http://127.0.0.1:3008',
                changeOrigin: true,
                secure: false,
                configure: (proxy) => handleProxyError(proxy, '/api/external')
            },
            '/api/upload-image': {
                target: 'http://127.0.0.1:3008',
                changeOrigin: true,
                secure: false,
                configure: (proxy) => handleProxyError(proxy, '/api/upload-image')
            },
        },
    },
    optimizeDeps: {
        exclude: [
            'web-ifc', 
            'web-ifc-three', 
            '@thatopen/components', 
            '@thatopen/fragments',
            '@thatopen/components-front'
        ]
    },
    assetsInclude: ['**/*.wasm']
});
