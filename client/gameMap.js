class GameMap {
    constructor(mapData) {
        console.log('Creating GameMap with data:', mapData);
        if (!mapData || !mapData.grid || !Array.isArray(mapData.grid)) {
            console.error('Invalid map data:', mapData);
            this.width = 0;
            this.height = 0;
            this.grid = [];
            return;
        }
        this.width = mapData.width;
        this.height = mapData.height;
        this.cellSize = mapData.cellSize || 64; // Default to 64 if not provided
        this.grid = mapData.grid;
        this.armorSpawns = mapData.armorSpawns || [];
        console.log('GameMap initialized with armor spawns:', this);
    }

    isEmptyCell(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return false;
        }
        return this.grid[z][x] === 0;
    }
}

export default GameMap;
