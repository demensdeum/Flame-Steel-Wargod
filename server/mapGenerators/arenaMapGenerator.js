const GameMap = require('../gameMap');

class ArenaMapGenerator {
    constructor(width = 32, height = 32) {
        this.width = width;
        this.height = height;
    }

    generate() {
        const map = new GameMap(this.width, this.height);
        
        // Create border walls
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only set walls on the border
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    map.setWall(x, y);
                }
            }
        }

        // Add spawn points in a circle around the center
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        const radius = Math.min(centerX, centerY) - 5; // Keep spawn points away from walls
        
        // Add 8 spawn points in a circle
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spawnX = Math.floor(centerX + Math.cos(angle) * radius);
            const spawnY = Math.floor(centerY + Math.sin(angle) * radius);
            
            // Mark this as a potential spawn point
            map.setEmpty(spawnX, spawnY, true);
        }

        // Add center spawn point
        map.setEmpty(centerX, centerY, true);

        return map;
    }
}

module.exports = ArenaMapGenerator;
