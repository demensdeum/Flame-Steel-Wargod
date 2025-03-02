export interface WorldPosition {
    x: number;
    z: number;
}

export interface GridPosition {
    x: number;
    z: number;
}

export class CoordinateSystem {
    private mapWidth: number;
    private mapHeight: number;
    private cellSize: number;

    constructor(mapWidth: number, mapHeight: number, cellSize: number) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.cellSize = cellSize;
    }

    public gridToWorld(gridPos: GridPosition): WorldPosition {
        return {
            x: (gridPos.x - this.mapWidth/2) * this.cellSize,
            z: (gridPos.z - this.mapHeight/2) * this.cellSize
        };
    }

    public worldToGrid(worldPos: WorldPosition): GridPosition {
        return {
            x: Math.round(worldPos.x / this.cellSize + this.mapWidth/2),
            z: Math.round(worldPos.z / this.cellSize + this.mapHeight/2)
        };
    }

    public isValidGridPosition(pos: GridPosition): boolean {
        return pos.x >= 0 && pos.x < this.mapWidth && 
               pos.z >= 0 && pos.z < this.mapHeight;
    }

    public isValidWorldPosition(pos: WorldPosition): boolean {
        const gridPos = this.worldToGrid(pos);
        return this.isValidGridPosition(gridPos);
    }
}
