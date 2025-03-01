const WebSocket = require('ws');
const TransportLayer = require('./transportLayer');

class WebSocketTransport extends TransportLayer {
    constructor(port) {
        super(port);
        this.server = null;
    }

    start() {
        this.server = new WebSocket.Server({ port: this.port });

        this.server.on('connection', (ws) => {
            ws.on('message', (message) => {
                this._handleMessage(ws, message);
            });

            ws.on('close', () => {
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
        this.server.clients.forEach((client) => {
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
