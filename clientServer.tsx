import express from 'express';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer as createViteServer } from 'vite';
import GameServer from './server/gameServer';

// Get current directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createServer() {
    const PORT = 3002;

    // Create Express app and HTTP server
    const app = express();
    const server = http.createServer(app);

    // Create Vite server in middleware mode and configure it
    const vite = await createViteServer({
        server: { 
            middlewareMode: true,
            hmr: false
        },
        appType: 'spa',
        root: path.join(__dirname, 'client')
    });

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);

    // Create game server instance with the same server
    const gameServer = new GameServer(PORT, app, server);

    // Start the single server instance
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
}

createServer().catch((e) => {
    console.error('Error starting server:', e);
    process.exit(1);
});
