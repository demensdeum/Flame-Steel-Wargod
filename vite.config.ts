import { defineConfig } from 'vite';

export default defineConfig({
    root: 'client',
    server: {
        port: 3002,
        strictPort: true,
        hmr: {
            port: 3002
        },
        proxy: {
            '/ws': {
                target: 'ws://localhost:3002',
                ws: true
            }
        }
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    },
    optimizeDeps: {
        include: ['three']
    },
    logLevel: 'info',
    clearScreen: false
});
