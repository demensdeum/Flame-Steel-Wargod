class GameMap {
    constructor(width = 16, height = 16) {
        this.width = width;
        this.height = height;
        this.cellSize = 64;
        this.grid = Array(height).fill().map(() => Array(width).fill(0));
        this.spawnPoints = [];
    }

    setWall(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y][x] = 1;
            this.spawnPoints = this.spawnPoints.filter(point => 
                point.x !== x || point.y !== y
            );
        }
    }

    setEmpty(x, y, isSpawnPoint = true) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y][x] = 0;
            // Remove existing spawn point if any
            this.spawnPoints = this.spawnPoints.filter(point => point.x !== x || point.y !== y);
            // Add as spawn point only if requested
            if (isSpawnPoint) {
                this.spawnPoints.push({ x, y });
            }
        }
    }

    getRandomSpawnPoint() {
        if (this.spawnPoints.length === 0) {
            throw new Error('No available spawn points');
        }
        console.log('Available spawn points:', this.spawnPoints);
        console.log('Map grid:', this.grid);
        
        const point = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        console.log('Selected spawn point:', point);
        
        // Convert grid coordinates to world coordinates
        return {
            x: point.x * this.cellSize,
            y: 0,
            z: point.y * this.cellSize
        };
    }

    isPositionValid(position) {
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(position.x / this.cellSize);
        const gridY = Math.floor(position.z / this.cellSize);

        // Check map boundaries
        if (!(gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height)) {
            return false;
        }

        return this.grid[gridY][gridX] === 0;
    }

    getCellAt(worldX, worldZ) {
        const gridX = Math.floor(worldX / this.cellSize);
        const gridY = Math.floor(worldZ / this.cellSize);
        
        if (!(gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height)) {
            return null;
        }
        
        return this.grid[gridY][gridX];
    }

    getMapData() {
        return {
            width: this.width,
            height: this.height,
            cellSize: this.cellSize,
            grid: this.grid.map(row => [...row]),
            worldWidth: this.width * this.cellSize,
            worldHeight: this.height * this.cellSize
        };
    }
}

module.exports = GameMap;
