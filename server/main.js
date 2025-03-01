const GameServer = require('./gameServer');

const server = new GameServer(8080);
server.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.stop();
    process.exit(0);
});
