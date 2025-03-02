import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export default class WebSocketTransport {
    private wss: WebSocketServer;
    private clients: Map<string, WebSocket>;

    constructor(port: number, server: Server) {
        this.wss = new WebSocketServer({ server });
        this.clients = new Map();
    }

    public onConnection(callback: (ws: WebSocket, id: string) => void): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const id = Math.random().toString(36).substr(2, 9);
            this.clients.set(id, ws);
            callback(ws, id);

            ws.on('close', () => {
                this.clients.delete(id);
            });
        });
    }

    public broadcast(message: string): void {
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    public send(clientId: string, message: string): void {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}
