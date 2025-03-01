const GameMap = require('../gameMap');

class CaveMapGenerator {
    constructor(width = 32, height = 32) {
        this.width = width;
        this.height = height;
        this.fillProbability = 0.4;
        this.birthLimit = 4;
        this.deathLimit = 3;
        this.iterations = 4;
    }

    generate() {
        const map = new GameMap(this.width, this.height);
        let grid = this._generateRandomGrid();

        for (let i = 0; i < this.iterations; i++) {
            grid = this._doSimulationStep(grid);
        }

        this._applyGridToMap(grid, map);
        this._ensureConnectivity(grid, map);

        return map;
    }

    _generateRandomGrid() {
        const grid = Array(this.height).fill().map(() => Array(this.width).fill(0));
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    grid[y][x] = 1;
                } else {
                    grid[y][x] = Math.random() < this.fillProbability ? 1 : 0;
                }
            }
        }
        return grid;
    }

    _doSimulationStep(oldGrid) {
        const newGrid = Array(this.height).fill().map(() => Array(this.width).fill(0));

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const neighbors = this._countAliveNeighbors(oldGrid, x, y);
                if (oldGrid[y][x] === 1) {
                    newGrid[y][x] = neighbors < this.deathLimit ? 0 : 1;
                } else {
                    newGrid[y][x] = neighbors > this.birthLimit ? 1 : 0;
                }
            }
        }

        return newGrid;
    }

    _countAliveNeighbors(grid, x, y) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const neighborX = x + i;
                const neighborY = y + j;
                if (i === 0 && j === 0) continue;
                if (neighborX < 0 || neighborX >= this.width || neighborY < 0 || neighborY >= this.height) {
                    count++;
                } else {
                    count += grid[neighborY][neighborX];
                }
            }
        }
        return count;
    }

    _applyGridToMap(grid, map) {
        console.log('Applying grid to map...');
        // First pass - set all cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (grid[y][x] === 1) {
                    map.setWall(x, y);
                } else {
                    // Only consider central area for spawn points (avoid edges)
                    if (x > 5 && x < this.width - 5 && y > 5 && y < this.height - 5) {
                        let isGoodSpawn = true;
                        let wallCount = 0;
                        
                        // Check a 5x5 area around the potential spawn point
                        for (let dy = -2; dy <= 2 && isGoodSpawn; dy++) {
                            for (let dx = -2; dx <= 2 && isGoodSpawn; dx++) {
                                const nx = x + dx;
                                const ny = y + dy;
                                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                                    if (grid[ny][nx] === 1) {
                                        wallCount++;
                                        // If there's a wall in immediate vicinity (3x3), reject
                                        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                                            isGoodSpawn = false;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Reject if too many walls in 5x5 area
                        if (wallCount > 8) {
                            isGoodSpawn = false;
                        }
                        
                        map.setEmpty(x, y, isGoodSpawn);
                        if (isGoodSpawn) {
                            console.log('Found good spawn point at:', {x, y, wallCount});
                        }
                    } else {
                        map.setEmpty(x, y, false);
                    }
                }
            }
        }
    }

    _ensureConnectivity(grid, map) {
        const regions = this._findRegions(grid);
        if (regions.length <= 1) return;

        const mainRegion = regions.reduce((a, b) => a.length > b.length ? a : b);
        const mainRegionSet = new Set(mainRegion.map(p => `${p.x},${p.y}`));

        for (const region of regions) {
            if (region === mainRegion) continue;

            const point1 = this._findClosestPoints(mainRegion, region);
            const point2 = this._findClosestPoints(region, mainRegion);

            this._createTunnel(point1, point2, map);
        }
    }

    _findRegions(grid) {
        const visited = new Set();
        const regions = [];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (grid[y][x] === 0 && !visited.has(`${x},${y}`)) {
                    const region = this._floodFill(grid, x, y, visited);
                    regions.push(region);
                }
            }
        }

        return regions;
    }

    _floodFill(grid, startX, startY, visited) {
        const region = [];
        const queue = [{x: startX, y: startY}];

        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);
            region.push({x, y});

            for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height 
                    && grid[newY][newX] === 0 && !visited.has(`${newX},${newY}`)) {
                    queue.push({x: newX, y: newY});
                }
            }
        }

        return region;
    }

    _findClosestPoints(region1, region2) {
        let minDist = Infinity;
        let closest = null;

        for (const p1 of region1) {
            for (const p2 of region2) {
                const dist = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    closest = p1;
                }
            }
        }

        return closest;
    }

    _createTunnel(point1, point2, map) {
        let x = point1.x;
        let y = point1.y;

        while (x !== point2.x || y !== point2.y) {
            // Don't make spawn points in tunnels
            map.setEmpty(x, y, false);
            if (x < point2.x) x++;
            else if (x > point2.x) x--;
            if (y < point2.y) y++;
            else if (y > point2.y) y--;
        }
        map.setEmpty(point2.x, point2.y, false);
    }

    static generateBasicMap() {
        const generator = new CaveMapGenerator(32, 32);
        return generator.generate();
    }
}

module.exports = CaveMapGenerator;
