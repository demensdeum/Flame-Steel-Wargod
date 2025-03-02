import { MapData, ArmorSpawn } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CoordinateSystem, WorldPosition, GridPosition } from '../shared/coordinates';

export default class GameMap {
    private width: number;
    private height: number;
    private cellSize: number;
    private grid: number[][];
    private worldWidth: number;
    private worldHeight: number;
    private armorSpawns: ArmorSpawn[];
    private spawnPoints: GridPosition[];
    private coordinates: CoordinateSystem;

    constructor(width: number, height: number, cellSize: number) {
        console.log('Initializing GameMap with:', { width, height, cellSize });
        
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        
        // Create grid with proper dimensions
        this.grid = [];
        for (let z = 0; z < height; z++) {
            const row = new Array(width).fill(0);
            this.grid.push(row);
        }
        
        this.worldWidth = width * cellSize;
        this.worldHeight = height * cellSize;
        this.armorSpawns = [];
        this.spawnPoints = [];
        this.coordinates = new CoordinateSystem(width, height, cellSize);
        
        console.log('GameMap initialized:', {
            gridDimensions: `${this.grid.length}x${this.grid[0].length}`,
            worldDimensions: `${this.worldWidth}x${this.worldHeight}`,
            sampleRow: this.grid[0].join('')
        });
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public getCellSize(): number {
        return this.cellSize;
    }

    public getGrid(): number[][] {
        return this.grid;
    }

    public getWorldWidth(): number {
        return this.worldWidth;
    }

    public getWorldHeight(): number {
        return this.worldHeight;
    }

    public setCell(pos: GridPosition, value: number): void {
        console.log(`Setting cell at (${pos.x}, ${pos.z}) to ${value}`);
        if (this.isValidGridPosition(pos)) {
            this.grid[pos.z][pos.x] = value;
        } else {
            console.error(`Invalid grid position: (${pos.x}, ${pos.z})`);
        }
    }

    public isEmptyCell(pos: GridPosition): boolean {
        if (!this.isValidGridPosition(pos)) {
            return false;
        }
        return this.grid[pos.z][pos.x] === 0;
    }

    public addArmorSpawn(pos: GridPosition): void {
        if (this.isEmptyCell(pos)) {
            const spawn: ArmorSpawn = {
                id: uuidv4(),
                x: pos.x * this.cellSize,
                z: pos.z * this.cellSize
            };
            this.armorSpawns.push(spawn);
        }
    }

    private isValidGridPosition(pos: GridPosition): boolean {
        return pos.x >= 0 && pos.x < this.width && pos.z >= 0 && pos.z < this.height;
    }

    public getArmorSpawns(): ArmorSpawn[] {
        return this.armorSpawns;
    }

    public addSpawnPoint(pos: GridPosition): void {
        if (this.isEmptyCell(pos)) {
            this.spawnPoints.push(pos);
        }
    }

    public getSpawnPoints(): GridPosition[] {
        return this.spawnPoints;
    }

    public getRandomSpawnPoint(): GridPosition | null {
        if (this.spawnPoints.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.spawnPoints.length);
        return this.spawnPoints[randomIndex];
    }

    public toJSON(): MapData {
        const data = {
            width: this.width,
            height: this.height,
            cellSize: this.cellSize,
            grid: this.grid,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            armorSpawns: this.armorSpawns,
            spawnPoints: this.spawnPoints
        };
        
        console.log('Converting GameMap to JSON:', {
            dimensions: `${this.width}x${this.height}`,
            cellSize: this.cellSize,
            gridPresent: !!this.grid,
            wallCount: this.grid.reduce((count, row) => 
                count + row.filter(cell => cell === 1).length, 0
            ),
            sampleRow: this.grid[0]?.join(''),
            armorSpawns: this.armorSpawns.length,
            spawnPoints: this.spawnPoints.length
        });
        
        return data;
    }
}
