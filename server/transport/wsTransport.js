const WebSocket = require('ws');
const TransportLayer = require('./transportLayer');

class WebSocketTransport extends TransportLayer {
    constructor(port) {
        super(port);
        this.server = null;
        this.clients = new Set();
    }

    start() {
        this.server = new WebSocket.Server({ port: this.port });

        this.server.on('connection', (ws) => {
            this.clients.add(ws);
            
            ws.on('message', (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    this._handleMessage(ws, parsedMessage);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                this._handleDisconnection(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
                this._handleDisconnection(ws);
            });

            this._handleConnection(ws);
        });

        console.log(`WebSocket server started on port ${this.port}`);
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.clients.clear();
            console.log('WebSocket server stopped');
        }
    }

    send(client, data) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

module.exports = WebSocketTransport;
