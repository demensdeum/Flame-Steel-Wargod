const WebSocket = require('ws');
const TransportLayer = require('./transportLayer');

class WebSocketTransport extends TransportLayer {
    constructor(port, httpServer) {
        super(port);
        this.server = null;
        this.httpServer = httpServer;
        this.connections = new Set();
    }

    start() {
        this.server = new WebSocket.Server({ server: this.httpServer });

        this.server.on('connection', (ws) => {
            this.connections.add(ws);

            ws.on('message', (message) => {
                this._handleMessage(ws, message);
            });

            ws.on('close', () => {
                this.connections.delete(ws);
                this._handleDisconnection(ws);
            });

            this._handleConnection(ws);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    send(connection, data) {
        if (connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(data));
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.connections.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    closeConnection(connection) {
        if (connection.readyState === WebSocket.OPEN) {
            connection.close();
        }
    }
}

module.exports = WebSocketTransport;
