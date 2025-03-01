const GameServer = require('./gameServer');
const TransportFactory = require('./transport/transportFactory');

// Create both WebSocket and UDP servers
const wsServer = new GameServer(8080, TransportFactory.WebSocket);
const udpServer = new GameServer(8081, TransportFactory.UDP);

// Start both servers
wsServer.start();
udpServer.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    wsServer.stop();
    udpServer.stop();
    process.exit(0);
});
