export interface MapData {
    width: number;
    height: number;
    cellSize: number;
    grid: number[][];
    worldWidth: number;
    worldHeight: number;
    armorSpawns: ArmorSpawn[];
}

export interface ArmorSpawn {
    id: string;
    x: number;
    z: number;
}

export interface FighterData {
    id: string;
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
    health?: number;
    weapon?: string;
    armor?: number;
}

export interface GameState {
    fighters: FighterData[];
}

export interface WorldPosition {
    x: number;
    z: number;
}

export interface ObjectData {
    objectId: string;
    objectType: 'armor' | 'fighter';
    x: number;
    y: number;
    z: number;
}

export interface ArmorCubeUserData {
    initialY: number;
    bobSpeed: number;
    bobHeight: number;
    rotateSpeed: number;
    timeOffset: number;
    objectId: string;
}

export interface ServerMessage {
    type: 'gameState' | 'objectCreated' | 'objectRemoved' | 'armorPickup';
    data?: GameState;
    objectType?: 'armor' | 'fighter';
    objectId?: string;
    fighterId?: string;
    armorAmount?: number;
    x?: number;
    y?: number;
    z?: number;
}

export interface ClientMessage {
    type: 'objectMoved' | 'objectRotated' | 'attack';
    objectId: string;
    x?: number;
    y?: number;
    z?: number;
    rx?: number;
    ry?: number;
    rz?: number;
    w?: number;
}
