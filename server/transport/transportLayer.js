class TransportLayer {
    constructor(port) {
        this.port = port;
        this.messageHandlers = new Map();
        this.connectionHandlers = new Set();
        this.disconnectionHandlers = new Set();
    }

    // Start the transport layer
    start() {
        throw new Error('Method start() must be implemented by subclass');
    }

    // Stop the transport layer
    stop() {
        throw new Error('Method stop() must be implemented by subclass');
    }

    // Send data to a specific client
    send(client, data) {
        throw new Error('Method send() must be implemented by subclass');
    }

    // Broadcast data to all clients
    broadcast(data) {
        throw new Error('Method broadcast() must be implemented by subclass');
    }

    // Add message handler
    onMessage(handler) {
        this.messageHandlers.set(handler, handler);
    }

    // Remove message handler
    removeMessageHandler(handler) {
        this.messageHandlers.delete(handler);
    }

    // Add connection handler
    onConnection(handler) {
        this.connectionHandlers.add(handler);
    }

    // Remove connection handler
    removeConnectionHandler(handler) {
        this.connectionHandlers.delete(handler);
    }

    // Add disconnection handler
    onDisconnection(handler) {
        this.disconnectionHandlers.add(handler);
    }

    // Remove disconnection handler
    removeDisconnectionHandler(handler) {
        this.disconnectionHandlers.delete(handler);
    }

    // Protected methods for subclasses to use
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
