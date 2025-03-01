const dgram = require('dgram');
const TransportLayer = require('./transportLayer');

class UDPTransport extends TransportLayer {
    constructor(port) {
        super(port);
        this.server = dgram.createSocket('udp4');
        this.clients = new Map(); // Map of 'address:port' -> {address, port}
    }

    start() {
        this.server.on('message', (message, rinfo) => {
            const clientId = `${rinfo.address}:${rinfo.port}`;
            
            try {
                const parsedMessage = JSON.parse(message);
                
                // Handle connection message
                if (parsedMessage.type === 'connect') {
                    if (!this.clients.has(clientId)) {
                        const client = { address: rinfo.address, port: rinfo.port };
                        this.clients.set(clientId, client);
                        this._handleConnection(client);
                    }
                    return;
                }

                // Handle disconnect message
                if (parsedMessage.type === 'disconnect') {
                    const client = this.clients.get(clientId);
                    if (client) {
                        this.clients.delete(clientId);
                        this._handleDisconnection(client);
                    }
                    return;
                }

                // Handle regular messages
                const client = this.clients.get(clientId);
                if (client) {
                    this._handleMessage(client, parsedMessage);
                }
            } catch (error) {
                console.error('Error parsing UDP message:', error);
            }
        });

        this.server.on('error', (error) => {
            console.error('UDP server error:', error);
        });

        this.server.bind(this.port);
        console.log(`UDP server started on port ${this.port}`);
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.clients.clear();
            console.log('UDP server stopped');
        }
    }

    send(client, data) {
        const message = JSON.stringify(data);
        this.server.send(message, client.port, client.address, (error) => {
            if (error) {
                console.error('Error sending UDP message:', error);
            }
        });
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            this.server.send(message, client.port, client.address, (error) => {
                if (error) {
                    console.error('Error broadcasting UDP message:', error);
                }
            });
        });
    }
}

module.exports = UDPTransport;
