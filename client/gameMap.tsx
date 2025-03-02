import { MapData } from './types';

export default class GameMap {
    public width: number;
    public height: number;
    public cellSize: number;
    public grid: number[][];
    public worldWidth: number;
    public worldHeight: number;
    
    constructor(data: MapData) {
        this.width = data.width;
        this.height = data.height;
        this.cellSize = data.cellSize;
        this.grid = data.grid;
        this.worldWidth = data.worldWidth;
        this.worldHeight = data.worldHeight;
    }
    
    public isEmptyCell(x: number, z: number): boolean {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return false;
        }
        return this.grid[z][x] === 0;
    }
}
