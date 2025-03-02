import { MapData } from './types';

export default class GameMap {
    public width: number;
    public height: number;
    public cellSize: number;
    public grid: number[][];
    public worldWidth: number;
    public worldHeight: number;
    
    constructor(data: MapData) {
        console.log('Creating client GameMap with data:', {
            width: data.width,
            height: data.height,
            cellSize: data.cellSize,
            gridPresent: !!data.grid,
            gridSize: data.grid?.length,
            gridSample: data.grid?.slice(0, 3).map(row => row.join('')),
            worldWidth: data.worldWidth,
            worldHeight: data.worldHeight
        });
        
        this.width = data.width;
        this.height = data.height;
        this.cellSize = data.cellSize;
        this.grid = data.grid;
        this.worldWidth = data.worldWidth;
        this.worldHeight = data.worldHeight;
        
        const wallCount = this.grid?.reduce((count, row) => 
            count + row.filter(cell => cell === 1).length, 0
        ) || 0;
        
        console.log('Client GameMap initialized with:', {
            dimensions: `${this.width}x${this.height}`,
            wallCount,
            firstRow: this.grid?.[0]?.join('')
        });
    }
    
    public isEmptyCell(x: number, z: number): boolean {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            console.log(`Cell (${x}, ${z}) is out of bounds`);
            return false;
        }
        const isEmpty = this.grid[z][x] === 0;
        console.log(`Checking cell (${x}, ${z}): ${isEmpty ? 'empty' : 'wall'}`);
        return isEmpty;
    }
}
