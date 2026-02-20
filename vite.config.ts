import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

import fs from "fs";

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

export default defineConfig({
    plugins: [react(), tailwindcss(), wasmCopyPlugin()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "client", "src"),
            "@shared": path.resolve(__dirname, "shared"),
        },
    },
    root: path.resolve(__dirname, "client"),
    publicDir: path.resolve(__dirname, "client", "public"),
    build: {
        outDir: path.resolve(__dirname, "dist"),
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    'web-ifc': ['web-ifc', 'web-ifc-three']
                }
            }
        }
    },
    server: {
        host: true,
        port: 5188,
        proxy: {
            '/api/trpc': {
                target: 'http://localhost:3008',
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: 'http://localhost:3008',
                changeOrigin: true,
                secure: false,
            },
            '/api/external': {
                target: 'http://localhost:3008',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    optimizeDeps: {
        exclude: ['web-ifc', 'web-ifc-three']
    },
    assetsInclude: ['**/*.wasm']
});
