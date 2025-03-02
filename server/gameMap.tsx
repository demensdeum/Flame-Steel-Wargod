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
    private coordinates: CoordinateSystem;

    constructor(width: number, height: number, cellSize: number) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = Array(height).fill(0).map(() => Array(width).fill(0));
        this.worldWidth = width * cellSize;
        this.worldHeight = height * cellSize;
        this.armorSpawns = [];
        this.coordinates = new CoordinateSystem(width, height, cellSize);
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
        if (this.isValidGridPosition(pos)) {
            this.grid[pos.z][pos.x] = value;
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

    public toJSON(): MapData {
        return {
            width: this.width,
            height: this.height,
            cellSize: this.cellSize,
            grid: this.grid,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            armorSpawns: this.armorSpawns
        };
    }
}
