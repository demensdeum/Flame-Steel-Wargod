const GameServer = require('./gameServer');
const TransportFactory = require('./transport/transportFactory');

const wsServer = new GameServer(8080, TransportFactory.WebSocket);
const udpServer = new GameServer(8081, TransportFactory.UDP);

wsServer.start();
udpServer.start();

process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    wsServer.stop();
    udpServer.stop();
    process.exit(0);
});
