const Armor = require('./armor');

class GameMap {
    constructor(width = 16, height = 16) {
        this.width = width;
        this.height = height;
        this.cellSize = 64;
        this.grid = Array(height).fill().map(() => Array(width).fill(0));
        this.spawnPoints = [];
        this.armorObjects = new Map(); // Map of armor ID to Armor object
    }

    addArmorObject(x, z) {
        const worldX = x * this.cellSize;
        const worldZ = z * this.cellSize;
        const armorId = `Armor_${x}_${z}`;
        
        console.log('GameMap: Creating armor object:', {
            gridPosition: { x, z },
            worldPosition: { x: worldX, z: worldZ },
            armorId
        });
        
        const armor = new Armor(
            armorId,  // Name
            25,      // Defense value
            worldX,  // x
            0.5,     // y (floating above ground)
            worldZ   // z
        );
        
        this.armorObjects.set(armorId, armor);
        
        console.log('GameMap: Created armor object:', {
            id: armor.getName(),
            position: armor.getPosition(),
            defense: armor.getDefense(),
            totalArmorObjects: this.armorObjects.size
        });
        
        return armor;
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
        
        // Filter spawn points to only use those not too close to the edge
        const safeSpawnPoints = this.spawnPoints.filter(point => 
            point.x > 2 && point.x < this.width - 2 && 
            point.y > 2 && point.y < this.height - 2
        );
        
        if (safeSpawnPoints.length === 0) {
            throw new Error('No safe spawn points available');
        }
        
        console.log('Safe spawn points:', safeSpawnPoints);
        
        const point = safeSpawnPoints[Math.floor(Math.random() * safeSpawnPoints.length)];
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
        // Convert armor objects to array first
        const armorObjectsArray = Array.from(this.armorObjects.values()).map(armor => {
            const position = armor.getPosition();
            console.log('Armor object raw position:', position);
            
            // Ensure position has x, y, z coordinates
            const validPosition = {
                x: position?.x || 0,
                y: position?.y || 0,
                z: position?.z || 0
            };
            
            console.log('Armor object validated position:', validPosition);
            
            return {
                id: armor.getName(),
                position: validPosition,
                defense: armor.getDefense()
            };
        });

        console.log('GameMap: Converting armor objects:', {
            numArmorObjects: this.armorObjects.size,
            armorObjectsArray
        });

        const mapData = {
            width: this.width,
            height: this.height,
            cellSize: this.cellSize,
            grid: this.grid.map(row => [...row]),
            worldWidth: this.width * this.cellSize,
            worldHeight: this.height * this.cellSize,
            armorObjects: armorObjectsArray,  // Make sure this is an array
            spawnPoints: this.spawnPoints.map(point => ({ ...point }))  // Clone spawn points
        };
        
        console.log('GameMap: Sending map data:', {
            dimensions: { width: this.width, height: this.height },
            cellSize: this.cellSize,
            numArmorObjects: armorObjectsArray.length,
            armorObjects: armorObjectsArray
        });
        
        return mapData;
    }

}

module.exports = GameMap;
