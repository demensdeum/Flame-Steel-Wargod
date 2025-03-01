const express = require('express');
const path = require('path');
const http = require('http');
const WebSocketTransport = require('./server/transport/webSocketTransport');
const GameServer = require('./server/gameServer');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create transport with HTTP server
class ServerWebSocketTransport extends WebSocketTransport {
    constructor(port) {
        super(port, server);
    }
}

// Create game server instance
const gameServer = new GameServer(3000, ServerWebSocketTransport);

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, 'client')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    gameServer.start();
});
