import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    plugins: [basicSsl()],
    root: 'client',
    server: {
        port: 3002,
        strictPort: true,
        hmr: false
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    }
});
