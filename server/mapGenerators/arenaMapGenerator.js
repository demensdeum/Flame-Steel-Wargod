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

        // Add armor objects in a smaller circle
        const armorRadius = radius * 0.6; // Armor spawns closer to center
        
        console.log('ArenaMapGenerator: Creating armor objects', {
            centerX,
            centerY,
            radius,
            armorRadius
        });

        // Add 4 armor objects
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const spawnX = Math.floor(centerX + Math.cos(angle) * armorRadius);
            const spawnZ = Math.floor(centerY + Math.sin(angle) * armorRadius);
            
            console.log(`ArenaMapGenerator: Creating armor ${i + 1}/4 at position:`, { spawnX, spawnZ });
            
            map.setEmpty(spawnX, spawnZ); // Ensure spot is empty
            const armor = map.addArmorObject(spawnX, spawnZ); // Create armor object at this position
            
            console.log('ArenaMapGenerator: Created armor object:', {
                id: armor.getName(),
                position: armor.getPosition(),
                defense: armor.getDefense()
            });
        }
        return map;
    }
}

module.exports = ArenaMapGenerator;
