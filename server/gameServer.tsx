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
            
            // Create fighter for client at a random spawn point
            const spawnPoint = this.gameMap.getRandomSpawnPoint();
            if (!spawnPoint) {
                console.error('No spawn points available!');
                ws.close();
                return;
            }
            
            const spawnWorldPos = this.coordinates.gridToWorld(spawnPoint);
            
            const fighter: Fighter = {
                id: clientId,
                x: spawnWorldPos.x,
                z: spawnWorldPos.z,
                health: 100,
                weapon: 'none',
                armor: 0
            };
            
            this.fighters.set(clientId, fighter);
            
            // Send initial game data including map and player ID
            const mapData = this.gameMap.toJSON();
            
            console.log('Map data from server:', {
                width: mapData.width,
                height: mapData.height,
                cellSize: mapData.cellSize,
                gridSize: mapData.grid?.length,
                gridSample: mapData.grid?.slice(0, 3).map(row => row.join('')),
                worldWidth: mapData.worldWidth,
                worldHeight: mapData.worldHeight
            });
            
            const initData = {
                type: 'initGame',
                playerId: clientId,
                mapData: {
                    ...mapData,
                    // Add fixed armor spawns in grid coordinates
                    armorSpawns: [
                        { id: 'armor1', x: Math.floor(this.gameMap.getWidth() * 0.25), z: Math.floor(this.gameMap.getHeight() * 0.25) },
                        { id: 'armor2', x: Math.floor(this.gameMap.getWidth() * 0.75), z: Math.floor(this.gameMap.getHeight() * 0.75) },
                        { id: 'armor3', x: Math.floor(this.gameMap.getWidth() * 0.25), z: Math.floor(this.gameMap.getHeight() * 0.75) },
                        { id: 'armor4', x: Math.floor(this.gameMap.getWidth() * 0.75), z: Math.floor(this.gameMap.getHeight() * 0.25) }
                    ]
                }
            };
            
            console.log('Sending init data to client:', {
                type: initData.type,
                playerId: initData.playerId,
                mapDataPresent: !!initData.mapData,
                gridPresent: !!initData.mapData.grid,
                wallCount: initData.mapData.grid?.reduce((count, row) => 
                    count + row.filter(cell => cell === 1).length, 0
                )
            });
            
            ws.send(JSON.stringify(initData));
            
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
