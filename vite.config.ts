import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
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
        exclude: ['web-ifc']
    }
});
