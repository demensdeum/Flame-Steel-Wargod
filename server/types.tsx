import { WebSocket } from 'ws';

import { WorldPosition } from '../shared/coordinates';

export interface Fighter extends WorldPosition {
    id: string;
    rx?: number;
    ry?: number;
    rz?: number;
    health: number;
    weapon: string;
    armor: number;
}

export interface ArmorSpawn extends WorldPosition {
    id: string;
}

export interface GameState {
    fighters: Fighter[];
}

export interface Client {
    ws: WebSocket;
    id: string;
}

export interface MapData {
    width: number;
    height: number;
    cellSize: number;
    grid: number[][];
    worldWidth: number;
    worldHeight: number;
    armorSpawns: ArmorSpawn[];
}

export interface ClientMessage {
    type: string;
    objectId: string;
    x?: number;
    y?: number;
    z?: number;
    rx?: number;
    ry?: number;
    rz?: number;
}
