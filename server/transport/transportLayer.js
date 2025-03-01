class TransportLayer {
    constructor(port) {
        this.port = port;
        this.messageHandlers = new Map();
        this.connectionHandlers = new Set();
        this.disconnectionHandlers = new Set();
    }

    start() {
        throw new Error('Method start() must be implemented by subclass');
    }

    stop() {
        throw new Error('Method stop() must be implemented by subclass');
    }

    send(client, data) {
        throw new Error('Method send() must be implemented by subclass');
    }

    broadcast(data) {
        throw new Error('Method broadcast() must be implemented by subclass');
    }

    closeConnection(connection) {
        throw new Error('Method closeConnection() must be implemented by subclass');
    }

    onMessage(handler) {
        this.messageHandlers.set(handler, handler);
    }

    removeMessageHandler(handler) {
        this.messageHandlers.delete(handler);
    }

    onConnection(handler) {
        this.connectionHandlers.add(handler);
    }

    removeConnectionHandler(handler) {
        this.connectionHandlers.delete(handler);
    }

    onDisconnection(handler) {
        this.disconnectionHandlers.add(handler);
    }

    removeDisconnectionHandler(handler) {
        this.disconnectionHandlers.delete(handler);
    }

    _handleMessage(client, message) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(client, message);
            } catch (error) {
                console.error('Error in message handler:', error);
            }
        });
    }

    _handleConnection(client) {
        this.connectionHandlers.forEach(handler => {
            try {
                handler(client);
            } catch (error) {
                console.error('Error in connection handler:', error);
            }
        });
    }

    _handleDisconnection(client) {
        this.disconnectionHandlers.forEach(handler => {
            try {
                handler(client);
            } catch (error) {
                console.error('Error in disconnection handler:', error);
            }
        });
    }
}

module.exports = TransportLayer;
