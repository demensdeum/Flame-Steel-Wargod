import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import GameMap from './gameMap';
import { generateArenaMap } from './mapGenerators/arenaMapGenerator';
import { Fighter, Client, GameState, ClientMessage } from './types';
import { CoordinateSystem, WorldPosition } from '../shared/coordinates';

export default class GameServer {
    private wss: WebSocketServer;
    private clients: Map<string, Client>;
    private fighters: Map<string, Fighter>;
    private gameMap: GameMap;
    private coordinates: CoordinateSystem;

    constructor(port: number, app: express.Application, server: http.Server) {
        this.wss = new WebSocketServer({ server });
        this.clients = new Map();
        this.fighters = new Map();
        
        // Create game map
        this.gameMap = generateArenaMap();
        this.coordinates = new CoordinateSystem(this.gameMap.getWidth(), this.gameMap.getHeight(), this.gameMap.getCellSize());
        
        this.setupWebSocketHandlers();
        this.startGameLoop();
    }

    private setupWebSocketHandlers(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = uuidv4();
            
            // Create new client
            const client: Client = {
                ws,
                id: clientId
            };
            
            this.clients.set(clientId, client);
            
            // Create fighter for client
            const centerGridPos = {
                x: Math.floor(this.gameMap.getWidth() / 2),
                z: Math.floor(this.gameMap.getHeight() / 2)
            };
            
            const centerWorldPos = this.coordinates.gridToWorld(centerGridPos);
            
            const fighter: Fighter = {
                id: clientId,
                x: centerWorldPos.x,
                z: centerWorldPos.z,
                health: 100,
                weapon: 'none',
                armor: 0
            };
            
            this.fighters.set(clientId, fighter);
            
            // Send map data
            ws.send(JSON.stringify({
                type: 'mapData',
                data: this.gameMap.toJSON()
            }));
            
            // Send initial game state
            this.broadcastGameState();
            
            ws.on('message', (data: WebSocket.RawData) => {
                try {
                    const message: ClientMessage = JSON.parse(data.toString());
                    this.handleClientMessage(clientId, message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            ws.on('close', () => {
                this.handleClientDisconnect(clientId);
            });
        });
    }

    private handleClientMessage(clientId: string, message: ClientMessage): void {
        const fighter = this.fighters.get(clientId);
        if (!fighter) return;

        switch (message.type) {
            case 'objectMoved':
                if (message.x !== undefined && message.z !== undefined) {
                    const newPos: WorldPosition = { x: message.x, z: message.z };
                    if (this.gameMap.isEmptyCell(newPos)) {
                        fighter.x = message.x;
                        fighter.z = message.z;
                        this.broadcastGameState();
                    }
                }
                break;

            case 'objectRotated':
                if (message.rx !== undefined && message.ry !== undefined && message.rz !== undefined) {
                    fighter.rx = message.rx;
                    fighter.ry = message.ry;
                    fighter.rz = message.rz;
                    this.broadcastGameState();
                }
                break;
        }
    }

    private handleClientDisconnect(clientId: string): void {
        // Remove client and fighter
        this.clients.delete(clientId);
        this.fighters.delete(clientId);
        
        // Notify other clients
        this.broadcastGameState();
    }

    private broadcastGameState(): void {
        const gameState: GameState = {
            fighters: Array.from(this.fighters.values())
        };

        const message = JSON.stringify({
            type: 'gameState',
            data: gameState
        });

        this.clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(message);
            }
        });
    }

    private startGameLoop(): void {
        setInterval(() => {
            // Update game state
            this.broadcastGameState();
        }, 1000 / 60); // 60 FPS
    }
}
