const WebSocketTransport = require('./wsTransport');
const UDPTransport = require('./udpTransport');

class TransportFactory {
    static WebSocket = WebSocketTransport;
    static UDP = UDPTransport;
}

module.exports = TransportFactory;
